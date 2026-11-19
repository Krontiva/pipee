'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, Mail, Users, FileText, ArrowRight, Radio, Plus, Loader2, Pencil, Trash2, Check, X, Calendar } from 'lucide-react'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import { addActivity, updateActivity, deleteActivity, updateNextAction } from '@/lib/actions/opportunities'
import type { Activity, ActivityType } from '@/types'

const TYPE_ICONS: Record<ActivityType, React.ReactNode> = {
  call: <Phone size={12} />,
  email: <Mail size={12} />,
  meeting: <Users size={12} />,
  note: <FileText size={12} />,
  stage_change: <ArrowRight size={12} />,
  outreach: <Radio size={12} />,
}

const TYPE_COLORS: Record<ActivityType, string> = {
  call: 'bg-blue-100 text-blue-600',
  email: 'bg-violet-100 text-violet-600',
  meeting: 'bg-amber-100 text-amber-600',
  note: 'bg-slate-100 text-slate-600',
  stage_change: 'bg-green-100 text-green-600',
  outreach: 'bg-orange-100 text-orange-600',
}

interface ActivityFeedProps {
  opportunityId: string
  activities: Activity[]
  nextAction?: string | null
  nextActionDate?: string | null
}

function ActivityItem({ activity, opportunityId, onRefresh }: {
  activity: Activity
  opportunityId: string
  onRefresh: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    type: activity.type,
    title: activity.title,
    description: activity.description ?? '',
    outcome: activity.outcome ?? '',
    occurred_at: activity.occurred_at.slice(0, 16),
  })

  const inputCls = 'w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500'
  const isSystemEntry = activity.type === 'stage_change'
  const isNextActionLog = activity.type === 'note' && activity.title?.startsWith('Next action:')

  function handleSave() {
    startTransition(async () => {
      const result = await updateActivity(activity.id, opportunityId, {
        type: form.type, title: form.title,
        description: form.description || null,
        outcome: form.outcome || null,
        occurred_at: form.occurred_at,
      })
      if (!result.error) { setEditing(false); onRefresh() }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteActivity(activity.id, opportunityId)
      onRefresh()
    })
  }

  if (editing) {
    return (
      <div className="flex gap-3">
        <div className={cn('flex items-center justify-center w-6 h-6 rounded-full shrink-0 mt-0.5', TYPE_COLORS[form.type as ActivityType] ?? TYPE_COLORS.note)}>
          {TYPE_ICONS[form.type as ActivityType] ?? TYPE_ICONS.note}
        </div>
        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as ActivityType }))} className={inputCls}>
              {(['call', 'email', 'meeting', 'note', 'outreach'] as ActivityType[]).map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
            <input type="datetime-local" value={form.occurred_at} onChange={e => setForm(p => ({ ...p, occurred_at: e.target.value }))} className={inputCls} />
          </div>
          <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Title" className={inputCls} />
          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Notes" rows={2} className={`${inputCls} resize-none`} />
          <input value={form.outcome} onChange={e => setForm(p => ({ ...p, outcome: e.target.value }))} placeholder="Outcome" className={inputCls} />
          <div className="flex gap-2 pt-1">
            <button onClick={() => setEditing(false)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <X size={11} /> Cancel
            </button>
            <button onClick={handleSave} disabled={isPending || !form.title} className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg px-2.5 py-1.5">
              {isPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Save
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isNextActionLog) {
    return (
      <div className="flex gap-3 group">
        <div className="flex items-center justify-center w-6 h-6 rounded-full shrink-0 mt-0.5 bg-indigo-100 text-indigo-400">
          <Check size={11} strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0 border-l-2 border-indigo-100 pl-3 py-0.5">
          <div className="flex items-baseline gap-2">
            <p className="text-gray-500 text-xs font-medium line-through decoration-indigo-200">{activity.title.replace('Next action: ', '')}</p>
            <span className="text-gray-300 text-xs shrink-0">{formatDate(activity.occurred_at)}</span>
          </div>
          {activity.description && <p className="text-gray-400 text-xs mt-0.5">{activity.description}</p>}
          {activity.outcome && <p className="text-indigo-400 text-xs mt-0.5">{activity.outcome}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 group">
      <div className={cn('flex items-center justify-center w-6 h-6 rounded-full shrink-0 mt-0.5', TYPE_COLORS[activity.type])}>
        {TYPE_ICONS[activity.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="text-gray-800 text-sm font-medium">{activity.title}</p>
          <span className="text-gray-400 text-xs shrink-0">{formatDate(activity.occurred_at)}</span>
          {!isSystemEntry && (
            <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button onClick={() => setEditing(true)} className="text-gray-300 hover:text-indigo-500 p-0.5 rounded">
                <Pencil size={11} />
              </button>
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)} className="text-gray-300 hover:text-red-500 p-0.5 rounded">
                  <Trash2 size={11} />
                </button>
              ) : (
                <span className="flex items-center gap-1 text-xs text-red-600">
                  Delete?
                  <button onClick={handleDelete} disabled={isPending} className="font-semibold hover:underline">Yes</button>
                  <button onClick={() => setConfirmDelete(false)} className="text-gray-400 hover:underline">No</button>
                </span>
              )}
            </div>
          )}
        </div>
        {activity.description && <p className="text-gray-500 text-xs mt-0.5">{activity.description}</p>}
        {activity.outcome && (
          <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1">
            <ArrowRight size={10} /> {activity.outcome}
          </p>
        )}
        {activity.profiles && <p className="text-gray-300 text-xs mt-0.5">{activity.profiles.name}</p>}
      </div>
    </div>
  )
}

// ── Next Action Card ───────────────────────────────────────────────────────────
function NextActionCard({ opportunityId, nextAction, nextActionDate, onRefresh, autoEdit = false }: {
  opportunityId: string
  nextAction: string | null
  nextActionDate: string | null
  onRefresh: () => void
  autoEdit?: boolean
}) {
  const [editing, setEditing] = useState(autoEdit)
  const [actionText, setActionText] = useState(nextAction ?? '')
  const [actionDate, setActionDate] = useState(nextActionDate ?? '')
  const [isPending, startTransition] = useTransition()
  const overdue = isOverdue(nextActionDate)

  function handleSave() {
    startTransition(async () => {
      await updateNextAction(opportunityId, actionText || null, actionDate || null)
      setEditing(false)
      onRefresh()
    })
  }

  const inputCls = 'w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500'

  if (editing) {
    return (
      <div className={cn('rounded-lg border p-3 space-y-2', overdue ? 'bg-red-50 border-red-200' : 'bg-indigo-50 border-indigo-200')}>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Next Action</p>
        <input value={actionText} onChange={e => setActionText(e.target.value)} placeholder="e.g. Send proposal draft" className={inputCls} />
        <input type="date" value={actionDate} onChange={e => setActionDate(e.target.value)} className={inputCls} />
        <div className="flex gap-2">
          <button onClick={() => setEditing(false)} className="flex items-center gap-1 text-xs text-gray-500 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:text-gray-700 bg-white">
            <X size={11} /> Cancel
          </button>
          <button onClick={handleSave} disabled={isPending} className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg px-2.5 py-1.5">
            {isPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Save
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg border p-3 group', overdue ? 'bg-red-50 border-red-200' : 'bg-indigo-50/60 border-indigo-100')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn('w-6 h-6 rounded-full shrink-0 flex items-center justify-center', overdue ? 'bg-red-100 text-red-500' : 'bg-indigo-100 text-indigo-500')}>
            <Calendar size={12} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className={cn('text-xs font-semibold uppercase tracking-wide', overdue ? 'text-red-500' : 'text-indigo-500')}>
                Next Action {overdue && '· Overdue'}
              </p>
            </div>
            <p className={cn('text-sm font-medium mt-0.5', overdue ? 'text-red-700' : 'text-gray-800')}>
              {nextAction ?? '—'}
            </p>
            {nextActionDate && (
              <p className={cn('text-xs mt-0.5', overdue ? 'text-red-400' : 'text-indigo-400')}>
                {formatDate(nextActionDate)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            disabled={isPending}
            onClick={() => startTransition(async () => {
              await updateNextAction(opportunityId, null, null)
              onRefresh()
            })}
            title="Mark as done"
            className={cn(
              'flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-md transition-all disabled:opacity-50',
              overdue
                ? 'bg-red-100 text-red-500 hover:bg-green-100 hover:text-green-600'
                : 'opacity-0 group-hover:opacity-100 text-gray-300 hover:text-green-600 hover:bg-green-50'
            )}
          >
            {isPending ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
            <span>Done</span>
          </button>
          <button
            onClick={() => setEditing(true)}
            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-indigo-500 transition-all p-0.5 rounded"
            title="Edit next action"
          >
            <Pencil size={11} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Feed ──────────────────────────────────────────────────────────────────
export function ActivityFeed({ opportunityId, activities, nextAction, nextActionDate }: ActivityFeedProps) {
  const [showLogForm, setShowLogForm] = useState(false)
  const [showNextActionForm, setShowNextActionForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    const form = e.currentTarget
    startTransition(async () => {
      const result = await addActivity(opportunityId, fd)
      if (result.error) {
        setError(result.error)
      } else {
        setShowLogForm(false)
        form.reset()
        router.refresh()
      }
    })
  }

  const sorted = [...activities].sort((a, b) =>
    new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
  )

  const inputCls = 'w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500'
  const hasNextAction = nextAction || nextActionDate

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Actions</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowNextActionForm(v => !v); setShowLogForm(false) }}
            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-600 transition-colors border border-indigo-100 rounded-lg px-2 py-1 hover:bg-indigo-50"
          >
            <Calendar size={11} /> Next action
          </button>
          <button
            onClick={() => { setShowLogForm(v => !v); setShowNextActionForm(false) }}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-500 transition-colors"
          >
            <Plus size={12} /> Log activity
          </button>
        </div>
      </div>

      {/* Set next action inline form */}
      {showNextActionForm && (
        <NextActionCard
          opportunityId={opportunityId}
          nextAction={nextAction ?? null}
          nextActionDate={nextActionDate ?? null}
          autoEdit={true}
          onRefresh={() => { router.refresh(); setShowNextActionForm(false) }}
        />
      )}

      {/* Log activity form */}
      {showLogForm && (
        <form onSubmit={handleSubmit} className="mb-4 bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              <select name="type" required className={inputCls}>
                {(['call', 'email', 'meeting', 'note', 'outreach'] as ActivityType[]).map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date</label>
              <input name="occurred_at" type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Title *</label>
            <input name="title" required placeholder="e.g. Intro call with Head of CX" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Notes</label>
            <textarea name="description" rows={2} placeholder="What happened?" className={`${inputCls} resize-none`} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Outcome</label>
            <input name="outcome" placeholder="e.g. Prospect requested a demo" className={inputCls} />
          </div>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowLogForm(false)}
              className="flex-1 border border-slate-200 text-gray-500 text-sm py-2 rounded-lg hover:text-gray-800">Cancel</button>
            <button type="submit" disabled={isPending}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm py-2 rounded-lg flex items-center justify-center gap-2">
              {isPending ? <><Loader2 size={13} className="animate-spin" /> Logging…</> : 'Log'}
            </button>
          </div>
        </form>
      )}

      {/* Activity list with next action pinned at top */}
      <div className="space-y-3 mt-2">
        {hasNextAction && !showNextActionForm && (
          <NextActionCard
            opportunityId={opportunityId}
            nextAction={nextAction ?? null}
            nextActionDate={nextActionDate ?? null}
            onRefresh={() => router.refresh()}
          />
        )}

        {sorted.map(activity => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            opportunityId={opportunityId}
            onRefresh={() => router.refresh()}
          />
        ))}

        {sorted.length === 0 && !hasNextAction && (
          <p className="text-gray-300 text-sm text-center py-6">No activity logged yet</p>
        )}
      </div>
    </div>
  )
}
