'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveUser } from '@/lib/auth-guards'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Turn the daily digest / stall alert emails on or off for the signed-in user.
// Stored in their Supabase Auth user_metadata, so no database schema is involved.
export async function setEmailNotifications(enabled: boolean): Promise<{ error?: string }> {
  const ctx = await requireActiveUser()
  if ('error' in ctx) return { error: ctx.error }

  // Merge into existing metadata rather than replacing it.
  const { error } = await supabaseAdmin().auth.admin.updateUserById(ctx.user.id, {
    user_metadata: { ...ctx.user.user_metadata, email_notifications: enabled },
  })
  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return {}
}
