'use client'

import { useState, useTransition } from 'react'
import { saveMEDDIC } from '@/lib/actions/opportunities'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import type { MEDDICScore } from '@/types'

const fieldsFor = (product: string) => [
  { key: 'metrics_evidence', label: 'Metrics', question: `What measurable outcome will ${product} deliver?`, placeholder: 'e.g. Reduce customer churn by 20% within 6 months' },
  { key: 'economic_buyer_name', label: 'Economic Buyer', question: 'Who has the budget authority to sign?', placeholder: 'Name + title, e.g. Jane Doe, CFO' },
  { key: 'decision_criteria', label: 'Decision Criteria', question: 'How will the prospect choose a solution?', placeholder: 'e.g. Functional fit, price, integration with existing systems' },
  { key: 'decision_process', label: 'Decision Process', question: 'What steps lead to a signed contract?', placeholder: 'e.g. Procurement → IT review → Board sign-off' },
  { key: 'identified_pain', label: 'Identified Pain', question: 'What problem is the prospect trying to fix today?', placeholder: 'e.g. Manual customer feedback collection causing 3-day lag' },
  { key: 'champion_name', label: 'Champion', question: `Who internally will advocate for ${product}?`, placeholder: 'Name + role, e.g. Kwame Asante, Head of CX' },
] as const

interface MEDDICScorecardProps {
  opportunityId: string
  score: MEDDICScore | null
  productName?: string
}

export function MEDDICScorecard({ opportunityId, score, productName = 'this product' }: MEDDICScorecardProps) {
  const FIELDS = fieldsFor(productName)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({
    metrics_evidence: score?.metrics_evidence ?? '',
    economic_buyer_name: score?.economic_buyer_name ?? '',
    decision_criteria: score?.decision_criteria ?? '',
    decision_process: score?.decision_process ?? '',
    identified_pain: score?.identified_pain ?? '',
    champion_name: score?.champion_name ?? '',
  })
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const currentScore = score?.score ?? 0

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await saveMEDDIC(opportunityId, form)
      if (result.error) setError(result.error)
      else setEditing(false)
    })
  }

  return (
    <div>
      {/* Score header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold text-gray-900">{currentScore}<span className="text-gray-400 text-base font-normal">/6</span></div>
          <div>
            <div className="flex gap-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={cn('h-2 w-6 rounded-full transition-colors', i < currentScore ? 'bg-indigo-500' : 'bg-slate-200')} />
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {currentScore < 4 ? 'Need ≥4 + Pain & Economic Buyer to advance from Stage 2' : 'Ready to advance from Stage 2'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
        >
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {/* Fields */}
      <div className="space-y-4">
        {FIELDS.map(({ key, label, question, placeholder }) => {
          const value = editing ? form[key] : (score?.[key as keyof MEDDICScore] as string) ?? ''
          const filled = Boolean(value)
          const required = key === 'identified_pain' || key === 'economic_buyer_name'

          return (
            <div key={key} className={cn(
              'rounded-lg border p-4 transition-colors',
              filled ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 bg-white'
            )}>
              <div className="flex items-center gap-2 mb-1">
                <div className={cn('w-2 h-2 rounded-full', filled ? 'bg-indigo-500' : 'bg-slate-300')} />
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{label}</span>
                {required && <span className="text-xs text-red-500">required</span>}
              </div>
              <p className="text-xs text-gray-400 mb-2">{question}</p>
              {editing ? (
                <textarea
                  value={form[key]}
                  onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholder}
                  rows={2}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              ) : (
                <p className={cn('text-sm', value ? 'text-gray-700' : 'text-gray-300 italic')}>
                  {value || 'Not yet recorded'}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {error && <p className="mt-4 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {editing && (
        <button
          onClick={handleSave}
          disabled={isPending}
          className="mt-4 w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isPending ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : 'Save MEDDIC'}
        </button>
      )}
    </div>
  )
}
