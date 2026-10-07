'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  AlertTriangle, X, Building2, DollarSign, Calendar, Globe,
  Bell, ChevronRight, Lock, FileText, LayoutGrid, Pencil, Check, Loader2,
} from 'lucide-react'
import { cn, formatCurrency, formatDate, isStalled, isOverdue, daysSinceStageEntry, activeBlocker } from '@/lib/utils'
import { updateNextAction, clearStalled } from '@/lib/actions/opportunities'
import { STAGE_META, SUB_STAGES } from '@/types'
import { StageTag } from '@/components/shared/StageTag'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { BlockerSection } from './BlockerSection'
import { DealOutcomeBar } from './DealOutcomeBar'
import { EditDealButton } from './EditDealButton'
import { StageProgress } from './StageProgress'
import { SubStageChecklist } from './SubStageChecklist'
import { MEDDICScorecard } from './MEDDICScorecard'
import { ActivityFeed } from './ActivityFeed'
import { DiscoveryBriefForm } from './DiscoveryBriefForm'
import { ProposalTracker } from './ProposalTracker'
import { ContactsSection } from './ContactsSection'
import type {
  Opportunity, MEDDICScore, SubStageProgress,
  Contact, Activity, DiscoveryBrief, Proposal, Profile, Sector,
} from '@/types'

// ── Notification logic (mirrors StageNotifications) ───────────────────────────
function getNotifications(opp: Opportunity, meddic?: MEDDICScore | null) {
  const notes: { type: 'warning' | 'info' | 'locked' | 'tip'; message: string }[] = []
  const s = opp.stage

  if (s === 1) {
    notes.push({ type: 'info',   message: 'Contact the prospect through at least two channels before advancing.' })
    notes.push({ type: 'locked', message: 'Deal value and pricing are not set at this stage — focus on outreach first.' })
  }
  if (s === 2) {
    notes.push({ type: 'info',    message: 'Fill in the MEDDIC scorecard after each discovery call.' })
    const score = meddic?.score ?? 0
    if (score < 4) notes.push({ type: 'warning', message: `MEDDIC score ${score}/6 — need ≥4 (incl. Pain & Economic Buyer) to advance.` })
    if (!meddic?.identified_pain)    notes.push({ type: 'locked', message: 'Identified Pain is required before advancing.' })
    if (!meddic?.economic_buyer_name) notes.push({ type: 'locked', message: 'Economic Buyer not yet identified.' })
  }
  if (s === 3) notes.push({ type: 'info', message: 'File a Discovery Brief before advancing to Stage 4.' })
  if (s === 4 && !opp.value) notes.push({ type: 'warning', message: 'Deal value is not set — update before drafting the proposal.' })
  if (s === 5) notes.push({ type: 'info', message: 'Track negotiation progress and update the Proposal Tracker with revisions.' })
  if (isStalled(opp.stage, opp.stage_entered_at)) {
    notes.push({
      type: 'warning',
      message: activeBlocker(opp)
        ? `Deal is stalled (${activeBlocker(opp)!.label}) — log a new activity or schedule a follow-up.`
        : 'Deal is stalled — tell us what is blocking it, then log an activity or schedule a follow-up.',
    })
  }
  return notes
}

// ── Props ──────────────────────────────────────────────────────────────────────
interface OpportunityDetailProps {
  opp: Opportunity
  profile: Profile
  meddic: MEDDICScore | null
  activities: Activity[]
  brief: DiscoveryBrief | null
  proposals: Proposal[]
  contacts: Contact[]
  sectors: Sector[]
  profiles: Profile[]
  subStageProgress: SubStageProgress[]
  reviewerName?: string
}

type Tab = 'overview' | 'activity' | 'meddic' | 'documents'

// ── Component ──────────────────────────────────────────────────────────────────
export function OpportunityDetail({
  opp, profile, meddic, activities, brief, proposals,
  contacts, sectors, profiles, subStageProgress, reviewerName,
}: OpportunityDetailProps) {
  const [tab, setTab] = useState<Tab>('overview')
  const [showNotifs, setShowNotifs] = useState(false)
  const [showStageModal, setShowStageModal] = useState(false)
  const [stageModalTab, setStageModalTab] = useState<'checklist' | 'guide'>('checklist')
  const [editingNextAction, setEditingNextAction] = useState(false)
  const [nextActionText, setNextActionText] = useState(opp.next_action ?? '')
  const [nextActionDate, setNextActionDate] = useState(opp.next_action_date ?? '')
  const [isPendingNextAction, startNextActionTransition] = useTransition()
  const [isPendingClearStalled, startClearStalledTransition] = useTransition()

  const stalled      = isStalled(opp.stage, opp.stage_entered_at)
  const daysInStage  = daysSinceStageEntry(opp.stage_entered_at)
  const notifications = getNotifications(opp, meddic)
  const warnings     = notifications.filter(n => n.type === 'warning' || n.type === 'locked')
  const hasWarnings  = warnings.length > 0

  // Stage progress summary for meta card
  const subStages   = SUB_STAGES[opp.stage] ?? []
  const doneCount   = subStages.filter(s => subStageProgress.some(p => p.sub_stage_key === s.key)).length
  const stagePct    = subStages.length > 0 ? Math.round((doneCount / subStages.length) * 100) : 0
  const stageMeta   = STAGE_META[opp.stage]

  // Documents tab lock
  const docsLocked = opp.stage < 3

  const TABS: { id: Tab; label: string; locked?: boolean }[] = [
    { id: 'overview',   label: 'Overview'  },
    { id: 'activity',   label: 'Actions'  },
    { id: 'meddic',     label: 'MEDDIC'    },
    { id: 'documents',  label: 'Documents', locked: docsLocked },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── STICKY HEADER ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm shrink-0">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            {/* Left: breadcrumb + title + badges */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1.5">
                <Link href="/pipeline" className="hover:text-indigo-600 transition-colors">Pipeline</Link>
                <ChevronRight size={12} />
                <span className="truncate">{opp.company_name}</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 truncate">{opp.title}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <StageTag stage={opp.stage} />
                <StatusBadge status={opp.status} />
                {stalled && (
                  <button
                    disabled={isPendingClearStalled}
                    onClick={() => startClearStalledTransition(async () => { await clearStalled(opp.id) })}
                    title="Mark as active — clear stalled status"
                    className="flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5 hover:bg-red-100 hover:border-red-300 transition-colors disabled:opacity-50"
                  >
                    {isPendingClearStalled ? <Loader2 size={11} className="animate-spin" /> : <AlertTriangle size={11} />}
                    Stalled ({daysInStage}d) · Clear
                  </button>
                )}
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              {/* Notifications icon */}
              <button
                onClick={() => setShowNotifs(true)}
                className={cn(
                  'relative p-2 rounded-lg border transition-colors',
                  hasWarnings
                    ? 'border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100'
                    : 'border-slate-200 text-gray-400 hover:bg-slate-100'
                )}
                title={`${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`}
              >
                <Bell size={15} />
                {notifications.length > 0 && (
                  <span className={cn(
                    'absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white',
                    hasWarnings ? 'bg-amber-500' : 'bg-blue-400'
                  )}>
                    {notifications.length}
                  </span>
                )}
              </button>

              <DealOutcomeBar opportunityId={opp.id} currentStatus={opp.status} />
              <EditDealButton opportunity={opp} profiles={profiles} sectors={sectors} currentUserRole={profile.role} />

              {(opp.value || opp.estimated_value) && (
                <div className="text-right">
                  {opp.value
                    ? <p className="text-green-600 text-lg font-bold leading-tight">{formatCurrency(opp.value, opp.currency)}</p>
                    : <p className="text-amber-500 text-lg font-bold leading-tight">~{formatCurrency(opp.estimated_value, opp.currency)}</p>
                  }
                  <p className="text-gray-400 text-[10px]">{opp.value ? 'Deal Value' : 'Estimated'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── SCROLLABLE BODY ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-5 space-y-5">

          {/* ── 5 META CARDS ── */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* Company */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
              <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1"><Building2 size={11} /> Company</div>
              <p className="text-gray-800 text-sm font-medium leading-snug">{opp.company_name}</p>
              {opp.sector && <p className="text-gray-400 text-xs mt-0.5">{opp.sector}</p>}
            </div>

            {/* Value */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
              <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1"><DollarSign size={11} /> Value</div>
              {opp.value
                ? <p className="text-green-600 text-sm font-semibold">{formatCurrency(opp.value, opp.currency)}</p>
                : opp.estimated_value
                  ? <><p className="text-amber-600 text-sm font-semibold">~{formatCurrency(opp.estimated_value, opp.currency)}</p><p className="text-gray-400 text-xs">estimated</p></>
                  : <p className="text-gray-400 text-sm font-medium">TBD</p>
              }
            </div>

            {/* Next Action — inline editable */}
            {(() => {
              const overdue = isOverdue(opp.next_action_date)
              return (
                <div className={cn(
                  'rounded-xl p-3 shadow-sm border group',
                  overdue ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'
                )}>
                  <div className="flex items-center justify-between mb-1">
                    <div className={cn('flex items-center gap-1.5 text-xs', overdue ? 'text-red-400' : 'text-gray-400')}>
                      <Calendar size={11} /> Next Action
                      {overdue && <span className="font-semibold text-red-500">· Overdue</span>}
                    </div>
                    {!editingNextAction && opp.next_action && (
                      <div className="flex items-center gap-1">
                        <button
                          disabled={isPendingNextAction}
                          onClick={() => startNextActionTransition(async () => {
                            await updateNextAction(opp.id, null, null)
                            setNextActionText('')
                            setNextActionDate('')
                          })}
                          title="Mark as done"
                          className={cn(
                            'text-xs flex items-center gap-0.5 px-1.5 py-0.5 rounded-md transition-all disabled:opacity-50',
                            overdue
                              ? 'bg-red-100 text-red-500 hover:bg-green-100 hover:text-green-600'
                              : 'opacity-0 group-hover:opacity-100 text-gray-300 hover:text-green-600 hover:bg-green-50'
                          )}
                        >
                          {isPendingNextAction ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                          <span>Done</span>
                        </button>
                        <button
                          onClick={() => setEditingNextAction(true)}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-indigo-500 transition-all p-0.5 rounded"
                        >
                          <Pencil size={11} />
                        </button>
                      </div>
                    )}
                    {!editingNextAction && !opp.next_action && (
                      <button
                        onClick={() => setEditingNextAction(true)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-indigo-500 transition-all p-0.5 rounded"
                      >
                        <Pencil size={11} />
                      </button>
                    )}
                  </div>

                  {editingNextAction ? (
                    <div className="space-y-1.5 mt-1">
                      <input
                        value={nextActionText}
                        onChange={e => setNextActionText(e.target.value)}
                        placeholder="e.g. Send proposal draft"
                        className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <input
                        type="date"
                        value={nextActionDate}
                        onChange={e => setNextActionDate(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <div className="flex gap-1.5 pt-0.5">
                        <button
                          onClick={() => setEditingNextAction(false)}
                          className="flex-1 text-xs border border-slate-200 text-gray-500 rounded-lg py-1 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                        <button
                          disabled={isPendingNextAction}
                          onClick={() => startNextActionTransition(async () => {
                            await updateNextAction(opp.id, nextActionText || null, nextActionDate || null)
                            setEditingNextAction(false)
                          })}
                          className="flex-1 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg py-1 flex items-center justify-center gap-1"
                        >
                          {isPendingNextAction ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />} Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className={cn('text-sm leading-snug', overdue ? 'text-red-700 font-medium' : 'text-gray-800')}>
                        {opp.next_action ?? '—'}
                      </p>
                      {opp.next_action_date && (
                        <p className={cn('text-xs mt-0.5', overdue ? 'text-red-400' : 'text-gray-400')}>
                          {formatDate(opp.next_action_date)}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )
            })()}

            {/* Website */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
              <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1"><Globe size={11} /> Website</div>
              {opp.website
                ? <a href={opp.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 text-sm hover:underline truncate block">{opp.website}</a>
                : <p className="text-gray-400 text-sm">—</p>
              }
            </div>

            {/* Stage Progress — clickable card */}
            <button
              onClick={() => setShowStageModal(true)}
              className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm text-left hover:border-indigo-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-gray-400 text-xs"><LayoutGrid size={11} /> Stage Progress</div>
                <ChevronRight size={12} className="text-gray-300 group-hover:text-indigo-400 transition-colors" />
              </div>
              <p className="text-gray-800 text-sm font-semibold">Stage {opp.stage} <span className="text-gray-400 font-normal">of 7</span></p>
              <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', stagePct === 100 ? 'bg-green-400' : 'bg-indigo-400')}
                  style={{ width: `${stagePct}%` }}
                />
              </div>
              <p className="text-gray-400 text-xs mt-1">{doneCount}/{subStages.length} checklist items</p>
            </button>
          </div>

          {stalled && opp.status === 'active' && <BlockerSection opp={opp} />}

          {/* ── TABS ── */}
          <div className="border-b border-slate-200">
            <div className="flex gap-0">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                    tab === t.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-slate-300'
                  )}
                >
                  {t.label}
                  {t.locked && <Lock size={10} className="text-gray-300" />}
                </button>
              ))}
            </div>
          </div>

          {/* ── TAB CONTENT ── */}
          <div className="pb-10">

            {/* Overview: Contacts */}
            {tab === 'overview' && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <ContactsSection opportunityId={opp.id} initialContacts={contacts} />
              </div>
            )}

            {/* Activity */}
            {tab === 'activity' && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <ActivityFeed
                  opportunityId={opp.id}
                  activities={activities}
                  nextAction={opp.next_action}
                  nextActionDate={opp.next_action_date}
                />
              </div>
            )}

            {/* MEDDIC */}
            {tab === 'meddic' && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">MEDDIC Score</p>
                <MEDDICScorecard opportunityId={opp.id} score={meddic} />
              </div>
            )}

            {/* Documents */}
            {tab === 'documents' && (
              docsLocked ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                    <Lock size={20} className="text-slate-400" />
                  </div>
                  <p className="text-gray-600 font-medium text-sm">Documents available from Stage 3</p>
                  <p className="text-gray-400 text-xs mt-1">Advance to Discovery (Stage 3) to file a brief and create proposals.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Discovery Brief</p>
                    <DiscoveryBriefForm
                      opportunityId={opp.id}
                      brief={brief}
                      canReview={profile.role === 'admin'}
                      reviewerName={reviewerName}
                    />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <ProposalTracker opportunityId={opp.id} proposals={proposals} dealCurrency={opp.currency} />
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* ── NOTIFICATIONS MODAL ── */}
      {showNotifs && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-end p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-sm shadow-2xl mt-16 mr-2">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Stage Guidance</h3>
                <p className="text-xs text-gray-400 mt-0.5">Stage {opp.stage} — {stageMeta?.name}</p>
              </div>
              <button onClick={() => setShowNotifs(false)} className="text-gray-300 hover:text-gray-500">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-2.5 max-h-[60vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">No notifications for this stage.</p>
              ) : notifications.map((n, i) => {
                const styles = {
                  warning: 'bg-amber-50 border-amber-200 text-amber-800',
                  locked:  'bg-slate-50 border-slate-200 text-slate-600',
                  info:    'bg-blue-50 border-blue-200 text-blue-800',
                  tip:     'bg-green-50 border-green-200 text-green-800',
                }
                return (
                  <div key={i} className={cn('rounded-lg border px-3 py-2.5 text-xs leading-relaxed', styles[n.type])}>
                    {n.message}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── STAGE PROGRESS MODAL ── */}
      {showStageModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
              <div>
                <h3 className="font-semibold text-gray-900">Stage Progress</h3>
                <p className="text-xs text-gray-400 mt-0.5">{opp.company_name}</p>
              </div>
              <button onClick={() => setShowStageModal(false)} className="text-gray-300 hover:text-gray-500 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Stage stepper */}
            <div className="px-6 pt-5 pb-3 shrink-0">
              <StageProgress opportunity={opp} completedProgress={subStageProgress} />
            </div>

            {/* Tab bar */}
            <div className="flex gap-0 px-6 border-b border-slate-200 shrink-0">
              {([
                { id: 'checklist' as const, label: 'Checklist' },
                { id: 'guide'     as const, label: 'Stage Guide' },
              ]).map(t => (
                <button
                  key={t.id}
                  onClick={() => setStageModalTab(t.id)}
                  className={cn(
                    'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                    stageModalTab === t.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-slate-300'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">

              {stageModalTab === 'checklist' && (
                <SubStageChecklist
                  opportunityId={opp.id}
                  stage={opp.stage}
                  completedProgress={subStageProgress}
                />
              )}

              {stageModalTab === 'guide' && (
                <div className="space-y-5">
                  {/* Stage name + purpose */}
                  {stageMeta && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                      <p className="text-indigo-700 text-sm font-semibold">{stageMeta.name}</p>
                      <p className="text-indigo-600/70 text-xs mt-1 leading-relaxed">{stageMeta.purpose}</p>
                    </div>
                  )}

                  {/* Exit criteria */}
                  {stageMeta?.exitCriteria && stageMeta.exitCriteria.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">
                        Exit Criteria
                      </p>
                      <ul className="space-y-1.5">
                        {stageMeta.exitCriteria.map((c, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                            <FileText size={13} className="text-green-500 shrink-0 mt-0.5" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Target duration */}
                  {stageMeta?.targetDays && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5">
                      <span className="font-semibold text-gray-700">Target duration:</span>
                      {stageMeta.targetDays} day{stageMeta.targetDays !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
