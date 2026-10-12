'use client'

import { useState, useTransition } from 'react'
import { Loader2, Pencil, Plus, X } from 'lucide-react'
import { createProduct, updateProduct } from '@/lib/actions/products'
import { CURRENCIES } from '@/types'
import type { Product } from '@/types'

const inputCls = 'w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500'

function ProductForm({ product, onDone }: { product?: Product; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = product ? await updateProduct(product.id, fd) : await createProduct(fd)
      if (result.error) setError(result.error)
      else onDone()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Name *</label>
          <input name="name" required defaultValue={product?.name} placeholder="e.g. Krongage" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Default currency</label>
          <select name="currency" defaultValue={product?.currency ?? 'GHS'} className={inputCls}>
            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.name}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Description</label>
          <input name="description" defaultValue={product?.description ?? ''} placeholder="One line about the product" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Colour</label>
          <input name="color" type="color" defaultValue={product?.color ?? '#2563eb'} className="h-9 w-16 bg-white border border-slate-200 rounded-lg p-1 cursor-pointer" />
        </div>
        {product && (
          <label className="flex items-center gap-2 text-sm text-gray-700 mt-5">
            <input
              type="checkbox"
              name="is_active"
              value="true"
              defaultChecked={product.is_active}
              className="rounded border-slate-300"
            />
            Active (new deals can be created)
          </label>
        )}
      </div>
      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex gap-3">
        <button type="button" onClick={onDone}
          className="flex-1 border border-slate-200 text-gray-500 hover:text-gray-800 text-sm py-2 rounded-lg transition-colors">Cancel</button>
        <button type="submit" disabled={isPending}
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
          {isPending ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : product ? 'Save changes' : 'Add product'}
        </button>
      </div>
    </form>
  )
}

export function ProductManagement({ products }: { products: Product[] }) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-gray-900 font-semibold">Products</h2>
          <p className="text-gray-400 text-sm">Everything Pipee tracks. Each product has its own deals and sectors.</p>
        </div>
        <button
          onClick={() => { setAdding(!adding); setEditingId(null) }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {adding ? <><X size={14} /> Close</> : <><Plus size={14} /> Add Product</>}
        </button>
      </div>

      {adding && <div className="mb-4"><ProductForm onDone={() => setAdding(false)} /></div>}

      <div className="space-y-2">
        {products.map(p => (
          editingId === p.id ? (
            <ProductForm key={p.id} product={p} onDone={() => setEditingId(null)} />
          ) : (
            <div key={p.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${p.is_active ? 'text-gray-800' : 'text-gray-400 line-through'}`}>{p.name}</p>
                {p.description && <p className="text-gray-400 text-xs truncate">{p.description}</p>}
              </div>
              <span className="text-xs text-gray-400">{p.currency}</span>
              {!p.is_active && <span className="text-xs text-gray-500 bg-slate-100 px-2 py-0.5 rounded-full">Off</span>}
              <button
                onClick={() => { setEditingId(p.id); setAdding(false) }}
                className="text-gray-400 hover:text-indigo-600 transition-colors"
                title="Edit product"
              >
                <Pencil size={14} />
              </button>
            </div>
          )
        ))}
        {products.length === 0 && (
          <div className="text-center py-6 text-gray-400 text-sm">No products yet. Run the multi-product migration first.</div>
        )}
      </div>
    </div>
  )
}
