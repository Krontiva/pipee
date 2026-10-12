import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TopNav } from '@/components/shared/TopNav'
import { OpportunityDetail } from '@/components/opportunities/OpportunityDetail'

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: opp },
    { data: profile },
    { data: meddic },
    { data: activities },
    { data: brief },
    { data: proposals },
    { data: contacts },
    { data: sectors },
    { data: profiles },
    { data: subStageProgress },
  ] = await Promise.all([
    supabase.from('opportunities').select('*, profiles(*)').eq('id', id).single(),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('meddic_scores').select('*').eq('opportunity_id', id).single(),
    supabase.from('activities').select('*, profiles(name)').eq('opportunity_id', id).order('occurred_at', { ascending: false }),
    supabase.from('discovery_briefs').select('*').eq('opportunity_id', id).single(),
    supabase.from('proposals').select('*').eq('opportunity_id', id).order('version'),
    supabase.from('contacts').select('*').eq('opportunity_id', id),
    supabase.from('sectors').select('*'),
    supabase.from('profiles').select('*').eq('is_active', true),
    supabase.from('sub_stage_progress').select('*').eq('opportunity_id', id),
  ])

  if (!opp || !profile) notFound()

  const reviewerName = brief?.reviewed_by
    ? (profiles ?? []).find(p => p.id === brief.reviewed_by)?.name
    : undefined

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopNav title={opp.company_name} profile={profile} sectors={sectors ?? []} />
      <div className="flex-1 overflow-hidden min-h-0">
        <OpportunityDetail
          opp={opp}
          profile={profile}
          meddic={meddic ?? null}
          activities={activities ?? []}
          brief={brief ?? null}
          proposals={proposals ?? []}
          contacts={contacts ?? []}
          sectors={(sectors ?? []).filter(s => s.product_id === opp.product_id)}
          profiles={profiles ?? []}
          subStageProgress={subStageProgress ?? []}
          reviewerName={reviewerName}
        />
      </div>
    </div>
  )
}

