import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Shield, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { TopNav } from '@/components/shared/TopNav'
import { ProductManagement } from '@/components/admin/ProductManagement'
import { UserManagement } from '@/components/admin/UserManagement'
import { ReportBuilder } from '@/components/admin/ReportBuilder'
import { AdminSettings } from '@/components/admin/AdminSettings'
import { upsertSectorAction } from '@/lib/actions/admin'
import { getApiKey } from '@/lib/actions/reports'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: profiles }, { data: sectors }, { data: products }, { data: memberships }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('profiles').select('*').order('created_at'),
    supabase.from('sectors').select('*').order('name'),
    supabase.from('products').select('*').order('name'),
    supabase.from('product_members').select('product_id, user_id'),
  ])
  const activeProducts = (products ?? []).filter(p => p.is_active)

  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const grokKeySet = !!(await getApiKey('groq_api_key'))

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopNav title="Admin" profile={profile} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-8">

          {/* ── Admin Guide banner ── */}
          <Link
            href="/admin/walkthrough"
            className="flex items-center gap-4 bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200 rounded-xl px-5 py-4 group hover:border-indigo-300 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm shadow-indigo-200">
              <Shield size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">Admin Guide</p>
              <p className="text-xs text-gray-500 mt-0.5">Learn how to manage the team, monitor the pipeline, handle stalled deals, and generate reports.</p>
            </div>
            <ArrowRight size={16} className="text-indigo-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </Link>

          {/* ── Products ── */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <ProductManagement products={products ?? []} />
          </div>

          {/* ── User Management ── */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <UserManagement profiles={profiles ?? []} products={activeProducts} memberships={memberships ?? []} />
          </div>

          {/* ── Report Builder ── */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-gray-900 font-semibold">Report Builder</h2>
              <p className="text-gray-400 text-sm">Generate AI-powered reports filtered by BDO, stage, status, or date range</p>
            </div>
            <ReportBuilder profiles={profiles ?? []} products={products ?? []} />
          </div>

          {/* ── Sector Management ── */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-gray-900 font-semibold">Priority Sectors</h2>
                <p className="text-gray-400 text-sm">Ideal Customer Profile sectors, set separately for each product</p>
              </div>
            </div>

            <div className="space-y-5">
              {(products ?? []).map(product => {
                const productSectors = (sectors ?? []).filter(s => s.product_id === product.id)
                return (
                  <div key={product.id}>
                    <p className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: product.color }} />
                      {product.name}
                    </p>
                    <div className="space-y-2">
                      {productSectors.map(sector => (
                        <div key={sector.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-lg">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${sector.is_priority ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                          <div className="flex-1">
                            <p className="text-gray-800 text-sm font-medium">{sector.name}</p>
                            {sector.description && <p className="text-gray-400 text-xs">{sector.description}</p>}
                          </div>
                          {sector.is_priority && (
                            <span className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">Priority</span>
                          )}
                        </div>
                      ))}
                      {productSectors.length === 0 && (
                        <p className="text-gray-400 text-xs px-1">No sectors yet for this product.</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <form action={upsertSectorAction} className="mt-4 flex gap-3">
              <select name="product_id" required defaultValue={activeProducts[0]?.id}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {activeProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input name="name" required placeholder="New sector name"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <button type="submit"
                className="bg-slate-100 border border-slate-200 text-gray-600 hover:text-gray-900 hover:bg-slate-200 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                Add Sector
              </button>
            </form>
          </div>

          {/* ── Admin Settings ── */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-gray-900 font-semibold">Settings</h2>
              <p className="text-gray-400 text-sm">API keys and integrations</p>
            </div>
            <AdminSettings grokKeySet={grokKeySet} />
          </div>

        </div>
      </div>
    </div>
  )
}
