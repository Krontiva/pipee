'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Search, Loader2 } from 'lucide-react'
import { createOpportunity } from '@/lib/actions/opportunities'
import { useProduct } from '@/components/shared/ProductProvider'
import { CURRENCIES } from '@/types'
import type { Profile, Sector } from '@/types'

interface TopNavProps {
  title: string
  profile: Profile
  sectors?: Sector[]
  profiles?: Profile[]
}

export function TopNav({ title, profile, sectors = [], profiles = [] }: TopNavProps) {
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { products, currentProduct, isMember } = useProduct()
  // Start on the product being viewed (or the first one when viewing all).
  const [chosenProductId, setChosenProductId] = useState<string | null>(null)
  const productId = chosenProductId ?? currentProduct?.id ?? products[0]?.id ?? ''
  const productSectors = sectors.filter(s => s.product_id === productId)
  const assignable = profiles.filter(p => p.is_active && (p.role === 'admin' || isMember(p.id, productId)))

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createOpportunity(fd)
      if (result.error) {
        setError(result.error)
      } else {
        setShowModal(false)
        router.push(`/opportunities/${result.data?.id}`)
      }
    })
  }

  const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <>
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0">
        <h1 className="text-gray-900 font-semibold text-lg">{title}</h1>
        <div className="flex items-center gap-3">
          {/* Search trigger */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('command-palette:open'))}
            className="flex items-center gap-2 text-sm text-gray-400 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg px-3 py-2 transition-colors"
          >
            <Search size={13} />
            <span className="hidden sm:inline pr-8">Search…</span>
            <span className="hidden sm:flex items-center gap-0.5 text-[10px] text-gray-300 ml-1">
              <kbd className="bg-white border border-slate-200 rounded px-1 py-0.5 font-sans">⌘</kbd>
              <kbd className="bg-white border border-slate-200 rounded px-1 py-0.5 font-sans">K</kbd>
            </span>
          </button>

          <button
            onClick={() => { setChosenProductId(null); setShowModal(true) }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={15} />
            New Deal
          </button>
        </div>
      </header>

      {/* New Deal Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
              <h2 className="text-gray-900 font-semibold">New Opportunity</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {products.length > 0 && (
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Product *</label>
                    <select
                      name="product_id"
                      required
                      value={productId}
                      onChange={e => setChosenProductId(e.target.value)}
                      className={inputCls}
                    >
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Deal Title *</label>
                  <input name="title" required placeholder="e.g. Ecobank Customer Engagement Platform" className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Company *</label>
                  <input name="company_name" required placeholder="Company name" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Sector</label>
                  <select name="sector" className={inputCls}>
                    <option value="">Select sector</option>
                    {productSectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
                  <select key={productId} name="currency" defaultValue={products.find(p => p.id === productId)?.currency ?? 'GHS'} className={inputCls}>
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.symbol} {c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Estimated Value <span className="text-amber-500 font-normal">(if uncertain)</span>
                  </label>
                  <input name="estimated_value" type="number" min="0" placeholder="Rough estimate" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Confirmed Value <span className="text-green-600 font-normal">(optional)</span>
                  </label>
                  <input name="value" type="number" min="0" placeholder="Agreed amount" className={inputCls} />
                </div>
                {profile.role === 'admin' && assignable.length > 0 && (
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Assign to</label>
                    <select name="assigned_to" className={inputCls}>
                      <option value="">Assign to me</option>
                      {assignable.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Next Action</label>
                  <input name="next_action" placeholder="e.g. Send intro email" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Action Date</label>
                  <input name="next_action_date" type="date" className={inputCls} />
                </div>
              </div>

              {/* Primary Contact */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Primary Contact</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                    <input name="contact_name" placeholder="e.g. Ama Owusu" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Job Title</label>
                    <input name="contact_title" placeholder="e.g. Head of Operations" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                    <select name="contact_role" className={inputCls}>
                      <option value="stakeholder">Stakeholder</option>
                      <option value="champion">Champion</option>
                      <option value="economic_buyer">Economic Buyer</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                    <input name="contact_email" type="email" placeholder="ama@company.com" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                    <input name="contact_phone" type="tel" placeholder="+233 XX XXX XXXX" className={inputCls} />
                  </div>
                </div>
              </div>
              {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-slate-200 text-gray-500 hover:text-gray-800 text-sm font-medium py-2 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isPending}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                  {isPending ? <><Loader2 size={13} className="animate-spin" /> Creating…</> : 'Create Deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
