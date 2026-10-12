import { cookies } from 'next/headers'
import type { Product } from '@/types'

// Which product the user is currently looking at. Stored in a cookie so server
// pages and client components agree. 'all' means every product they can access.
export const PRODUCT_COOKIE = 'pipee_product'
export const ALL_PRODUCTS = 'all'

// RLS already limits `products` to the ones this person may use, so whatever
// comes back is safe to offer in the switcher.
export async function getProductContext(supabase: {
  from: (table: string) => any // eslint-disable-line @typescript-eslint/no-explicit-any
}) {
  const { data } = await supabase.from('products').select('*').eq('is_active', true).order('name')
  const products = (data ?? []) as Product[]

  const stored = (await cookies()).get(PRODUCT_COOKIE)?.value
  let currentId = ALL_PRODUCTS
  if (products.length === 1) currentId = products[0].id
  else if (stored && products.some(p => p.id === stored)) currentId = stored

  // Null means "don't filter by product".
  const productFilter = currentId === ALL_PRODUCTS ? null : currentId
  return { products, currentId, productFilter }
}
