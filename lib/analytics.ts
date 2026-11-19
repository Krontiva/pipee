import { STAGE_META } from '@/types'

// Pure calculations behind the Analytics page. No database access here: the
// page loads rows and hands them in, so every number is derived from what the
// app already stores (opportunities + the activity log). Nothing in this file
// needs a schema change.

const DAY = 86_400_000
const STAGES = [1, 2, 3, 4, 5, 6, 7]

// Below this many closed deals, a stage's own win rate is too noisy to trust,
// so the forecast falls back to the overall win rate for that stage.
export const MIN_SAMPLE = 5
// Observed stage durations need at least this many deals to replace the target.
const MIN_DURATION_SAMPLE = 3

export const DISQ_LABELS: Record<string, string> = {
  NO_FIT: 'No fit',
  NO_PAIN: 'No pain',
  NO_BUDGET: 'No budget',
  NO_AUTHORITY: 'No authority',
  NO_TIMELINE: 'No timeline',
  COMPETITOR: 'Competitor',
}

export interface OppIn {
  id: string
  title: string
  company_name: string
  stage: number
  status: string
  value: number | null
  estimated_value: number | null
  currency: string | null
  sector: string | null
  assigned_to: string | null
  disqualification_reason: string | null
  stage_entered_at: string
  created_at: string
  updated_at: string
}
export interface EventIn { opportunity_id: string; type: string; title: string; occurred_at: string }
export interface ProfileIn { id: string; name: string; role: string; is_active: boolean }
export type Targets = Record<string, { amount: number; currency: string }>

// Quarterly sales targets, one per rep. They live as one JSON row in the
// existing admin_settings table ({ [userId]: { amount, currency } }), so no
// schema change is needed.
export const TARGETS_KEY = 'rep_targets'

export function parseTargets(raw: string | null | undefined): Targets {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    const out: Targets = {}
    for (const [id, t] of Object.entries(parsed ?? {})) {
      const v = t as { amount?: unknown; currency?: unknown }
      if (typeof v?.amount === 'number' && v.amount > 0 && typeof v.currency === 'string') {
        out[id] = { amount: v.amount, currency: v.currency }
      }
    }
    return out
  } catch {
    return {}
  }
}

export interface ConversionRow { stage: number; reached: number; won: number; rate: number; used: number; source: 'stage' | 'overall' }
export interface VelocityRow { stage: number; name: string; target: number; n: number; median: number | null; mean: number | null }
export interface GroupRow { key: string; open: number; won: number; lost: number; disqualified: number; winRate: number | null }
export interface RepRow extends GroupRow {
  id: string
  name: string
  avgCycleDays: number | null
  target: { amount: number; currency: string } | null
  wonThisQuarter: number
}
export interface LateDeal { id: string; title: string; company: string; stage: number; days: number; target: number; ratio: number; owner: string }
export interface CurrencyBlock {
  currency: string
  openCount: number
  pipeline: number
  weighted: number
  noValue: number
  byStage: { stage: number; count: number; value: number; weighted: number }[]
  projected: { month: string; count: number; weighted: number }[]
}

export interface AnalyticsData {
  generatedAt: string
  totals: { open: number; won: number; lost: number; disqualified: number; winRate: number | null }
  conversion: ConversionRow[]
  overallWinRate: number
  closedCount: number
  velocity: VelocityRow[]
  velocitySkipped: number
  heatmap: { stage: number; name: string; target: number; buckets: number[] }[]
  lateDeals: LateDeal[]
  disqReasons: { reason: string; label: string; count: number }[]
  sectors: GroupRow[]
  reps: RepRow[]
  currencies: string[]
  defaultCurrency: string
  byCurrency: Record<string, CurrencyBlock>
  quarterLabel: string
}

const isOpen = (s: string) => s === 'active' || s === 'stalled'
const isClosed = (s: string) => s === 'won' || s === 'lost' || s === 'disqualified'
const amountOf = (o: OppIn) => o.value ?? o.estimated_value ?? 0
const curOf = (o: OppIn) => o.currency || 'GHS'
const ms = (iso: string) => new Date(iso).getTime()

function median(xs: number[]): number | null {
  if (xs.length === 0) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const round1 = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10)

interface Visit { stage: number; start: number }

// Rebuild the stages a deal has been through from its logged "Moved to Stage N"
// activities. Deals start at stage 1 when created.
function timeline(opp: OppIn, events: EventIn[]): Visit[] {
  const moves = events
    .filter(e => e.type === 'stage_change')
    .map(e => ({ stage: Number(/Stage (\d)/.exec(e.title)?.[1]), start: ms(e.occurred_at) }))
    .filter(m => m.stage >= 1 && m.stage <= 7)
    .sort((a, b) => a.start - b.start)
  return [{ stage: 1, start: ms(opp.created_at) }, ...moves]
}

// When a closed deal was closed: the logged "marked as WON/LOST" or
// "Disqualified" activity, falling back to last-updated.
function closeTime(opp: OppIn, events: EventIn[]): number {
  const closes = events
    .filter(e => /^Deal marked as (WON|LOST)/i.test(e.title) || /^Disqualified:/i.test(e.title))
    .map(e => ms(e.occurred_at))
  return closes.length ? Math.max(...closes) : ms(opp.updated_at)
}

export function computeAnalytics(input: {
  opps: OppIn[]
  events: EventIn[]
  profiles: ProfileIn[]
  targets: Targets
  now?: number
}): AnalyticsData {
  const { opps, profiles, targets } = input
  const now = input.now ?? Date.now()

  const eventsByOpp = new Map<string, EventIn[]>()
  for (const e of input.events) {
    const list = eventsByOpp.get(e.opportunity_id)
    if (list) list.push(e); else eventsByOpp.set(e.opportunity_id, [e])
  }
  const ev = (id: string) => eventsByOpp.get(id) ?? []

  const open = opps.filter(o => isOpen(o.status))
  const closed = opps.filter(o => isClosed(o.status))
  const won = opps.filter(o => o.status === 'won')
  const lost = opps.filter(o => o.status === 'lost')
  const disq = opps.filter(o => o.status === 'disqualified')
  const rate = (w: number, l: number) => (w + l > 0 ? Math.round((w / (w + l)) * 100) : null)

  // ── Stage timelines → durations and highest stage reached ─────────────────
  const durations: Record<number, number[]> = Object.fromEntries(STAGES.map(s => [s, []]))
  const maxStage = new Map<string, number>()
  let velocitySkipped = 0

  for (const o of opps) {
    const visits = timeline(o, ev(o.id))
    maxStage.set(o.id, Math.max(o.stage, ...visits.map(v => v.stage)))

    // If the log doesn't end where the deal actually is, some moves were never
    // recorded (e.g. deals that predate the activity log): skip it rather than guess.
    if (visits[visits.length - 1].stage !== o.stage) { velocitySkipped++; continue }

    const closedAt = isClosed(o.status) ? closeTime(o, ev(o.id)) : null
    visits.forEach((v, i) => {
      const next = visits[i + 1]
      let end: number | null = null
      if (next && next.stage > v.stage) end = next.start
      else if (!next && o.status === 'won' && closedAt) end = closedAt
      if (end !== null && end >= v.start) durations[v.stage].push((end - v.start) / DAY)
    })
  }

  const velocity: VelocityRow[] = STAGES.map(s => ({
    stage: s,
    name: STAGE_META[s]?.name ?? `Stage ${s}`,
    target: STAGE_META[s]?.targetDays ?? 0,
    n: durations[s].length,
    median: round1(median(durations[s])),
    mean: round1(mean(durations[s])),
  }))
  // Typical days in a stage: what we've observed once there's enough data, else the target.
  const typical = (s: number) =>
    durations[s].length >= MIN_DURATION_SAMPLE ? (median(durations[s]) as number) : (STAGE_META[s]?.targetDays ?? 0)

  // ── Stage → chance of eventually winning ──────────────────────────────────
  const overallWinRate = closed.length ? won.length / closed.length : 0
  const conversion: ConversionRow[] = STAGES.map(s => {
    const reached = closed.filter(o => (maxStage.get(o.id) ?? 0) >= s)
    const w = reached.filter(o => o.status === 'won').length
    const enough = reached.length >= MIN_SAMPLE
    return {
      stage: s,
      reached: reached.length,
      won: w,
      rate: reached.length ? w / reached.length : 0,
      used: enough ? w / reached.length : overallWinRate,
      source: enough ? 'stage' : 'overall',
    }
  })
  const prob = (s: number) => conversion[s - 1]?.used ?? 0

  // ── Aging heatmap: time in current stage vs that stage's target ───────────
  const heat = STAGES.map(s => ({
    stage: s, name: STAGE_META[s]?.name ?? `Stage ${s}`, target: STAGE_META[s]?.targetDays ?? 0,
    buckets: [0, 0, 0, 0], // <50% of target, 50-100%, 100-200%, 200%+ (stalled)
  }))
  const nameOf = (id: string | null) => profiles.find(p => p.id === id)?.name ?? 'Unassigned'
  const late: LateDeal[] = []
  for (const o of open) {
    const target = STAGE_META[o.stage]?.targetDays
    if (!target) continue
    const days = (now - ms(o.stage_entered_at)) / DAY
    const ratio = days / target
    heat[o.stage - 1].buckets[ratio < 0.5 ? 0 : ratio < 1 ? 1 : ratio < 2 ? 2 : 3]++
    if (ratio >= 1) {
      late.push({ id: o.id, title: o.title, company: o.company_name, stage: o.stage, days: Math.floor(days), target, ratio, owner: nameOf(o.assigned_to) })
    }
  }
  late.sort((a, b) => b.ratio - a.ratio)

  // ── Win / loss breakdowns ─────────────────────────────────────────────────
  const group = (key: string, list: OppIn[]): GroupRow => {
    const w = list.filter(o => o.status === 'won').length
    const l = list.filter(o => o.status === 'lost').length
    return {
      key,
      open: list.filter(o => isOpen(o.status)).length,
      won: w, lost: l,
      disqualified: list.filter(o => o.status === 'disqualified').length,
      winRate: rate(w, l),
    }
  }
  const bySector = new Map<string, OppIn[]>()
  for (const o of opps) {
    const k = o.sector?.trim() || 'Unspecified'
    bySector.set(k, [...(bySector.get(k) ?? []), o])
  }
  const sectors = [...bySector].map(([k, l]) => group(k, l))
    .sort((a, b) => (b.won + b.lost + b.disqualified) - (a.won + a.lost + a.disqualified) || b.open - a.open)

  const disqReasons = Object.keys(DISQ_LABELS)
    .map(r => ({ reason: r, label: DISQ_LABELS[r], count: disq.filter(o => o.disqualification_reason === r).length }))
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count)
  const unknownReason = disq.filter(o => !o.disqualification_reason || !(o.disqualification_reason in DISQ_LABELS)).length
  if (unknownReason) disqReasons.push({ reason: 'UNKNOWN', label: 'No reason recorded', count: unknownReason })

  // ── Reps, with quarterly target progress ──────────────────────────────────
  const d = new Date(now)
  const qIndex = Math.floor(d.getUTCMonth() / 3)
  const quarterStart = Date.UTC(d.getUTCFullYear(), qIndex * 3, 1)
  const quarterLabel = `Q${qIndex + 1} ${d.getUTCFullYear()}`

  const repIds = new Set<string>(profiles.filter(p => p.is_active && p.role === 'bd_rep').map(p => p.id))
  for (const o of opps) if (o.assigned_to) repIds.add(o.assigned_to)
  const reps: RepRow[] = [...repIds].map(id => {
    const mine = opps.filter(o => o.assigned_to === id)
    const cycles = mine.filter(o => o.status === 'won').map(o => (closeTime(o, ev(o.id)) - ms(o.created_at)) / DAY).filter(x => x >= 0)
    const target = targets[id] ?? null
    const wonThisQuarter = target
      ? mine.filter(o => o.status === 'won' && curOf(o) === target.currency && closeTime(o, ev(o.id)) >= quarterStart)
          .reduce((sum, o) => sum + amountOf(o), 0)
      : 0
    return { ...group(id, mine), id, name: nameOf(id), avgCycleDays: round1(mean(cycles)), target, wonThisQuarter }
  }).sort((a, b) => (b.won + b.lost) - (a.won + a.lost) || b.open - a.open)

  // ── Forecast, per currency (no exchange rates, so currencies never mix) ───
  const currencySet = new Set<string>()
  for (const o of open) if (amountOf(o) > 0) currencySet.add(curOf(o))
  for (const t of Object.values(targets)) currencySet.add(t.currency)
  if (currencySet.size === 0) currencySet.add('GHS')
  const counts = new Map<string, number>()
  for (const o of open) counts.set(curOf(o), (counts.get(curOf(o)) ?? 0) + 1)
  const defaultCurrency = [...currencySet].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))[0]

  const byCurrency: Record<string, CurrencyBlock> = {}
  for (const c of currencySet) {
    const list = open.filter(o => curOf(o) === c)
    const priced = list.filter(o => amountOf(o) > 0)
    const monthly = new Map<string, { count: number; weighted: number }>()
    for (const o of priced) {
      // Projected finish: rest of the current stage plus the typical time in every later stage.
      const elapsed = (now - ms(o.stage_entered_at)) / DAY
      let remaining = Math.max(0, typical(o.stage) - elapsed)
      for (let s = o.stage + 1; s <= 7; s++) remaining += typical(s)
      const when = new Date(now + remaining * DAY)
      const month = `${when.getUTCFullYear()}-${String(when.getUTCMonth() + 1).padStart(2, '0')}`
      const cur = monthly.get(month) ?? { count: 0, weighted: 0 }
      cur.count++
      cur.weighted += amountOf(o) * prob(o.stage)
      monthly.set(month, cur)
    }
    byCurrency[c] = {
      currency: c,
      openCount: list.length,
      pipeline: priced.reduce((s, o) => s + amountOf(o), 0),
      weighted: priced.reduce((s, o) => s + amountOf(o) * prob(o.stage), 0),
      noValue: list.length - priced.length,
      byStage: STAGES.map(s => {
        const at = priced.filter(o => o.stage === s)
        const value = at.reduce((sum, o) => sum + amountOf(o), 0)
        return { stage: s, count: at.length, value, weighted: value * prob(s) }
      }),
      projected: [...monthly].sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({ month, ...v })),
    }
  }

  return {
    generatedAt: new Date(now).toISOString(),
    totals: { open: open.length, won: won.length, lost: lost.length, disqualified: disq.length, winRate: rate(won.length, lost.length) },
    conversion, overallWinRate, closedCount: closed.length,
    velocity, velocitySkipped,
    heatmap: heat, lateDeals: late.slice(0, 8),
    disqReasons, sectors, reps,
    currencies: [...currencySet], defaultCurrency, byCurrency, quarterLabel,
  }
}
