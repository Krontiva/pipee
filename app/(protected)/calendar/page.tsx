import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProductContext } from '@/lib/products'
import { TopNav } from '@/components/shared/TopNav'
import { CalendarView } from '@/components/calendar/CalendarView'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { productFilter } = await getProductContext(supabase)

  let oppQuery = supabase.from('opportunities').select('id, title, company_name, stage, status, next_action, next_action_date, assigned_to, product_id').not('next_action_date', 'is', null)
  let sectorQuery = supabase.from('sectors').select('*')
  if (productFilter) {
    oppQuery = oppQuery.eq('product_id', productFilter)
    sectorQuery = sectorQuery.eq('product_id', productFilter)
  }

  const [{ data: profile }, { data: opportunities }, { data: sectors }, { data: profiles }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    oppQuery,
    sectorQuery,
    supabase.from('profiles').select('*').eq('is_active', true),
  ])

  if (!profile) redirect('/login')

  const visible = profile.role === 'admin'
    ? (opportunities ?? [])
    : (opportunities ?? []).filter(o => o.assigned_to === user.id)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopNav title="Calendar" profile={profile} sectors={sectors ?? []} profiles={profiles ?? []} />
      <div className="flex-1 overflow-hidden">
        <CalendarView opportunities={visible as import('@/types').Opportunity[]} />
      </div>
    </div>
  )
}
