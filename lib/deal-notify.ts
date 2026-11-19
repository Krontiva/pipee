import { after } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendEmail, escapeHtml } from '@/lib/email'

// Emails about one deal: the people watching it, its owner, and anyone named
// directly (a mention, or a reassignment). Sent after the response, so the
// person making the change never waits on email, and a failure is logged, not shown.
//
// Only people who can open the deal are ever emailed — its owner and admins —
// because the database hides a deal from everyone else. Nobody is emailed about
// their own action, and anyone who turned emails off (the bell in the sidebar)
// is skipped.

const BASE_URL = process.env.PIPEE_PUBLIC_URL ?? 'https://pipee.vercel.app'
// Resend's default limit is 2 requests/second.
const SEND_GAP_MS = 600

export interface DealNotice {
  opportunityId: string
  /** The person who made the change. Never emailed about it. */
  actorId: string
  /** Completes the sentence "<actor> ...", e.g. "moved this deal to Stage 3". */
  what: string
  /** Optional extra lines shown under the headline (escaped here). */
  detail?: string[]
  /** Also email these people (if they can see the deal), e.g. the new owner or a mentioned person. */
  alsoNotify?: string[]
  /** Email only `alsoNotify`, not the owner and watchers (used for mentions). */
  onlyAlsoNotify?: boolean
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export function scheduleDealNotice(notice: DealNotice) {
  after(() => sendDealNotice(notice).catch(e => console.error('[deal-notify] failed', notice.opportunityId, e)))
}

async function sendDealNotice(n: DealNotice) {
  const supabase = supabaseAdmin()

  const [{ data: opp }, { data: profiles }] = await Promise.all([
    supabase.from('opportunities').select('id, company_name, title, assigned_to').eq('id', n.opportunityId).maybeSingle(),
    supabase.from('profiles').select('id, name, role').eq('is_active', true),
  ])
  if (!opp) return

  const actor = profiles?.find(p => p.id === n.actorId)?.name ?? 'Someone'
  const canSee = new Set((profiles ?? []).filter(p => p.role === 'admin' || p.id === opp.assigned_to).map(p => p.id))

  // Emails, the opt-out flag and each person's watch list live in Supabase Auth metadata.
  const emails = new Map<string, string>()
  const optedOut = new Set<string>()
  const watchers = new Set<string>()
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(error.message)
    for (const u of data.users) {
      if (u.email) emails.set(u.id, u.email)
      if (u.user_metadata?.email_notifications === false) optedOut.add(u.id)
      const watching = u.user_metadata?.watching
      if (Array.isArray(watching) && watching.includes(n.opportunityId)) watchers.add(u.id)
    }
    if (data.users.length < 1000) break
  }

  const wanted = new Set<string>(n.alsoNotify ?? [])
  if (!n.onlyAlsoNotify) {
    if (opp.assigned_to) wanted.add(opp.assigned_to)
    watchers.forEach(id => wanted.add(id))
  }
  const to = [...wanted].filter(id => id !== n.actorId && canSee.has(id) && !optedOut.has(id) && emails.has(id))
  if (to.length === 0) return

  const html =
    `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:14px;color:#0f172a;max-width:560px">` +
    `<p><strong>${escapeHtml(actor)}</strong> ${escapeHtml(n.what)} on <a href="${BASE_URL}/opportunities/${opp.id}" style="color:#4f46e5;font-weight:600;text-decoration:none">${escapeHtml(opp.company_name)}</a>.</p>` +
    (n.detail?.length
      ? `<div style="border-left:3px solid #e2e8f0;padding-left:12px;color:#475569">${n.detail.map(d => `<p style="margin:4px 0">${escapeHtml(d)}</p>`).join('')}</div>`
      : '') +
    `<p style="margin-top:20px"><a href="${BASE_URL}/opportunities/${opp.id}" style="color:#4f46e5">Open the deal</a></p>` +
    `<p style="margin-top:28px;font-size:12px;color:#94a3b8">You get this because you own or watch this deal, or were named in it. Turn emails off with the bell icon in the Pipee sidebar.</p></div>`

  const subject = `Pipee: ${actor} ${n.what} — ${opp.company_name}`

  for (const id of to) {
    try {
      await sendEmail({ to: emails.get(id)!, subject, html })
    } catch (e) {
      console.error('[deal-notify] send failed for', id, e)
    }
    await sleep(SEND_GAP_MS)
  }
}
