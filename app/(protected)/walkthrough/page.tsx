'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronRight, ChevronLeft, LayoutDashboard, Columns3, Search,
  CalendarDays, CheckCircle2, Circle, ArrowRight, Zap, Target,
  Users, FileText, BarChart3, Bell, Plus, MessageSquare,
  Phone, Mail, Star, Trophy, AlertTriangle, Sparkles, BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STAGE_META } from '@/types'

// ─── Stage colours ────────────────────────────────────────────────────────────
const STAGE_COLOURS: Record<number, { bg: string; text: string; border: string; dot: string }> = {
  1: { bg: 'bg-slate-100',   text: 'text-slate-700',  border: 'border-slate-200', dot: 'bg-slate-400' },
  2: { bg: 'bg-blue-50',     text: 'text-blue-700',   border: 'border-blue-200',  dot: 'bg-blue-500'  },
  3: { bg: 'bg-violet-50',   text: 'text-violet-700', border: 'border-violet-200',dot: 'bg-violet-500'},
  4: { bg: 'bg-amber-50',    text: 'text-amber-700',  border: 'border-amber-200', dot: 'bg-amber-500' },
  5: { bg: 'bg-orange-50',   text: 'text-orange-700', border: 'border-orange-200',dot: 'bg-orange-500'},
  6: { bg: 'bg-green-50',    text: 'text-green-700',  border: 'border-green-200', dot: 'bg-green-500' },
  7: { bg: 'bg-emerald-50',  text: 'text-emerald-700',border: 'border-emerald-200',dot:'bg-emerald-600'},
}

const MEDDIC = [
  { letter: 'M', label: 'Metrics',         desc: 'What measurable value does the prospect want to achieve?',      color: 'bg-blue-500' },
  { letter: 'E', label: 'Economic Buyer',  desc: 'Who has final budget authority and signs off the deal?',        color: 'bg-violet-500' },
  { letter: 'D', label: 'Decision Criteria', desc: 'What criteria will they use to choose a vendor?',            color: 'bg-amber-500' },
  { letter: 'D', label: 'Decision Process', desc: 'What is the buying process — steps, timeline, approvals?',    color: 'bg-orange-500' },
  { letter: 'I', label: 'Identified Pain', desc: 'What is the explicit business problem driving urgency?',       color: 'bg-red-500' },
  { letter: 'C', label: 'Champion',        desc: 'Who inside the account is selling this deal for you?',         color: 'bg-green-500' },
]

// ─── Slide definitions ────────────────────────────────────────────────────────
type Slide = {
  id: string
  title: string
  subtitle?: string
  content: React.ReactNode
}

function WelcomeSlide() {
  return (
    <div className="flex flex-col items-center text-center gap-6 py-4">
      <div className="w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
        <span className="text-white font-bold text-4xl">K</span>
      </div>
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Welcome to Pipee</h2>
        <p className="text-gray-500 mt-2 text-lg max-w-lg mx-auto">
          Your team&apos;s command centre for tracking every deal from first contact to signed contract.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-4 w-full max-w-lg mt-2">
        {[
          { icon: LayoutDashboard, label: 'Live Dashboard',  desc: 'Pipeline at a glance' },
          { icon: Columns3,        label: '7-Stage Kanban',  desc: 'Drag deals forward'   },
          { icon: BarChart3,       label: 'MEDDIC Scoring',  desc: 'Qualify every deal'   },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Icon size={18} className="text-indigo-600" />
            </div>
            <p className="font-semibold text-sm text-gray-800">{label}</p>
            <p className="text-xs text-gray-400">{desc}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-400 italic">Use the arrows below or keyboard ← → to navigate slides</p>
    </div>
  )
}

function DashboardSlide() {
  return (
    <div className="space-y-5">
      <p className="text-gray-600 text-sm leading-relaxed">
        The <strong className="text-gray-900">Dashboard</strong> is your morning briefing. Open it every day to see where your pipeline stands and what needs urgent attention.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: BarChart3,     color: 'bg-indigo-50 text-indigo-600', title: 'Pipeline Metrics',   desc: 'Total active deal value, won deals this period, and win rate across the team.' },
          { icon: AlertTriangle, color: 'bg-red-50 text-red-500',       title: 'Stalled Deal Alerts',desc: 'Any deal sitting in a stage longer than 2× its target time appears here in red.' },
          { icon: Users,         color: 'bg-violet-50 text-violet-600', title: 'BDO Leaderboard',    desc: 'See each rep\'s active deal count, pipeline value, and win rate side by side.' },
          { icon: BarChart3,     color: 'bg-amber-50 text-amber-600',   title: 'Stage Funnel Chart', desc: 'Conversion rates between stages — spot where deals are dropping off.' },
        ].map(({ icon: Icon, color, title, desc }) => (
          <div key={title} className="flex gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', color)}>
              <Icon size={16} />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-800">{title}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex gap-3">
        <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700">
          <strong>Pro tip:</strong> A deal is stalled when it has been in a stage more than 2× the target duration. Stalled deals need immediate action — reach out, schedule a call, or log a note.
        </p>
      </div>
    </div>
  )
}

function PipelineOverviewSlide() {
  const [active, setActive] = useState<number | null>(null)
  return (
    <div className="space-y-4">
      <p className="text-gray-600 text-sm leading-relaxed">
        Every deal moves through <strong className="text-gray-900">7 stages</strong>. Click a stage to see what it&apos;s for and how long it should take.
      </p>
      <div className="flex flex-col gap-2">
        {Object.entries(STAGE_META).map(([n, meta]) => {
          const num = Number(n)
          const col = STAGE_COLOURS[num]
          const isOpen = active === num
          return (
            <div key={num}>
              <button
                onClick={() => setActive(isOpen ? null : num)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left',
                  isOpen ? `${col.bg} ${col.border}` : 'bg-white border-slate-200 hover:bg-slate-50'
                )}
              >
                <span className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0', col.dot)}>
                  {num}
                </span>
                <span className={cn('flex-1 text-sm font-medium', isOpen ? col.text : 'text-gray-700')}>
                  {meta.name}
                </span>
                <span className="text-xs text-gray-400">{meta.targetDays}d target</span>
                <ChevronRight size={14} className={cn('text-gray-300 transition-transform', isOpen && 'rotate-90')} />
              </button>
              {isOpen && (
                <div className={cn('mx-2 rounded-b-xl border-x border-b px-4 py-3 space-y-2', col.border, col.bg)}>
                  <p className="text-sm text-gray-600 italic">{meta.purpose}</p>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Exit criteria</p>
                  <ul className="space-y-1">
                    {meta.exitCriteria.map(c => (
                      <li key={c} className="flex items-start gap-2 text-xs text-gray-600">
                        <CheckCircle2 size={12} className={cn('shrink-0 mt-0.5', col.text)} />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MEDDICSlide() {
  const [flipped, setFlipped] = useState<number | null>(null)
  return (
    <div className="space-y-4">
      <p className="text-gray-600 text-sm leading-relaxed">
        <strong className="text-gray-900">MEDDIC</strong> is your qualification framework. Before a deal can advance from Stage 2, you must score ≥ 4/6 dimensions — and <em>Identified Pain</em> and <em>Economic Buyer</em> are mandatory.
      </p>
      <div className="grid grid-cols-3 gap-3">
        {MEDDIC.map(({ letter, label, desc, color }, i) => (
          <button
            key={label}
            onClick={() => setFlipped(flipped === i ? null : i)}
            className="rounded-xl border border-slate-200 p-3.5 text-left hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group"
          >
            {flipped === i ? (
              <p className="text-xs text-gray-600 leading-relaxed">{desc}</p>
            ) : (
              <div className="flex flex-col gap-2">
                <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm', color)}>
                  {letter}
                </span>
                <p className="font-semibold text-sm text-gray-800">{label}</p>
                <p className="text-[10px] text-gray-400 group-hover:text-indigo-400">Tap to learn more →</p>
              </div>
            )}
          </button>
        ))}
      </div>
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 flex gap-3">
        <Star size={15} className="text-indigo-500 shrink-0 mt-0.5" />
        <p className="text-sm text-indigo-700">
          Find the MEDDIC scorecard inside any deal&apos;s detail page. Fill it in after every discovery call — it unlocks stage advancement.
        </p>
      </div>
    </div>
  )
}

function CreatingDealSlide() {
  return (
    <div className="space-y-5">
      <p className="text-gray-600 text-sm leading-relaxed">
        Creating a new deal takes 30 seconds. Hit <strong className="text-gray-900">+ New Deal</strong> in the top-right corner of any page.
      </p>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
          <span className="text-sm font-semibold text-gray-700">New Opportunity</span>
          <div className="w-5 h-5 rounded-full bg-slate-200" />
        </div>
        <div className="p-4 space-y-3">
          {[
            { label: 'Deal Title *',   placeholder: 'e.g. Ecobank Customer Engagement Platform', required: true  },
            { label: 'Company *',      placeholder: 'Company name',                               required: true  },
            { label: 'Deal Value',     placeholder: 'e.g. 50,000',                                required: false },
            { label: 'Next Action',    placeholder: 'e.g. Send intro email',                      required: false },
          ].map(({ label, placeholder, required }) => (
            <div key={label}>
              <p className="text-[10px] font-medium text-gray-500 mb-1">
                {label} {required && <span className="text-red-400">required</span>}
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-gray-400">{placeholder}</div>
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <div className="flex-1 bg-slate-100 rounded-lg py-2 text-xs text-center text-gray-400">Cancel</div>
            <div className="flex-1 bg-indigo-600 rounded-lg py-2 text-xs text-center text-white font-medium">Create Deal</div>
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-400 text-center">The deal opens at Stage 1 automatically — ready to move through the pipeline.</p>
    </div>
  )
}

function DealDetailSlide() {
  const [tab, setTab] = useState<'overview' | 'activity' | 'meddic' | 'documents'>('overview')
  const tabs = [
    { id: 'overview'   as const, label: 'Overview',   icon: Users       },
    { id: 'activity'   as const, label: 'Activity',   icon: MessageSquare },
    { id: 'meddic'     as const, label: 'MEDDIC',     icon: Star        },
    { id: 'documents'  as const, label: 'Documents',  icon: FileText    },
  ]
  const content: Record<typeof tab, React.ReactNode> = {
    overview: (
      <div className="space-y-3">
        <p className="text-sm text-gray-600">The Overview tab shows all contacts on the deal — Champion, Economic Buyer, and Stakeholders. Add everyone involved so nothing falls through the cracks.</p>
        {['Champion', 'Economic Buyer', 'Stakeholder'].map((role, i) => (
          <div key={role} className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700">
              {['C', 'E', 'S'][i]}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">{role}</p>
              <p className="text-[10px] text-gray-400">{['Your internal advocate', 'Signs the budget', 'Influences the decision'][i]}</p>
            </div>
          </div>
        ))}
      </div>
    ),
    activity: (
      <div className="space-y-3">
        <p className="text-sm text-gray-600">Log every interaction and track your next action — all in one place.</p>
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex items-start gap-2.5">
          <CalendarDays size={14} className="text-indigo-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-indigo-700">Next Action card</p>
            <p className="text-xs text-indigo-600/80 mt-0.5">Pinned at the top of the feed. Click &quot;Next action&quot; to set or update it. Turns red when overdue.</p>
          </div>
        </div>
        {[
          { icon: Phone,    label: 'Call',    color: 'text-blue-500 bg-blue-50'    },
          { icon: Mail,     label: 'Email',   color: 'text-violet-500 bg-violet-50' },
          { icon: Users,    label: 'Meeting', color: 'text-amber-500 bg-amber-50'  },
          { icon: FileText, label: 'Note',    color: 'text-gray-500 bg-slate-100'  },
        ].map(({ icon: Icon, label, color }) => (
          <div key={label} className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-xs', color)}>
              <Icon size={13} />
            </div>
            <span className="text-sm text-gray-700 font-medium">{label}</span>
          </div>
        ))}
      </div>
    ),
    meddic: (
      <div className="space-y-3">
        <p className="text-sm text-gray-600">Score each MEDDIC dimension as you gather information. The score badge updates live. ≥4 required to advance past Stage 2.</p>
        <div className="grid grid-cols-3 gap-2">
          {MEDDIC.map(({ letter, label, color }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg">
              <span className={cn('w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold', color)}>{letter}</span>
              <span className="text-[10px] text-gray-500 text-center">{label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    documents: (
      <div className="space-y-3">
        <p className="text-sm text-gray-600">Documents unlock at Stage 3. Contains the Discovery Brief and Proposal Tracker.</p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2.5">
          <Bell size={14} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">The tab shows a padlock icon at stages 1–2. Advance to Stage 3 (Discovery) to unlock it.</p>
        </div>
        {['Discovery Brief — context, pain points, success criteria', 'Proposal Tracker — version history, status, deal value'].map(item => (
          <div key={item} className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
            <CheckCircle2 size={14} className="text-slate-300 shrink-0" />
            <span className="text-xs text-gray-600">{item}</span>
          </div>
        ))}
      </div>
    ),
  }
  return (
    <div className="space-y-4">
      <p className="text-gray-600 text-sm leading-relaxed">
        Click any deal to open its detail page. The sticky header shows your stage progress — tap it to open the stage checklist. Below that, four tabs:
      </p>
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all',
              tab === id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>
      {content[tab]}
    </div>
  )
}

function AdvancingStagesSlide() {
  const [step, setStep] = useState(0)
  const steps = [
    { label: 'Open the deal',           desc: 'Click any deal card in the Pipeline or All Deals view.' },
    { label: 'Check exit criteria',     desc: 'The stage stepper at the top shows what\'s required to move forward. Green = done, grey = pending.' },
    { label: 'Fill in required data',   desc: 'Log activities, score MEDDIC, file a Discovery Brief — whatever the current stage demands.' },
    { label: 'Click "Advance Stage"',   desc: 'A checklist modal confirms all exit criteria are met before the deal moves.' },
    { label: 'Or drag on Kanban',       desc: 'Drag the card to the next column. If exit criteria aren\'t met, a warning will appear.' },
  ]
  return (
    <div className="space-y-4">
      <p className="text-gray-600 text-sm leading-relaxed">
        Advancing a deal is deliberate — every stage has <strong className="text-gray-900">exit criteria</strong> that must be met first.
      </p>
      <div className="flex flex-col gap-2">
        {steps.map((s, i) => (
          <button
            key={i}
            onClick={() => setStep(i === step ? -1 : i)}
            className={cn(
              'flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all',
              step === i ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:bg-slate-50'
            )}
          >
            <span className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5',
              step === i ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-gray-500'
            )}>{i + 1}</span>
            <div>
              <p className={cn('text-sm font-medium', step === i ? 'text-indigo-700' : 'text-gray-700')}>{s.label}</p>
              {step === i && <p className="text-xs text-gray-500 mt-1">{s.desc}</p>}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function CalendarSearchSlide() {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-indigo-500" />
          <h3 className="font-semibold text-gray-800">Calendar View</h3>
        </div>
        <p className="text-sm text-gray-600">Every deal with a <strong>Next Action Date</strong> appears on the calendar, colour-coded by stage. Use it to plan your week and ensure no follow-up slips.</p>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-7 gap-1 text-center">
          {['M','T','W','T','F','S','S'].map((d, i) => (
            <div key={i} className="text-[10px] font-semibold text-gray-400">{d}</div>
          ))}
          {[...Array(7)].map((_, i) => (
            <div key={i} className={cn('rounded text-[10px] py-1', i === 2 ? 'bg-indigo-100 text-indigo-700 font-semibold' : i === 4 ? 'bg-amber-100 text-amber-700' : i === 5 ? 'bg-violet-100 text-violet-700' : 'text-gray-400')}>
              {i + 12}
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-slate-100 pt-4 space-y-3">
        <div className="flex items-center gap-2">
          <Search size={16} className="text-indigo-500" />
          <h3 className="font-semibold text-gray-800">Command Palette (⌘K)</h3>
        </div>
        <p className="text-sm text-gray-600">Press <kbd className="bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-xs font-sans">⌘K</kbd> (or <kbd className="bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-xs font-sans">Ctrl+K</kbd>) from anywhere to instantly search deals and navigate pages.</p>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100">
            <Search size={13} className="text-gray-300" />
            <span className="text-sm text-gray-300">Search deals, companies, pages…</span>
          </div>
          <div className="p-2 space-y-0.5">
            {['Dashboard', 'Pipeline', 'All Deals'].map(item => (
              <div key={item} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-gray-500">
                <LayoutDashboard size={11} className="text-gray-300" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ReadySlide({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-6 py-4">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
        <Trophy size={36} className="text-white" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-900">You&apos;re ready to close deals.</h2>
        <p className="text-gray-500 mt-2 max-w-md mx-auto">
          Remember — keep your pipeline moving, fill in MEDDIC after every call, and never let a deal go stale.
        </p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <button
          onClick={onFinish}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          Go to Pipeline <ArrowRight size={16} />
        </button>
        <div className="grid grid-cols-3 gap-2 text-xs text-gray-400">
          {[
            '⌘K to search anytime',
            'Log every interaction',
            'Advance on evidence',
          ].map(tip => (
            <div key={tip} className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-2">
              {tip}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function WalkthroughPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)

  const slides: Slide[] = [
    {
      id: 'welcome',
      title: 'Welcome',
      content: <WelcomeSlide />,
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      subtitle: 'Your morning briefing',
      content: <DashboardSlide />,
    },
    {
      id: 'pipeline',
      title: 'The 7-Stage Pipeline',
      subtitle: 'Click a stage to explore',
      content: <PipelineOverviewSlide />,
    },
    {
      id: 'meddic',
      title: 'MEDDIC Qualification',
      subtitle: 'Tap a card to learn what each letter means',
      content: <MEDDICSlide />,
    },
    {
      id: 'advancing',
      title: 'Advancing a Deal',
      subtitle: 'Click each step to expand',
      content: <AdvancingStagesSlide />,
    },
    {
      id: 'new-deal',
      title: 'Creating a New Deal',
      subtitle: 'It takes 30 seconds',
      content: <CreatingDealSlide />,
    },
    {
      id: 'detail',
      title: 'Inside a Deal',
      subtitle: 'Switch tabs to explore each section',
      content: <DealDetailSlide />,
    },
    {
      id: 'calendar',
      title: 'Calendar & Search',
      subtitle: 'Stay organised and move fast',
      content: <CalendarSearchSlide />,
    },
    {
      id: 'ready',
      title: "You're Ready",
      content: <ReadySlide onFinish={() => router.push('/pipeline')} />,
    },
  ]

  const current = slides[step]
  const progress = ((step + 1) / slides.length) * 100

  function prev() { if (step > 0) setStep(s => s - 1) }
  function next() { if (step < slides.length - 1) setStep(s => s + 1) }

  return (
    <div
      className="flex flex-col h-full bg-slate-50"
      onKeyDown={e => {
        if (e.key === 'ArrowRight') next()
        if (e.key === 'ArrowLeft')  prev()
      }}
      tabIndex={0}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-indigo-500" />
          <h1 className="text-gray-900 font-semibold text-lg">Getting Started</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{step + 1} of {slides.length}</span>
          <button
            onClick={() => router.push('/pipeline')}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skip tour
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-200 shrink-0">
        <div
          className="h-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Slide dots */}
      <div className="flex items-center justify-center gap-1.5 py-3 shrink-0">
        {slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setStep(i)}
            className={cn(
              'rounded-full transition-all duration-200',
              i === step ? 'w-5 h-2 bg-indigo-500' : 'w-2 h-2 bg-slate-300 hover:bg-slate-400'
            )}
          />
        ))}
      </div>

      {/* Slide content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-gray-900">{current.title}</h2>
            {current.subtitle && (
              <p className="text-sm text-gray-400 mt-0.5">{current.subtitle}</p>
            )}
          </div>
          {current.content}
        </div>
      </div>

      {/* Nav buttons */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-white shrink-0">
        <button
          onClick={prev}
          disabled={step === 0}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            step === 0
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-slate-100'
          )}
        >
          <ChevronLeft size={16} /> Previous
        </button>

        <div className="flex items-center gap-1">
          {slides.map((_, i) => (
            <Sparkles
              key={i}
              size={8}
              className={i <= step ? 'text-indigo-400' : 'text-slate-200'}
            />
          ))}
        </div>

        {step < slides.length - 1 ? (
          <button
            onClick={next}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={() => router.push('/pipeline')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Go to Pipeline <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
