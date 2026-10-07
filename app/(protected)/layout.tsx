import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/shared/Sidebar'
import { CommandPalette } from '@/components/shared/CommandPalette'
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
  const { data: openOpps } = await supabase
    .from('opportunities')
    .select('stage, status, stage_entered_at, blocker, blocker_label, blocker_set_at')
    .eq('status', 'active')
  const blockerCount = (openOpps ?? []).filter(o => needsBlocker(o)).length

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar profile={profile} blockerCount={blockerCount} />
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        {children}
      </main>
      <CommandPalette />
    </div>
  )
}
