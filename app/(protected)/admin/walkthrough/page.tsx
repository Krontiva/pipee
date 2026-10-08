'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronRight, ChevronLeft, ArrowRight, Sparkles, Shield,
  Users, BarChart3, AlertTriangle, Settings, FileText,
  TrendingUp, UserCheck, Eye, Bell, Download, Plus,
  CheckCircle2, Clock, Trophy,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Slide = { id: string; title: string; subtitle?: string; content: React.ReactNode }

// ── Slides ──────────────────────────────────────────────────────────────────

function WelcomeSlide() {
  return (
    <div className="flex flex-col items-center text-center gap-6 py-4">
      <div className="w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
        <Shield size={36} className="text-white" />
      </div>
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Admin Guide</h2>
        <p className="text-gray-500 mt-2 text-lg max-w-lg mx-auto">
          As an admin, you manage the team, monitor the pipeline, and generate reports. This guide covers everything you need.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-4 w-full max-w-lg mt-2">
        {[
          { icon: Users,     label: 'Team Management',   desc: 'Add and manage users' },
          { icon: Eye,       label: 'Full Pipeline View', desc: 'See every deal' },
          { icon: BarChart3, label: 'Reports',            desc: 'AI-powered insights' },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Icon size={18} className="text-indigo-600" />
            </div>
            <p className="font-semibold text-sm text-gray-800">{label}</p>
            <p className="text-xs text-gray-400 text-center">{desc}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-400 italic">Use the arrows below or keyboard ← → to navigate</p>
    </div>
  )
}

function DashboardSlide() {
  return (
    <div className="space-y-5">
      <p className="text-gray-600 text-sm leading-relaxed">
        The admin <strong className="text-gray-900">Dashboard</strong> shows a complete picture of the team&apos;s pipeline — not just your own deals. You get four key views every time you open it.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: TrendingUp,    color: 'bg-indigo-50 text-indigo-600', title: 'Pipeline Metrics',       desc: 'Team-wide active deal value, won revenue, and win rate across all reps.' },
          { icon: Clock,         color: 'bg-amber-50 text-amber-600',   title: 'Team Activity Feed',     desc: 'See what every rep is working on today — overdue actions, due today, and upcoming.' },
          { icon: Trophy,        color: 'bg-green-50 text-green-600',   title: 'BDO Leaderboard',        desc: 'Pipeline value, won deals, and win rate ranked per rep.' },
          { icon: AlertTriangle, color: 'bg-red-50 text-red-500',       title: 'Stalled Deal Alerts',    desc: 'Deals sitting too long in a stage surface here — click any to investigate.' },
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
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 flex gap-3">
        <Bell size={16} className="text-indigo-500 shrink-0 mt-0.5" />
        <p className="text-sm text-indigo-700">The <strong>Team Activity Feed</strong> is your daily check-in — if a rep has overdue actions, it shows in red. Click any deal to open it directly.</p>
      </div>
    </div>
  )
}

function PipelineOversightSlide() {
  return (
    <div className="space-y-5">
      <p className="text-gray-600 text-sm leading-relaxed">
        As admin you can see <strong className="text-gray-900">all deals</strong> across every rep in the Pipeline and All Deals views. BD reps only see their own.
      </p>
      <div className="space-y-3">
        {[
          {
            step: '1',
            color: 'bg-indigo-600',
            title: 'Pipeline → Kanban',
            desc: 'Drag-and-drop board showing all active deals across 7 stages. Filter by rep using the BD rep selector in the top bar.',
          },
          {
            step: '2',
            color: 'bg-violet-600',
            title: 'Pipeline → BD Rep Grid',
            desc: 'Side-by-side view of each rep\'s deals, overdue next actions, and stage distribution — great for weekly reviews.',
          },
          {
            step: '3',
            color: 'bg-amber-500',
            title: 'All Deals → List View',
            desc: 'Searchable, sortable table of every opportunity. Filter by stage, status, or rep to spot gaps quickly.',
          },
          {
            step: '4',
            color: 'bg-green-600',
            title: 'Deal Detail',
            desc: 'Open any deal to see the full activity history, MEDDIC score, contacts, and documents. You can edit and advance deals on a rep\'s behalf.',
          },
        ].map(({ step, color, title, desc }) => (
          <div key={step} className="flex gap-3 bg-white border border-slate-200 rounded-xl p-4">
            <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs text-white font-bold shrink-0', color)}>
              {step}
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-800">{title}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StalledDealsSlide() {
  return (
    <div className="space-y-5">
      <p className="text-gray-600 text-sm leading-relaxed">
        A deal is flagged <strong className="text-red-600">Stalled</strong> when it has been in a stage for more than 2× the target time for that stage. Here&apos;s how to handle it.
      </p>
      <div className="space-y-3">
        {[
          { icon: Eye,          color: 'bg-slate-100 text-slate-600', title: 'Spot it',    desc: 'Stalled deals appear on the Dashboard alert panel and with a red badge on the deal header.' },
          { icon: FileText,     color: 'bg-blue-50 text-blue-600',    title: 'Investigate', desc: 'Open the deal → Actions tab to read the activity history. Check if the rep has logged recent contact.' },
          { icon: Bell,         color: 'bg-amber-50 text-amber-600',  title: 'Act on it',  desc: 'Coach the rep to log a next action, book a follow-up call, or escalate if the prospect is unresponsive.' },
          { icon: CheckCircle2, color: 'bg-green-50 text-green-600',  title: 'Clear it',   desc: 'Once the rep has re-engaged, click the "Stalled · Clear" badge on the deal header. This resets the clock.' },
        ].map(({ icon: Icon, color, title, desc }) => (
          <div key={title} className="flex gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3.5">
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
      <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex gap-3">
        <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
        <p className="text-sm text-red-700">A stalled deal is a signal, not a verdict. The goal is to coach re-engagement — not to close the deal prematurely.</p>
      </div>
    </div>
  )
}

function ReportsSlide() {
  return (
    <div className="space-y-5">
      <p className="text-gray-600 text-sm leading-relaxed">
        Go to <strong className="text-gray-900">Admin → Report Builder</strong> to generate AI-powered PowerPoint reports. You can filter by rep, stage, status, and date range.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { title: 'Pipeline Summary',      desc: 'Full team pipeline health — stage breakdown, win rate, stalled deals, and recommendations.' },
          { title: 'BDO Performance',       desc: 'Per-rep breakdown of active deals, won revenue, pipeline value, and win rate.' },
          { title: 'Deal Deep Dive',        desc: 'Detailed view of individual deals — MEDDIC score, contacts, activity history, and next steps.' },
          { title: 'Sector Analysis',       desc: 'Deal distribution and value by industry sector — useful for ICP targeting decisions.' },
        ].map(({ title, desc }) => (
          <div key={title} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <p className="font-semibold text-sm text-gray-800 mb-1">{title}</p>
            <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">How to generate a report</p>
        <div className="space-y-1.5">
          {[
            'Select the report type from the dropdown',
            'Set filters — BD rep, stage, status, and date range',
            'Click Generate Report to preview the AI analysis',
            'Click Download .pptx to export the slide deck',
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
              <p className="text-sm text-gray-600">{step}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex gap-3">
        <Download size={16} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700">Reports require a <strong>Groq API key</strong> configured in Admin → Settings. The .pptx download works without the key — only the AI narrative requires it.</p>
      </div>
    </div>
  )
}

function UserManagementSlide() {
  return (
    <div className="space-y-5">
      <p className="text-gray-600 text-sm leading-relaxed">
        Go to <strong className="text-gray-900">Admin → Team Members</strong> to add, activate, or deactivate users. You can create BD reps or other admins.
      </p>
      <div className="space-y-3">
        {[
          {
            icon: Plus,
            color: 'bg-indigo-100 text-indigo-600',
            title: 'Adding a user',
            desc: 'Click "Add User", fill in name, email, a temporary password, and select a role (BD Rep or Admin). The account is created immediately — share the credentials with the new team member.',
          },
          {
            icon: UserCheck,
            color: 'bg-green-100 text-green-600',
            title: 'Activating / Deactivating',
            desc: 'Click Activate or Deactivate next to a BD rep to control their access. Deactivated reps cannot log in but their deal history is preserved.',
          },
          {
            icon: Shield,
            color: 'bg-violet-100 text-violet-600',
            title: 'Admin vs BD Rep',
            desc: 'Admins see all deals, can generate reports, and manage users. BD Reps only see their own deals and cannot access the Admin panel.',
          },
        ].map(({ icon: Icon, color, title, desc }) => (
          <div key={title} className="flex gap-3 bg-white border border-slate-200 rounded-xl p-4">
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', color)}>
              <Icon size={16} />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-800">{title}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SettingsSlide() {
  return (
    <div className="space-y-5">
      <p className="text-gray-600 text-sm leading-relaxed">
        The <strong className="text-gray-900">Admin → Settings</strong> section lets you configure integrations and manage your ICP sector list.
      </p>
      <div className="space-y-3">
        <div className="flex gap-3 bg-white border border-slate-200 rounded-xl p-4">
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <Settings size={16} className="text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-800">Groq API Key</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">Required for AI report narratives. Get a free key at console.groq.com, then paste it here. The key is stored securely and never exposed to the client.</p>
          </div>
        </div>
        <div className="flex gap-3 bg-white border border-slate-200 rounded-xl p-4">
          <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
            <FileText size={16} className="text-indigo-600" />
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-800">Priority Sectors</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">Add and manage the industry sectors your team targets. These appear as selectable tags when creating deals and help with sector analysis reports.</p>
          </div>
        </div>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Quick checklist to get fully set up</p>
        {[
          'Add all BD reps in Team Members',
          'Configure your Priority Sectors',
          'Add your Groq API key to enable AI reports',
          'Walk each rep through the BD Rep walkthrough',
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <CheckCircle2 size={13} className="text-blue-400 shrink-0" />
            <p className="text-sm text-blue-700">{item}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReadySlide({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-6 py-4">
      <div className="w-20 h-20 rounded-2xl bg-green-500 flex items-center justify-center shadow-lg shadow-green-200">
        <CheckCircle2 size={40} className="text-white" />
      </div>
      <div>
        <h2 className="text-3xl font-bold text-gray-900">You&apos;re All Set</h2>
        <p className="text-gray-500 mt-2 text-lg max-w-lg mx-auto">
          You know how to monitor the team, manage stalled deals, generate reports, and configure the platform. Head to the dashboard to get started.
        </p>
      </div>
      <div className="flex gap-3 flex-wrap justify-center">
        <button
          onClick={onFinish}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-sm shadow-indigo-200"
        >
          Go to Dashboard <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminWalkthroughPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)

  const slides: Slide[] = [
    { id: 'welcome',    title: 'Welcome',                                           content: <WelcomeSlide /> },
    { id: 'dashboard',  title: 'Dashboard Overview',  subtitle: 'Your daily control centre',  content: <DashboardSlide /> },
    { id: 'oversight',  title: 'Pipeline Oversight',  subtitle: 'Seeing the full team picture', content: <PipelineOversightSlide /> },
    { id: 'stalled',    title: 'Managing Stalled Deals', subtitle: 'How to identify and resolve them', content: <StalledDealsSlide /> },
    { id: 'reports',    title: 'Reports',              subtitle: 'AI-powered PowerPoint exports', content: <ReportsSlide /> },
    { id: 'users',      title: 'Team Management',      subtitle: 'Adding and managing users',   content: <UserManagementSlide /> },
    { id: 'settings',   title: 'Settings & Setup',     subtitle: 'Configure integrations and sectors', content: <SettingsSlide /> },
    { id: 'ready',      title: "You're All Set",                                    content: <ReadySlide onFinish={() => router.push('/dashboard')} /> },
  ]

  const current = slides[step]
  const progress = ((step + 1) / slides.length) * 100

  function prev() { if (step > 0) setStep(s => s - 1) }
  function next() { if (step < slides.length - 1) setStep(s => s + 1) }

  return (
    <div
      className="flex flex-col h-full bg-slate-50"
      onKeyDown={e => { if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev() }}
      tabIndex={0}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-indigo-500" />
          <h1 className="text-gray-900 font-semibold text-lg">Admin Guide</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{step + 1} of {slides.length}</span>
          <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Skip
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-200 shrink-0">
        <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-1.5 py-3 shrink-0">
        {slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setStep(i)}
            className={cn('rounded-full transition-all duration-200', i === step ? 'w-5 h-2 bg-indigo-500' : 'w-2 h-2 bg-slate-300 hover:bg-slate-400')}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-gray-900">{current.title}</h2>
            {current.subtitle && <p className="text-sm text-gray-400 mt-0.5">{current.subtitle}</p>}
          </div>
          {current.content}
        </div>
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-white shrink-0">
        <button
          onClick={prev}
          disabled={step === 0}
          className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors', step === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-slate-100')}
        >
          <ChevronLeft size={16} /> Previous
        </button>

        <div className="flex items-center gap-1">
          {slides.map((_, i) => (
            <Sparkles key={i} size={8} className={i <= step ? 'text-indigo-400' : 'text-slate-200'} />
          ))}
        </div>

        {step < slides.length - 1 ? (
          <button onClick={next} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
            Go to Dashboard <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
