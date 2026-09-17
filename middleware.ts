import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { verifyHubSession, SESSION_COOKIE, HubSessionError } from '@krontiva/hub-contract'
import { establishHubSsoSession } from '@/lib/hub-sso'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Hub single sign-on: verify Hub's shared cookie if present, and mint a
  // real local session for that person before the redirect-to-login check
  // below ever runs — even if a local session already exists, since that's
  // very likely their own personal Pipee account, not the Hub-admin
  // identity a Hub visit is supposed to grant. Skipped only when the
  // existing local session already matches Hub's claim (by email); once
  // minted, later navigations don't re-mint every time. See lib/hub-sso.ts.
  const hubCookie = request.cookies.get(SESSION_COOKIE)?.value
  if (hubCookie) {
    try {
      const claims = await verifyHubSession(hubCookie)
      if (!user || user.email !== claims.email) {
        const minted = await establishHubSsoSession(claims)
        if (minted) {
          await supabase.auth.setSession({
            access_token: minted.accessToken,
            refresh_token: minted.refreshToken,
          })
          user = (await supabase.auth.getUser()).data.user
        }
      }
    } catch (e) {
      if (!(e instanceof HubSessionError)) console.error('[middleware] hub sso failed', e)
    }
  }

  if (!user && !pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user!.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // 'api' excluded: API routes authenticate themselves (e.g.
    // /api/cron/hub-sync's own shared-secret check) rather than via a
    // browser session cookie, which a server-to-server caller never has —
    // routing them through this cookie-based redirect first breaks them.
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
