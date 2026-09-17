import { NextResponse } from 'next/server'
import { isCronRequest } from '@/lib/cron-auth'
import { syncOpportunitiesToHub } from '@/lib/hub-sync'

// Vercel Cron always invokes with GET (see lib/cron-auth.ts).
export async function GET(req: Request) {
  if (!isCronRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await syncOpportunitiesToHub()
    if (!result.delivery.ok) {
      console.error('[cron/hub-sync] Hub rejected the batch', result.delivery)
      return NextResponse.json(result, { status: 502 })
    }
    if (result.rejected.length > 0) {
      console.warn('[cron/hub-sync] some opportunities failed local validation', result.rejected)
    }
    return NextResponse.json(result)
  } catch (e) {
    console.error('[cron/hub-sync] sync failed', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// Manual trigger, same auth.
export async function POST(req: Request) {
  return GET(req)
}
