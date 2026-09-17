/**
 * Scheduler authentication for /api/cron/* routes.
 *
 * Two conventions are accepted (mirrors the Hub repo's lib/cron-auth.ts):
 *
 *   Authorization: Bearer <CRON_SECRET>   — what Vercel Cron sends automatically
 *                                           when CRON_SECRET is set on the project
 *   X-Cron-Secret: <CRON_SECRET>          — for manual triggers, since Vercel's
 *                                           cron UI cannot set custom headers
 */

// Length-independent comparison, so the secret cannot be probed by timing.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export function isCronRequest(req: Request): boolean {
  const expected = process.env.CRON_SECRET
  // Refuse rather than allow when unconfigured — an unset secret must not
  // make scheduled endpoints public.
  if (!expected) return false

  const bearer = req.headers.get('authorization')
  if (bearer?.startsWith('Bearer ') && safeEqual(bearer.slice(7), expected)) return true

  const header = req.headers.get('x-cron-secret')
  if (header && safeEqual(header, expected)) return true

  return false
}
