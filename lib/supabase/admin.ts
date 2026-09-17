import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS, server-only. Never import this from
// a "use client" file or expose SUPABASE_SERVICE_ROLE_KEY to the browser.
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
