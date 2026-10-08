'use server'

import PptxGenJS from 'pptxgenjs'
import { requireAdmin } from '@/lib/auth-guards'
import { STAGE_META } from '@/types'
import { isStalled, activeBlocker } from '@/lib/utils'
import type { ReportFilters } from './reports'

// ── Brand colours ─────────────────────────────────────────────────────────────
const C = {
  indigo:    '4F46E5',
  indigoL:   'EEF2FF',
  slate:     '64748B',
  slateL:    'F8FAFC',
  border:    'E2E8F0',
  dark:      '0F172A',
  text:      '334155',
  textMuted: '94A3B8',
  white:     'FFFFFF',
  green:     '16A34A',
  red:       'DC2626',
  amber:     'D97706',
  stage: ['64748B','3B82F6','8B5CF6','F59E0B','F97316','22C55E','10B981'],
}

function hex(c: string) { return `#${c}` }

// ── Slide helpers ─────────────────────────────────────────────────────────────
function addSlideHeader(slide: PptxGenJS.Slide, title: string, subtitle?: string) {
  // Top bar
  slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.7, fill: { color: C.indigo } })
  // Logo letter
  slide.addShape('rect', { x: 0.3, y: 0.1, w: 0.5, h: 0.5, fill: { color: C.white }, line: { color: C.white }, rectRadius: 0.08 })
  slide.addText('K', { x: 0.3, y: 0.1, w: 0.5, h: 0.5, fontSize: 14, bold: true, color: C.indigo, align: 'center', valign: 'middle' })
  // Title in bar
  slide.addText(title, { x: 0.95, y: 0.12, w: 7, h: 0.46, fontSize: 14, bold: true, color: C.white, valign: 'middle' })
  if (subtitle) {
    slide.addText(subtitle, { x: 0.95, y: 0.12, w: 7, h: 0.46, fontSize: 9, color: 'C7D2FE', align: 'right', valign: 'middle' })
  }
}

function addKV(slide: PptxGenJS.Slide, x: number, y: number, w: number, h: number, label: string, value: string, valueColor = C.dark) {
  slide.addShape('rect', { x, y, w, h, fill: { color: C.slateL }, line: { color: C.border, pt: 1 }, rectRadius: 0.08 })
  slide.addText(label, { x: x + 0.15, y: y + 0.12, w: w - 0.3, h: 0.25, fontSize: 8, color: C.textMuted, bold: true })
  slide.addText(value, { x: x + 0.15, y: y + 0.35, w: w - 0.3, h: h - 0.45, fontSize: 16, bold: true, color: valueColor, valign: 'middle' })
}

function formatVal(v: number, currency = 'GHS') {
  const sym: Record<string,string> = { GHS:'GH₵', USD:'$', EUR:'€', GBP:'£', NGN:'₦' }
  return `${sym[currency] ?? currency}${v.toLocaleString()}`
}

// ── Main generator ────────────────────────────────────────────────────────────
export async function generatePptx(filters: ReportFilters): Promise<{ base64?: string; error?: string }> {
  const guard = await requireAdmin()
  if ('error' in guard) return { error: guard.error }
  const supabase = guard.supabase

  // ── Fetch data ─────────────────────────────────────────────────────────────
  let query = supabase
    .from('opportunities')
    .select('*, profiles(name, role), meddic_scores(score), activities(type)')

  if (filters.assignedTo && filters.assignedTo !== 'all') query = query.eq('assigned_to', filters.assignedTo)
  if (filters.stage     && filters.stage     !== 'all') query = query.eq('stage', filters.stage)
  if (filters.status    && filters.status    !== 'all') query = query.eq('status', filters.status)
  if (filters.dateFrom)  query = query.gte('created_at', filters.dateFrom)
  if (filters.dateTo)    query = query.lte('created_at', filters.dateTo + 'T23:59:59Z')

  const { data: opps = [], error: dbErr } = await query.limit(200)
  if (dbErr) return { error: dbErr.message }

  const { data: allProfiles = [] } = await supabase.from('profiles').select('id,name,role').eq('is_active', true)

  const opportunities = opps ?? []
  const profiles = allProfiles ?? []

  // Derived stats
  const active     = opportunities.filter(o => o.status === 'active')
  const won        = opportunities.filter(o => o.status === 'won')
  const lost       = opportunities.filter(o => o.status === 'lost')
  // Stalled is derived from time in stage — nothing ever stores status 'stalled'.
  const isStalledOpp = (o: { status: string; stage: number; stage_entered_at: string }) =>
    o.status === 'active' && isStalled(o.stage, o.stage_entered_at)
  const stalled    = opportunities.filter(isStalledOpp)
  const dealVal    = (o: { value?: number | null; estimated_value?: number | null }) => o.value ?? o.estimated_value ?? 0
  const totalVal   = active.reduce((s, o) => s + dealVal(o), 0)
  const wonVal     = won.reduce((s, o) => s + dealVal(o), 0)
  const winRate    = (won.length + lost.length) > 0 ? Math.round((won.length / (won.length + lost.length)) * 100) : 0

  const byStage = [1,2,3,4,5,6,7].map(s => ({
    stage: s,
    name: STAGE_META[s]?.name ?? `Stage ${s}`,
    count: opportunities.filter(o => o.stage === s).length,
    value: opportunities.filter(o => o.stage === s).reduce((a,o) => a + dealVal(o), 0),
  }))

  const byRep = profiles
    .filter(p => p.role === 'bd_rep')
    .map(p => {
      const ro = opportunities.filter(o => (o.profiles as { name:string } | null)?.name === p.name)
      return {
        name: p.name,
        active: ro.filter(o => o.status === 'active').length,
        won:    ro.filter(o => o.status === 'won').length,
        stalled:ro.filter(isStalledOpp).length,
        pipeline: ro.reduce((s,o) => s + dealVal(o), 0),
      }
    })

  const topDeals = [...opportunities]
    .filter(o => dealVal(o) > 0)
    .sort((a,b) => dealVal(b) - dealVal(a))
    .slice(0, 8)

  const stalledDeals = opportunities.filter(isStalledOpp).slice(0, 6)

  const reportTypeLabel: Record<string,string> = {
    pipeline_summary: 'Pipeline Summary',
    individual_performance: 'BDO Performance',
    deal_deep_dive: 'Deal Deep Dive',
    sector_analysis: 'Sector Analysis',
  }
  const reportTitle = reportTypeLabel[filters.reportType] ?? 'BD Report'
  const today = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })

  // ── Build PPTX ─────────────────────────────────────────────────────────────
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE' // 13.33 × 7.5 inches
  pptx.author  = 'Pipee'
  pptx.company = 'Krontiva'
  pptx.title   = `Pipee — ${reportTitle}`

  // ── SLIDE 1: Cover ─────────────────────────────────────────────────────────
  {
    const s = pptx.addSlide()
    // Full indigo background left panel
    s.addShape('rect', { x: 0, y: 0, w: 4.5, h: 7.5, fill: { color: C.indigo } })
    // Logo block
    s.addShape('rect', { x: 0.5, y: 0.6, w: 0.9, h: 0.9, fill: { color: C.white }, rectRadius: 0.14 })
    s.addText('K', { x: 0.5, y: 0.6, w: 0.9, h: 0.9, fontSize: 28, bold: true, color: C.indigo, align: 'center', valign: 'middle' })
    s.addText('KRONGAGE BD', { x: 1.55, y: 0.72, w: 2.7, h: 0.35, fontSize: 11, bold: true, color: C.white, valign: 'middle' })
    s.addText('Pipeline Management', { x: 1.55, y: 1.03, w: 2.7, h: 0.28, fontSize: 9, color: 'C7D2FE', valign: 'middle' })
    // Report title
    s.addText(reportTitle, { x: 0.4, y: 2.2, w: 3.7, h: 1.2, fontSize: 28, bold: true, color: C.white })
    // Divider
    s.addShape('rect', { x: 0.4, y: 3.55, w: 1.5, h: 0.04, fill: { color: 'C7D2FE' } })
    // Date & filter info
    s.addText(today, { x: 0.4, y: 3.75, w: 3.7, h: 0.3, fontSize: 10, color: 'C7D2FE' })
    s.addText(`${opportunities.length} deals analysed`, { x: 0.4, y: 4.1, w: 3.7, h: 0.3, fontSize: 10, color: 'C7D2FE' })
    if (filters.assignedTo && filters.assignedTo !== 'all') {
      const rep = profiles.find(p => p.id === filters.assignedTo)
      if (rep) s.addText(`BDO: ${rep.name}`, { x: 0.4, y: 4.4, w: 3.7, h: 0.3, fontSize: 10, color: 'C7D2FE' })
    }
    // Krontiva branding bottom
    s.addText('Krontiva — Confidential', { x: 0.4, y: 7.1, w: 3.7, h: 0.28, fontSize: 8, color: '818CF8' })
    // Right side summary cards
    s.addText('At a Glance', { x: 5, y: 0.7, w: 7.8, h: 0.4, fontSize: 14, bold: true, color: C.dark })
    s.addShape('rect', { x: 4.8, y: 0.55, w: 0.04, h: 6.5, fill: { color: C.border } })
    addKV(s, 5, 1.3,  3.6, 1.1, 'Active Pipeline Value',   formatVal(totalVal), C.indigo)
    addKV(s, 9, 1.3,  3.6, 1.1, 'Active Deals',            String(active.length), C.indigo)
    addKV(s, 5, 2.6,  3.6, 1.1, 'Won Value',               formatVal(wonVal), C.green)
    addKV(s, 9, 2.6,  3.6, 1.1, 'Win Rate',                `${winRate}%`, winRate >= 30 ? C.green : C.amber)
    addKV(s, 5, 3.9,  3.6, 1.1, 'Stalled Deals',           String(stalled.length), stalled.length > 0 ? C.red : C.slate)
    addKV(s, 9, 3.9,  3.6, 1.1, 'Deals Won',               String(won.length), C.green)
    // Stage mini bar
    s.addText('Pipeline by Stage', { x: 5, y: 5.2, w: 7.8, h: 0.3, fontSize: 10, bold: true, color: C.text })
    const maxCount = Math.max(...byStage.map(b => b.count), 1)
    byStage.forEach((b, i) => {
      const bx = 5 + i * 1.15
      const barH = Math.max((b.count / maxCount) * 1.1, 0.06)
      s.addShape('rect', { x: bx, y: 6.5 - barH, w: 0.9, h: barH, fill: { color: C.stage[i] ?? C.slate }, rectRadius: 0.04 })
      s.addText(String(b.count), { x: bx, y: 6.52 - barH - 0.22, w: 0.9, h: 0.22, fontSize: 9, bold: true, color: C.stage[i] ?? C.slate, align: 'center' })
      s.addText(`S${b.stage}`, { x: bx, y: 6.55, w: 0.9, h: 0.22, fontSize: 8, color: C.textMuted, align: 'center' })
    })
  }

  // ── SLIDE 2: Pipeline Overview ─────────────────────────────────────────────
  {
    const s = pptx.addSlide()
    addSlideHeader(s, 'Pipeline Overview', today)

    // Metric cards row
    const cards = [
      { label: 'Total Deals',     val: String(opportunities.length),  color: C.indigo },
      { label: 'Active Pipeline', val: formatVal(totalVal),           color: C.indigo },
      { label: 'Won This Period', val: String(won.length),            color: C.green  },
      { label: 'Win Rate',        val: `${winRate}%`,                 color: winRate >= 30 ? C.green : C.amber },
    ]
    cards.forEach((c, i) => addKV(s, 0.3 + i * 3.15, 0.85, 2.9, 1.0, c.label, c.val, c.color))

    // Stage breakdown table
    s.addText('Breakdown by Stage', { x: 0.3, y: 2.05, w: 12.5, h: 0.3, fontSize: 11, bold: true, color: C.dark })

    // Table header
    const cols = ['Stage', 'Name', 'Deals', 'Pipeline Value', 'Target Days']
    const colW = [0.6, 4.5, 1.0, 2.2, 1.5]
    let cx = 0.3
    cols.forEach((col, ci) => {
      s.addShape('rect', { x: cx, y: 2.42, w: colW[ci], h: 0.32, fill: { color: C.indigo } })
      s.addText(col, { x: cx + 0.08, y: 2.42, w: colW[ci] - 0.1, h: 0.32, fontSize: 9, bold: true, color: C.white, valign: 'middle' })
      cx += colW[ci]
    })

    byStage.forEach((b, ri) => {
      const ry = 2.74 + ri * 0.38
      const bg = ri % 2 === 0 ? C.white : C.slateL
      cx = 0.3
      const row = [`S${b.stage}`, b.name, String(b.count), b.value > 0 ? formatVal(b.value) : '—', `${STAGE_META[b.stage]?.targetDays ?? '?'}d`]
      row.forEach((cell, ci) => {
        s.addShape('rect', { x: cx, y: ry, w: colW[ci], h: 0.37, fill: { color: bg }, line: { color: C.border, pt: 0.5 } })
        s.addText(cell, { x: cx + 0.08, y: ry, w: colW[ci] - 0.1, h: 0.37, fontSize: 9, color: ci === 2 && b.count > 0 ? C.stage[ri] : C.text, bold: ci === 2, valign: 'middle' })
        cx += colW[ci]
      })
    })

    // Stage bar chart (right)
    s.addText('Deal Count by Stage', { x: 10.1, y: 2.05, w: 2.8, h: 0.3, fontSize: 11, bold: true, color: C.dark })
    const maxC = Math.max(...byStage.map(b => b.count), 1)
    byStage.forEach((b, i) => {
      const barW = (b.count / maxC) * 2.3
      const ry   = 2.42 + i * 0.48
      s.addShape('rect', { x: 10.1, y: ry + 0.06, w: Math.max(barW, 0.05), h: 0.32, fill: { color: C.stage[i] ?? C.slate }, rectRadius: 0.04 })
      if (b.count > 0) s.addText(String(b.count), { x: 10.15 + barW, y: ry + 0.06, w: 0.4, h: 0.32, fontSize: 9, bold: true, color: C.stage[i] ?? C.slate, valign: 'middle' })
    })
  }

  // ── SLIDE 3: BDO Performance ───────────────────────────────────────────────
  {
    const s = pptx.addSlide()
    addSlideHeader(s, 'BDO Performance', today)

    s.addText('Performance by Business Development Officer', { x: 0.3, y: 0.85, w: 12.5, h: 0.3, fontSize: 11, bold: true, color: C.dark })

    // Header
    const cols = ['BDO', 'Active Deals', 'Won', 'Stalled', 'Pipeline Value', 'Avg Stage']
    const colW = [2.5, 1.8, 1.2, 1.2, 2.5, 1.6]
    let cx = 0.3
    cols.forEach((col, ci) => {
      s.addShape('rect', { x: cx, y: 1.25, w: colW[ci], h: 0.35, fill: { color: C.indigo } })
      s.addText(col, { x: cx + 0.08, y: 1.25, w: colW[ci] - 0.1, h: 0.35, fontSize: 9, bold: true, color: C.white, valign: 'middle' })
      cx += colW[ci]
    })

    byRep.forEach((r, ri) => {
      const ry = 1.6 + ri * 0.52
      const bg = ri % 2 === 0 ? C.white : C.slateL
      cx = 0.3
      const stalledColor = r.stalled > 0 ? C.red : C.text
      const row = [r.name, String(r.active), String(r.won), String(r.stalled), r.pipeline > 0 ? formatVal(r.pipeline) : '—', '—']
      const colors = [C.dark, C.indigo, C.green, stalledColor, C.text, C.text]
      row.forEach((cell, ci) => {
        s.addShape('rect', { x: cx, y: ry, w: colW[ci], h: 0.5, fill: { color: bg }, line: { color: C.border, pt: 0.5 } })
        s.addText(cell, { x: cx + 0.1, y: ry, w: colW[ci] - 0.15, h: 0.5, fontSize: 10, bold: ci === 0, color: colors[ci], valign: 'middle' })
        cx += colW[ci]
      })
      // Pipeline bar
      if (r.pipeline > 0 && byRep.length > 0) {
        const maxPipe = Math.max(...byRep.map(b => b.pipeline), 1)
        const bw = (r.pipeline / maxPipe) * 2.0
        s.addShape('rect', { x: 7.95, y: ry + 0.1, w: bw, h: 0.32, fill: { color: C.indigoL }, rectRadius: 0.04 })
        s.addShape('rect', { x: 7.95, y: ry + 0.1, w: Math.max(bw * 0.15, 0.08), h: 0.32, fill: { color: C.indigo }, rectRadius: 0.04 })
      }
    })

    if (byRep.length === 0) {
      s.addText('No BDO data available for the selected filters.', { x: 0.3, y: 2.5, w: 12.5, h: 0.5, fontSize: 11, color: C.textMuted, align: 'center' })
    }
  }

  // ── SLIDE 4: Top Deals ────────────────────────────────────────────────────
  {
    const s = pptx.addSlide()
    addSlideHeader(s, 'Top Deals by Value', today)

    s.addText('Highest value opportunities in the pipeline', { x: 0.3, y: 0.85, w: 12.5, h: 0.28, fontSize: 10, color: C.textMuted })

    const cols = ['#', 'Company', 'Deal Title', 'Stage', 'Value', 'Status', 'BDO']
    const colW = [0.4, 2.0, 3.5, 1.0, 1.8, 1.2, 1.9]
    let cx = 0.3
    cols.forEach((col, ci) => {
      s.addShape('rect', { x: cx, y: 1.22, w: colW[ci], h: 0.35, fill: { color: C.indigo } })
      s.addText(col, { x: cx + 0.06, y: 1.22, w: colW[ci] - 0.08, h: 0.35, fontSize: 8.5, bold: true, color: C.white, valign: 'middle' })
      cx += colW[ci]
    })

    topDeals.forEach((d, ri) => {
      const ry  = 1.57 + ri * 0.46
      const bg  = ri % 2 === 0 ? C.white : C.slateL
      const stColor = C.stage[d.stage - 1] ?? C.slate
      cx = 0.3
      const row = [
        String(ri + 1),
        d.company_name,
        d.title,
        `Stage ${d.stage}`,
        formatVal(d.value ?? 0, d.currency),
        d.status,
        (d.profiles as { name: string } | null)?.name ?? '—',
      ]
      const colors = [C.textMuted, C.dark, C.text, stColor, C.green, C.text, C.text]
      const bolds  = [false, true, false, true, true, false, false]
      row.forEach((cell, ci) => {
        s.addShape('rect', { x: cx, y: ry, w: colW[ci], h: 0.44, fill: { color: bg }, line: { color: C.border, pt: 0.5 } })
        s.addText(cell, { x: cx + 0.06, y: ry, w: colW[ci] - 0.08, h: 0.44, fontSize: 8.5, bold: bolds[ci], color: colors[ci], valign: 'middle' })
        cx += colW[ci]
      })
    })
  }

  // ── SLIDE 5: Stalled Deals ────────────────────────────────────────────────
  {
    const s = pptx.addSlide()
    addSlideHeader(s, 'Stalled Deals — Action Required', today)

    if (stalledDeals.length === 0) {
      s.addShape('rect', { x: 2, y: 2.5, w: 9, h: 1.5, fill: { color: 'F0FDF4' }, line: { color: '86EFAC', pt: 1 }, rectRadius: 0.1 })
      s.addText('✓  No stalled deals — pipeline is healthy!', { x: 2, y: 2.5, w: 9, h: 1.5, fontSize: 16, color: C.green, align: 'center', valign: 'middle' })
    } else {
      s.addText(`${stalledDeals.length} deal${stalledDeals.length > 1 ? 's' : ''} need immediate attention`, { x: 0.3, y: 0.85, w: 12.5, h: 0.28, fontSize: 10, color: C.red })

      stalledDeals.forEach((d, i) => {
        const ry = 1.25 + i * 0.95
        s.addShape('rect', { x: 0.3, y: ry, w: 12.5, h: 0.88, fill: { color: 'FEF2F2' }, line: { color: 'FECACA', pt: 1 }, rectRadius: 0.08 })
        // Left accent
        s.addShape('rect', { x: 0.3, y: ry, w: 0.08, h: 0.88, fill: { color: C.red }, rectRadius: 0.04 })
        s.addText(d.company_name, { x: 0.55, y: ry + 0.08, w: 5, h: 0.3, fontSize: 11, bold: true, color: C.dark })
        s.addText(d.title, { x: 0.55, y: ry + 0.38, w: 6, h: 0.25, fontSize: 9, color: C.text })
        const blocker = activeBlocker(d)?.label ?? 'Blocker not recorded'
        s.addText(`Stage ${d.stage}: ${STAGE_META[d.stage]?.name ?? ''}  ·  Blocker: ${blocker}`, { x: 0.55, y: ry + 0.61, w: 8, h: 0.22, fontSize: 8.5, color: C.textMuted })
        // Value
        if (d.value) s.addText(formatVal(d.value, d.currency), { x: 9, y: ry + 0.12, w: 3.5, h: 0.35, fontSize: 13, bold: true, color: C.red, align: 'right' })
        // BDO
        const bdo = (d.profiles as { name: string } | null)?.name
        if (bdo) s.addText(`BDO: ${bdo}`, { x: 9, y: ry + 0.52, w: 3.5, h: 0.25, fontSize: 9, color: C.textMuted, align: 'right' })
      })
    }
  }

  // ── SLIDE 6: Recommendations ──────────────────────────────────────────────
  {
    const s = pptx.addSlide()
    addSlideHeader(s, 'Recommendations', today)

    const recs: string[] = []
    if (stalled.length > 3)  recs.push(`Schedule urgent follow-ups for ${stalled.length} stalled deals — prioritise by value.`)
    if (winRate < 20)         recs.push('Win rate is below 20%. Review qualification criteria and MEDDIC scores on Stage 2+ deals.')
    if (active.filter(o => o.stage <= 2).length > active.length * 0.6)
                              recs.push('Pipeline is top-heavy (60%+ in Stages 1–2). Push more deals into discovery and demo stages.')
    const noMeddic = active.filter(o => (o.meddic_scores as { score: number } | null)?.score === 0)
    if (noMeddic.length > 0)  recs.push(`${noMeddic.length} active deals have no MEDDIC score. Prioritise qualification on these.`)
    const noDate = active.filter(o => !o.next_action_date)
    if (noDate.length > 0)    recs.push(`${noDate.length} deals have no next action date. Set follow-up dates to prevent drift.`)
    if (topDeals.length > 0)  recs.push(`Focus BD energy on top-value deals: ${topDeals.slice(0,3).map(d => d.company_name).join(', ')}.`)
    if (recs.length === 0)    recs.push('Pipeline health looks solid. Maintain cadence and continue MEDDIC qualification on all active deals.')

    recs.forEach((rec, i) => {
      const ry = 0.95 + i * 0.82
      s.addShape('rect', { x: 0.3, y: ry, w: 12.5, h: 0.72, fill: { color: C.indigoL }, line: { color: 'C7D2FE', pt: 1 }, rectRadius: 0.08 })
      s.addShape('rect', { x: 0.3, y: ry, w: 0.08, h: 0.72, fill: { color: C.indigo }, rectRadius: 0.04 })
      s.addText(`${i + 1}`, { x: 0.5, y: ry, w: 0.5, h: 0.72, fontSize: 14, bold: true, color: C.indigo, align: 'center', valign: 'middle' })
      s.addText(rec, { x: 1.1, y: ry + 0.05, w: 11.5, h: 0.62, fontSize: 11, color: C.dark, valign: 'middle' })
    })

    // Footer
    s.addShape('rect', { x: 0, y: 7.15, w: '100%', h: 0.35, fill: { color: C.indigo } })
    s.addText(`Pipee — ${reportTitle} — ${today} — Krontiva Confidential`, { x: 0.3, y: 7.15, w: 12.5, h: 0.35, fontSize: 8, color: 'C7D2FE', valign: 'middle' })
  }

  // ── Export ──────────────────────────────────────────────────────────────────
  try {
    const base64 = await pptx.write({ outputType: 'base64' }) as string
    return { base64 }
  } catch (e) {
    return { error: `PPTX generation failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}
