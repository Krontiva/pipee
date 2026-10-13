'use client'

import { useState, useTransition } from 'react'
import { Check, ChevronRight, AlertTriangle, Loader2, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STAGE_META, STAGE_COLORS, SUB_STAGES } from '@/types'
import { advanceStage } from '@/lib/actions/opportunities'
import type { Opportunity, SubStageProgress } from '@/types'

interface StageProgressProps {
  opportunity: Opportunity
  completedProgress: SubStageProgress[]
}

export function StageProgress({ opportunity, completedProgress }: StageProgressProps) {
  const [showModal, setShowModal] = useState(false)
  const [targetStage, setTargetStage] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const completedKeys = new Set(completedProgress.map(p => p.sub_stage_key))

  function openAdvance(stage: number) {
    setTargetStage(stage)
    setError(null)
    setShowModal(true)
  }

  function confirmAdvance() {
    if (!targetStage) return
    startTransition(async () => {
      const result = await advanceStage(opportunity.id, targetStage)
      if (result.error) {
        setError(result.error)
      } else {
        setShowModal(false)
      }
    })
  }

  const currentMeta = STAGE_META[targetStage ?? opportunity.stage]

  // Which required sub-stages are incomplete for the CURRENT stage?
  const currentSubStages = SUB_STAGES[opportunity.stage] ?? []
  const blockers = currentSubStages.filter(s => s.required && !completedKeys.has(s.key))
  const canAdvance = blockers.length === 0

  return (
    <>
      {/* Stage stepper */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {[1, 2, 3, 4, 5, 6, 7].map((stage, idx) => {
          const done   = opportunity.stage > stage
          const active = opportunity.stage === stage

          return (
            <div key={stage} className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => !done && !active && openAdvance(stage)}
                disabled={done || active || stage > opportunity.stage + 1}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                  done  && 'bg-green-50 text-green-600 cursor-default',
                  active && 'bg-indigo-50 text-indigo-600 cursor-default ring-2 ring-indigo-300',
                  !done && !active && stage <= opportunity.stage + 1 && 'bg-slate-100 text-gray-500 hover:bg-slate-200 hover:text-gray-800 cursor-pointer',
                  !done && !active && stage > opportunity.stage + 1 && 'bg-slate-100 text-gray-300 cursor-not-allowed',
                )}
              >
                <span className="flex items-center justify-center w-5 h-5 rounded-full border border-current">
                  {done ? <Check size={10} /> : stage}
                </span>
                <span className="hidden sm:block text-center max-w-[70px] leading-tight">
                  {STAGE_META[stage]?.name.split(' ')[0]}
                </span>
              </button>
              {idx < 6 && <ChevronRight size={12} className="text-gray-300 shrink-0" />}
            </div>
          )
        })}
      </div>

      {/* Advance modal */}
      {showModal && targetStage && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">

            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-gray-900 font-semibold">Advance to Stage {targetStage}</h3>
              <p className="text-gray-400 text-sm mt-0.5">{currentMeta?.name}</p>
            </div>

            <div className="px-6 py-5 space-y-4 flex-1 min-h-0 overflow-y-auto">

              {/* Exit criteria */}
              <div>
                <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide mb-2">
                  Exit criteria — Stage {opportunity.stage}
                </p>
                <ul className="space-y-1.5">
                  {STAGE_META[opportunity.stage]?.exitCriteria.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check size={13} className="text-green-500 mt-0.5 shrink-0" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Sub-stage checklist status */}
              {currentSubStages.length > 0 && (
                <div>
                  <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide mb-2">
                    Checklist status
                  </p>
                  <ul className="space-y-1">
                    {currentSubStages.map(item => {
                      const done = completedKeys.has(item.key)
                      return (
                        <li key={item.key} className={cn(
                          'flex items-center gap-2 text-sm rounded-lg px-2.5 py-1.5',
                          done ? 'text-green-700 bg-green-50' : item.required ? 'text-red-700 bg-red-50' : 'text-gray-500 bg-slate-50'
                        )}>
                          {done
                            ? <Check size={12} className="text-green-500 shrink-0" />
                            : item.required
                              ? <Lock size={12} className="text-red-400 shrink-0" />
                              : <div className="w-3 h-3 rounded-full border border-gray-300 shrink-0" />
                          }
                          <span className={done ? 'line-through decoration-green-400' : ''}>{item.label}</span>
                          {item.required && !done && (
                            <span className="ml-auto text-[10px] font-bold text-red-500">BLOCKING</span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {/* Blocker warning */}
              {!canAdvance && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-amber-700 text-sm">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>
                    <strong>{blockers.length} required item{blockers.length > 1 ? 's' : ''} </strong>
                    must be completed on the checklist before you can advance.
                  </span>
                </div>
              )}

              {/* Server error */}
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-red-600 text-sm">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 pb-5 shrink-0">
              <button onClick={() => setShowModal(false)}
                className="flex-1 border border-slate-200 text-gray-500 hover:text-gray-800 text-sm font-medium py-2 rounded-lg transition-colors">
                Cancel
              </button>
              <button
                onClick={confirmAdvance}
                disabled={isPending || !canAdvance}
                title={!canAdvance ? `${blockers.length} required checklist item${blockers.length > 1 ? 's' : ''} incomplete` : undefined}
                className={cn(
                  'flex-1 text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2',
                  canAdvance
                    ? 'bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                )}
              >
                {isPending
                  ? <><Loader2 size={13} className="animate-spin" /> Advancing…</>
                  : !canAdvance
                    ? <><Lock size={13} /> {blockers.length} item{blockers.length > 1 ? 's' : ''} remaining</>
                    : 'Confirm Advance'
                }
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
