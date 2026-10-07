'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react'
import { cn, formatCurrency, formatDate, isStalled } from '@/lib/utils'
import { StageTag } from '@/components/shared/StageTag'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { BlockerPill } from '@/components/shared/BlockerPill'
import type { Opportunity } from '@/types'

type SortKey = 'company_name' | 'stage' | 'value' | 'next_action_date' | 'status'

interface ListViewProps {
  opportunities: Opportunity[]
}

export function ListView({ opportunities }: ListViewProps) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'stage', dir: 'asc' })

  function toggleSort(key: SortKey) {
    setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }

  const sorted = [...opportunities].sort((a, b) => {
    const dir = sort.dir === 'asc' ? 1 : -1
    const va = a[sort.key] ?? ''
    const vb = b[sort.key] ?? ''
    if (sort.key === 'value') return ((a.value ?? 0) - (b.value ?? 0)) * dir
    if (sort.key === 'stage') return (a.stage - b.stage) * dir
    return String(va).localeCompare(String(vb)) * dir
  })

  function SortIcon({ col }: { col: SortKey }) {
    if (sort.key !== col) return <ArrowUpDown size={12} className="text-gray-300" />
    return sort.dir === 'asc' ? <ChevronUp size={12} className="text-indigo-500" /> : <ChevronDown size={12} className="text-indigo-500" />
  }

  const thBtn = 'flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800'

  return (
    <div className="overflow-auto flex-1">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white border-b border-slate-200">
          <tr>
            <th className="text-left px-4 py-3">
              <button onClick={() => toggleSort('company_name')} className={thBtn}>
                Company <SortIcon col="company_name" />
              </button>
            </th>
            <th className="text-left px-4 py-3">
              <button onClick={() => toggleSort('stage')} className={thBtn}>
                Stage <SortIcon col="stage" />
              </button>
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Assigned</th>
            <th className="text-left px-4 py-3">
              <button onClick={() => toggleSort('value')} className={thBtn}>
                Value <SortIcon col="value" />
              </button>
            </th>
            <th className="text-left px-4 py-3">
              <button onClick={() => toggleSort('status')} className={thBtn}>
                Status <SortIcon col="status" />
              </button>
            </th>
            <th className="text-left px-4 py-3">
              <button onClick={() => toggleSort('next_action_date')} className={thBtn}>
                Next Action <SortIcon col="next_action_date" />
              </button>
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">MEDDIC</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map(opp => {
            const stalled = isStalled(opp.stage, opp.stage_entered_at)
            return (
              <tr key={opp.id} className={cn(
                'hover:bg-slate-50 transition-colors',
                stalled && 'border-l-2 border-l-red-400'
              )}>
                <td className="px-4 py-3">
                  <Link href={`/opportunities/${opp.id}`} className="hover:text-indigo-600 transition-colors">
                    <p className="text-gray-800 font-medium">{opp.title}</p>
                    <p className="text-gray-400 text-xs">{opp.company_name}</p>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <StageTag stage={opp.stage} showName={false} />
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {opp.profiles?.name ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-700 text-xs font-medium">
                  {formatCurrency(opp.value, opp.currency)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <StatusBadge status={opp.status} />
                    {stalled && <BlockerPill opp={opp} />}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  <div>{opp.next_action ?? '—'}</div>
                  {opp.next_action_date && (
                    <div className="text-gray-400">{formatDate(opp.next_action_date)}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className={cn(
                        'w-2 h-2 rounded-full',
                        i < (opp.meddic_scores?.score ?? 0) ? 'bg-indigo-500' : 'bg-slate-200'
                      )} />
                    ))}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {sorted.length === 0 && (
        <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
          No opportunities found
        </div>
      )}
    </div>
  )
}
