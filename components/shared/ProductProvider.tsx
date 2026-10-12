'use client'

import { createContext, useContext, useMemo, useTransition } from 'react'
import { setCurrentProduct } from '@/lib/actions/products'
import type { Product } from '@/types'

interface ProductContextValue {
  products: Product[]
  currentId: string          // a product id, or 'all'
  currentProduct: Product | null
  // Set when a specific product is selected; null means "all products".
  productFilter: string | null
  switching: boolean
  switchProduct: (id: string) => void
  getProduct: (id: string | null | undefined) => Product | undefined
  // Admins only: whether a person may work on a product. Admins always may.
  isMember: (userId: string, productId: string) => boolean
}

const ProductContext = createContext<ProductContextValue | null>(null)

export interface Membership { product_id: string; user_id: string }

export function ProductProvider({
  products,
  currentId,
  memberships = [],
  children,
}: {
  products: Product[]
  currentId: string
  memberships?: Membership[]
  children: React.ReactNode
}) {
  const [switching, startTransition] = useTransition()

  const value = useMemo<ProductContextValue>(() => {
    const currentProduct = products.find(p => p.id === currentId) ?? null
    return {
      products,
      currentId,
      currentProduct,
      productFilter: currentProduct ? currentProduct.id : null,
      switching,
      switchProduct: id => {
        if (id === currentId) return
        startTransition(async () => { await setCurrentProduct(id) })
      },
      getProduct: id => products.find(p => p.id === id),
      isMember: (userId, productId) => memberships.some(m => m.user_id === userId && m.product_id === productId),
    }
  }, [products, currentId, memberships, switching])

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>
}

export function useProduct() {
  const ctx = useContext(ProductContext)
  if (!ctx) throw new Error('useProduct must be used inside <ProductProvider>')
  return ctx
}
