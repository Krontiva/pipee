import { createClient } from '@supabase/supabase-js'
import type { HubClaims } from '@krontiva/hub-contract'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export interface HubSsoSession {
  accessToken: string
  refreshToken: string
}

/**
 * Given an already-verified Hub session, ensure this person has a local
 * Pipee account and hand back a real session for it — same mechanism as
 * RoadMap's lib/hub-sso.ts, adapted for one real difference: Pipee's
 * `profiles` table has no `email` column (only `profiles.id`, which is
 * `auth.users.id`), so there's no way to look someone up by email before
 * creating them.
 *
 * generateLink solves that by itself: called on an email with no existing
 * auth.users row, it silently creates one and returns it — no separate
 * createUser step needed. Its `verification_type` also differs by
 * whether the account is brand new ('signup') or already exists
 * ('magiclink'); verifyOtp must be called with whichever it actually
 * returned, not a hardcoded 'magiclink' — the wrong type is rejected as
 * "invalid or expired" even though the token itself is fine.
 *
 * Every Hub user becomes a Pipee admin ('admin' in Pipee's own
 * user_role enum) — the access model Hub's admin asked for, same as
 * RoadMap.
 */
export async function establishHubSsoSession(claims: HubClaims): Promise<HubSsoSession | null> {
  const supabase = supabaseAdmin()
  const email = claims.email
  if (!email) return null

  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (linkErr || !linkData?.user || !linkData.properties?.hashed_token) {
    console.error('[hub-sso] generateLink failed', linkErr?.message)
    return null
  }

  const { error: upsertErr } = await supabase
    .from('profiles')
    .upsert(
      { id: linkData.user.id, name: claims.name ?? email, role: 'admin' },
      { onConflict: 'id' },
    )
  if (upsertErr) {
    console.error('[hub-sso] profile upsert failed', upsertErr.message)
    return null
  }

  // generateLink was called with type: 'magiclink' above, so Supabase can
  // only hand back one of these two verification types in response — never
  // the other GenerateLinkType values (e.g. 'email_change_current') that
  // don't apply here but still widen the field's declared type.
  const verificationType = linkData.properties.verification_type as 'signup' | 'magiclink'
  const { data: verified, error: verifyErr } = await supabase.auth.verifyOtp({
    type: verificationType,
    token_hash: linkData.properties.hashed_token,
  })
  if (verifyErr || !verified.session) {
    console.error('[hub-sso] verifyOtp failed', verifyErr?.message)
    return null
  }

  return {
    accessToken: verified.session.access_token,
    refreshToken: verified.session.refresh_token,
  }
}
