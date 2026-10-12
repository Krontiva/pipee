'use client'

import { useState, useEffect } from 'react'
import { Columns3, List, Filter, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { KanbanBoard } from '@/components/pipeline/KanbanBoard'
import { ListView } from '@/components/pipeline/ListView'
import { TopNav } from '@/components/shared/TopNav'
import { useProduct } from '@/components/shared/ProductProvider'
import type { Opportunity, Profile, Sector } from '@/types'

export default function PipelinePage() {
  const { productFilter } = useProduct()
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [filter, setFilter] = useState<'all' | 'mine'>('all')
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sectors, setSectors] = useState<Sector[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let sub: ReturnType<typeof supabase.channel> | null = null

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: prof }, { data: sects }, { data: profs }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        productFilter
          ? supabase.from('sectors').select('*').eq('product_id', productFilter).order('name')
          : supabase.from('sectors').select('*').order('name'),
        supabase.from('profiles').select('*').eq('is_active', true),
      ])

      setProfile(prof)
      setSectors(sects ?? [])
      setProfiles(profs ?? [])

      async function fetchOpps() {
        let q = supabase
          .from('opportunities')
          .select('*, profiles(*), meddic_scores(*)')
          .order('created_at', { ascending: false })

        if (filter === 'mine') q = q.eq('assigned_to', user!.id)
        if (productFilter) q = q.eq('product_id', productFilter)

        const { data } = await q
        setOpportunities(data ?? [])
        setLoading(false)
      }

      await fetchOpps()

      // Realtime
      sub = supabase.channel(`pipeline-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'opportunities' }, fetchOpps)
        .subscribe()
    }

    load()
    return () => { sub?.unsubscribe() }
  }, [filter, productFilter])

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm gap-2">
        <Loader2 size={16} className="animate-spin" />
        Loading pipeline…
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopNav title="Pipeline" profile={profile} sectors={sectors} profiles={profiles} />

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-200 bg-white shrink-0">
        {/* View toggle */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
          <button
            onClick={() => setView('kanban')}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              view === 'kanban' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
          >
            <Columns3 size={13} /> Kanban
          </button>
          <button
            onClick={() => setView('list')}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              view === 'list' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
          >
            <List size={13} /> List
          </button>
        </div>

        <div className="h-4 w-px bg-slate-200" />

        {/* Filter */}
        {profile.role === 'admin' && (
          <div className="flex items-center gap-1">
            <Filter size={13} className="text-gray-400" />
            <select
              value={filter}
              onChange={e => setFilter(e.target.value as 'all' | 'mine')}
              className="bg-transparent text-xs text-gray-500 border-none focus:outline-none cursor-pointer"
            >
              <option value="all">All Deals</option>
              <option value="mine">My Deals</option>
            </select>
          </div>
        )}

        <div className="ml-auto text-xs text-gray-400">
          {opportunities.filter(o => !['won', 'lost', 'disqualified'].includes(o.status)).length} active deals
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {view === 'kanban'
          ? <KanbanBoard initialOpportunities={opportunities} />
          : <div className="h-full overflow-auto"><ListView opportunities={opportunities} /></div>
        }
      </div>
    </div>
  )
}
