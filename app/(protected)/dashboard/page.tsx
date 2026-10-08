import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { TopNav } from '@/components/shared/TopNav'
import { PipelineMetrics } from '@/components/dashboard/PipelineMetrics'
import { ConversionChart } from '@/components/dashboard/ConversionChart'
import { BDOLeaderboard } from '@/components/dashboard/BDOLeaderboard'
import { StalledDealsAlert } from '@/components/dashboard/StalledDealsAlert'
import { BlockerReminders } from '@/components/dashboard/BlockerReminders'
import { TeamActivityFeed } from '@/components/dashboard/TeamActivityFeed'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: profile },
    { data: opportunities },
    { data: profiles },
    { data: sectors },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('opportunities').select('*, profiles(*), meddic_scores(score)'),
    supabase.from('profiles').select('*').eq('is_active', true),
    supabase.from('sectors').select('*'),
  ])

  if (!profile) redirect('/login')

  // BD reps only see their own data
  const visibleOpps = profile.role === 'admin'
    ? (opportunities ?? [])
    : (opportunities ?? []).filter(o => o.assigned_to === user.id)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopNav title="Dashboard" profile={profile} sectors={sectors ?? []} profiles={profiles ?? []} />

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Good {getGreeting()}, {profile.name.split(' ')[0]} 👋
          </h2>
          <p className="text-gray-400 text-sm">Here&apos;s your Pipee pipeline overview.</p>
        </div>

        {/* Onboarding banner */}
        <Link
          href={profile.role === 'admin' ? '/admin/walkthrough' : '/walkthrough'}
          className="flex items-center gap-4 bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200 rounded-xl px-5 py-4 group hover:border-indigo-300 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm shadow-indigo-200">
            <BookOpen size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">{profile.role === 'admin' ? 'Admin Guide' : 'New to Pipee?'}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {profile.role === 'admin'
                ? 'Learn how to monitor the team, manage stalled deals, and generate reports.'
                : 'Take the interactive walkthrough — learn the 7-stage pipeline, MEDDIC scoring, and how to move deals forward.'}
            </p>
          </div>
          <ArrowRight size={16} className="text-indigo-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </Link>

        <BlockerReminders opportunities={visibleOpps} showOwner={profile.role === 'admin'} />

        <PipelineMetrics opportunities={visibleOpps} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ConversionChart opportunities={visibleOpps} />
          <StalledDealsAlert opportunities={visibleOpps} />
        </div>

        {profile.role === 'admin' && (
          <>
            <TeamActivityFeed opportunities={opportunities ?? []} profiles={profiles ?? []} />
            <BDOLeaderboard opportunities={visibleOpps} profiles={profiles ?? []} />
          </>
        )}
      </div>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
