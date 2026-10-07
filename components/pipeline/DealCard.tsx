'use client'

import Link from 'next/link'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AlertTriangle, Calendar, User, TrendingUp } from 'lucide-react'
import { cn, formatCurrency, formatDate, isStalled, isOverdue } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { BlockerPill } from '@/components/shared/BlockerPill'
import type { Opportunity } from '@/types'

export function DealCard({ opportunity }: { opportunity: Opportunity }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: opportunity.id,
  })

  const stalled = isStalled(opportunity.stage, opportunity.stage_entered_at)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'bg-white border rounded-lg p-3 cursor-grab active:cursor-grabbing select-none shadow-sm',
        stalled ? 'border-red-300' : 'border-slate-200',
        isDragging && 'opacity-50 scale-95'
      )}
    >
      {stalled && (
        <div className="flex items-center gap-1.5 text-red-500 text-xs mb-2 flex-wrap">
          <AlertTriangle size={11} />
          <span>Stalled</span>
          <BlockerPill opp={opportunity} />
        </div>
      )}

      <Link
        href={`/opportunities/${opportunity.id}`}
        onClick={(e) => e.stopPropagation()}
        className="block group"
      >
        <p className="text-gray-800 text-sm font-medium leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2">
          {opportunity.title}
        </p>
        <p className="text-gray-400 text-xs mt-0.5">{opportunity.company_name}</p>
      </Link>

      <div className="mt-3 space-y-1.5">
        {opportunity.value ? (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <TrendingUp size={11} className="text-green-500" />
            {formatCurrency(opportunity.value, opportunity.currency)}
          </div>
        ) : opportunity.estimated_value ? (
          <div className="flex items-center gap-1.5 text-xs text-amber-600">
            <TrendingUp size={11} className="text-amber-400" />
            ~{formatCurrency(opportunity.estimated_value, opportunity.currency)}
          </div>
        ) : null}
        {opportunity.next_action_date && (() => {
          const overdue = isOverdue(opportunity.next_action_date)
          return (
            <div className={cn('flex items-center gap-1.5 text-xs', overdue ? 'text-red-500' : 'text-gray-500')}>
              <Calendar size={11} className={overdue ? 'text-red-400' : 'text-amber-500'} />
              {formatDate(opportunity.next_action_date)}
              {overdue && <span className="font-semibold">· Overdue</span>}
            </div>
          )
        })()}
        {opportunity.profiles && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <User size={11} />
            {opportunity.profiles.name}
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        <StatusBadge status={opportunity.status} />
        {opportunity.meddic_scores && (
          <span className="text-xs text-gray-400">
            MEDDIC {opportunity.meddic_scores.score}/6
          </span>
        )}
      </div>
    </div>
  )
}
