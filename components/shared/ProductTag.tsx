'use client'

import { cn } from '@/lib/utils'
import { useProduct } from '@/components/shared/ProductProvider'

// Small coloured pill naming a deal's product. Hidden when the person only has
// one product, since it would add noise without telling them anything.
export function ProductTag({ productId, className }: { productId: string | null | undefined; className?: string }) {
  const { products, getProduct } = useProduct()
  const product = getProduct(productId)
  if (!product || products.length < 2) return null

  return (
    <span
      className={cn('inline-flex items-center gap-1 text-[10px] font-medium text-gray-600 bg-slate-100 border border-slate-200 rounded-full px-1.5 py-0.5', className)}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: product.color }} />
      {product.name}
    </span>
  )
}
