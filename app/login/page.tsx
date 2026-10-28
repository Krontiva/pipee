'use client'

import { useState } from 'react'
import Link from 'next/link'
import { login } from '@/lib/actions/auth'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = await login(new FormData(e.currentTarget))
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 mb-4">
            <span className="text-white font-bold text-lg">K</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Pipee</h1>
          <p className="text-gray-400 text-sm mt-1">Pipeline Management Tool</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-8 space-y-5 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              placeholder="you@krontiva.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs text-indigo-600 hover:text-indigo-500">
                Forgot password?
              </Link>
            </div>
            <input
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-red-600 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg py-2.5 text-sm transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Signing in…
              </>
            ) : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-gray-400 text-xs mt-6">
          Krontiva Internal Tool · Confidential
        </p>
      </div>
    </div>
  )
}
