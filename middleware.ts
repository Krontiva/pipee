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
  // identity a Hub visit is supposed to grant.
  //
  // But only when this request is actually the Hub embed loading Pipee in
  // its <iframe> (app/[slug]/page.tsx in the Hub repo), never for a direct
  // visit to this domain. `Sec-Fetch-Dest: iframe` is the browser-set
  // signal that distinguishes the two — cookies alone can't, since
  // `krontiva_session` is sent on every request to *.krontiva.africa
  // either way. Without this gate, a `krontiva_session` cookie merely
  // present in the browser (e.g. from testing hub-dev-test on Hub in
  // another tab) would silently override a real, deliberate local login on
  // Pipee's own /login, on every request, until the cookie expired —
  // that's the interference bug this fixes. Inside the iframe it's the
  // opposite: Hub's own identity should always win there, matching what
  // Hub's sidebar shows.
  const isHubEmbed = request.headers.get('sec-fetch-dest') === 'iframe'
  const hubCookie = request.cookies.get(SESSION_COOKIE)?.value
  if (hubCookie && isHubEmbed) {
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
