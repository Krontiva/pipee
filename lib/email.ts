// Thin Resend wrapper shared by every outgoing email (password reset, digests, alerts).
// FROM must be on a domain verified in Resend (see .env.example).
export async function sendEmail(opts: { to: string; subject: string; html: string }) {
  const from = process.env.RESEND_FROM_EMAIL
  const key = process.env.RESEND_API_KEY
  if (!from || !key) throw new Error('RESEND_API_KEY / RESEND_FROM_EMAIL are not set')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
