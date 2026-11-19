'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveUser } from '@/lib/auth-guards'
import { supabaseAdmin } from '@/lib/supabase/admin'

const MAX_WATCHED = 500

// Watch or unwatch a deal: watchers get an email when someone else changes it.
// The list is kept in the person's own Supabase Auth metadata, so no database
// schema is involved.
export async function toggleWatchDeal(opportunityId: string): Promise<{ watching?: boolean; error?: string }> {
  const ctx = await requireActiveUser()
  if ('error' in ctx) return { error: ctx.error }

  // Only someone who can open the deal may watch it (the database hides it otherwise).
  const { data: opp } = await ctx.supabase.from('opportunities').select('id').eq('id', opportunityId).maybeSingle()
  if (!opp) return { error: 'You do not have access to this deal.' }

  const current: string[] = Array.isArray(ctx.user.user_metadata?.watching) ? ctx.user.user_metadata.watching : []
  const watching = !current.includes(opportunityId)
  const next = watching ? [...current, opportunityId].slice(-MAX_WATCHED) : current.filter(id => id !== opportunityId)

  const { error } = await supabaseAdmin().auth.admin.updateUserById(ctx.user.id, {
    user_metadata: { ...ctx.user.user_metadata, watching: next },
  })
  if (error) return { error: error.message }

  revalidatePath(`/opportunities/${opportunityId}`)
  return { watching }
}
