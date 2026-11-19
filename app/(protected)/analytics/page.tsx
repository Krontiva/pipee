import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProductContext } from '@/lib/products'
import { TopNav } from '@/components/shared/TopNav'
import { AnalyticsView } from '@/components/analytics/AnalyticsView'
import { computeAnalytics, parseTargets, TARGETS_KEY } from '@/lib/analytics'
import type { EventIn, OppIn } from '@/lib/analytics'

const PAGE = 1000

// Supabase returns at most 1000 rows per request, so read in pages.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAll<T>(build: () => any): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    rows.push(...((data ?? []) as T[]))
    if (!data || data.length < PAGE) break
  }
  return rows
}

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')
  // Forecasts and rep comparisons are management information.
  if (profile.role !== 'admin') redirect('/dashboard')

  const { productFilter } = await getProductContext(supabase)

  const [opps, stageEvents, outcomeEvents, disqEvents, { data: profiles }, { data: sectors }, { data: targetRow }] = await Promise.all([
    fetchAll<OppIn>(() => {
      let q = supabase
        .from('opportunities')
        .select('id, title, company_name, stage, status, value, estimated_value, currency, sector, assigned_to, disqualification_reason, stage_entered_at, created_at, updated_at')
        .order('created_at').order('id')
      if (productFilter) q = q.eq('product_id', productFilter)
      return q
    }),
    fetchAll<EventIn>(() =>
      supabase.from('activities').select('opportunity_id, type, title, occurred_at').eq('type', 'stage_change').order('occurred_at').order('id')),
    fetchAll<EventIn>(() =>
      supabase.from('activities').select('opportunity_id, type, title, occurred_at').ilike('title', 'Deal marked as%').order('occurred_at').order('id')),
    fetchAll<EventIn>(() =>
      supabase.from('activities').select('opportunity_id, type, title, occurred_at').ilike('title', 'Disqualified:%').order('occurred_at').order('id')),
    supabase.from('profiles').select('id, name, role, is_active'),
    supabase.from('sectors').select('*'),
    supabase.from('admin_settings').select('value').eq('key', TARGETS_KEY).maybeSingle(),
  ])

  // Activities are loaded globally; keep only those for the deals in view.
  const ids = new Set(opps.map(o => o.id))
  const events = [...stageEvents, ...outcomeEvents, ...disqEvents].filter(e => ids.has(e.opportunity_id))

  const data = computeAnalytics({
    opps,
    events,
    profiles: profiles ?? [],
    targets: parseTargets(targetRow?.value),
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopNav title="Analytics" profile={profile} sectors={sectors ?? []} />
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <AnalyticsView data={data} />
      </div>
    </div>
  )
}
