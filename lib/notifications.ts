import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendEmail, escapeHtml } from '@/lib/email'
import { STAGE_META } from '@/types'
import { activeBlocker, isOverdue, isStalled } from '@/lib/utils'
import type { BlockerKey } from '@/types'

const DAY = 86_400_000
// Rep digest warns about deals that will cross the stalled line within this many days.
const WARN_DAYS = 3
// Admin alert covers deals that stalled within this window. Longer than the
// 1-day cron interval so one missed run doesn't lose an alert, short enough
// that deploying this feature doesn't dump every already-stalled deal on admins.
const ALERT_WINDOW_DAYS = 2
// Resend's default limit is 2 requests/second.
const SEND_GAP_MS = 600

const BASE_URL = process.env.PIPEE_PUBLIC_URL ?? 'https://pipee.vercel.app'

interface OppRow {
  id: string
  title: string
  company_name: string
  stage: number
  stage_entered_at: string
  assigned_to: string | null
  next_action: string | null
  next_action_date: string | null
  blocker: BlockerKey | null
  blocker_label: string | null
  blocker_set_at: string | null
  products: { name: string } | { name: string }[] | null
}

interface ProfileRow {
  id: string
  name: string
  role: 'admin' | 'bd_rep'
}

// Which stalled spells admins have already been told about, so a deal that
// stays stalled for weeks alerts once. Kept as one JSON row in the existing
// admin_settings table ({ [opportunityId]: stage_entered_at }) — a "spell" is
// one continuous stay in a stage, so a deal that moves and stalls again later
// alerts again. No schema change needed.
const SENT_KEY = 'notif_deal_stalled_sent'

// Same rule as isStalled(): time in stage over 2x the stage target.
function stalledAt(stage: number, enteredAt: string): number {
  return new Date(enteredAt).getTime() + (STAGE_META[stage]?.targetDays ?? 0) * 2 * DAY
}

function productName(o: OppRow): string {
  const p = Array.isArray(o.products) ? o.products[0] : o.products
  return p?.name ?? ''
}

interface DigestItem { opp: OppRow; detail: string }
interface Digest { overdue: DigestItem[]; stalled: DigestItem[]; soon: DigestItem[] }

function buildDigest(opps: OppRow[], now: number): Digest {
  const d: Digest = { overdue: [], stalled: [], soon: [] }
  for (const o of opps) {
    if (o.next_action_date && isOverdue(o.next_action_date)) {
      const days = Math.floor((now - new Date(o.next_action_date).getTime()) / DAY)
      d.overdue.push({
        opp: o,
        detail: `${o.next_action || 'Next action'} — due ${days <= 0 ? 'today' : `${days} day${days === 1 ? '' : 's'} ago`}`,
      })
    }
    if (isStalled(o.stage, o.stage_entered_at)) {
      const b = activeBlocker(o)
      d.stalled.push({
        opp: o,
        detail: b ? `Stalled — blocker: ${b.label}` : 'Stalled — no blocker recorded yet',
      })
    } else {
      const until = stalledAt(o.stage, o.stage_entered_at) - now
      if (until <= WARN_DAYS * DAY) {
        const days = Math.max(1, Math.ceil(until / DAY))
        d.soon.push({
          opp: o,
          detail: `Stalls in ${days} day${days === 1 ? '' : 's'} (${STAGE_META[o.stage]?.name ?? `Stage ${o.stage}`})`,
        })
      }
    }
  }
  return d
}

const total = (d: Digest) => d.overdue.length + d.stalled.length + d.soon.length

function row(item: DigestItem): string {
  const prod = productName(item.opp)
  return (
    `<li style="margin:0 0 8px"><a href="${BASE_URL}/opportunities/${item.opp.id}" style="color:#4f46e5;font-weight:600;text-decoration:none">${escapeHtml(item.opp.company_name)}</a>` +
    `${prod ? ` <span style="color:#94a3b8">· ${escapeHtml(prod)}</span>` : ''}<br><span style="color:#475569">${escapeHtml(item.detail)}</span></li>`
  )
}

// `title` is trusted markup: callers escape anything user-supplied.
function section(title: string, items: DigestItem[]): string {
  if (items.length === 0) return ''
  return `<h3 style="margin:20px 0 8px;font-size:14px;color:#0f172a">${title} (${items.length})</h3><ul style="padding-left:18px;margin:0">${items.map(row).join('')}</ul>`
}

const wrap = (inner: string) =>
  `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:14px;color:#0f172a;max-width:560px">${inner}` +
  `<p style="margin-top:28px;font-size:12px;color:#94a3b8">You can turn these emails off in Pipee, using the bell icon next to your name in the sidebar.</p></div>`

function digestHtml(name: string, d: Digest): string {
  return wrap(
    `<p>Hi ${escapeHtml(name.split(' ')[0] || 'there')}, here's what needs your attention in Pipee today.</p>` +
      section('Overdue next actions', d.overdue) +
      section('Stalled deals', d.stalled) +
      section('Stalling soon', d.soon) +
      `<p style="margin-top:20px"><a href="${BASE_URL}/dashboard" style="color:#4f46e5">Open Pipee</a></p>`
  )
}

function adminAlertHtml(groups: { owner: string; items: DigestItem[] }[]): string {
  return wrap(
    `<p>These deals have just crossed the stalled threshold (twice their stage's target time).</p>` +
      groups.map(g => section(escapeHtml(g.owner), g.items)).join('') +
      `<p style="margin-top:20px"><a href="${BASE_URL}/dashboard" style="color:#4f46e5">Open Pipee</a></p>`
  )
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export interface NotificationResult {
  dryRun: boolean
  digests: { sent: number; skippedEmpty: number; skippedNoEmail: number; failed: number }
  adminAlert: { newlyStalled: number; recipients: number; failed: number }
  plan?: { digests: Record<string, number>; newlyStalled: string[] }
}

export async function runNotifications(opts: { dryRun?: boolean } = {}): Promise<NotificationResult> {
  const dryRun = !!opts.dryRun
  const supabase = supabaseAdmin()
  const now = Date.now()

  const [{ data: opps, error: oppErr }, { data: profiles, error: profErr }] = await Promise.all([
    supabase
      .from('opportunities')
      .select('id, title, company_name, stage, stage_entered_at, assigned_to, next_action, next_action_date, blocker, blocker_label, blocker_set_at, products(name)')
      .eq('status', 'active')
      .returns<OppRow[]>(),
    supabase
      .from('profiles')
      .select('id, name, role')
      .eq('is_active', true)
      .returns<ProfileRow[]>(),
  ])
  if (oppErr) throw new Error(`opportunities: ${oppErr.message}`)
  if (profErr) throw new Error(`profiles: ${profErr.message}`)

  // Emails and the opt-out preference live in Supabase Auth (user_metadata),
  // not in profiles. Anything other than an explicit `false` means opted in.
  const emails = new Map<string, string>()
  const optedOut = new Set<string>()
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`auth users: ${error.message}`)
    for (const u of data.users) {
      if (u.email) emails.set(u.id, u.email)
      if (u.user_metadata?.email_notifications === false) optedOut.add(u.id)
    }
    if (data.users.length < 1000) break
  }

  const result: NotificationResult = {
    dryRun,
    digests: { sent: 0, skippedEmpty: 0, skippedNoEmail: 0, failed: 0 },
    adminAlert: { newlyStalled: 0, recipients: 0, failed: 0 },
    ...(dryRun ? { plan: { digests: {}, newlyStalled: [] } } : {}),
  }

  // ── 1. Daily digest per rep ────────────────────────────────────────────────
  for (const p of profiles ?? []) {
    if (optedOut.has(p.id)) continue
    const mine = (opps ?? []).filter(o => o.assigned_to === p.id)
    const digest = buildDigest(mine, now)
    const n = total(digest)
    if (n === 0) { result.digests.skippedEmpty++; continue }
    const to = emails.get(p.id)
    if (!to) { result.digests.skippedNoEmail++; continue }

    if (dryRun) {
      result.plan!.digests[p.name] = n
      result.digests.sent++
      continue
    }
    try {
      await sendEmail({
        to,
        subject: `Pipee: ${n} deal item${n === 1 ? '' : 's'} need${n === 1 ? 's' : ''} your attention`,
        html: digestHtml(p.name, digest),
      })
      result.digests.sent++
    } catch (e) {
      console.error('[notifications] digest failed for', p.id, e)
      result.digests.failed++
    }
    await sleep(SEND_GAP_MS)
  }

  // ── 2. Admin alert: deals that just stalled (once per stalled spell) ───────
  const recent = (opps ?? []).filter(o => {
    const at = stalledAt(o.stage, o.stage_entered_at)
    return at <= now && at >= now - ALERT_WINDOW_DAYS * DAY
  })
  if (recent.length === 0) return result

  const admins = (profiles ?? []).filter(p => p.role === 'admin' && !optedOut.has(p.id) && emails.has(p.id))

  const { data: sentRow } = await supabase.from('admin_settings').select('value').eq('key', SENT_KEY).maybeSingle()
  let sent: Record<string, string> = {}
  try { sent = sentRow?.value ? JSON.parse(sentRow.value) : {} } catch { sent = {} }

  const wasSent = (o: OppRow) => sent[o.id] && new Date(sent[o.id]).getTime() === new Date(o.stage_entered_at).getTime()
  const fresh: OppRow[] = recent.filter(o => !wasSent(o))

  if (dryRun) {
    result.plan!.newlyStalled = fresh.map(o => o.company_name)
    result.adminAlert.newlyStalled = fresh.length
    result.adminAlert.recipients = fresh.length ? admins.length : 0
    return result
  }

  // Record before sending, so overlapping runs can't announce the same deal
  // twice. Entries for deals that are no longer active are dropped so the row
  // doesn't grow forever.
  const activeIds = new Set((opps ?? []).map(o => o.id))
  const saveSent = async (map: Record<string, string>) => {
    const pruned = Object.fromEntries(Object.entries(map).filter(([id]) => activeIds.has(id)))
    const { error } = await supabase
      .from('admin_settings')
      .upsert({ key: SENT_KEY, value: JSON.stringify(pruned), updated_at: new Date().toISOString() })
    if (error) throw new Error(`admin_settings: ${error.message}`)
  }
  if (fresh.length > 0) {
    await saveSent({ ...sent, ...Object.fromEntries(fresh.map(o => [o.id, o.stage_entered_at])) })
  }

  result.adminAlert.newlyStalled = fresh.length
  if (fresh.length === 0) return result

  const ownerName = (id: string | null) => (profiles ?? []).find(p => p.id === id)?.name ?? 'Unassigned'
  const groups = new Map<string, DigestItem[]>()
  for (const o of fresh) {
    const key = ownerName(o.assigned_to)
    const b = activeBlocker(o)
    const list = groups.get(key) ?? []
    list.push({ opp: o, detail: b ? `Blocker: ${b.label}` : 'No blocker recorded yet' })
    groups.set(key, list)
  }
  const html = adminAlertHtml([...groups].map(([owner, items]) => ({ owner, items })))
  const subject = `Pipee: ${fresh.length} deal${fresh.length === 1 ? ' has' : 's have'} stalled`

  let delivered = 0
  for (const a of admins) {
    try {
      await sendEmail({ to: emails.get(a.id)!, subject, html })
      delivered++
    } catch (e) {
      console.error('[notifications] admin alert failed for', a.id, e)
      result.adminAlert.failed++
    }
    await sleep(SEND_GAP_MS)
  }
  result.adminAlert.recipients = delivered

  // Nobody received it: release the record so the next run retries.
  if (delivered === 0) await saveSent(sent)
  return result
}
