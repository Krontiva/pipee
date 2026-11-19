import { NextResponse } from 'next/server'
import { isCronRequest } from '@/lib/cron-auth'
import { runNotifications } from '@/lib/notifications'

// Sends are paced for Resend's rate limit, so give the run room to finish.
export const maxDuration = 60

// Vercel Cron always invokes with GET (see lib/cron-auth.ts).
// Add ?dry=1 to see what would be sent without sending or recording anything.
export async function GET(req: Request) {
  if (!isCronRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const dryRun = new URL(req.url).searchParams.get('dry') === '1'
  try {
    return NextResponse.json(await runNotifications({ dryRun }))
  } catch (e) {
    console.error('[cron/notifications] failed', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// Manual trigger, same auth.
export async function POST(req: Request) {
  return GET(req)
}
