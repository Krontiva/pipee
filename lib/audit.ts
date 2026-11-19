// What counts as a "system" activity: entries the app writes itself to record
// who did what to a deal. They form the audit trail, so the app refuses to edit
// or delete them and refuses to let a person type a note that imitates one.
//
// Limit: this is enforced in the app's server actions. The database's own rules
// still let a deal's owner change their own deal's activity rows directly, so
// this is a strong guard against mistakes and casual tampering, not a
// tamper-proof ledger. (That would need a database-level rule.)

const SYSTEM_PREFIXES = [
  'Changed ',
  'Owner changed',
  'Deal marked as',
  'Disqualified:',
  'Deal reopened',
  'Stalled status cleared',
  'Blocker:',
  'Opportunity created',
] as const

export function isReservedTitle(title: string | null | undefined): boolean {
  return !!title && SYSTEM_PREFIXES.some(p => title.startsWith(p))
}

export function isSystemActivity(a: { type: string; title: string | null }): boolean {
  return a.type === 'stage_change' || isReservedTitle(a.title)
}

export type AuditCategory = 'Stage' | 'Owner' | 'Details' | 'Outcome' | 'Blocker' | 'Created'

export function auditCategory(a: { type: string; title: string }): AuditCategory {
  if (a.type === 'stage_change') return 'Stage'
  if (a.title.startsWith('Owner changed')) return 'Owner'
  if (a.title.startsWith('Changed ')) return 'Details'
  if (a.title.startsWith('Blocker:') || a.title.startsWith('Stalled status cleared')) return 'Blocker'
  if (a.title.startsWith('Opportunity created')) return 'Created'
  return 'Outcome'
}
