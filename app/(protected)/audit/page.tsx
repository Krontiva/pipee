import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProductContext } from '@/lib/products'
import { fetchAll } from '@/lib/fetch-all'
import { auditCategory, isSystemActivity } from '@/lib/audit'
import { TopNav } from '@/components/shared/TopNav'
import { AuditLogView } from '@/components/audit/AuditLogView'
import type { AuditEntry } from '@/components/audit/AuditLogView'

interface Row {
  id: string
  opportunity_id: string
  type: string
  title: string
  description: string | null
  occurred_at: string
  profiles: { name: string } | { name: string }[] | null
  opportunities: { company_name: string; product_id: string } | { company_name: string; product_id: string }[] | null
}

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v)

// Newest rows only: the page shows the latest changes, not the whole history.
const MAX_ROWS = 3000
const SHOWN = 500

export default async function AuditPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')
  // Who changed what is management information.
  if (profile.role !== 'admin') redirect('/dashboard')

  const { productFilter } = await getProductContext(supabase)

  const rows = await fetchAll<Row>(
    () =>
      supabase
        .from('activities')
        .select('id, opportunity_id, type, title, description, occurred_at, profiles(name), opportunities(company_name, product_id)')
        .in('type', ['note', 'stage_change'])
        .order('occurred_at', { ascending: false })
        .order('id'),
    MAX_ROWS
  )

  const entries: AuditEntry[] = rows
    .filter(r => isSystemActivity(r))
    .filter(r => !productFilter || one(r.opportunities)?.product_id === productFilter)
    .slice(0, SHOWN)
    .map(r => ({
      id: r.id,
      dealId: r.opportunity_id,
      deal: one(r.opportunities)?.company_name ?? 'Deleted deal',
      who: one(r.profiles)?.name ?? 'System',
      category: auditCategory(r),
      what: r.title,
      note: r.description,
      at: r.occurred_at,
    }))

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopNav title="Audit log" profile={profile} />
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <AuditLogView entries={entries} />
      </div>
    </div>
  )
}
