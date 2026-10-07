export type UserRole = 'admin' | 'bd_rep'
export type OpportunityStatus = 'active' | 'stalled' | 'won' | 'lost' | 'disqualified'
export type DisqualificationReason = 'NO_FIT' | 'NO_PAIN' | 'NO_BUDGET' | 'NO_AUTHORITY' | 'NO_TIMELINE' | 'COMPETITOR'
export type ContactRole = 'champion' | 'economic_buyer' | 'stakeholder' | 'other'
export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'stage_change' | 'outreach'
export type MeetingSubtype = 'physical' | 'online'
export type CalendarEventType = 'action' | 'meeting_physical' | 'meeting_online' | 'deadline'
export type ProposalStatus = 'draft' | 'submitted' | 'accepted' | 'rejected'
export type OutreachChannel = 'email' | 'linkedin' | 'phone' | 'other'

// ── Currencies ────────────────────────────────────────────────────────────────
export interface Currency { code: string; symbol: string; name: string; locale: string }
export const CURRENCIES: Currency[] = [
  { code: 'GHS', symbol: 'GH₵', name: 'Ghana Cedi',     locale: 'en-GH' },
  { code: 'USD', symbol: '$',    name: 'US Dollar',      locale: 'en-US' },
  { code: 'EUR', symbol: '€',    name: 'Euro',           locale: 'de-DE' },
  { code: 'GBP', symbol: '£',    name: 'British Pound',  locale: 'en-GB' },
  { code: 'NGN', symbol: '₦',    name: 'Nigerian Naira', locale: 'en-NG' },
]

export interface Profile {
  id: string
  name: string
  role: UserRole
  avatar_url: string | null
  sectors: string[]
  is_active: boolean
  created_at: string
}

// Why a stalled deal is stalled. `label` is the short pill text shown on cards;
// 'other' has no fixed label — it's summarised from the rep's own words.
export type BlockerKey =
  | 'no_response' | 'no_champion' | 'no_decision_maker' | 'no_budget'
  | 'competitor' | 'bad_timing' | 'internal_delay' | 'other'

export const BLOCKER_OPTIONS: { key: BlockerKey; name: string; meaning: string; label: string | null }[] = [
  { key: 'no_response',       name: 'No response',            meaning: 'Contact has gone cold',                    label: 'No response' },
  { key: 'no_champion',       name: 'No champion',            meaning: 'Nobody internally owns it',                label: 'No champion' },
  { key: 'no_decision_maker', name: 'No decision-maker',      meaning: "We're talking to the wrong person",        label: 'No decision-maker' },
  { key: 'no_budget',         name: 'No budget',              meaning: 'Commercial blocker',                       label: 'No budget' },
  { key: 'competitor',        name: 'Competitor',             meaning: 'Evaluating or chose someone else',         label: 'Competitor' },
  { key: 'bad_timing',        name: 'Bad timing',             meaning: 'Wants it, but not now',                    label: 'Bad timing' },
  { key: 'internal_delay',    name: 'Internal delay',         meaning: 'Waiting on our side (proposal, legal, approval)', label: 'Internal delay' },
  { key: 'other',             name: 'Other',                  meaning: 'Something else — describe it',             label: null },
]

export interface Opportunity {
  id: string
  title: string
  company_name: string
  sector: string | null
  website: string | null
  stage: number
  status: OpportunityStatus
  assigned_to: string | null
  value: number | null
  estimated_value: number | null
  currency: string
  disqualification_reason: DisqualificationReason | null
  next_action: string | null
  next_action_date: string | null
  calendar_event_type: CalendarEventType
  stage_entered_at: string
  blocker: BlockerKey | null
  blocker_note: string | null
  blocker_label: string | null
  blocker_set_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Joined
  profiles?: Profile
  meddic_scores?: MEDDICScore
}

export interface MEDDICScore {
  id: string
  opportunity_id: string
  metrics_evidence: string | null
  economic_buyer_name: string | null
  economic_buyer_title: string | null
  decision_criteria: string | null
  decision_process: string | null
  identified_pain: string | null
  champion_name: string | null
  score: number
  updated_at: string
}

export interface Contact {
  id: string
  opportunity_id: string
  name: string
  title: string | null
  role: ContactRole
  email: string | null
  phone: string | null
  linkedin_url: string | null
  created_at: string
}

export interface Activity {
  id: string
  opportunity_id: string
  user_id: string | null
  type: ActivityType
  title: string
  description: string | null
  outcome: string | null
  occurred_at: string
  created_at: string
  meeting_subtype: MeetingSubtype | null
  profiles?: Profile
}

export interface DiscoveryBrief {
  id: string
  opportunity_id: string
  context: string | null
  pain_points: string | null
  success_criteria: string | null
  constraints: string | null
  reviewed_by: string | null
  filed_at: string | null
  created_at: string
}

export interface Proposal {
  id: string
  opportunity_id: string
  version: number
  status: ProposalStatus
  scope: string | null
  value: number | null
  currency: string
  payment_schedule: string | null
  submitted_at: string | null
  accepted_at: string | null
  notes: string | null
  created_at: string
}

export interface OutreachEntry {
  id: string
  opportunity_id: string
  channel: OutreachChannel
  attempt_number: number
  outcome: string | null
  occurred_at: string
}

export interface Sector {
  id: string
  name: string
  description: string | null
  icp_notes: string | null
  is_priority: boolean
  created_at: string
}

// ── Sub-stage tracking ────────────────────────────────────────────────────────
export interface SubStageItem {
  key: string        // e.g. '1a', '2c'
  label: string      // short display name
  description: string
  required: boolean  // must be complete before advancing
}

export interface SubStageProgress {
  id: string
  opportunity_id: string
  sub_stage_key: string
  completed_at: string
  completed_by: string | null
}

export const SUB_STAGES: Record<number, SubStageItem[]> = {
  1: [
    { key: '1a', label: 'Prospect researched',       description: 'Company profiled and confirmed as ICP-fit before outreach begins', required: false },
    { key: '1b', label: 'First outreach sent',        description: 'Contacted through channel 1 (email, LinkedIn, phone, etc.)', required: true  },
    { key: '1c', label: 'Second outreach sent',       description: 'Follow-up through a different channel to demonstrate persistence', required: true  },
    { key: '1d', label: 'Response received',          description: 'Prospect responded or expressed interest in a conversation', required: true  },
    { key: '1e', label: 'Contact details recorded',   description: 'Name, title, role, and preferred contact channel logged under Contacts', required: true  },
  ],
  2: [
    { key: '2a', label: 'Intro meeting booked',       description: 'First qualifying call or meeting scheduled with the prospect', required: true  },
    { key: '2b', label: 'MEDDIC scorecard filled',    description: 'All qualifying dimensions assessed — score must reach ≥4 to advance', required: true  },
    { key: '2c', label: 'Identified Pain confirmed',  description: 'Core business problem documented in the MEDDIC scorecard', required: true  },
    { key: '2d', label: 'Economic Buyer named',       description: 'Person who controls the budget and signs the deal identified', required: true  },
    { key: '2e', label: 'Discovery meeting scheduled', description: 'Next deep-dive session booked with the named decision-maker', required: true  },
  ],
  3: [
    { key: '3a', label: 'Discovery meeting held',     description: 'In-depth session completed to diagnose the prospect\'s problem', required: true  },
    { key: '3b', label: 'Pain points documented',     description: 'Specific challenges and business impact captured in the Discovery Brief', required: true  },
    { key: '3c', label: 'Success criteria agreed',    description: 'Prospect confirmed what a successful outcome looks like for them', required: true  },
    { key: '3d', label: 'Discovery Brief filed',      description: 'Brief completed and submitted for Solutions Lead review', required: true  },
    { key: '3e', label: 'Demo date confirmed',        description: 'Demonstration or presentation date agreed and blocked in the calendar', required: true  },
  ],
  4: [
    { key: '4a', label: 'Demo delivered',             description: 'Tailored Krongage solution demonstration presented to stakeholders', required: true  },
    { key: '4b', label: 'Stakeholder feedback noted', description: 'Responses, objections, and concerns from all attendees documented', required: true  },
    { key: '4c', label: 'Technical questions resolved', description: 'All open integration or technical questions have clear answers', required: true  },
    { key: '4d', label: 'Deal value entered',         description: 'Pricing parameters are clear — deal value set in the system', required: true  },
    { key: '4e', label: 'Proposal green-light given', description: 'Prospect explicitly confirmed they want to receive a formal proposal', required: true  },
  ],
  5: [
    { key: '5a', label: 'Proposal drafted',           description: 'Formal proposal with scope, pricing, and terms created in Proposal Tracker', required: true  },
    { key: '5b', label: 'Proposal submitted',         description: 'Proposal sent to the Economic Buyer / decision-maker', required: true  },
    { key: '5c', label: 'Negotiation completed',      description: 'All objections addressed; final scope, pricing, and terms agreed', required: true  },
    { key: '5d', label: 'Written acceptance received', description: 'Prospect confirmed the proposal is acceptable in writing', required: true  },
    { key: '5e', label: 'Legal/Finance notified',     description: 'Internal teams alerted to begin contract drafting', required: true  },
  ],
  6: [
    { key: '6a', label: 'Contract issued',            description: 'Contract sent to prospect within 3 working days of written acceptance', required: true  },
    { key: '6b', label: 'Legal review done',          description: 'Internal legal review of contract terms completed', required: false },
    { key: '6c', label: 'Contract signed',            description: 'Signed agreement received from the prospect', required: true  },
    { key: '6d', label: 'Handover brief prepared',    description: 'Briefing document for the Account Manager compiled and ready to share', required: true  },
  ],
  7: [
    { key: '7a', label: 'Handover completed',         description: 'Formal handover meeting held with Account Manager within 5 days', required: true  },
    { key: '7b', label: 'Onboarding initiated',       description: 'Client onboarding process started — first session booked', required: true  },
    { key: '7c', label: '90-day milestones defined',  description: 'First 90-day success milestones agreed and shared with the client', required: true  },
    { key: '7d', label: '30-day check-in done',       description: 'First monthly review completed with the client', required: false },
  ],
}

// Stage metadata from the Pipee BD Framework
export const STAGE_META: Record<number, {
  name: string
  purpose: string
  targetDays: number
  exitCriteria: string[]
}> = {
  1: {
    name: 'Market Targeting & Prospecting',
    purpose: 'Identify and list businesses that match the Ideal Customer Profile',
    targetDays: 7,
    exitCriteria: [
      'Target contacted through at least two channels',
      'Response or expression of interest received',
      'Contact name, role, and channel recorded',
      'Next agreed action and date documented',
    ],
  },
  2: {
    name: 'Lead Qualification',
    purpose: 'Confirm fit, need, authority, and timing (MEDDIC)',
    targetDays: 3,
    exitCriteria: [
      'At least 4 of 6 MEDDIC dimensions satisfied',
      'Identified Pain must be confirmed',
      'Economic Buyer must be identified',
      'Discovery meeting scheduled with named decision-maker',
    ],
  },
  3: {
    name: 'Discovery & Needs Assessment',
    purpose: 'Diagnose the prospect\'s problem in depth',
    targetDays: 7,
    exitCriteria: [
      'Discovery Brief completed and filed',
      'Success criteria agreed with prospect',
      'Demonstration date confirmed in calendar',
    ],
  },
  4: {
    name: 'Solution Design & Demonstration',
    purpose: 'Present a tailored Krongage solution',
    targetDays: 10,
    exitCriteria: [
      'Stakeholder feedback documented',
      'Open technical questions resolved',
      'Prospect confirmed willingness to receive formal proposal',
      'Pricing parameters sufficiently clear to draft proposal',
    ],
  },
  5: {
    name: 'Proposal & Commercial Negotiation',
    purpose: 'Issue pricing and terms; reach agreement',
    targetDays: 17,
    exitCriteria: [
      'Prospect issued written confirmation proposal is acceptable',
      'Final pricing, scope, and term documented',
      'Legal/Finance notified to begin contract drafting',
    ],
  },
  6: {
    name: 'Contracting & Close',
    purpose: 'Sign agreement and prepare for handover',
    targetDays: 10,
    exitCriteria: [
      'Contract issued within 3 working days of acceptance',
      'Signed agreement received from prospect',
      'Handover briefing prepared for Account Manager',
    ],
  },
  7: {
    name: 'Handover, Onboarding & Account Growth',
    purpose: 'Transition to delivery and unlock expansion',
    targetDays: 90,
    exitCriteria: [
      'Formal handover completed to Account Manager',
      'Client onboarding initiated',
      'First 90-day success milestones defined',
    ],
  },
}

// Default next action auto-set when a deal enters each stage
export const STAGE_DEFAULT_NEXT_ACTION: Record<number, { action: string; days: number }> = {
  1: { action: 'Send first outreach (email or LinkedIn)',       days: 2  },
  2: { action: 'Schedule and run discovery/qualification call', days: 3  },
  3: { action: 'Complete and file Discovery Brief',             days: 5  },
  4: { action: 'Prepare and deliver solution demonstration',    days: 7  },
  5: { action: 'Send formal proposal to prospect',              days: 5  },
  6: { action: 'Issue contract and collect signed agreement',   days: 3  },
  7: { action: 'Complete handover briefing with Account Manager', days: 7 },
}

export const STAGE_COLORS: Record<number, string> = {
  1: 'bg-slate-500',
  2: 'bg-blue-500',
  3: 'bg-violet-500',
  4: 'bg-amber-500',
  5: 'bg-orange-500',
  6: 'bg-green-500',
  7: 'bg-emerald-600',
}

export const STATUS_COLORS: Record<OpportunityStatus, string> = {
  active: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  stalled: 'bg-red-500/20 text-red-400 border-red-500/30',
  won: 'bg-green-500/20 text-green-400 border-green-500/30',
  lost: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  disqualified: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
}
