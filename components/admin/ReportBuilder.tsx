'use client'

import { useState, useTransition } from 'react'
import {
  BarChart3, Loader2, Download, RefreshCw, ChevronDown,
  User, Users, FileText, TrendingUp, Building2, Presentation,
} from 'lucide-react'
import { generateReport } from '@/lib/actions/reports'
import { generatePptx } from '@/lib/actions/pptx'
import { cn } from '@/lib/utils'
import type { ReportFilters } from '@/lib/actions/reports'
import type { Product, Profile } from '@/types'

// Safe inline bold renderer — splits on **text** markers, never injects raw HTML
function BoldText({ text }: { text: string }) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>
      )}
    </>
  )
}

// Simple markdown renderer — no dangerouslySetInnerHTML
function MarkdownReport({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div className="space-y-1 text-sm text-gray-700 leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('# '))   return <h1 key={i} className="text-xl font-bold text-gray-900 mt-4 mb-2"><BoldText text={line.slice(2)} /></h1>
        if (line.startsWith('## '))  return <h2 key={i} className="text-base font-bold text-gray-900 mt-4 mb-1 border-b border-slate-100 pb-1"><BoldText text={line.slice(3)} /></h2>
        if (line.startsWith('### ')) return <h3 key={i} className="text-sm font-semibold text-gray-800 mt-3 mb-1"><BoldText text={line.slice(4)} /></h3>
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <div key={i} className="flex items-start gap-2 pl-2">
              <span className="text-indigo-400 mt-1 shrink-0">•</span>
              <span><BoldText text={line.slice(2)} /></span>
            </div>
          )
        }
        if (/^\d+\./.test(line)) {
          return <p key={i} className="pl-4"><BoldText text={line} /></p>
        }
        if (line.trim() === '') return <div key={i} className="h-2" />
        return <p key={i}><BoldText text={line} /></p>
      })}
    </div>
  )
}

const REPORT_TYPES = [
  { value: 'pipeline_summary',      label: 'Pipeline Summary',       icon: BarChart3,   desc: 'Full pipeline overview — stages, values, conversion' },
  { value: 'individual_performance',label: 'BDO Performance',        icon: User,        desc: 'Per-rep deal count, win rate, pipeline value' },
  { value: 'deal_deep_dive',        label: 'Deal Deep Dive',         icon: FileText,    desc: 'Detailed analysis of a specific deal' },
  { value: 'sector_analysis',       label: 'Sector Analysis',        icon: Building2,   desc: 'Breakdown by industry sector and ICP fit' },
]

interface ReportBuilderProps {
  profiles: Profile[]
  products: Product[]
}

export function ReportBuilder({ profiles, products }: ReportBuilderProps) {
  const [isPending, startTransition] = useTransition()
  const [isPptxPending, startPptxTransition] = useTransition()
  const [report, setReport] = useState<string | null>(null)
  const [reportError, setReportError] = useState<string | null>(null)
  const [pptxError, setPptxError] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)

  const [filters, setFilters] = useState<ReportFilters>({
    reportType: 'pipeline_summary',
    productId: 'all',
    assignedTo: 'all',
    stage: 'all',
    status: 'all',
  })

  function set<K extends keyof ReportFilters>(k: K, v: ReportFilters[K]) {
    setFilters(f => ({ ...f, [k]: v }))
  }

  function handleGenerate() {
    setReport(null)
    setReportError(null)
    startTransition(async () => {
      const result = await generateReport(filters)
      if (result.error) {
        setReportError(result.error)
      } else {
        setReport(result.report ?? null)
        setGeneratedAt(new Date().toLocaleString('en-GB'))
      }
    })
  }

  function handleDownload() {
    if (!report) return
    const blob = new Blob([report], { type: 'text/markdown' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `${fileStem}-${filters.reportType}-${new Date().toISOString().slice(0,10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleDownloadPptx() {
    setPptxError(null)
    startPptxTransition(async () => {
      const result = await generatePptx(filters)
      if (result.error) {
        setPptxError(result.error)
      } else if (result.base64) {
        const bytes = Uint8Array.from(atob(result.base64), c => c.charCodeAt(0))
        const blob  = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })
        const url   = URL.createObjectURL(blob)
        const a     = document.createElement('a')
        a.href = url
        a.download = `${fileStem}-${filters.reportType}-${new Date().toISOString().slice(0,10)}.pptx`
        a.click()
        URL.revokeObjectURL(url)
      }
    })
  }

  const fileStem = `${products.find(p => p.id === filters.productId)?.code ?? 'pipee'}-report`
  const bdReps = profiles.filter(p => p.role === 'bd_rep' && p.is_active)

  const inp = 'bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <div className="space-y-5">
      {/* Report type selector */}
      <div className="grid grid-cols-2 gap-2">
        {REPORT_TYPES.map(rt => {
          const Icon = rt.icon
          const active = filters.reportType === rt.value
          return (
            <button
              key={rt.value}
              onClick={() => set('reportType', rt.value as ReportFilters['reportType'])}
              className={cn(
                'flex items-start gap-3 p-3 rounded-xl border text-left transition-all',
                active ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:bg-slate-50'
              )}
            >
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', active ? 'bg-indigo-100' : 'bg-slate-100')}>
                <Icon size={15} className={active ? 'text-indigo-600' : 'text-gray-500'} />
              </div>
              <div>
                <p className={cn('text-sm font-medium', active ? 'text-indigo-700' : 'text-gray-700')}>{rt.label}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{rt.desc}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Filters</p>
        <div className="grid grid-cols-2 gap-3">
          {/* Product */}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
            <select className={inp + ' w-full'} value={filters.productId ?? 'all'} onChange={e => set('productId', e.target.value)}>
              <option value="all">All products</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* BD Member */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">BD Member</label>
            <select className={inp + ' w-full'} value={filters.assignedTo ?? 'all'} onChange={e => set('assignedTo', e.target.value)}>
              <option value="all">All BD Reps</option>
              {bdReps.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Stage */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Stage</label>
            <select className={inp + ' w-full'} value={filters.stage ?? 'all'} onChange={e => set('stage', e.target.value === 'all' ? 'all' : Number(e.target.value))}>
              <option value="all">All Stages</option>
              {[1,2,3,4,5,6,7].map(s => <option key={s} value={s}>Stage {s}</option>)}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select className={inp + ' w-full'} value={filters.status ?? 'all'} onChange={e => set('status', e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="stalled">Stalled</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="disqualified">Disqualified</option>
            </select>
          </div>

          {/* Date from */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Created From</label>
            <input type="date" className={inp + ' w-full'} value={filters.dateFrom ?? ''} onChange={e => set('dateFrom', e.target.value || undefined)} />
          </div>

          {/* Date to */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Created To</label>
            <input type="date" className={inp + ' w-full'} value={filters.dateTo ?? ''} onChange={e => set('dateTo', e.target.value || undefined)} />
          </div>
        </div>
      </div>

      {/* Generate buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleGenerate}
          disabled={isPending || isPptxPending}
          className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
        >
          {isPending ? (
            <><Loader2 size={15} className="animate-spin" /> Generating…</>
          ) : (
            <><BarChart3 size={15} /> Generate Report</>
          )}
        </button>
        <button
          onClick={handleDownloadPptx}
          disabled={isPptxPending || isPending}
          className="flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-gray-700 font-semibold py-2.5 px-4 rounded-xl transition-colors"
          title="Generate & download as PowerPoint"
        >
          {isPptxPending ? (
            <><Loader2 size={15} className="animate-spin text-indigo-500" /> Building…</>
          ) : (
            <><Presentation size={15} className="text-indigo-500" /> Download .pptx</>
          )}
        </button>
      </div>

      {/* Errors */}
      {reportError && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {reportError}
        </div>
      )}
      {pptxError && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {pptxError}
        </div>
      )}

      {/* Report output */}
      {report && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div>
              <p className="text-sm font-semibold text-gray-800">Generated Report</p>
              {generatedAt && <p className="text-xs text-gray-400">{generatedAt}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={handleGenerate} disabled={isPending || isPptxPending}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white transition-colors">
                <RefreshCw size={12} /> Regenerate
              </button>
              <button onClick={handleDownload}
                className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-lg px-2.5 py-1.5 bg-indigo-50 transition-colors">
                <Download size={12} /> .md
              </button>
              <button onClick={handleDownloadPptx} disabled={isPptxPending}
                className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 border border-violet-200 rounded-lg px-2.5 py-1.5 bg-violet-50 disabled:opacity-50 transition-colors">
                {isPptxPending ? <Loader2 size={12} className="animate-spin" /> : <Presentation size={12} />}
                .pptx
              </button>
            </div>
          </div>
          <div className="p-5 max-h-[600px] overflow-y-auto">
            <MarkdownReport content={report} />
          </div>
        </div>
      )}
    </div>
  )
}
