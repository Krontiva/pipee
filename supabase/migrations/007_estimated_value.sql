-- The app reads and writes opportunities.estimated_value, but no earlier
-- migration created it. Safe to run on a database that already has it.
alter table opportunities
  add column if not exists estimated_value numeric(12,2);
