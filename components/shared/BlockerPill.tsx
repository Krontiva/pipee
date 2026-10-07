import { cn, activeBlocker } from '@/lib/utils'
import type { Opportunity } from '@/types'

// Red pill with the blocker for a stalled deal; amber "Needs blocker" if the
// rep hasn't said why yet. Render only for stalled deals.
export function BlockerPill({ opp }: { opp: Opportunity }) {
  const blocker = activeBlocker(opp)
  return (
    <span
      title={blocker && opp.blocker_note ? opp.blocker_note : undefined}
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none',
        blocker
          ? 'bg-red-50 text-red-600 border-red-200'
          : 'bg-amber-50 text-amber-700 border-amber-200'
      )}
    >
      {blocker ? blocker.label : 'Needs blocker'}
    </span>
  )
}
