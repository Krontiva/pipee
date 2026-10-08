'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth-guards'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function inviteUser(formData: FormData) {
  const guard = await requireAdmin()
  if ('error' in guard) return { error: guard.error }

  const email = (formData.get('email') as string)?.trim()
  const name = (formData.get('name') as string)?.trim()
  const role = formData.get('role')
  const password = formData.get('password') as string

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Enter a valid email address.' }
  if (!name) return { error: 'Name is required.' }
  if (role !== 'admin' && role !== 'bd_rep') return { error: 'Invalid role.' }
  if (!password || password.length < 8) return { error: 'Password must be at least 8 characters.' }

  // Create auth user with a temporary password (user will reset via email)
  const adminClient = supabaseAdmin()

  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError) return { error: createError.message }

  const { error: profileError } = await adminClient.from('profiles').insert({
    id: newUser.user.id,
    name,
    role,
  })

  if (profileError) {
    // Don't leave a login with no profile behind.
    await adminClient.auth.admin.deleteUser(newUser.user.id)
    return { error: profileError.message }
  }

  revalidatePath('/admin')
  return { success: true }
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  const guard = await requireAdmin()
  if ('error' in guard) return { error: guard.error }
  if (userId === guard.user.id && !isActive) return { error: 'You cannot deactivate your own account.' }

  const { error } = await guard.supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', userId)
  if (error) return { error: error.message }

  // Also block the login itself, so an already-signed-in session stops working.
  const { error: banError } = await supabaseAdmin().auth.admin.updateUserById(userId, {
    ban_duration: isActive ? 'none' : '876000h',
  })
  if (banError) return { error: banError.message }

  revalidatePath('/admin')
  return { success: true }
}

export async function upsertSectorAction(formData: FormData): Promise<void> {
  const guard = await requireAdmin()
  if ('error' in guard) return
  const supabase = guard.supabase
  const id = formData.get('id') as string | null

  const sectorData = {
    name: formData.get('name') as string,
    description: formData.get('description') as string || null,
    icp_notes: formData.get('icp_notes') as string || null,
    is_priority: formData.get('is_priority') === 'true',
  }

  await (id
    ? supabase.from('sectors').update(sectorData).eq('id', id)
    : supabase.from('sectors').insert(sectorData))

  revalidatePath('/admin')
}
