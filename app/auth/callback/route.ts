import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Landing point for the password-reset link we email. Verifies the one-time
// `token_hash` to start a session, then forwards to `next`.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const tokenHash = searchParams.get('token_hash')
  const next = searchParams.get('next')
  // Only same-site relative paths, to avoid an open redirect.
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'

  if (tokenHash && searchParams.get('type') === 'recovery') {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash })
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`)
  }

  return NextResponse.redirect(`${origin}/forgot-password?error=expired`)
}
