'use client'

import { useState, useTransition } from 'react'
import { Trophy, ThumbsDown, Ban, ChevronDown, Loader2, X, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { markWonLost, disqualifyOpportunity, reopenOpportunity } from '@/lib/actions/opportunities'
import type { OpportunityStatus, DisqualificationReason } from '@/types'

const DISQ_REASONS: { value: DisqualificationReason; label: string }[] = [
  { value: 'NO_FIT',       label: 'No ICP fit'             },
  { value: 'NO_PAIN',      label: 'No identified pain'     },
  { value: 'NO_BUDGET',    label: 'No budget'              },
  { value: 'NO_AUTHORITY', label: 'No decision authority'  },
  { value: 'NO_TIMELINE',  label: 'No clear timeline'      },
  { value: 'COMPETITOR',   label: 'Lost to competitor'     },
]

interface DealOutcomeBarProps {
  opportunityId: string
  currentStatus: OpportunityStatus
  isAdmin?: boolean
}

export function DealOutcomeBar({ opportunityId, currentStatus, isAdmin = false }: DealOutcomeBarProps) {
  const [modal, setModal] = useState<'won' | 'lost' | 'disqualify' | null>(null)
  const [notes, setNotes] = useState('')
  const [disqReason, setDisqReason] = useState<DisqualificationReason>('NO_FIT')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isClosed = ['won', 'lost', 'disqualified'].includes(currentStatus)

  function close() { setModal(null); setNotes(''); setError(null) }

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      let result: { error?: string; success?: boolean }
      if (modal === 'won' || modal === 'lost') {
        result = await markWonLost(opportunityId, modal, notes || undefined)
      } else {
        result = await disqualifyOpportunity(opportunityId, disqReason)
      }
      if (result.error) setError(result.error)
      else close()
    })
  }

  if (isClosed) {
    const label =
      currentStatus === 'won'          ? '🏆 Deal Won'        :
      currentStatus === 'lost'         ? '❌ Deal Lost'        :
      currentStatus === 'disqualified' ? '🚫 Disqualified'    : ''
    const cls =
      currentStatus === 'won'          ? 'bg-green-50 border-green-200 text-green-700' :
      currentStatus === 'lost'         ? 'bg-slate-50 border-slate-200 text-slate-600' :
                                         'bg-orange-50 border-orange-200 text-orange-700'
    return (
      <div className={cn('flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold', cls)}>
        {label}
        {isAdmin && (
          <button
            disabled={isPending}
            onClick={() => startTransition(async () => {
              const result = await reopenOpportunity(opportunityId)
              if (result.error) setError(result.error)
            })}
            className="ml-2 text-xs font-medium underline underline-offset-2 opacity-70 hover:opacity-100 disabled:opacity-40"
          >
            Reopen
          </button>
        )}
        {error && <span className="ml-2 text-xs text-red-600">{error}</span>}
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Won */}
        <button
          onClick={() => setModal('won')}
          className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Trophy size={13} /> Won
        </button>

        {/* Lost */}
        <button
          onClick={() => setModal('lost')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          <ThumbsDown size={13} /> Lost
        </button>

        {/* Disqualify */}
        <button
          onClick={() => setModal('disqualify')}
          className="flex items-center gap-1.5 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Ban size={13} /> Disqualify
        </button>
      </div>

      {/* Confirmation Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-sm shadow-xl">

            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-gray-900">
                {modal === 'won'        && '🏆 Mark as Won'}
                {modal === 'lost'       && '❌ Mark as Lost'}
                {modal === 'disqualify' && '🚫 Disqualify Deal'}
              </h3>
              <button onClick={close} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              {modal === 'disqualify' ? (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Reason *</label>
                  <select
                    value={disqReason}
                    onChange={e => setDisqReason(e.target.value as DisqualificationReason)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {DISQ_REASONS.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-2">
                    Disqualified deals remain visible for nurture tracking.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes (optional)</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder={modal === 'won' ? 'e.g. Final contract value, key success factors…' : 'e.g. Lost to competitor on price…'}
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" />{error}
                </div>
              )}
            </div>

            <div className="flex gap-3 px-5 pb-5">
              <button onClick={close}
                className="flex-1 border border-slate-200 text-gray-500 hover:text-gray-800 text-sm font-medium py-2 rounded-lg transition-colors">
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className={cn(
                  'flex-1 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50',
                  modal === 'won'        ? 'bg-green-600 hover:bg-green-500' :
                  modal === 'lost'       ? 'bg-slate-600 hover:bg-slate-500' :
                                           'bg-orange-600 hover:bg-orange-500'
                )}
              >
                {isPending ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : 'Confirm'}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
