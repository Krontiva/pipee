'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function requestPasswordReset(formData: FormData) {
  const email = (formData.get('email') as string | null)?.trim()
  if (!email) return { error: 'Please enter your email address.' }

  // Supabase mints the recovery token but doesn't email it; we send it via
  // Resend. Failures are logged, never returned, so the response can't be
  // used to discover which emails have accounts.
  try {
    const { data, error } = await supabaseAdmin().auth.admin.generateLink({
      type: 'recovery',
      email,
    })
    if (error || !data?.properties?.hashed_token) {
      // Unknown email lands here too.
      console.error('[auth] password reset link not generated', error?.message)
      return { success: true }
    }

    // Fixed base URL, not the request's Host/Origin header — those are
    // client-controlled and would let an attacker aim the emailed link at
    // their own domain.
    const base = process.env.PIPEE_PUBLIC_URL ?? 'https://pipee.vercel.app'
    const link =
      `${base}/auth/callback?token_hash=${encodeURIComponent(data.properties.hashed_token)}` +
      `&type=recovery&next=/reset-password`

    await sendPasswordResetEmail(email, link)
  } catch (e) {
    console.error('[auth] password reset email failed', e)
  }

  return { success: true }
}

async function sendPasswordResetEmail(to: string, link: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to,
      subject: 'Reset your Pipee password',
      html: `
        <p>We received a request to reset your Pipee password.</p>
        <p><a href="${link}">Choose a new password</a></p>
        <p>This link expires in an hour. If you didn't ask for this, you can ignore this email.</p>
      `,
    }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
}

export async function updatePassword(formData: FormData) {
  const password = formData.get('password') as string
  const confirm = formData.get('confirm') as string

  if (!password || password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }
  if (password !== confirm) return { error: 'Passwords do not match.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'This reset link has expired. Please request a new one.' }
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function getSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return { user, profile }
}
