-- Blockers: why a stalled deal is stalled.
-- A blocker only counts for the current stalled spell: if blocker_set_at is
-- older than stage_entered_at (the deal moved stage or was cleared since),
-- it is stale and the rep is asked for a fresh one. No extra reset logic.
alter table opportunities
  add column if not exists blocker        text,
  add column if not exists blocker_note   text,
  add column if not exists blocker_label  text,
  add column if not exists blocker_set_at timestamptz;

alter table opportunities
  drop constraint if exists opportunities_blocker_check;
alter table opportunities
  add constraint opportunities_blocker_check check (
    blocker is null or blocker in (
      'no_response', 'no_champion', 'no_decision_maker', 'no_budget',
      'competitor', 'bad_timing', 'internal_delay', 'other'
    )
  );
