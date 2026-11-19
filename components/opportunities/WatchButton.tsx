'use client'

import { useState, useTransition } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toggleWatchDeal } from '@/lib/actions/watch'
import { cn } from '@/lib/utils'

// Watch a deal to get an email whenever someone else changes it.
export function WatchButton({ opportunityId, initialWatching }: { opportunityId: string; initialWatching: boolean }) {
  const [watching, setWatching] = useState(initialWatching)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggle() {
    setError(null)
    startTransition(async () => {
      const res = await toggleWatchDeal(opportunityId)
      if (res.error) setError(res.error)
      else setWatching(!!res.watching)
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      title={error ?? (watching ? 'You get an email when someone else changes this deal. Click to stop.' : 'Get an email when someone else changes this deal')}
      className={cn(
        'flex items-center gap-2 border text-sm font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50',
        watching ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-gray-600 hover:text-gray-900 hover:bg-slate-100',
        error && 'border-red-300'
      )}
    >
      {isPending ? <Loader2 size={13} className="animate-spin" /> : watching ? <Eye size={13} /> : <EyeOff size={13} />}
      {watching ? 'Watching' : 'Watch'}
    </button>
  )
}
