'use client'

import { useState, useMemo } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, addWeeks, subWeeks,
} from 'date-fns'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Calendar as CalIcon, MapPin, Video, Clock, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Opportunity, CalendarEventType } from '@/types'

// ─── Stage colours (bg / text) ────────────────────────────────────────────────
const STAGE_CHIP: Record<number, { bg: string; text: string; dot: string }> = {
  1: { bg: 'bg-slate-100',  text: 'text-slate-700',  dot: 'bg-slate-400'   },
  2: { bg: 'bg-blue-100',   text: 'text-blue-800',   dot: 'bg-blue-500'    },
  3: { bg: 'bg-violet-100', text: 'text-violet-800', dot: 'bg-violet-500'  },
  4: { bg: 'bg-amber-100',  text: 'text-amber-800',  dot: 'bg-amber-500'   },
  5: { bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500'  },
  6: { bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500'   },
  7: { bg: 'bg-emerald-100',text: 'text-emerald-800',dot: 'bg-emerald-600' },
}

// ─── Event type meta ─────────────────────────────────────────────────────────
const EVENT_TYPE_META: Record<CalendarEventType, { icon: React.ElementType; label: string; chip: string }> = {
  action:           { icon: ClipboardList, label: 'Action',           chip: '' },
  meeting_physical: { icon: MapPin,        label: 'Physical Meeting', chip: 'bg-violet-100 text-violet-700 border-violet-200' },
  meeting_online:   { icon: Video,         label: 'Online Meeting',   chip: 'bg-blue-100 text-blue-700 border-blue-200'       },
  deadline:         { icon: Clock,         label: 'Deadline',         chip: 'bg-red-100 text-red-700 border-red-200'          },
}

type View = 'month' | 'week' | 'agenda'
const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface CalEvent {
  id: string
  title: string
  company: string
  date: Date
  stage: number
  eventType: CalendarEventType
  opp: Opportunity
}

interface CalendarViewProps {
  opportunities: Opportunity[]
}

// ─── Event chip ───────────────────────────────────────────────────────────────
function EventChip({
  event, compact = false, onClick,
}: { event: CalEvent; compact?: boolean; onClick: () => void }) {
  const col  = STAGE_CHIP[event.stage] ?? STAGE_CHIP[1]
  const meta = EVENT_TYPE_META[event.eventType] ?? EVENT_TYPE_META.action
  const Icon = meta.icon

  // Deadlines get a red left-border override; meetings get icons
  const isDeadline = event.eventType === 'deadline'
  const isMeeting  = event.eventType === 'meeting_physical' || event.eventType === 'meeting_online'

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className={cn(
        'flex items-center gap-1.5 w-full text-left rounded-md px-1.5 py-0.5 truncate transition-opacity hover:opacity-80',
        isDeadline ? 'bg-red-50 border border-red-200' : col.bg,
        compact ? 'text-[10px]' : 'text-xs'
      )}
    >
      {isMeeting || isDeadline
        ? <Icon size={compact ? 9 : 11} className={cn('shrink-0', isDeadline ? 'text-red-500' : col.text)} />
        : <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', col.dot)} />
      }
      <span className={cn('truncate font-medium', isDeadline ? 'text-red-700' : col.text)}>
        {compact ? event.company : `${event.company}: ${event.opp.next_action ?? 'Follow up'}`}
      </span>
    </button>
  )
}

// ─── Month view ───────────────────────────────────────────────────────────────
function MonthView({
  current, events, selectedDay, onSelectDay,
}: {
  current: Date
  events: CalEvent[]
  selectedDay: Date | null
  onSelectDay: (d: Date) => void
}) {
  const router = useRouter()

  const monthStart = startOfMonth(current)
  const monthEnd   = endOfMonth(current)
  const gridStart  = startOfWeek(monthStart)
  const gridEnd    = endOfWeek(monthEnd)
  const days       = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>()
    for (const e of events) {
      const key = format(e.date, 'yyyy-MM-dd')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return map
  }, [events])

  const MAX_VISIBLE = 3

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-white">
        {WEEK_DAYS.map(d => (
          <div key={d} className="py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr min-h-0">
        {days.map(day => {
          const key      = format(day, 'yyyy-MM-dd')
          const dayEvts  = eventsByDay.get(key) ?? []
          const inMonth  = isSameMonth(day, current)
          const isSelected = selectedDay && isSameDay(day, selectedDay)
          const todayDay = isToday(day)

          return (
            <div
              key={key}
              onClick={() => onSelectDay(day)}
              className={cn(
                'border-b border-r border-slate-100 p-1.5 flex flex-col gap-1 cursor-pointer transition-colors',
                !inMonth && 'bg-slate-50/60',
                isSelected && 'bg-blue-50/60',
                'hover:bg-slate-50'
              )}
            >
              {/* Date number */}
              <div className="flex items-center justify-start mb-0.5">
                <span className={cn(
                  'text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full leading-none',
                  todayDay   ? 'bg-blue-600 text-white'  :
                  !inMonth   ? 'text-gray-300'            :
                  isSelected ? 'text-blue-700 font-bold'  :
                               'text-gray-700'
                )}>
                  {format(day, 'd')}
                </span>
              </div>

              {/* Events */}
              {dayEvts.slice(0, MAX_VISIBLE).map(evt => (
                <EventChip
                  key={evt.id}
                  event={evt}
                  compact
                  onClick={() => router.push(`/opportunities/${evt.id}`)}
                />
              ))}
              {dayEvts.length > MAX_VISIBLE && (
                <button
                  onClick={e => { e.stopPropagation(); onSelectDay(day) }}
                  className="text-[10px] text-blue-500 hover:text-blue-700 font-medium px-1 text-left"
                >
                  +{dayEvts.length - MAX_VISIBLE} more
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Week view ────────────────────────────────────────────────────────────────
function WeekView({
  current, events,
}: { current: Date; events: CalEvent[] }) {
  const router = useRouter()
  const weekStart = startOfWeek(current)
  const weekEnd   = endOfWeek(current)
  const days      = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>()
    for (const e of events) {
      const key = format(e.date, 'yyyy-MM-dd')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return map
  }, [events])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-white shrink-0">
        {days.map(day => {
          const todayDay = isToday(day)
          return (
            <div key={day.toString()} className="flex flex-col items-center py-3 border-r border-slate-100 last:border-r-0">
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">
                {format(day, 'EEE')}
              </span>
              <span className={cn(
                'w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold',
                todayDay ? 'bg-blue-600 text-white' : 'text-gray-700'
              )}>
                {format(day, 'd')}
              </span>
            </div>
          )
        })}
      </div>

      {/* Event columns */}
      <div className="flex-1 grid grid-cols-7 overflow-y-auto min-h-0">
        {days.map(day => {
          const key     = format(day, 'yyyy-MM-dd')
          const dayEvts = eventsByDay.get(key) ?? []
          const todayDay = isToday(day)
          return (
            <div
              key={key}
              className={cn(
                'border-r border-slate-100 last:border-r-0 p-2 flex flex-col gap-1.5',
                todayDay && 'bg-blue-50/30'
              )}
            >
              {dayEvts.length === 0 ? (
                <div className="flex-1 flex items-start pt-3 justify-center">
                  <span className="text-[10px] text-slate-200 select-none">—</span>
                </div>
              ) : (
                dayEvts.map(evt => (
                  <EventChip
                    key={evt.id}
                    event={evt}
                    onClick={() => router.push(`/opportunities/${evt.id}`)}
                  />
                ))
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Agenda view ──────────────────────────────────────────────────────────────
function AgendaView({ events }: { events: CalEvent[] }) {
  const router = useRouter()

  const sorted = useMemo(() =>
    [...events].sort((a, b) => a.date.getTime() - b.date.getTime()),
    [events]
  )

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, CalEvent[]>()
    for (const e of sorted) {
      const key = format(e.date, 'yyyy-MM-dd')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return [...map.entries()]
  }, [sorted])

  if (grouped.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 text-gray-400">
        <CalIcon size={36} className="text-slate-200" />
        <p className="text-sm">No upcoming actions scheduled</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {grouped.map(([key, evts]) => {
        const date = new Date(key)
        const todayDay = isToday(date)
        return (
          <div key={key} className="flex border-b border-slate-100 last:border-b-0">
            {/* Date label */}
            <div className={cn(
              'w-28 shrink-0 px-5 py-4 flex flex-col items-center justify-start border-r border-slate-100',
              todayDay && 'bg-blue-50/50'
            )}>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                {format(date, 'EEE')}
              </span>
              <span className={cn(
                'text-2xl font-light mt-0.5 leading-none',
                todayDay ? 'text-blue-600' : 'text-gray-700'
              )}>
                {format(date, 'd')}
              </span>
              <span className="text-[10px] text-gray-400 mt-0.5">
                {format(date, 'MMM')}
              </span>
            </div>

            {/* Events */}
            <div className="flex-1 py-2 px-4 space-y-2">
              {evts.map(evt => {
                const col  = STAGE_CHIP[evt.stage] ?? STAGE_CHIP[1]
                const meta = EVENT_TYPE_META[evt.eventType] ?? EVENT_TYPE_META.action
                const Icon = meta.icon
                const isDeadline = evt.eventType === 'deadline'
                return (
                  <button
                    key={evt.id}
                    onClick={() => router.push(`/opportunities/${evt.id}`)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-3 rounded-xl border bg-white hover:bg-blue-50/40 transition-colors text-left group',
                      isDeadline ? 'border-red-200 hover:border-red-300' : 'border-slate-100 hover:border-blue-200'
                    )}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                      isDeadline ? 'bg-red-50' : col.bg
                    )}>
                      <Icon size={14} className={isDeadline ? 'text-red-500' : col.text} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {evt.opp.next_action ?? 'Follow up'}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {evt.company} · <span className="text-gray-500">{meta.label}</span>
                      </p>
                    </div>
                    <span className={cn(
                      'text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0',
                      isDeadline ? 'bg-red-100 text-red-700' : `${col.bg} ${col.text}`
                    )}>
                      Stage {evt.stage}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Side panel — day detail ──────────────────────────────────────────────────
function DayPanel({
  day, events, onClose,
}: { day: Date; events: CalEvent[]; onClose: () => void }) {
  const router = useRouter()
  const dayEvts = events.filter(e => isSameDay(e.date, day))

  return (
    <div className="w-72 shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{format(day, 'EEEE')}</p>
          <p className="text-lg font-semibold text-gray-900 leading-tight">
            {format(day, 'd MMMM yyyy')}
          </p>
        </div>
        <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-xl leading-none">×</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {dayEvts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-300">
            <CalIcon size={28} />
            <p className="text-xs text-center">No actions on this day</p>
          </div>
        ) : dayEvts.map(evt => {
          const col  = STAGE_CHIP[evt.stage] ?? STAGE_CHIP[1]
          const meta = EVENT_TYPE_META[evt.eventType] ?? EVENT_TYPE_META.action
          const Icon = meta.icon
          const isDeadline = evt.eventType === 'deadline'
          return (
            <button
              key={evt.id}
              onClick={() => router.push(`/opportunities/${evt.id}`)}
              className={cn(
                'w-full flex items-start gap-3 p-3 rounded-xl border hover:bg-blue-50/40 transition-colors text-left',
                isDeadline ? 'border-red-200 bg-red-50/20' : 'border-slate-100 hover:border-blue-200'
              )}
            >
              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5', isDeadline ? 'bg-red-100' : col.bg)}>
                <Icon size={13} className={isDeadline ? 'text-red-500' : col.text} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{evt.opp.next_action ?? 'Follow up'}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{evt.company}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', isDeadline ? 'bg-red-100 text-red-700' : `${col.bg} ${col.text}`)}>
                    Stage {evt.stage}
                  </span>
                  <span className="text-[10px] text-gray-400">{meta.label}</span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Mini month picker in header ─────────────────────────────────────────────
function MiniMonthNav({
  current, onPrev, onNext, onToday,
}: { current: Date; onPrev: () => void; onNext: () => void; onToday: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onToday}
        className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
      >
        Today
      </button>
      <div className="flex items-center">
        <button
          onClick={onPrev}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-gray-500"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={onNext}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-gray-500"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <h2 className="text-lg font-semibold text-gray-900 min-w-[160px]">
        {format(current, 'MMMM yyyy')}
      </h2>
    </div>
  )
}

type EventFilter = 'all' | 'meeting_physical' | 'meeting_online' | 'deadline' | 'action'

const FILTER_OPTIONS: { value: EventFilter; label: string; icon: React.ElementType; chip: string }[] = [
  { value: 'all',              label: 'All',             icon: CalIcon,       chip: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'meeting_physical', label: 'Physical',        icon: MapPin,        chip: 'bg-violet-100 text-violet-700 border-violet-200' },
  { value: 'meeting_online',   label: 'Online',          icon: Video,         chip: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'deadline',         label: 'Deadlines',       icon: Clock,         chip: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'action',           label: 'Actions',         icon: ClipboardList, chip: 'bg-amber-100 text-amber-700 border-amber-200' },
]

// ─── Main export ──────────────────────────────────────────────────────────────
export function CalendarView({ opportunities }: CalendarViewProps) {
  const [view, setView] = useState<View>('month')
  const [current, setCurrent] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [eventFilter, setEventFilter] = useState<EventFilter>('all')

  const allEvents: CalEvent[] = useMemo(() =>
    opportunities
      .filter(o => o.next_action_date)
      .map(o => ({
        id: o.id,
        title: `${o.company_name}: ${o.next_action ?? 'Follow up'}`,
        company: o.company_name,
        date: new Date(o.next_action_date!),
        stage: o.stage,
        eventType: (o.calendar_event_type ?? 'action') as CalendarEventType,
        opp: o,
      })),
    [opportunities]
  )

  const events = useMemo(() =>
    eventFilter === 'all' ? allEvents : allEvents.filter(e => e.eventType === eventFilter),
    [allEvents, eventFilter]
  )

  function navigate(dir: 'prev' | 'next') {
    if (view === 'month') {
      setCurrent(d => dir === 'prev' ? subMonths(d, 1) : addMonths(d, 1))
    } else if (view === 'week') {
      setCurrent(d => dir === 'prev' ? subWeeks(d, 1) : addWeeks(d, 1))
    }
  }

  function onSelectDay(day: Date) {
    setSelectedDay(prev => prev && isSameDay(prev, day) ? null : day)
  }

  const showPanel = selectedDay !== null && view !== 'agenda'

  return (
    <div className="flex flex-col h-full bg-white">
      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-2 px-5 py-3 border-b border-slate-200 shrink-0 bg-white">
        <div className="flex items-center justify-between">
          <MiniMonthNav
            current={current}
            onPrev={() => navigate('prev')}
            onNext={() => navigate('next')}
            onToday={() => { setCurrent(new Date()); setSelectedDay(new Date()) }}
          />

          {/* View switcher */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-0.5">
            {(['month', 'week', 'agenda'] as View[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize',
                  view === v
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Event type filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {FILTER_OPTIONS.map(({ value, label, icon: Icon, chip }) => (
            <button
              key={value}
              onClick={() => setEventFilter(value)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                eventFilter === value
                  ? chip + ' shadow-sm'
                  : 'bg-white text-gray-400 border-slate-200 hover:border-slate-300'
              )}
            >
              <Icon size={11} />
              {label}
              {value !== 'all' && (
                <span className="ml-0.5 opacity-60">
                  {allEvents.filter(e => e.eventType === value).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Calendar body + optional day panel ── */}
      <div className="flex flex-1 min-h-0">
        <div className="flex flex-col flex-1 min-h-0 min-w-0">
          {view === 'month' && (
            <MonthView
              current={current}
              events={events}
              selectedDay={selectedDay}
              onSelectDay={onSelectDay}
            />
          )}
          {view === 'week' && (
            <WeekView current={current} events={events} />
          )}
          {view === 'agenda' && (
            <AgendaView events={events} />
          )}
        </div>

        {showPanel && (
          <DayPanel
            day={selectedDay!}
            events={events}
            onClose={() => setSelectedDay(null)}
          />
        )}
      </div>
    </div>
  )
}
