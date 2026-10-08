'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, X, LayoutDashboard, Columns3, List,
  CalendarDays, Users, ArrowRight, Building2, Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatCurrency } from '@/lib/utils'
import { STAGE_META } from '@/types'
import type { Opportunity } from '@/types'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pipeline', label: 'Pipeline', icon: Columns3 },
  { href: '/opportunities', label: 'All Deals', icon: List },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/admin', label: 'Admin', icon: Users },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Open via Cmd+K / Ctrl+K and custom event from the trigger button
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    function onOpenEvent() { setOpen(true) }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('command-palette:open', onOpenEvent)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('command-palette:open', onOpenEvent)
    }
  }, [])

  // Focus & reset on open
  useEffect(() => {
    if (open) {
      /* eslint-disable react-hooks/set-state-in-effect -- intentional reset each time the palette opens */
      setQuery('')
      setResults([])
      setActiveIndex(0)
      /* eslint-enable react-hooks/set-state-in-effect */
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  // Debounced Supabase search
  useEffect(() => {
    if (!query.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale results when the box is emptied
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    const t = setTimeout(async () => {
      const supabase = createClient()
      // Escape % and _ so user input doesn't break ilike
      const safe = query.replace(/[%_\\]/g, c => `\\${c}`)
      const { data, error } = await supabase
        .from('opportunities')
        .select('id, title, company_name, sector, stage, value, currency, status, profiles(name)')
        .or(`title.ilike.%${safe}%,company_name.ilike.%${safe}%,sector.ilike.%${safe}%`)
        .not('status', 'in', '(disqualified)')
        .limit(8)
      if (!error) setResults((data ?? []) as unknown as Opportunity[])
      else setResults([])
      setLoading(false)
      setActiveIndex(0)
    }, 180)
    return () => clearTimeout(t)
  }, [query])

  const filteredNav = query
    ? NAV_ITEMS.filter(n => n.label.toLowerCase().includes(query.toLowerCase()))
    : NAV_ITEMS

  const totalItems = filteredNav.length + results.length

  function close() { setOpen(false) }

  function navigate(href: string) {
    router.push(href)
    close()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, totalItems - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex < filteredNav.length) {
        navigate(filteredNav[activeIndex].href)
      } else {
        const opp = results[activeIndex - filteredNav.length]
        if (opp) navigate(`/opportunities/${opp.id}`)
      }
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[14vh] px-4"
      onMouseDown={close}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" />

      {/* Panel */}
      <div
        className="relative w-full max-w-[580px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Search row */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          {loading
            ? <Loader2 size={16} className="text-gray-400 animate-spin shrink-0" />
            : <Search size={16} className="text-gray-400 shrink-0" />
          }
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search deals, companies, pages…"
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="text-gray-300 hover:text-gray-500 transition-colors"
            >
              <X size={14} />
            </button>
          ) : (
            <button
              onClick={close}
              className="text-gray-300 hover:text-gray-500 transition-colors"
            >
              <kbd className="text-[10px] bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 font-sans">
                Esc
              </kbd>
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[420px] overflow-y-auto">

          {/* Nav pages */}
          {filteredNav.length > 0 && (
            <section>
              <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                Pages
              </p>
              {filteredNav.map((item, i) => {
                const Icon = item.icon
                const active = activeIndex === i
                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left',
                      active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-slate-50'
                    )}
                  >
                    <span className={cn(
                      'flex items-center justify-center w-7 h-7 rounded-lg shrink-0',
                      active ? 'bg-indigo-100' : 'bg-slate-100'
                    )}>
                      <Icon size={14} className={active ? 'text-indigo-600' : 'text-gray-500'} />
                    </span>
                    <span className="font-medium">{item.label}</span>
                    <ArrowRight
                      size={12}
                      className={cn('ml-auto transition-transform', active ? 'text-indigo-400 translate-x-0.5' : 'text-gray-300')}
                    />
                  </button>
                )
              })}
            </section>
          )}

          {/* Deals */}
          {results.length > 0 && (
            <section>
              <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                Deals
              </p>
              {results.map((opp, i) => {
                const idx = filteredNav.length + i
                const active = activeIndex === idx
                const stageMeta = STAGE_META[opp.stage]
                return (
                  <button
                    key={opp.id}
                    onClick={() => navigate(`/opportunities/${opp.id}`)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left',
                      active ? 'bg-indigo-50' : 'hover:bg-slate-50'
                    )}
                  >
                    <span className={cn(
                      'flex items-center justify-center w-7 h-7 rounded-lg shrink-0',
                      active ? 'bg-indigo-100' : 'bg-slate-100'
                    )}>
                      <Building2 size={14} className={active ? 'text-indigo-600' : 'text-gray-500'} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className={cn('block font-medium truncate', active ? 'text-indigo-700' : 'text-gray-800')}>
                        {opp.title}
                      </span>
                      <span className="block text-xs text-gray-400 truncate">
                        {opp.company_name}
                        {stageMeta && <> · <span className="text-gray-500">{stageMeta.name}</span></>}
                      </span>
                    </span>
                    {opp.value != null && opp.value > 0 && (
                      <span className="text-xs font-semibold text-green-600 shrink-0">
                        {formatCurrency(opp.value, opp.currency)}
                      </span>
                    )}
                    <ArrowRight
                      size={12}
                      className={cn('shrink-0', active ? 'text-indigo-400' : 'text-gray-300')}
                    />
                  </button>
                )
              })}
            </section>
          )}

          {/* No results */}
          {query && !loading && results.length === 0 && filteredNav.length === 0 && (
            <div className="flex flex-col items-center py-14 text-center px-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <Search size={20} className="text-gray-300" />
              </div>
              <p className="text-gray-600 text-sm font-medium">No results for &quot;{query}&quot;</p>
              <p className="text-gray-400 text-xs mt-1">Try searching by deal name or company</p>
            </div>
          )}

          {/* Default empty state */}
          {!query && (
            <div className="px-4 py-8 text-center">
              <p className="text-gray-400 text-sm">Start typing to search across all deals and pages</p>
              <div className="flex items-center justify-center gap-3 mt-4">
                {['Ecobank', 'Pipeline', 'Proposal'].map(hint => (
                  <button
                    key={hint}
                    onClick={() => setQuery(hint)}
                    className="text-xs text-gray-400 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full px-3 py-1 transition-colors"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer hotkeys */}
        <div className="flex items-center gap-5 px-4 py-2.5 border-t border-slate-100 bg-slate-50/80">
          {[
            { keys: ['↑', '↓'], label: 'navigate' },
            { keys: ['↵'], label: 'open' },
            { keys: ['Esc'], label: 'close' },
          ].map(({ keys, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="flex gap-0.5">
                {keys.map(k => (
                  <kbd key={k} className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-sans leading-none">
                    {k}
                  </kbd>
                ))}
              </span>
              {label}
            </span>
          ))}
          <span className="ml-auto text-[10px] text-gray-300">⌘K to toggle</span>
        </div>
      </div>
    </div>
  )
}
