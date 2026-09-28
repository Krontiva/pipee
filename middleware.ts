import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { verifyHubSession, SESSION_COOKIE, HubSessionError } from '@krontiva/hub-contract'
import { establishHubSsoSession } from '@/lib/hub-sso'

/**
 * Product-local (never cross-domain) cookie recording which email the
 * current session was minted for via Hub SSO, if any. See the comment at
 * its use below.
 */
const HUB_MARKER_COOKIE = 'hub_sso_email'

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
  // identity a Hub visit is supposed to grant.
  //
  // But this must never keep re-asserting itself over a session the person
  // reached by actually signing in on Pipee's own /login: without some way
  // to tell the two apart, a `krontiva_session` cookie merely left over in
  // the browser from unrelated Hub testing would silently clobber that
  // deliberate local login on every single request until the cookie
  // expired (see the interference bug this fixes). HUB_MARKER_COOKIE is
  // that signal — it's set only when *this* code mints a session, to the
  // email it minted for. A local session only gets overridden when the
  // marker shows it was Hub-minted in the first place and Hub's claim has
  // since moved to someone else; a session with no marker, or one whose
  // marker doesn't match the current user, is left alone.
  const hubCookie = request.cookies.get(SESSION_COOKIE)?.value
  if (hubCookie) {
    try {
      const claims = await verifyHubSession(hubCookie)
      const marker = request.cookies.get(HUB_MARKER_COOKIE)?.value
      const sessionIsHubOwned = !user || marker === user.email
      if (sessionIsHubOwned && (!user || user.email !== claims.email)) {
        const minted = await establishHubSsoSession(claims)
        if (minted) {
          await supabase.auth.setSession({
            access_token: minted.accessToken,
            refresh_token: minted.refreshToken,
          })
          user = (await supabase.auth.getUser()).data.user
          supabaseResponse.cookies.set(HUB_MARKER_COOKIE, claims.email, {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 30,
          })
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
