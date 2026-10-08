'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-guards'

// ── Save / retrieve API key from admin_settings ──────────────────────────────
export async function saveApiKey(key: string, value: string) {
  const guard = await requireAdmin()
  if ('error' in guard) return { error: guard.error }

  const { error } = await guard.supabase
    .from('admin_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() })
  if (error) return { error: error.message }
  return { success: true }
}

export async function getApiKey(key: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', key)
    .single()
  return data?.value ?? null
}

// ── Report generation via Grok (xAI) ────────────────────────────────────────
export interface ReportFilters {
  dateFrom?: string
  dateTo?: string
  assignedTo?: string   // profile id or 'all'
  stage?: number | 'all'
  status?: string
  reportType: 'pipeline_summary' | 'individual_performance' | 'deal_deep_dive' | 'sector_analysis'
  dealId?: string
}

export async function generateReport(filters: ReportFilters): Promise<{ report?: string; error?: string }> {
  const guard = await requireAdmin()
  if ('error' in guard) return { error: guard.error }
  const supabase = guard.supabase

  // Fetch API key
  const grokKey = await getApiKey('groq_api_key')
  if (!grokKey) return { error: 'Groq API key not configured. Add it in Admin → Settings.' }

  // Fetch data
  let query = supabase
    .from('opportunities')
    .select('*, profiles(name, role), meddic_scores(score, identified_pain, economic_buyer_name, champion_name), activities(type, title, occurred_at)')

  if (filters.assignedTo && filters.assignedTo !== 'all') {
    query = query.eq('assigned_to', filters.assignedTo)
  }
  if (filters.stage && filters.stage !== 'all') {
    query = query.eq('stage', filters.stage)
  }
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }
  if (filters.dealId) {
    query = query.eq('id', filters.dealId)
  }
  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom)
  }
  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo + 'T23:59:59Z')
  }

  const { data: opportunities, error: dbError } = await query.limit(100)
  if (dbError) return { error: dbError.message }

  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, name, role')
    .eq('is_active', true)

  // Build context for Grok
  const reportTypeLabels: Record<string, string> = {
    pipeline_summary: 'Pipeline Summary Report',
    individual_performance: 'Individual BD Performance Report',
    deal_deep_dive: 'Deal Deep Dive Report',
    sector_analysis: 'Sector Analysis Report',
  }

  const totalValue = opportunities?.reduce((s, o) => s + (o.value ?? 0), 0) ?? 0
  const byStage = [1,2,3,4,5,6,7].map(s => ({
    stage: s,
    count: opportunities?.filter(o => o.stage === s).length ?? 0,
    value: opportunities?.filter(o => o.stage === s).reduce((a, o) => a + (o.value ?? 0), 0) ?? 0,
  }))

  const byRep = (allProfiles ?? [])
    .filter(p => p.role === 'bd_rep')
    .map(p => {
      const repOpps = opportunities?.filter(o => (o.profiles as { name: string } | null)?.name === p.name) ?? []
      return {
        name: p.name,
        active: repOpps.filter(o => o.status === 'active').length,
        won: repOpps.filter(o => o.status === 'won').length,
        lost: repOpps.filter(o => o.status === 'lost').length,
        pipeline: repOpps.reduce((s, o) => s + (o.value ?? 0), 0),
        avgStage: repOpps.length ? Math.round(repOpps.reduce((s, o) => s + o.stage, 0) / repOpps.length * 10) / 10 : 0,
      }
    })

  const dataContext = JSON.stringify({
    reportType: reportTypeLabels[filters.reportType],
    filters: { ...filters, totalDeals: opportunities?.length },
    summary: { totalDeals: opportunities?.length, totalPipelineValue: totalValue },
    byStage,
    byRep,
    deals: opportunities?.map(o => ({
      title: o.title,
      company: o.company_name,
      sector: o.sector,
      stage: o.stage,
      status: o.status,
      value: o.value,
      currency: o.currency,
      assignedTo: (o.profiles as { name: string } | null)?.name,
      meddicScore: (o.meddic_scores as { score: number } | null)?.score,
      activitiesCount: Array.isArray(o.activities) ? o.activities.length : 0,
      nextAction: o.next_action,
      nextActionDate: o.next_action_date,
      stageEnteredAt: o.stage_entered_at,
    })),
  }, null, 2)

  const systemPrompt = `You are a senior business development analyst for Krontiva, a Ghanaian tech company selling the Krongage customer engagement platform.
You write clear, professional BD pipeline reports in a structured format.
Use markdown formatting. Be specific with numbers. Highlight risks, wins, and recommendations.
Write in a professional but direct tone — this is an internal management report.`

  const userPrompt = `Generate a ${reportTypeLabels[filters.reportType]} based on the following pipeline data.

${dataContext}

Structure your report with:
1. Executive Summary (3-4 bullet points)
2. Key Metrics
3. ${filters.reportType === 'individual_performance' ? 'Per-BDO Breakdown' : filters.reportType === 'deal_deep_dive' ? 'Deal Analysis' : filters.reportType === 'sector_analysis' ? 'Sector Breakdown' : 'Pipeline Stage Analysis'}
4. Top Risks & Stalled Deals
5. Recommendations (actionable, specific)

Today's date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${grokKey}`,
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return { error: `Grok API error: ${response.status} — ${err}` }
    }

    const result = await response.json()
    const report = result.choices?.[0]?.message?.content
    if (!report) return { error: 'Grok returned an empty response.' }
    return { report }
  } catch (e: unknown) {
    return { error: `Network error: ${e instanceof Error ? e.message : String(e)}` }
  }
}
