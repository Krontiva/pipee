'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, TrendingUp, Briefcase, Trophy, AlertTriangle } from 'lucide-react'
import { cn, formatCurrency, formatDate, isStalled, isOverdue } from '@/lib/utils'
import { StageTag } from '@/components/shared/StageTag'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { BlockerPill } from '@/components/shared/BlockerPill'
import { initials } from '@/lib/utils'
import type { Opportunity, Profile } from '@/types'

interface BDRepGridProps {
  opportunities: Opportunity[]
  profiles: Profile[]
}

function groupByCurrency(opps: Opportunity[]) {
  const map: Record<string, number> = {}
  for (const o of opps) {
    const amount = o.value ?? o.estimated_value ?? 0
    if (!amount) continue
    const cur = o.currency || 'GHS'
    map[cur] = (map[cur] ?? 0) + amount
  }
  return Object.entries(map)
}

export function BDRepGrid({ opportunities, profiles }: BDRepGridProps) {
  const [selectedRep, setSelectedRep] = useState<Profile | null>(null)

  // Build per-rep stats
  const repStats = profiles.map(rep => {
    const repOpps = opportunities.filter(o => o.assigned_to === rep.id)
    const active  = repOpps.filter(o => o.status === 'active' || o.status === 'stalled')
    const won     = repOpps.filter(o => o.status === 'won')
    const stalled = repOpps.filter(o => o.status === 'stalled')
    const overdue = active.filter(o => isOverdue(o.next_action_date))
    const pipelineByCurrency = groupByCurrency(active)
    return { rep, repOpps, active, won, stalled, overdue, pipelineByCurrency }
  }).filter(s => s.repOpps.length > 0 || profiles.length <= 4) // always show all if small team

  const selectedOpps = selectedRep
    ? opportunities.filter(o => o.assigned_to === selectedRep.id)
    : []

  return (
    <>
      {/* BD Rep cards grid */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {repStats.map(({ rep, active, won, stalled, overdue, pipelineByCurrency }) => (
          <button
            key={rep.id}
            onClick={() => setSelectedRep(rep)}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-left hover:border-indigo-300 hover:shadow-md transition-all group"
          >
            {/* Rep header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {initials(rep.name)}
              </div>
              <div className="min-w-0">
                <p className="text-gray-900 font-semibold text-sm truncate">{rep.name}</p>
                <p className="text-gray-400 text-xs capitalize">{rep.role.replace('_', ' ')}</p>
              </div>
              <div className="ml-auto text-gray-300 group-hover:text-indigo-400 transition-colors">
                <X size={14} className="rotate-45" />
              </div>
            </div>

            {/* Pipeline value */}
            <div className="mb-4">
              {pipelineByCurrency.length > 0 ? (
                pipelineByCurrency.map(([cur, total]) => (
                  <p key={cur} className="text-indigo-600 text-xl font-bold leading-tight">
                    {formatCurrency(total, cur)}
                  </p>
                ))
              ) : (
                <p className="text-gray-300 text-xl font-bold">—</p>
              )}
              <p className="text-gray-400 text-xs mt-0.5">Active pipeline</p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-100">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-gray-500 mb-0.5">
                  <Briefcase size={11} />
                </div>
                <p className="text-gray-900 text-sm font-semibold">{active.length}</p>
                <p className="text-gray-400 text-[10px]">Active</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-green-500 mb-0.5">
                  <Trophy size={11} />
                </div>
                <p className="text-gray-900 text-sm font-semibold">{won.length}</p>
                <p className="text-gray-400 text-[10px]">Won</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-amber-500 mb-0.5">
                  <TrendingUp size={11} />
                </div>
                <p className={cn('text-sm font-semibold', stalled.length > 0 ? 'text-amber-600' : 'text-gray-900')}>
                  {stalled.length}
                </p>
                <p className="text-gray-400 text-[10px]">Stalled</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-red-400 mb-0.5">
                  <AlertTriangle size={11} />
                </div>
                <p className={cn('text-sm font-semibold', overdue.length > 0 ? 'text-red-600' : 'text-gray-900')}>
                  {overdue.length}
                </p>
                <p className="text-gray-400 text-[10px]">Overdue</p>
              </div>
            </div>
          </button>
        ))}

        {repStats.length === 0 && (
          <div className="col-span-full flex items-center justify-center py-20 text-gray-400 text-sm">
            No deals in the pipeline yet
          </div>
        )}
      </div>

      {/* Deal detail modal */}
      {selectedRep && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col">

            {/* Modal header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 shrink-0">
              <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {initials(selectedRep.name)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900">{selectedRep.name}'s Pipeline</h3>
                <p className="text-xs text-gray-400 mt-0.5">{selectedOpps.length} deal{selectedOpps.length !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setSelectedRep(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Deal list */}
            <div className="flex-1 overflow-y-auto">
              {selectedOpps.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-gray-400 text-sm">No deals assigned</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white border-b border-slate-100">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Deal</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Stage</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Value</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Next Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOpps
                      .sort((a, b) => a.stage - b.stage)
                      .map(opp => {
                        const stalled = isStalled(opp.stage, opp.stage_entered_at)
                        const overdue = isOverdue(opp.next_action_date)
                        return (
                          <tr key={opp.id} className={cn('hover:bg-slate-50 transition-colors', stalled && 'border-l-2 border-l-red-300')}>
                            <td className="px-5 py-3">
                              <Link href={`/opportunities/${opp.id}`} onClick={() => setSelectedRep(null)} className="hover:text-indigo-600 transition-colors">
                                <p className="text-gray-800 font-medium text-sm">{opp.title}</p>
                                <p className="text-gray-400 text-xs">{opp.company_name}</p>
                              </Link>
                            </td>
                            <td className="px-4 py-3">
                              <StageTag stage={opp.stage} showName={false} />
                            </td>
                            <td className="px-4 py-3 text-xs font-medium">
                              {opp.value
                                ? <span className="text-green-600">{formatCurrency(opp.value, opp.currency)}</span>
                                : opp.estimated_value
                                  ? <span className="text-amber-500">~{formatCurrency(opp.estimated_value, opp.currency)}</span>
                                  : <span className="text-gray-300">TBD</span>
                              }
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <StatusBadge status={opp.status} />
                                {stalled && <BlockerPill opp={opp} />}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs">
                              {opp.next_action ? (
                                <>
                                  <p className={cn('font-medium', overdue ? 'text-red-600' : 'text-gray-700')}>{opp.next_action}</p>
                                  {opp.next_action_date && (
                                    <p className={cn('mt-0.5', overdue ? 'text-red-400' : 'text-gray-400')}>
                                      {formatDate(opp.next_action_date)}{overdue && ' · Overdue'}
                                    </p>
                                  )}
                                </>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
