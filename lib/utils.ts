import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { STAGE_META, CURRENCIES, BLOCKER_OPTIONS } from '@/types'
import type { Opportunity, BlockerKey } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | null, currency = 'GHS') {
  if (value === null) return '—'
  const def = CURRENCIES.find(c => c.code === currency)
  const locale = def?.locale ?? 'en-GH'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function isStalled(stage: number, stageEnteredAt: string): boolean {
  const meta = STAGE_META[stage]
  if (!meta) return false
  const targetMs = meta.targetDays * 24 * 60 * 60 * 1000 * 2
  const elapsed = Date.now() - new Date(stageEnteredAt).getTime()
  return elapsed > targetMs
}

type BlockerFields = Pick<Opportunity, 'stage' | 'stage_entered_at' | 'blocker' | 'blocker_label' | 'blocker_set_at'>

// The blocker for the *current* stalled spell, or null. A blocker set before the
// deal last entered its stage (moved or cleared since) is stale and ignored.
export function activeBlocker(opp: BlockerFields): { key: BlockerKey; label: string } | null {
  if (!opp.blocker || !opp.blocker_set_at) return null
  if (new Date(opp.blocker_set_at) < new Date(opp.stage_entered_at)) return null
  const fallback = BLOCKER_OPTIONS.find(b => b.key === opp.blocker)?.label ?? 'Other'
  return { key: opp.blocker, label: opp.blocker_label || fallback }
}

export function needsBlocker(opp: BlockerFields & { status: Opportunity['status'] }): boolean {
  return opp.status === 'active' && isStalled(opp.stage, opp.stage_entered_at) && !activeBlocker(opp)
}

export function daysSinceStageEntry(stageEnteredAt: string): number {
  return Math.floor((Date.now() - new Date(stageEnteredAt).getTime()) / (1000 * 60 * 60 * 24))
}

export function isOverdue(date: string | null): boolean {
  if (!date) return false
  return new Date(date) < new Date(new Date().toDateString())
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
