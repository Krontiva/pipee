'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Info, Loader2 } from 'lucide-react'
import { cn, formatCurrency, initials } from '@/lib/utils'
import { CURRENCIES, STAGE_META } from '@/types'
import { setRepTarget } from '@/lib/actions/analytics'
import { MIN_SAMPLE } from '@/lib/analytics'
import type { AnalyticsData, RepRow } from '@/lib/analytics'

const TABS = [
  { id: 'forecast', label: 'Forecast' },
  { id: 'winloss', label: 'Win / Loss' },
  { id: 'velocity', label: 'Velocity & Aging' },
  { id: 'reps', label: 'Reps & Targets' },
] as const
type TabId = (typeof TABS)[number]['id']

const card = 'bg-white border border-slate-200 rounded-xl p-5 shadow-sm'
const label = 'text-xs font-semibold text-gray-400 uppercase tracking-wide'
const th = 'text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-2 pr-4'
const td = 'py-2.5 pr-4 text-sm text-gray-700'

const pct = (n: number | null) => (n === null ? '—' : `${n}%`)
const ratePct = (r: number) => `${Math.round(r * 100)}%`

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-xs text-gray-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
      <Info size={13} className="mt-0.5 shrink-0 text-gray-400" />
      <span>{children}</span>
    </p>
  )
}

function Stat({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className={card}>
      <p className={label}>{title}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-2">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export function AnalyticsView({ data }: { data: AnalyticsData }) {
  const [tab, setTab] = useState<TabId>('forecast')
  const [currency, setCurrency] = useState(data.defaultCurrency)
  const block = data.byCurrency[currency] ?? data.byCurrency[data.defaultCurrency]
  const lowData = data.closedCount < MIN_SAMPLE

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Analytics</h2>
          <p className="text-sm text-gray-400">
            Forecast and performance, calculated from your pipeline history. Admins only.
          </p>
        </div>
        {data.currencies.length > 1 && (
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {data.currencies.map(c => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={cn('px-3 py-1 rounded-md text-xs font-medium transition-colors',
                  c === currency ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn('px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors',
              tab === t.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'forecast' && (
        <div className="space-y-6">
          {lowData && (
            <Note>
              Only {data.closedCount} deal{data.closedCount === 1 ? ' has' : 's have'} been closed so far (won, lost or
              disqualified). Win probabilities based on so few deals are unreliable. Treat the forecast as a rough guide until
              there are at least {MIN_SAMPLE} closed deals per stage.
            </Note>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat title="Weighted forecast" value={formatCurrency(block.weighted, currency)} sub="Pipeline × chance of winning" />
            <Stat title="Open pipeline" value={formatCurrency(block.pipeline, currency)} sub={`${block.openCount} open deals`} />
            <Stat title="Win rate" value={pct(data.totals.winRate)} sub={`${data.totals.won} won · ${data.totals.lost} lost`} />
            <Stat title="Overall close rate" value={ratePct(data.overallWinRate)} sub={`${data.totals.won} of ${data.closedCount} closed deals`} />
          </div>

          {block.noValue > 0 && (
            <Note>
              {block.noValue} open deal{block.noValue === 1 ? ' has' : 's have'} no value or estimated value in {currency} and
              {block.noValue === 1 ? ' is' : ' are'} left out of the money figures.
            </Note>
          )}

          <div className={card}>
            <p className={cn(label, 'mb-1')}>Forecast by stage</p>
            <p className="text-xs text-gray-400 mb-3">
              Chance of winning = share of past closed deals that reached this stage and were won. Disqualified deals count as not won.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className={th}>Stage</th>
                    <th className={th}>Open deals</th>
                    <th className={th}>Value</th>
                    <th className={th}>Chance of winning</th>
                    <th className={th}>Based on</th>
                    <th className={th}>Weighted</th>
                  </tr>
                </thead>
                <tbody>
                  {block.byStage.map(r => {
                    const c = data.conversion[r.stage - 1]
                    return (
                      <tr key={r.stage} className="border-b border-slate-50 last:border-0">
                        <td className={td}>{r.stage}. {STAGE_META[r.stage]?.name}</td>
                        <td className={td}>{r.count}</td>
                        <td className={td}>{formatCurrency(r.value, currency)}</td>
                        <td className={td}>{ratePct(c.used)}</td>
                        <td className={cn(td, 'text-xs text-gray-400')}>
                          {c.source === 'stage'
                            ? `${c.won} of ${c.reached} closed deals`
                            : `overall rate (only ${c.reached} closed deal${c.reached === 1 ? '' : 's'} reached here)`}
                        </td>
                        <td className={cn(td, 'font-medium text-gray-900')}>{formatCurrency(r.weighted, currency)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className={card}>
            <p className={cn(label, 'mb-1')}>Projected timing</p>
            <p className="text-xs text-gray-400 mb-3">
              Estimated, not entered: today plus the time left in each deal&apos;s current stage and the typical time in every later stage.
              Typical time is the observed median where there is enough history, otherwise the stage target.
            </p>
            {block.projected.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">No open deals with a value to project.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className={th}>Projected month</th>
                      <th className={th}>Deals</th>
                      <th className={th}>Weighted value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {block.projected.map(p => (
                      <tr key={p.month} className="border-b border-slate-50 last:border-0">
                        <td className={td}>{monthLabel(p.month)}</td>
                        <td className={td}>{p.count}</td>
                        <td className={cn(td, 'font-medium text-gray-900')}>{formatCurrency(p.weighted, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-3">
              Deals already past the typical time in their stage are projected as if they finish it today, so near-term months can be optimistic.
            </p>
          </div>
        </div>
      )}

      {tab === 'winloss' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat title="Won" value={String(data.totals.won)} />
            <Stat title="Lost" value={String(data.totals.lost)} />
            <Stat title="Disqualified" value={String(data.totals.disqualified)} />
            <Stat title="Win rate" value={pct(data.totals.winRate)} sub="Won ÷ (won + lost), as on the dashboard" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={card}>
              <p className={cn(label, 'mb-3')}>Why deals were disqualified</p>
              {data.disqReasons.length === 0 ? (
                <p className="text-sm text-gray-400 py-4">No disqualified deals yet.</p>
              ) : (
                <div className="space-y-3">
                  {data.disqReasons.map(r => {
                    const max = data.disqReasons[0].count
                    return (
                      <div key={r.reason}>
                        <div className="flex justify-between text-sm text-gray-700 mb-1">
                          <span>{r.label}</span><span className="font-medium">{r.count}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full">
                          <div className="h-2 bg-indigo-500 rounded-full" style={{ width: `${(r.count / max) * 100}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-4">
                Lost deals don&apos;t record a reason in Pipee, so this covers disqualified deals only.
              </p>
            </div>

            <div className={card}>
              <p className={cn(label, 'mb-3')}>By sector</p>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className={th}>Sector</th><th className={th}>Open</th><th className={th}>Won</th>
                      <th className={th}>Lost</th><th className={th}>Disq.</th><th className={th}>Win rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sectors.map(s => (
                      <tr key={s.key} className="border-b border-slate-50 last:border-0">
                        <td className={td}>{s.key}</td><td className={td}>{s.open}</td><td className={td}>{s.won}</td>
                        <td className={td}>{s.lost}</td><td className={td}>{s.disqualified}</td>
                        <td className={cn(td, 'font-medium')}>{pct(s.winRate)}</td>
                      </tr>
                    ))}
                    {data.sectors.length === 0 && (
                      <tr><td className={cn(td, 'text-gray-400')} colSpan={6}>No deals yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className={card}>
            <p className={cn(label, 'mb-3')}>By rep</p>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className={th}>Rep</th><th className={th}>Open</th><th className={th}>Won</th><th className={th}>Lost</th>
                    <th className={th}>Disq.</th><th className={th}>Win rate</th><th className={th}>Avg days to win</th>
                  </tr>
                </thead>
                <tbody>
                  {data.reps.map(r => (
                    <tr key={r.id} className="border-b border-slate-50 last:border-0">
                      <td className={td}>{r.name}</td><td className={td}>{r.open}</td><td className={td}>{r.won}</td>
                      <td className={td}>{r.lost}</td><td className={td}>{r.disqualified}</td>
                      <td className={cn(td, 'font-medium')}>{pct(r.winRate)}</td>
                      <td className={td}>{r.avgCycleDays === null ? '—' : Math.round(r.avgCycleDays)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              A win rate built on a handful of closed deals moves a lot with each new result. Read it alongside the won and lost counts.
            </p>
          </div>
        </div>
      )}

      {tab === 'velocity' && (
        <div className="space-y-6">
          <div className={card}>
            <p className={cn(label, 'mb-1')}>Days spent in each stage vs target</p>
            <p className="text-xs text-gray-400 mb-4">
              Median days for deals that completed the stage, against the stage&apos;s target.
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={data.velocity.map(v => ({ name: `S${v.stage}`, Target: v.target, 'Actual (median)': v.median ?? 0 }))}
                margin={{ top: 0, right: 0, left: -10, bottom: 0 }}
              >
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Target" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Actual (median)" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="overflow-x-auto mt-4">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className={th}>Stage</th><th className={th}>Target</th><th className={th}>Median</th>
                    <th className={th}>Average</th><th className={th}>Deals measured</th>
                  </tr>
                </thead>
                <tbody>
                  {data.velocity.map(v => (
                    <tr key={v.stage} className="border-b border-slate-50 last:border-0">
                      <td className={td}>{v.stage}. {v.name}</td>
                      <td className={td}>{v.target}d</td>
                      <td className={cn(td, v.median !== null && v.median > v.target && 'text-amber-600 font-medium')}>
                        {v.median === null ? '—' : `${v.median}d`}
                      </td>
                      <td className={td}>{v.mean === null ? '—' : `${v.mean}d`}</td>
                      <td className={td}>{v.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.velocitySkipped > 0 && (
              <p className="text-xs text-gray-400 mt-3">
                {data.velocitySkipped} deal{data.velocitySkipped === 1 ? ' was' : 's were'} left out because {data.velocitySkipped === 1 ? 'its' : 'their'} stage
                moves aren&apos;t fully recorded in the activity log.
              </p>
            )}
          </div>

          <div className={card}>
            <p className={cn(label, 'mb-1')}>Aging heatmap</p>
            <p className="text-xs text-gray-400 mb-4">
              Open deals by time in their current stage, as a share of that stage&apos;s target. Past 200% a deal counts as stalled.
            </p>
            <Heatmap rows={data.heatmap} />
          </div>

          <div className={card}>
            <p className={cn(label, 'mb-3')}>Furthest past target</p>
            {data.lateDeals.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">No open deals are past their stage target.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className={th}>Deal</th><th className={th}>Stage</th><th className={th}>Days in stage</th>
                      <th className={th}>Target</th><th className={th}>Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lateDeals.map(d => (
                      <tr key={d.id} className="border-b border-slate-50 last:border-0">
                        <td className={td}>
                          <Link href={`/opportunities/${d.id}`} className="text-indigo-600 font-medium hover:underline">{d.company}</Link>
                        </td>
                        <td className={td}>S{d.stage}</td>
                        <td className={cn(td, d.ratio >= 2 ? 'text-red-600 font-medium' : 'text-amber-600 font-medium')}>{d.days}d</td>
                        <td className={td}>{d.target}d</td>
                        <td className={td}>{d.owner}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'reps' && (
        <div className={card}>
          <p className={cn(label, 'mb-1')}>Quarterly targets · {data.quarterLabel}</p>
          <p className="text-xs text-gray-400 mb-4">
            Progress counts deals marked won this quarter, in the target&apos;s currency. Set an amount to 0 to clear a target.
          </p>
          <div className="space-y-3">
            {data.reps.map(r => <TargetRow key={r.id} rep={r} defaultCurrency={currency} />)}
            {data.reps.length === 0 && <p className="text-sm text-gray-400 py-2">No reps yet.</p>}
          </div>
        </div>
      )}
    </div>
  )
}

const HEAT_COLS = [
  { name: 'Under 50%', rgb: '34,197,94' },
  { name: '50–100%', rgb: '234,179,8' },
  { name: '100–200%', rgb: '249,115,22' },
  { name: '200%+ (stalled)', rgb: '239,68,68' },
]

function Heatmap({ rows }: { rows: AnalyticsData['heatmap'] }) {
  const max = Math.max(1, ...rows.flatMap(r => r.buckets))
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1">
        <thead>
          <tr>
            <th className={th}>Stage</th>
            {HEAT_COLS.map(c => <th key={c.name} className="text-center text-xs font-semibold text-gray-400 py-2">{c.name}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.stage}>
              <td className="text-sm text-gray-700 pr-4 whitespace-nowrap">{r.stage}. {r.name} <span className="text-xs text-gray-400">({r.target}d)</span></td>
              {r.buckets.map((n, i) => (
                <td
                  key={i}
                  className="text-center text-sm font-medium rounded-md h-9 min-w-24"
                  style={{
                    backgroundColor: n === 0 ? '#f8fafc' : `rgba(${HEAT_COLS[i].rgb},${0.15 + (n / max) * 0.65})`,
                    color: n === 0 ? '#cbd5e1' : '#0f172a',
                  }}
                >
                  {n}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TargetRow({ rep, defaultCurrency }: { rep: RepRow; defaultCurrency: string }) {
  const [amount, setAmount] = useState(rep.target ? String(rep.target.amount) : '')
  const [cur, setCur] = useState(rep.target?.currency ?? defaultCurrency)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const progress = rep.target ? Math.min(100, (rep.wonThisQuarter / rep.target.amount) * 100) : 0

  function save() {
    setError(null)
    startTransition(async () => {
      const res = await setRepTarget(rep.id, Number(amount || 0), cur)
      if (res.error) setError(res.error)
    })
  }

  return (
    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs text-white font-semibold shrink-0">
          {initials(rep.name)}
        </div>
        <div className="flex-1 min-w-40">
          <p className="text-sm font-medium text-gray-800">{rep.name}</p>
          {rep.target ? (
            <p className="text-xs text-gray-400">
              {formatCurrency(rep.wonThisQuarter, rep.target.currency)} of {formatCurrency(rep.target.amount, rep.target.currency)} · {Math.round(progress)}%
            </p>
          ) : (
            <p className="text-xs text-gray-400">No target set</p>
          )}
        </div>
        <input
          type="number" min="0" step="any" value={amount} onChange={e => setAmount(e.target.value)}
          placeholder="Target amount"
          className="w-36 border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white"
        />
        <select value={cur} onChange={e => setCur(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white">
          {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
        </select>
        <button
          onClick={save} disabled={isPending}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
        >
          {isPending && <Loader2 size={13} className="animate-spin" />} Save
        </button>
      </div>
      {rep.target && (
        <div className="h-1.5 bg-slate-200 rounded-full mt-3">
          <div className="h-1.5 bg-green-500 rounded-full" style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  )
}
