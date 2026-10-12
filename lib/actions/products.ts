'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { requireActiveUser, requireAdmin } from '@/lib/auth-guards'
import { PRODUCT_COOKIE, ALL_PRODUCTS } from '@/lib/products'

const HEX = /^#[0-9a-fA-F]{6}$/

export async function setCurrentProduct(productId: string) {
  const guard = await requireActiveUser()
  if ('error' in guard) return { error: guard.error }

  if (productId !== ALL_PRODUCTS) {
    // RLS only returns products this person can access.
    const { data } = await guard.supabase.from('products').select('id').eq('id', productId).maybeSingle()
    if (!data) return { error: 'You do not have access to that product.' }
  }

  ;(await cookies()).set(PRODUCT_COOKIE, productId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  revalidatePath('/', 'layout')
  return { success: true }
}

function readProductFields(formData: FormData) {
  const name = (formData.get('name') as string | null)?.trim()
  const color = (formData.get('color') as string | null)?.trim() || '#2563eb'
  const currency = (formData.get('currency') as string | null)?.trim() || 'GHS'
  const description = (formData.get('description') as string | null)?.trim() || null
  if (!name) return { error: 'Product name is required.' as const }
  if (!HEX.test(color)) return { error: 'Pick a valid colour.' as const }
  return { name, color, currency, description }
}

export async function createProduct(formData: FormData) {
  const guard = await requireAdmin()
  if ('error' in guard) return { error: guard.error }

  const fields = readProductFields(formData)
  if ('error' in fields) return { error: fields.error }

  const code = fields.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  if (!code) return { error: 'Product name must contain letters or numbers.' }

  const { error } = await guard.supabase.from('products').insert({ ...fields, code })
  if (error) {
    return { error: error.code === '23505' ? 'A product with that name already exists.' : error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function updateProduct(productId: string, formData: FormData) {
  const guard = await requireAdmin()
  if ('error' in guard) return { error: guard.error }

  const fields = readProductFields(formData)
  if ('error' in fields) return { error: fields.error }

  const { error } = await guard.supabase
    .from('products')
    .update({ ...fields, is_active: formData.get('is_active') === 'true' })
    .eq('id', productId)
  if (error) {
    return { error: error.code === '23505' ? 'A product with that name already exists.' : error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

// Replace the list of products a person can work on.
export async function setUserProducts(userId: string, productIds: string[]) {
  const guard = await requireAdmin()
  if ('error' in guard) return { error: guard.error }
  const { supabase } = guard

  const { data: existing, error: readError } = await supabase
    .from('product_members')
    .select('product_id')
    .eq('user_id', userId)
  if (readError) return { error: readError.message }

  const current = new Set((existing ?? []).map(r => r.product_id as string))
  const wanted = new Set(productIds)
  const toAdd = [...wanted].filter(id => !current.has(id))
  const toRemove = [...current].filter(id => !wanted.has(id))

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from('product_members')
      .insert(toAdd.map(product_id => ({ product_id, user_id: userId })))
    if (error) return { error: error.message }
  }
  if (toRemove.length > 0) {
    const { error } = await supabase
      .from('product_members')
      .delete()
      .eq('user_id', userId)
      .in('product_id', toRemove)
    if (error) return { error: error.message }
  }

  revalidatePath('/admin')
  return { success: true }
}
