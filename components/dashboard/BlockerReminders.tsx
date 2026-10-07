import Link from 'next/link'
import { MessageSquareWarning, ArrowRight } from 'lucide-react'
import { daysSinceStageEntry, needsBlocker } from '@/lib/utils'
import type { Opportunity } from '@/types'

// Stalled deals with no blocker yet. Callers pass only the deals the viewer may
// see (reps: their own; admins: everyone's), so each person gets their own list.
export function BlockerReminders({ opportunities, showOwner }: { opportunities: Opportunity[]; showOwner: boolean }) {
  const pending = opportunities.filter(needsBlocker)
  if (pending.length === 0) return null

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <MessageSquareWarning size={15} className="text-amber-600" />
        <p className="text-sm font-semibold text-amber-900">
          {showOwner
            ? `${pending.length} stalled deal${pending.length > 1 ? 's' : ''} across the team need a blocker`
            : `You have ${pending.length} stalled deal${pending.length > 1 ? 's' : ''} that need a blocker`}
        </p>
      </div>
      <p className="text-xs text-amber-700 mb-3">Open each deal and say what is holding it up.</p>
      <div className="space-y-1.5">
        {pending.map(opp => (
          <Link
            key={opp.id}
            href={`/opportunities/${opp.id}`}
            className="flex items-center justify-between gap-3 bg-white border border-amber-100 rounded-lg px-3 py-2 hover:border-amber-300 transition-colors group"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate group-hover:text-indigo-600 transition-colors">{opp.title}</p>
              <p className="text-xs text-gray-400 truncate">
                {opp.company_name} · Stage {opp.stage} · {daysSinceStageEntry(opp.stage_entered_at)}d in stage
                {showOwner && ` · ${opp.profiles?.name ?? 'Unassigned'}`}
              </p>
            </div>
            <ArrowRight size={14} className="text-gray-300 group-hover:text-indigo-600 shrink-0 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  )
}
