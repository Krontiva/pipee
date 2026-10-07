'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTransition, useState, useEffect } from 'react'
import { cn, initials } from '@/lib/utils'
import { logout } from '@/lib/actions/auth'
import type { Profile } from '@/types'
import {
  LayoutDashboard,
  Columns3,
  List,
  CalendarDays,
  Users,
  LogOut,
  ChevronRight,
  Loader2,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard',     label: 'Dashboard',   icon: LayoutDashboard, adminOnly: false },
  { href: '/pipeline',      label: 'Pipeline',    icon: Columns3,        adminOnly: false },
  { href: '/opportunities', label: 'All Deals',   icon: List,            adminOnly: true  },
  { href: '/calendar',      label: 'Calendar',    icon: CalendarDays,    adminOnly: false },
  { href: '/walkthrough',   label: 'Get Started', icon: BookOpen,        adminOnly: false },
]

const STORAGE_KEY = 'krongage-sidebar-collapsed'

interface SidebarProps {
  blockerCount?: number
  profile: Profile
}

export function Sidebar({ profile, blockerCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Hydrate from localStorage on mount only
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'true') setCollapsed(true)
    setMounted(true)
  }, [])

  function toggleCollapsed() {
    setCollapsed(c => {
      const next = !c
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }

  function handleLogout() {
    startTransition(async () => {
      await logout()
    })
  }

  // Prevent layout flash before hydration — render expanded server-side
  const isCollapsed = mounted && collapsed

  // Stalled deals waiting for a blocker are actioned from the dashboard and pipeline.
  const showBadge = (href: string) => blockerCount > 0 && (href === '/dashboard' || href === '/pipeline')

  return (
    <aside
      className={cn(
        'flex flex-col shrink-0 bg-white border-r border-slate-200 h-full transition-all duration-200 ease-in-out',
        isCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Brand + toggle */}
      <div
        className={cn(
          'flex items-center border-b border-slate-200 px-3 py-[18px]',
          isCollapsed ? 'justify-center' : 'gap-3 px-5'
        )}
      >
        {/* Logo mark */}
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 shrink-0">
          <span className="text-white font-bold text-sm">K</span>
        </div>

        {/* Word mark — hidden when collapsed */}
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-gray-900 font-semibold text-sm leading-none">Pipee</p>
            <p className="text-gray-400 text-xs mt-0.5">Pipeline Management</p>
          </div>
        )}

        {/* Collapse toggle — repositioned when collapsed */}
        <button
          onClick={toggleCollapsed}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'text-gray-400 hover:text-gray-700 transition-colors rounded-md p-0.5',
            isCollapsed && 'absolute left-3 bottom-[72px]'  // floats near user row when collapsed
          )}
        >
          {isCollapsed
            ? <PanelLeftOpen  size={16} />
            : <PanelLeftClose size={16} />
          }
        </button>
      </div>

      {/* Nav */}
      <nav className={cn('flex-1 py-4 space-y-0.5 overflow-y-auto', isCollapsed ? 'px-2' : 'px-3')}>
        {NAV_ITEMS.filter(item => !item.adminOnly || profile.role === 'admin').map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              title={isCollapsed ? label : undefined}
              className={cn(
                'flex items-center rounded-lg text-sm font-medium transition-colors',
                isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2',
                active
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-500 hover:bg-slate-100 hover:text-gray-800'
              )}
            >
              <span className="relative shrink-0">
                <Icon size={16} />
                {isCollapsed && showBadge(href) && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500" />
                )}
              </span>
              {!isCollapsed && (
                <>
                  <span>{label}</span>
                  {showBadge(href) && (
                    <span
                      title={`${blockerCount} stalled deal${blockerCount > 1 ? 's' : ''} need a blocker`}
                      className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center"
                    >
                      {blockerCount}
                    </span>
                  )}
                  {active && !showBadge(href) && <ChevronRight size={12} className="ml-auto opacity-60" />}
                </>
              )}
            </Link>
          )
        })}

        {profile.role === 'admin' && (() => {
          const active = pathname.startsWith('/admin')
          return (
            <Link
              href="/admin"
              title={isCollapsed ? 'Admin' : undefined}
              className={cn(
                'flex items-center rounded-lg text-sm font-medium transition-colors',
                isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2',
                active
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-500 hover:bg-slate-100 hover:text-gray-800'
              )}
            >
              <Users size={16} className="shrink-0" />
              {!isCollapsed && (
                <>
                  <span>Admin</span>
                  {active && <ChevronRight size={12} className="ml-auto opacity-60" />}
                </>
              )}
            </Link>
          )
        })()}
      </nav>

      {/* User row */}
      <div className={cn('border-t border-slate-200', isCollapsed ? 'px-2 py-3' : 'px-3 py-3')}>
        <div
          className={cn(
            'flex items-center',
            isCollapsed ? 'flex-col gap-2' : 'gap-3 px-3 py-2'
          )}
        >
          {/* Avatar */}
          <div
            title={isCollapsed ? profile.name : undefined}
            className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs text-white font-semibold shrink-0"
          >
            {initials(profile.name)}
          </div>

          {/* Name + role — hidden when collapsed */}
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-gray-800 text-sm font-medium truncate">{profile.name}</p>
              <p className="text-gray-400 text-xs truncate capitalize">{profile.role.replace('_', ' ')}</p>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            disabled={isPending}
            title="Sign out"
            className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
          </button>
        </div>
      </div>
    </aside>
  )
}
