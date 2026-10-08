import { createClient } from '@/lib/supabase/server'

// Shared server-side checks for server actions. Never rely on the UI hiding a
// button — every action that changes data must call one of these first.

export async function requireActiveUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, is_active')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Not authenticated' as const }
  if (!profile.is_active) return { error: 'Your account has been deactivated.' as const }

  return { supabase, user, profile }
}

export async function requireAdmin() {
  const ctx = await requireActiveUser()
  if ('error' in ctx) return ctx
  if (ctx.profile.role !== 'admin') return { error: 'Unauthorized: admin only.' as const }
  return ctx
}
