import { HubClient, partitionWorkItems, type HubWorkItem } from '@krontiva/hub-contract'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { OpportunityStatus, BlockerKey } from '@/types'
import { STAGE_META } from '@/types'
import { isStalled, activeBlocker } from '@/lib/utils'

// Pipee has no per-item change feed and the pipeline is small, so every run
// does a full resync rather than maintaining an outbox — the simplification
// the contract allows for a "reconciliation send", just run on every tick
// instead of periodically alongside one (see RoadMap's lib/hub-sync.ts,
// which takes the same approach for the same reason).
const PIPEE_URL = process.env.PIPEE_PUBLIC_URL ?? 'https://pipee.vercel.app'

// Pipee's five statuses collapse onto Hub's five work-item states.
// 'stalled' -> 'blocked' is the one that matters most: it's what makes
// Hub's per-product vocabulary for Pipee ("stalled", in product-copy.ts on
// the Hub side) actually mean something instead of always reading zero.
// 'lost' and 'disqualified' both become 'dropped' rather than 'done' — a
// lost or disqualified deal didn't close successfully, and folding it into
// 'done' would inflate "closed this week" with losses.
const STATE_MAP: Record<OpportunityStatus, HubWorkItem['state']> = {
  active: 'active',
  stalled: 'blocked',
  won: 'done',
  lost: 'dropped',
  disqualified: 'dropped',
}

interface OpportunityRow {
  id: string
  title: string
  company_name: string
  sector: string | null
  website: string | null
  stage: number
  status: OpportunityStatus
  assigned_to: string | null
  value: number | null
  currency: string
  disqualification_reason: string | null
  next_action: string | null
  next_action_date: string | null
  stage_entered_at: string
  blocker: BlockerKey | null
  blocker_label: string | null
  blocker_set_at: string | null
  created_at: string
  updated_at: string
}

export interface HubSyncResult {
  sent: number
  skippedNoOwner: number
  rejected: Array<{ id: string; reason: string }>
  workItemCounts: Record<string, number>
  delivery: { ok: boolean; status: number; error?: string }
}

// The moment a deal crossed its stalled threshold (2x the stage target), not when it entered the stage.
function stalledSince(stage: number, stageEnteredAt: string): string {
  const days = (STAGE_META[stage]?.targetDays ?? 0) * 2
  return new Date(new Date(stageEnteredAt).getTime() + days * 86_400_000).toISOString()
}

export async function syncOpportunitiesToHub(): Promise<HubSyncResult> {
  const secret = process.env.PIPEE_HUB_SECRET
  if (!secret) throw new Error('PIPEE_HUB_SECRET is not set')

  const supabase = supabaseAdmin()

  const [{ data: opportunities, error: oppError }, { data: profiles, error: profileError }] = await Promise.all([
    supabase
      .from('opportunities')
      .select(
        'id, title, company_name, sector, website, stage, status, assigned_to, value, currency, disqualification_reason, next_action, next_action_date, stage_entered_at, blocker, blocker_label, blocker_set_at, created_at, updated_at'
      )
      .returns<OpportunityRow[]>(),
    supabase.from('profiles').select('id, name').returns<{ id: string; name: string }[]>(),
  ])

  if (oppError) throw new Error(`Failed to load opportunities: ${oppError.message}`)
  if (profileError) throw new Error(`Failed to load profiles: ${profileError.message}`)

  const nameById = new Map((profiles ?? []).map(p => [p.id, p.name]))

  const rows = opportunities ?? []
  const skippedNoOwner = rows.filter(r => !r.assigned_to).length

  const items: HubWorkItem[] = rows
    .filter((r): r is OpportunityRow & { assigned_to: string } => !!r.assigned_to)
    .map(r => {
      // Nothing stores status 'stalled' — it is derived from time in stage.
      const stalled = r.status === 'active' && isStalled(r.stage, r.stage_entered_at)
      const state = stalled ? 'blocked' : STATE_MAP[r.status]
      const stateChangedAt = r.updated_at ?? r.created_at

      return {
        // Overwritten by HubClient with the client's own productId — required
        // by the type, ignored in practice.
        product_id: 'pipee',
        external_id: r.id,
        // Company name first — that's what a manager scans for, "title"
        // alone (e.g. "Q4 renewal") is often meaningless without it.
        title: `${r.company_name} — ${r.title}`,
        state,
        owner_id: r.assigned_to,
        // Pipee hasn't adopted Hub's own user id as owner_id yet (that's the
        // SSO integration work, still pending — see product_sso_integration_followup
        // in Hub's memory). Until then, this name is what lets Hub's Monday
        // View show a person instead of this raw Pipee-internal id.
        owner_name: nameById.get(r.assigned_to) ?? null,
        // No natural horizon here — Pipee's pipeline moves through numbered
        // stages, not a now/next/later planning horizon.
        horizon: null,
        url: `${PIPEE_URL}/opportunities/${r.id}`,
        opened_at: r.created_at,
        state_changed_at: stateChangedAt,
        // Approximation: the opportunity's last update, not necessarily the
        // exact moment it went stalled (a later non-status-changing update
        // would move this forward) — same caveat as RoadMap's hub-sync.
        blocked_since: state === 'blocked' ? (stalled ? stalledSince(r.stage, r.stage_entered_at) : stateChangedAt) : null,
        due_at: r.next_action_date,
        closed_at: state === 'done' ? stateChangedAt : null,
        meta: {
          company_name: r.company_name,
          sector: r.sector,
          website: r.website,
          stage: r.stage,
          value: r.value,
          currency: r.currency,
          pipee_status: r.status,
          disqualification_reason: r.disqualification_reason,
          next_action: r.next_action,
          blocker: activeBlocker(r)?.label ?? null,
        },
      }
    })

  const { valid, invalid } = partitionWorkItems(items)

  const hub = new HubClient({ productId: 'pipee', secret })
  const result = await hub.sendWorkItems(valid)

  const workItemCounts: Record<string, number> = {}
  for (const item of valid) workItemCounts[item.state] = (workItemCounts[item.state] ?? 0) + 1

  // A full resync every run means nothing is ever "pending" — there is no
  // outbox to drain.
  await hub.sendHeartbeat({
    sent_at: new Date().toISOString(),
    work_item_counts: workItemCounts,
    outbox_pending: 0,
    outbox_oldest_pending_seconds: 0,
  })

  return {
    sent: result.ok ? valid.length : 0,
    skippedNoOwner,
    rejected: invalid.map(i => ({ id: i.item.external_id, reason: i.reason })),
    workItemCounts,
    delivery: result.ok
      ? { ok: true, status: result.status }
      : { ok: false, status: result.status, error: result.error },
  }
}
