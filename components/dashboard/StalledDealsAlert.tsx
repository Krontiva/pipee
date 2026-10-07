import Link from 'next/link'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { daysSinceStageEntry, formatCurrency } from '@/lib/utils'
import { STAGE_META } from '@/types'
import { BlockerPill } from '@/components/shared/BlockerPill'
import { isStalled } from '@/lib/utils'
import type { Opportunity } from '@/types'

export function StalledDealsAlert({ opportunities }: { opportunities: Opportunity[] }) {
  const stalled = opportunities.filter(o =>
    o.status === 'active' && isStalled(o.stage, o.stage_entered_at)
  )

  if (stalled.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Stalled Deals</p>
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <span>✓</span> No stalled deals — pipeline is healthy!
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-red-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={14} className="text-red-500" />
        <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">
          {stalled.length} Stalled Deal{stalled.length > 1 ? 's' : ''} — Action Required
        </p>
      </div>
      <div className="space-y-2">
        {stalled.map(opp => {
          const days = daysSinceStageEntry(opp.stage_entered_at)
          const target = STAGE_META[opp.stage]?.targetDays ?? 7
          return (
            <Link
              key={opp.id}
              href={`/opportunities/${opp.id}`}
              className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors group"
            >
              <div>
                <p className="text-gray-800 text-sm font-medium group-hover:text-indigo-600 transition-colors">
                  {opp.title}
                </p>
                <p className="text-gray-400 text-xs">
                  {opp.company_name} · Stage {opp.stage} · {days}d ({target * 2}d limit)
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <BlockerPill opp={opp} />
                {opp.value && <span className="text-green-600 text-sm font-medium">{formatCurrency(opp.value)}</span>}
                <ArrowRight size={14} className="text-gray-400 group-hover:text-indigo-600 transition-colors" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
