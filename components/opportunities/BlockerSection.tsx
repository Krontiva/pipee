'use client'

import { useState, useTransition } from 'react'
import { AlertTriangle, Check, Loader2, Pencil } from 'lucide-react'
import { cn, activeBlocker } from '@/lib/utils'
import { setBlocker } from '@/lib/actions/opportunities'
import { BLOCKER_OPTIONS, type BlockerKey, type Opportunity } from '@/types'

// Shown on a stalled deal: why is it stalled? The owner (or an admin) picks a
// blocker; "Other" takes free text that is summarised to two words for the card.
export function BlockerSection({ opp }: { opp: Opportunity }) {
  const current = activeBlocker(opp)
  const [editing, setEditing] = useState(!current)
  const [choice, setChoice] = useState<BlockerKey | ''>(current?.key ?? '')
  const [note, setNote] = useState(opp.blocker_note ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function save() {
    if (!choice) return
    setError(null)
    startTransition(async () => {
      const res = await setBlocker(opp.id, choice, note)
      if (res.error) setError(res.error)
      else setEditing(false)
    })
  }

  const fieldCls = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <div className={cn(
      'rounded-xl border p-4 shadow-sm',
      current ? 'bg-white border-red-200' : 'bg-amber-50 border-amber-200'
    )}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-red-500">
          <AlertTriangle size={13} /> Blocker
        </div>
        {current && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors"
          >
            <Pencil size={11} /> Edit
          </button>
        )}
      </div>

      {!editing && current ? (
        <div className="mt-2">
          <p className="text-sm font-medium text-gray-900">
            {BLOCKER_OPTIONS.find(b => b.key === current.key)?.name}
            {current.key === 'other' && <span className="text-gray-400 font-normal"> · shown as “{current.label}”</span>}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {current.key === 'other' ? opp.blocker_note : BLOCKER_OPTIONS.find(b => b.key === current.key)?.meaning}
          </p>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-amber-800">
            {current ? 'Update what is blocking this deal.' : 'This deal is stalled. Tell us what is blocking it.'}
          </p>
          <select
            value={choice}
            onChange={e => setChoice(e.target.value as BlockerKey | '')}
            className={fieldCls}
          >
            <option value="">Select a blocker…</option>
            {BLOCKER_OPTIONS.map(b => (
              <option key={b.key} value={b.key}>{b.name} — {b.meaning}</option>
            ))}
          </select>
          {choice === 'other' && (
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="Describe what is blocking this deal"
              className={fieldCls}
            />
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            {current && (
              <button
                onClick={() => { setEditing(false); setError(null) }}
                className="text-xs border border-slate-200 text-gray-500 rounded-lg px-3 py-1.5 hover:text-gray-700"
              >
                Cancel
              </button>
            )}
            <button
              disabled={isPending || !choice || (choice === 'other' && !note.trim())}
              onClick={save}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg px-3 py-1.5 flex items-center gap-1"
            >
              {isPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Save blocker
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
