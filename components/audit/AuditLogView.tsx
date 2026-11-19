'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Info, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AuditCategory } from '@/lib/audit'

export interface AuditEntry {
  id: string
  dealId: string
  deal: string
  who: string
  category: AuditCategory
  what: string
  note: string | null
  at: string
}

const CATEGORIES: ('All' | AuditCategory)[] = ['All', 'Stage', 'Owner', 'Details', 'Outcome', 'Blocker', 'Created']

const CHIP: Record<AuditCategory, string> = {
  Stage: 'bg-green-100 text-green-700',
  Owner: 'bg-violet-100 text-violet-700',
  Details: 'bg-blue-100 text-blue-700',
  Outcome: 'bg-amber-100 text-amber-700',
  Blocker: 'bg-orange-100 text-orange-700',
  Created: 'bg-slate-100 text-slate-600',
}

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export function AuditLogView({ entries }: { entries: AuditEntry[] }) {
  const [category, setCategory] = useState<'All' | AuditCategory>('All')
  const [query, setQuery] = useState('')

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries.filter(e =>
      (category === 'All' || e.category === category) &&
      (!q || `${e.deal} ${e.who} ${e.what} ${e.note ?? ''}`.toLowerCase().includes(q))
    )
  }, [entries, category, query])

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Audit log</h2>
        <p className="text-sm text-gray-400">Who changed what on each deal. Admins only.</p>
      </div>

      <p className="flex items-start gap-2 text-xs text-gray-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
        <Info size={13} className="mt-0.5 shrink-0 text-gray-400" />
        <span>
          Stage moves, outcomes and blockers go back as far as they were recorded. Changes to value, currency, owner and name are
          recorded from the moment this log was introduced. Entries can&apos;t be edited or deleted in Pipee.
        </span>
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 bg-slate-100 rounded-lg p-1">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn('px-3 py-1 rounded-md text-xs font-medium transition-colors',
                c === category ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query} onChange={e => setQuery(e.target.value)} placeholder="Search deal, person or change"
            className="w-full border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-sm bg-white"
          />
        </div>
        <span className="text-xs text-gray-400">{shown.length} entr{shown.length === 1 ? 'y' : 'ies'}</span>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {['When', 'Who', 'Type', 'Deal', 'Change'].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map(e => (
              <tr key={e.id} className="border-b border-slate-50 last:border-0 align-top">
                <td className="py-2.5 px-4 text-xs text-gray-400 whitespace-nowrap">{when(e.at)}</td>
                <td className="py-2.5 px-4 text-sm text-gray-700 whitespace-nowrap">{e.who}</td>
                <td className="py-2.5 px-4">
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', CHIP[e.category])}>{e.category}</span>
                </td>
                <td className="py-2.5 px-4 text-sm">
                  <Link href={`/opportunities/${e.dealId}`} className="text-indigo-600 font-medium hover:underline">{e.deal}</Link>
                </td>
                <td className="py-2.5 px-4 text-sm text-gray-700">
                  {e.what}
                  {e.note && <p className="text-xs text-gray-400 mt-0.5 whitespace-pre-wrap">{e.note}</p>}
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-sm text-gray-400">No entries match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
