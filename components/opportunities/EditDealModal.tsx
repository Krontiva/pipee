'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2, Save } from 'lucide-react'
import { updateOpportunity } from '@/lib/actions/opportunities'
import { useProduct } from '@/components/shared/ProductProvider'
import { CURRENCIES, STAGE_META } from '@/types'
import type { Opportunity, Profile, Sector } from '@/types'

interface EditDealModalProps {
  opportunity: Opportunity
  profiles: Profile[]
  sectors: Sector[]
  currentUserRole: string
  onClose: () => void
}

const inp = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500'
const lbl = 'block text-xs font-medium text-gray-600 mb-1'

export function EditDealModal({ opportunity, profiles, sectors, currentUserRole, onClose }: EditDealModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const { isMember } = useProduct()
  const productSectors = sectors.filter(s => s.product_id === opportunity.product_id)
  const assignable = profiles.filter(p => p.is_active && (p.role === 'admin' || isMember(p.id, opportunity.product_id)))

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)

    const updates: Record<string, unknown> = {
      title:           fd.get('title'),
      company_name:    fd.get('company_name'),
      sector:          fd.get('sector') || null,
      website:         fd.get('website') || null,
      value:           fd.get('value') ? Number(fd.get('value')) : null,
      estimated_value: fd.get('estimated_value') ? Number(fd.get('estimated_value')) : null,
      currency:        fd.get('currency'),
      notes:           fd.get('notes') || null,
    }
    if (currentUserRole === 'admin') {
      updates.assigned_to = fd.get('assigned_to') || null
    }

    startTransition(async () => {
      const result = await updateOpportunity(opportunity.id, updates)
      if (result.error) {
        setError(result.error)
      } else {
        router.refresh()
        onClose()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-gray-900 font-semibold">Edit Deal</h2>
            <p className="text-xs text-gray-400 mt-0.5">{opportunity.company_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Title */}
            <div className="col-span-2">
              <label className={lbl}>Deal Title *</label>
              <input name="title" required defaultValue={opportunity.title} className={inp} />
            </div>

            {/* Company */}
            <div className="col-span-2">
              <label className={lbl}>Company *</label>
              <input name="company_name" required defaultValue={opportunity.company_name} className={inp} />
            </div>

            {/* Website */}
            <div className="col-span-2">
              <label className={lbl}>Website</label>
              <input name="website" type="url" defaultValue={opportunity.website ?? ''} placeholder="https://" className={inp} />
            </div>

            {/* Sector */}
            <div>
              <label className={lbl}>Sector</label>
              <select name="sector" defaultValue={opportunity.sector ?? ''} className={inp}>
                <option value="">Select sector</option>
                {productSectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>

            {/* Assign to (admin only) */}
            {currentUserRole === 'admin' && (
              <div>
                <label className={lbl}>Assigned To</label>
                <select name="assigned_to" defaultValue={opportunity.assigned_to ?? ''} className={inp}>
                  {assignable.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Currency */}
            <div>
              <label className={lbl}>Currency</label>
              <select name="currency" defaultValue={opportunity.currency} className={inp}>
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.symbol} {c.name} ({c.code})</option>
                ))}
              </select>
            </div>

            {/* Estimated Value */}
            <div>
              <label className={lbl}>Estimated Value <span className="text-amber-500 font-normal">(if uncertain)</span></label>
              <input name="estimated_value" type="number" min="0" defaultValue={opportunity.estimated_value ?? ''} placeholder="Rough estimate" className={inp} />
            </div>

            {/* Confirmed Value */}
            <div>
              <label className={lbl}>Confirmed Value <span className="text-green-600 font-normal">(when finalised)</span></label>
              <input name="value" type="number" min="0" defaultValue={opportunity.value ?? ''} placeholder="Agreed amount" className={inp} />
            </div>

            {/* Notes */}
            <div className="col-span-2">
              <label className={lbl}>Internal Notes</label>
              <textarea name="notes" rows={3} defaultValue={opportunity.notes ?? ''} placeholder="Any internal context or notes…" className={inp + ' resize-none'} />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-200 shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 border border-slate-200 text-gray-500 hover:text-gray-800 text-sm font-medium py-2 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            form="edit-deal-form"
            onClick={e => { e.preventDefault(); (e.currentTarget.closest('.flex.flex-col')?.querySelector('form') as HTMLFormElement)?.requestSubmit() }}
            disabled={isPending}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isPending ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : <><Save size={13} /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  )
}
