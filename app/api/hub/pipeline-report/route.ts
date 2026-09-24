import { NextResponse } from 'next/server'
import { signPayload, SIGNATURE_HEADERS, LIMITS } from '@krontiva/hub-contract'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { daysSinceStageEntry, isOverdue, isStalled } from '@/lib/utils'
import { STAGE_META } from '@/types'

// Krontiva Hub → Pipee: the pipeline per rep, in Pipee's own terms — so Hub
// shows what Pipee's dashboard shows instead of re-deriving it from pushed
// work items (where "stalled" is a status nothing ever sets, and "aging" is
// timed from updated_at rather than time in stage).
//
// Every number uses the rule Pipee's dashboard uses:
//   - active:  status 'active'                               (BDOLeaderboard, PipelineMetrics)
//   - stalled: active and isStalled(stage, stage_entered_at) (StalledDealsAlert, card badges)
//              — time in the current stage over 2× that stage's target
//   - won / lost / win rate: all-time, won ÷ (won + lost)    (BDOLeaderboard)
//   - overdue next actions: active with a next action dated before today (TeamActivityFeed)
// People: every active BD rep, including reps with no deals (as the
// leaderboard lists them), plus anyone else with deals assigned, plus an
// "Unassigned" row for deals with no rep.
//
// Authenticated with PIPEE_HUB_SECRET using the contract's HMAC scheme (Hub
// signs `timestamp + "." + raw_body`). POST so the signed string is the
// body. Body is `{}`.

const PIPEE_URL = process.env.PIPEE_PUBLIC_URL ?? 'https://pipee.vercel.app'

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

interface OppRow {
  id: string
  title: string
  company_name: string
  stage: number
  stage_entered_at: string
  status: 'active' | 'stalled' | 'won' | 'lost' | 'disqualified'
  assigned_to: string | null
  next_action: string | null
  next_action_date: string | null
}

interface ProfileRow {
  id: string
  name: string
  role: string
  is_active: boolean
}

interface RepStats {
  repId: string | null
  name: string
  active: number
  stalled: number
  won: number
  lost: number
  disqualified: number
  winRate: number
  overdueActions: number
}

export async function POST(req: Request) {
  const secret = process.env.PIPEE_HUB_SECRET
  if (!secret) return NextResponse.json({ error: 'Not configured' }, { status: 503 })

  const timestamp = req.headers.get(SIGNATURE_HEADERS.timestamp)
  const signature = req.headers.get(SIGNATURE_HEADERS.signature)
  if (!timestamp || !signature) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ts = parseInt(timestamp, 10)
  if (isNaN(ts) || Math.abs(Math.floor(Date.now() / 1000) - ts) > LIMITS.signatureSkewSeconds) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.text()
  if (!safeEqual(signature, await signPayload(secret, ts, body))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = supabaseAdmin()
  const [{ data: opps, error: oppError }, { data: profiles, error: profileError }] = await Promise.all([
    supabase
      .from('opportunities')
      .select('id, title, company_name, stage, stage_entered_at, status, assigned_to, next_action, next_action_date')
      .returns<OppRow[]>(),
    supabase.from('profiles').select('id, name, role, is_active').returns<ProfileRow[]>(),
  ])
  if (oppError || profileError) return NextResponse.json({ error: 'Failed to load pipeline' }, { status: 500 })

  const allOpps = opps ?? []
  const profileById = new Map((profiles ?? []).map(p => [p.id, p]))

  const repIds = new Set<string | null>()
  for (const p of profiles ?? []) if (p.role === 'bd_rep' && p.is_active) repIds.add(p.id)
  for (const o of allOpps) repIds.add(o.assigned_to)

  const stalledDeals: unknown[] = []
  const reps: RepStats[] = [...repIds].map(repId => {
    const mine = allOpps.filter(o => o.assigned_to === repId)
    const active = mine.filter(o => o.status === 'active')
    const stalled = active.filter(o => isStalled(o.stage, o.stage_entered_at))
    const won = mine.filter(o => o.status === 'won').length
    const lost = mine.filter(o => o.status === 'lost').length
    const name = repId === null ? 'Unassigned' : (profileById.get(repId)?.name ?? 'Unknown')

    for (const o of stalled) {
      const meta = STAGE_META[o.stage]
      stalledDeals.push({
        id: o.id,
        repId,
        repName: name,
        company: o.company_name,
        title: o.title,
        stage: o.stage,
        stageName: meta?.name ?? null,
        daysInStage: daysSinceStageEntry(o.stage_entered_at),
        stalledAfterDays: meta ? meta.targetDays * 2 : null,
        url: `${PIPEE_URL}/opportunities/${o.id}`,
      })
    }

    return {
      repId,
      name,
      active: active.length,
      stalled: stalled.length,
      won,
      lost,
      disqualified: mine.filter(o => o.status === 'disqualified').length,
      winRate: won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0,
      overdueActions: active.filter(o => o.next_action && o.next_action_date && isOverdue(o.next_action_date)).length,
    }
  })

  // Reps first by name, "Unassigned" last — and only if it has any deals.
  const people = reps
    .filter(r => r.repId !== null || r.active + r.won + r.lost + r.disqualified > 0)
    .sort((a, b) => Number(a.repId === null) - Number(b.repId === null) || a.name.localeCompare(b.name))

  const sum = (k: keyof RepStats) => people.reduce((s, r) => s + (r[k] as number), 0)
  const won = sum('won')
  const lost = sum('lost')

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      totals: {
        active: sum('active'),
        stalled: sum('stalled'),
        won,
        lost,
        disqualified: sum('disqualified'),
        winRate: won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0,
        overdueActions: sum('overdueActions'),
      },
      people,
      stalledDeals,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
