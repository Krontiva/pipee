'use client'

import { useState } from 'react'
import Link from 'next/link'
import { requestPasswordReset } from '@/lib/actions/auth'
import { Loader2 } from 'lucide-react'

export default function ForgotPasswordForm({ linkExpired }: { linkExpired: boolean }) {
  const [error, setError] = useState<string | null>(
    linkExpired ? 'That reset link is invalid or has expired. Request a new one below.' : null
  )
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = await requestPasswordReset(new FormData(e.currentTarget))
    setLoading(false)
    if (result?.error) setError(result.error)
    else setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 mb-4">
            <span className="text-white font-bold text-lg">K</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Reset password</h1>
          <p className="text-gray-400 text-sm mt-1">
            We&apos;ll email you a link to choose a new one
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-8 space-y-5 shadow-sm">
          {sent ? (
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 text-green-700 text-sm">
              If an account exists for that email, a reset link is on its way. Check your inbox
              (and spam folder).
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="you@krontiva.com"
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
                    Sending…
                  </>
                ) : 'Send reset link'}
              </button>
            </form>
          )}

          <p className="text-center text-sm">
            <Link href="/login" className="text-indigo-600 hover:text-indigo-500">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
