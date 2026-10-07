'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { STAGE_META, SUB_STAGES, STAGE_DEFAULT_NEXT_ACTION, BLOCKER_OPTIONS } from '@/types'
import type { DisqualificationReason, BlockerKey } from '@/types'

export async function createOpportunity(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const assignedTo = formData.get('assigned_to') as string || user.id

  const { data, error } = await supabase
    .from('opportunities')
    .insert({
      title: formData.get('title') as string,
      company_name: formData.get('company_name') as string,
      sector: formData.get('sector') as string || null,
      website: formData.get('website') as string || null,
      value: formData.get('value') ? Number(formData.get('value')) : null,
      estimated_value: formData.get('estimated_value') ? Number(formData.get('estimated_value')) : null,
      currency: formData.get('currency') as string || 'GHS',
      assigned_to: assignedTo,
      // Stage 1 default next action — user can override via the form
      next_action: formData.get('next_action') as string || STAGE_DEFAULT_NEXT_ACTION[1].action,
      next_action_date: formData.get('next_action_date') as string || (() => {
        const d = new Date(); d.setDate(d.getDate() + STAGE_DEFAULT_NEXT_ACTION[1].days); return d.toISOString().slice(0, 10)
      })(),
    })
    .select()
    .single()

  if (error) return { error: error.message }

  // Create blank MEDDIC score
  await supabase.from('meddic_scores').insert({ opportunity_id: data.id, score: 0 })

  // Create primary contact if provided
  const contactName = formData.get('contact_name') as string
  if (contactName?.trim()) {
    await supabase.from('contacts').insert({
      opportunity_id: data.id,
      name: contactName.trim(),
      title: formData.get('contact_title') as string || null,
      role: formData.get('contact_role') as string || 'stakeholder',
      email: formData.get('contact_email') as string || null,
      phone: formData.get('contact_phone') as string || null,
    })
  }

  // Log creation activity
  await supabase.from('activities').insert({
    opportunity_id: data.id,
    user_id: user.id,
    type: 'note',
    title: 'Opportunity created',
    occurred_at: new Date().toISOString(),
  })

  revalidatePath('/pipeline')
  revalidatePath('/opportunities')
  revalidatePath('/dashboard')
  return { data }
}

export async function advanceStage(opportunityId: string, newStage: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (newStage < 1 || newStage > 7) return { error: 'Invalid stage' }

  const { data: opp } = await supabase
    .from('opportunities')
    .select('stage, meddic_scores(*)')
    .eq('id', opportunityId)
    .single()

  if (!opp) return { error: 'Opportunity not found.' }
  const currentStage = opp.stage

  // Only enforce gates when moving forward
  if (newStage > currentStage) {
    // ── Sub-stage gate: all required sub-stages must be complete ──────────────
    const requiredKeys = (SUB_STAGES[currentStage] ?? [])
      .filter(s => s.required)
      .map(s => s.key)

    if (requiredKeys.length > 0) {
      const { data: completed } = await supabase
        .from('sub_stage_progress')
        .select('sub_stage_key')
        .eq('opportunity_id', opportunityId)
        .in('sub_stage_key', requiredKeys)

      const completedKeys = new Set((completed ?? []).map(r => r.sub_stage_key))
      const missing = requiredKeys.filter(k => !completedKeys.has(k))

      if (missing.length > 0) {
        const missingLabels = missing
          .map(k => SUB_STAGES[currentStage]?.find(s => s.key === k)?.label ?? k)
          .join(', ')
        return {
          error: `Complete all required checklist items before advancing. Still open: ${missingLabels}.`,
          missingSubStages: missing,
        }
      }
    }

    // ── MEDDIC gate: Stage 2 → 3 needs score ≥4 with Pain + Economic Buyer ──
    if (currentStage === 2 && newStage === 3) {
      const meddic = Array.isArray(opp.meddic_scores) ? opp.meddic_scores[0] : opp.meddic_scores
      if (!meddic || meddic.score < 4 || !meddic.identified_pain || !meddic.economic_buyer_name) {
        return { error: 'MEDDIC score must be ≥4 with Identified Pain and Economic Buyer confirmed before advancing.' }
      }
    }
  }

  // Build the auto next action for the new stage
  const defaultNext = STAGE_DEFAULT_NEXT_ACTION[newStage]
  const nextActionDate = new Date()
  nextActionDate.setDate(nextActionDate.getDate() + (defaultNext?.days ?? 3))

  const { error } = await supabase
    .from('opportunities')
    .update({
      stage: newStage,
      stage_entered_at: new Date().toISOString(),
      status: 'active',
      next_action: defaultNext?.action ?? null,
      next_action_date: nextActionDate.toISOString().slice(0, 10),
    })
    .eq('id', opportunityId)

  if (error) return { error: error.message }

  await supabase.from('activities').insert({
    opportunity_id: opportunityId,
    user_id: user.id,
    type: 'stage_change',
    title: `Moved to Stage ${newStage}: ${STAGE_META[newStage]?.name}`,
    occurred_at: new Date().toISOString(),
  })

  revalidatePath('/pipeline')
  revalidatePath(`/opportunities/${opportunityId}`)
  revalidatePath('/dashboard')
  return { success: true }
}

export async function toggleSubStage(
  opportunityId: string,
  subStageKey: string,
  completed: boolean
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (completed) {
    const { error } = await supabase
      .from('sub_stage_progress')
      .upsert({ opportunity_id: opportunityId, sub_stage_key: subStageKey, completed_by: user.id })
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('sub_stage_progress')
      .delete()
      .eq('opportunity_id', opportunityId)
      .eq('sub_stage_key', subStageKey)
    if (error) return { error: error.message }
  }

  revalidatePath(`/opportunities/${opportunityId}`)
  return { success: true }
}

export async function updateOpportunity(id: string, updates: Record<string, unknown>) {
  const supabase = await createClient()
  const { error } = await supabase.from('opportunities').update(updates).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/pipeline')
  revalidatePath(`/opportunities/${id}`)
  revalidatePath('/dashboard')
  return { success: true }
}

export async function disqualifyOpportunity(id: string, reason: DisqualificationReason) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('opportunities')
    .update({ status: 'disqualified', disqualification_reason: reason })
    .eq('id', id)

  if (error) return { error: error.message }

  await supabase.from('activities').insert({
    opportunity_id: id,
    user_id: user.id,
    type: 'note',
    title: `Disqualified: ${reason.replace('_', ' ')}`,
    occurred_at: new Date().toISOString(),
  })

  revalidatePath('/pipeline')
  revalidatePath(`/opportunities/${id}`)
  revalidatePath('/dashboard')
  return { success: true }
}

export async function markWonLost(id: string, outcome: 'won' | 'lost', notes?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('opportunities')
    .update({ status: outcome })
    .eq('id', id)

  if (error) return { error: error.message }

  await supabase.from('activities').insert({
    opportunity_id: id,
    user_id: user.id,
    type: 'note',
    title: `Deal marked as ${outcome.toUpperCase()}`,
    description: notes || null,
    occurred_at: new Date().toISOString(),
  })

  revalidatePath('/pipeline')
  revalidatePath(`/opportunities/${id}`)
  revalidatePath('/dashboard')
  return { success: true }
}

export async function addContact(opportunityId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Name is required' }

  const { error } = await supabase.from('contacts').insert({
    opportunity_id: opportunityId,
    name,
    title:        (formData.get('title') as string)?.trim()        || null,
    role:         (formData.get('role')  as string)                || 'stakeholder',
    email:        (formData.get('email') as string)?.trim()        || null,
    phone:        (formData.get('phone') as string)?.trim()        || null,
    linkedin_url: (formData.get('linkedin_url') as string)?.trim() || null,
  })

  if (error) return { error: error.message }
  revalidatePath(`/opportunities/${opportunityId}`)
  return { success: true }
}

export async function deleteContact(opportunityId: string, contactId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('contacts').delete().eq('id', contactId)
  if (error) return { error: error.message }
  revalidatePath(`/opportunities/${opportunityId}`)
  return { success: true }
}

export async function updateContact(opportunityId: string, contactId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Name is required' }

  const { error } = await supabase.from('contacts').update({
    name,
    title:        (formData.get('title') as string)?.trim()        || null,
    role:         (formData.get('role')  as string)                || 'stakeholder',
    email:        (formData.get('email') as string)?.trim()        || null,
    phone:        (formData.get('phone') as string)?.trim()        || null,
    linkedin_url: (formData.get('linkedin_url') as string)?.trim() || null,
  }).eq('id', contactId)

  if (error) return { error: error.message }
  revalidatePath(`/opportunities/${opportunityId}`)
  return { success: true }
}

export async function clearStalled(opportunityId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('opportunities')
    .update({ status: 'active', stage_entered_at: new Date().toISOString() })
    .eq('id', opportunityId)

  if (error) return { error: error.message }

  await supabase.from('activities').insert({
    opportunity_id: opportunityId,
    user_id: user.id,
    type: 'note',
    title: 'Stalled status cleared',
    occurred_at: new Date().toISOString(),
  })

  revalidatePath(`/opportunities/${opportunityId}`)
  revalidatePath('/pipeline')
  revalidatePath('/dashboard')
  return { success: true }
}

// Two-word pill text for a free-typed blocker. Falls back to the first two words
// if the model is unavailable, so saving never fails because of it.
async function summariseBlocker(note: string): Promise<string> {
  const fallback = note.split(/\s+/).slice(0, 2).join(' ')
  try {
    let key = process.env.GROQ_API_KEY ?? null
    if (!key) {
      // Reps can't read admin_settings under RLS, so use the service client.
      const { data } = await supabaseAdmin().from('admin_settings').select('value').eq('key', 'groq_api_key').single()
      key = data?.value ?? null
    }
    if (!key) return fallback

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        temperature: 0,
        max_tokens: 12,
        messages: [
          { role: 'system', content: 'Summarise why a sales deal is blocked in exactly two words, Title Case, no punctuation. Reply with the two words only.' },
          { role: 'user', content: note },
        ],
      }),
    })
    if (!res.ok) return fallback
    const out: string = (await res.json()).choices?.[0]?.message?.content ?? ''
    const words = out.replace(/[^\p{L}\p{N}\s-]/gu, '').trim().split(/\s+/).filter(Boolean)
    return words.length >= 1 && words.length <= 3 ? words.slice(0, 2).join(' ') : fallback
  } catch {
    return fallback
  }
}

export async function setBlocker(opportunityId: string, blocker: BlockerKey, note?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const option = BLOCKER_OPTIONS.find(b => b.key === blocker)
  if (!option) return { error: 'Unknown blocker' }

  const text = note?.trim() ?? ''
  if (blocker === 'other' && !text) return { error: 'Please describe the blocker.' }

  const label = option.label ?? await summariseBlocker(text)

  // RLS limits this to the deal's owner or an admin.
  const { data, error } = await supabase
    .from('opportunities')
    .update({
      blocker,
      blocker_note: blocker === 'other' ? text : null,
      blocker_label: label,
      blocker_set_at: new Date().toISOString(),
    })
    .eq('id', opportunityId)
    .select('id')
  if (error) return { error: error.message }
  if (!data?.length) return { error: 'You do not have access to this deal.' }

  await supabase.from('activities').insert({
    opportunity_id: opportunityId,
    user_id: user.id,
    type: 'note',
    title: `Blocker: ${label}`,
    description: blocker === 'other' ? text : option.meaning,
    occurred_at: new Date().toISOString(),
  })

  revalidatePath(`/opportunities/${opportunityId}`)
  revalidatePath('/pipeline')
  revalidatePath('/dashboard')
  return { success: true, label }
}

export async function saveMEDDIC(opportunityId: string, data: Record<string, string>) {
  const supabase = await createClient()

  const filled = [
    data.metrics_evidence,
    data.economic_buyer_name,
    data.decision_criteria,
    data.decision_process,
    data.identified_pain,
    data.champion_name,
  ].filter(Boolean).length

  const { error } = await supabase
    .from('meddic_scores')
    .upsert(
      {
        opportunity_id: opportunityId,
        ...data,
        score: filled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'opportunity_id' }
    )

  if (error) return { error: error.message }
  revalidatePath(`/opportunities/${opportunityId}`)
  return { success: true, score: filled }
}

export async function updateActivity(
  activityId: string,
  opportunityId: string,
  data: { type: string; title: string; description: string | null; outcome: string | null; occurred_at: string }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('activities')
    .update(data)
    .eq('id', activityId)

  if (error) return { error: error.message }
  revalidatePath(`/opportunities/${opportunityId}`)
  return { success: true }
}

export async function deleteActivity(activityId: string, opportunityId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('activities').delete().eq('id', activityId)
  if (error) return { error: error.message }
  revalidatePath(`/opportunities/${opportunityId}`)
  return { success: true }
}

export async function updateProposal(
  proposalId: string,
  opportunityId: string,
  data: { status: string; scope: string | null; value: number | null; currency: string; payment_schedule: string | null; notes: string | null }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('proposals').update(data).eq('id', proposalId)
  if (error) return { error: error.message }
  revalidatePath(`/opportunities/${opportunityId}`)
  return { success: true }
}

export async function updateNextAction(
  opportunityId: string,
  nextAction: string | null,
  nextActionDate: string | null
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Fetch the current next action before overwriting so we can log it
  const { data: current } = await supabase
    .from('opportunities')
    .select('next_action, next_action_date')
    .eq('id', opportunityId)
    .single()

  // If there was a previous next action, log it as a completed note in the activity feed
  if (current?.next_action) {
    const wasOverdue = current.next_action_date
      ? new Date(current.next_action_date) < new Date(new Date().toDateString())
      : false

    await supabase.from('activities').insert({
      opportunity_id: opportunityId,
      user_id: user.id,
      type: 'note',
      title: `Next action: ${current.next_action}`,
      description: current.next_action_date
        ? `Due ${new Date(current.next_action_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}${wasOverdue ? ' · was overdue' : ''}`
        : null,
      outcome: nextAction ? `Replaced with: ${nextAction}` : 'Cleared',
      occurred_at: new Date().toISOString(),
    })
  }

  const { error } = await supabase
    .from('opportunities')
    .update({ next_action: nextAction, next_action_date: nextActionDate })
    .eq('id', opportunityId)

  if (error) return { error: error.message }
  revalidatePath(`/opportunities/${opportunityId}`)
  revalidatePath('/pipeline')
  revalidatePath('/calendar')
  return { success: true }
}

export async function addActivity(opportunityId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('activities').insert({
    opportunity_id: opportunityId,
    user_id: user.id,
    type: formData.get('type') as string,
    title: formData.get('title') as string,
    description: formData.get('description') as string || null,
    outcome: formData.get('outcome') as string || null,
    occurred_at: formData.get('occurred_at') as string || new Date().toISOString(),
  })

  if (error) return { error: error.message }

  // If a next action was provided alongside the activity, update it on the opportunity
  const nextAction = formData.get('next_action') as string || null
  const nextActionDate = formData.get('next_action_date') as string || null
  if (nextAction || nextActionDate) {
    await supabase
      .from('opportunities')
      .update({ next_action: nextAction, next_action_date: nextActionDate || null })
      .eq('id', opportunityId)
    revalidatePath('/pipeline')
    revalidatePath('/calendar')
  }

  revalidatePath(`/opportunities/${opportunityId}`)
  return { success: true }
}
