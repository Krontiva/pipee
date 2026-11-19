import Link from 'next/link'
import { AlertTriangle, Calendar, CheckCircle2, Clock, TrendingUp } from 'lucide-react'
import { formatDate, initials, isOverdue } from '@/lib/utils'
import type { Opportunity, Profile } from '@/types'

interface TeamActivityFeedProps {
  opportunities: Opportunity[]
  profiles: Profile[]
}

export function TeamActivityFeed({ opportunities, profiles }: TeamActivityFeedProps) {
  const today = new Date().toDateString()

  const reps = profiles
    .filter(p => p.role === 'bd_rep' && p.is_active)
    .map(p => {
      const myOpps = opportunities.filter(o => o.assigned_to === p.id)
      const active = myOpps.filter(o => o.status === 'active')
      const stalled = myOpps.filter(o => o.status === 'stalled')

      const overdueActions = active.filter(o =>
        o.next_action && o.next_action_date && isOverdue(o.next_action_date)
      )
      const dueTodayActions = active.filter(o =>
        o.next_action && o.next_action_date &&
        new Date(o.next_action_date).toDateString() === today &&
        !isOverdue(o.next_action_date)
      )
      const upcomingActions = active.filter(o =>
        o.next_action && o.next_action_date &&
        !isOverdue(o.next_action_date) &&
        new Date(o.next_action_date).toDateString() !== today
      )
      const noAction = active.filter(o => !o.next_action)

      return { profile: p, active, stalled, overdueActions, dueTodayActions, upcomingActions, noAction }
    })

  if (reps.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Team Activity</p>
        <p className="text-gray-400 text-sm text-center py-6">No BD reps configured yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">What the Team is Working On</p>
        <p className="text-xs text-gray-400">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
      </div>

      <div className="space-y-4">
        {reps.map(({ profile, active, stalled, overdueActions, dueTodayActions, upcomingActions, noAction }) => (
          <div key={profile.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
            {/* Rep header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs text-white font-semibold shrink-0">
                {initials(profile.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-800 text-sm font-semibold">{profile.name}</p>
                <p className="text-gray-400 text-xs">{active.length} active deal{active.length !== 1 ? 's' : ''}{stalled.length > 0 ? ` · ${stalled.length} stalled` : ''}</p>
              </div>
              {/* Status pill */}
              {overdueActions.length > 0 ? (
                <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                  <AlertTriangle size={10} /> {overdueActions.length} overdue
                </span>
              ) : dueTodayActions.length > 0 ? (
                <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                  <Clock size={10} /> {dueTodayActions.length} due today
                </span>
              ) : active.length > 0 ? (
                <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                  <CheckCircle2 size={10} /> On track
                </span>
              ) : null}
            </div>

            {/* Action items */}
            <div className="space-y-1.5">
              {/* Overdue */}
              {overdueActions.map(o => (
                <Link key={o.id} href={`/opportunities/${o.id}`} className="flex items-start gap-2 p-2 rounded-lg bg-red-50 border border-red-100 hover:border-red-300 transition-colors group">
                  <AlertTriangle size={12} className="text-red-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-red-700 truncate">{o.title}</p>
                    <p className="text-xs text-red-400 truncate">{o.next_action} · due {formatDate(o.next_action_date!)}</p>
                  </div>
                </Link>
              ))}

              {/* Due today */}
              {dueTodayActions.map(o => (
                <Link key={o.id} href={`/opportunities/${o.id}`} className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-100 hover:border-amber-300 transition-colors group">
                  <Clock size={12} className="text-amber-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{o.title}</p>
                    <p className="text-xs text-amber-500 truncate">{o.next_action} · today</p>
                  </div>
                </Link>
              ))}

              {/* Upcoming */}
              {upcomingActions.slice(0, 3).map(o => (
                <Link key={o.id} href={`/opportunities/${o.id}`} className="flex items-start gap-2 p-2 rounded-lg bg-white border border-slate-100 hover:border-indigo-200 transition-colors group">
                  <Calendar size={12} className="text-indigo-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{o.title}</p>
                    <p className="text-xs text-gray-400 truncate">{o.next_action} · {formatDate(o.next_action_date!)}</p>
                  </div>
                </Link>
              ))}

              {/* No next action */}
              {noAction.length > 0 && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-100 border border-slate-200">
                  <TrendingUp size={12} className="text-slate-400 shrink-0" />
                  <p className="text-xs text-slate-500">{noAction.length} deal{noAction.length !== 1 ? 's' : ''} with no next action set</p>
                </div>
              )}

              {active.length === 0 && stalled.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">No active deals</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
