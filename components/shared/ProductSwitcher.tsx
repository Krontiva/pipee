'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProduct } from '@/components/shared/ProductProvider'

// Sidebar dropdown for choosing which product the app is showing.
export function ProductSwitcher({ collapsed }: { collapsed: boolean }) {
  const { products, currentId, currentProduct, switching, switchProduct } = useProduct()

  if (products.length === 0) {
    return collapsed ? null : (
      <p className="mx-3 mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        No products assigned yet. Ask an admin to give you access.
      </p>
    )
  }

  const dotColor = currentProduct?.color ?? '#94a3b8'

  if (collapsed) {
    return (
      <div className="px-2 pt-3 flex justify-center" title={currentProduct?.name ?? 'All products'}>
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: dotColor }} />
      </div>
    )
  }

  // One product: show its name, nothing to switch.
  if (products.length === 1) {
    return (
      <div className="mx-3 mt-3 flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-slate-50 border border-slate-200 rounded-lg">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
        <span className="truncate">{products[0].name}</span>
      </div>
    )
  }

  return (
    <div className="px-3 pt-3">
      <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 px-1">Product</label>
      <div className="relative">
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full pointer-events-none"
          style={{ backgroundColor: dotColor }}
        />
        <select
          value={currentId}
          onChange={e => switchProduct(e.target.value)}
          disabled={switching}
          className={cn(
            'w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-8 py-2 text-sm font-medium text-gray-700',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-60'
          )}
        >
          <option value="all">All products</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {switching && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
      </div>
    </div>
  )
}
