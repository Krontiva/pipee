import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/shared/Sidebar'
import { CommandPalette } from '@/components/shared/CommandPalette'
import { ProductProvider } from '@/components/shared/ProductProvider'
import { getProductContext } from '@/lib/products'
import { needsBlocker } from '@/lib/utils'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Stalled deals still waiting for a blocker. RLS scopes this per person: a rep
  // counts only their own deals, an admin counts everyone's.
  const { products, currentId, productFilter } = await getProductContext(supabase)

  let openQuery = supabase
    .from('opportunities')
    .select('stage, status, stage_entered_at, blocker, blocker_label, blocker_set_at')
    .eq('status', 'active')
  if (productFilter) openQuery = openQuery.eq('product_id', productFilter)
  const { data: openOpps } = await openQuery

  // Admins need to know who is on which product when assigning deals.
  const { data: memberships } = profile.role === 'admin'
    ? await supabase.from('product_members').select('product_id, user_id')
    : { data: [] }
  const blockerCount = (openOpps ?? []).filter(o => needsBlocker(o)).length

  return (
    <ProductProvider products={products} currentId={currentId} memberships={memberships ?? []}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar profile={profile} blockerCount={blockerCount} />
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          {children}
        </main>
        <CommandPalette />
      </div>
    </ProductProvider>
  )
}
