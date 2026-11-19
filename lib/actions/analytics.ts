'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth-guards'
import { CURRENCIES } from '@/types'
import { parseTargets, TARGETS_KEY } from '@/lib/analytics'

// Admin-only. An amount of 0 (or empty) clears the rep's target.
export async function setRepTarget(userId: string, amount: number, currency: string): Promise<{ error?: string }> {
  const guard = await requireAdmin()
  if ('error' in guard) return { error: guard.error }
  const { supabase } = guard

  if (!userId) return { error: 'Missing rep.' }
  if (!Number.isFinite(amount) || amount < 0) return { error: 'Enter a valid amount.' }
  if (!CURRENCIES.some(c => c.code === currency)) return { error: 'Unknown currency.' }

  const { data: row } = await supabase.from('admin_settings').select('value').eq('key', TARGETS_KEY).maybeSingle()
  const targets = parseTargets(row?.value)

  if (amount === 0) delete targets[userId]
  else targets[userId] = { amount, currency }

  const { error } = await supabase
    .from('admin_settings')
    .upsert({ key: TARGETS_KEY, value: JSON.stringify(targets), updated_at: new Date().toISOString() })
  if (error) return { error: error.message }

  revalidatePath('/analytics')
  return {}
}
