-- Multi-product support (single migration, safe to re-run).
--
-- What this does:
--   1. Adds a products table (Krongage becomes the first product).
--   2. Adds product_members: which reps may work on which product.
--   3. Tags every opportunity and sector with a product_id (existing rows
--      are moved to Krongage, so nothing changes for current users).
--   4. Gives every existing user access to Krongage, so nobody loses access.
--   5. Rewrites the security rules: admins see everything; a rep sees a deal
--      only if it is assigned to them AND they are a member of its product.

begin;

-- 1. PRODUCTS -------------------------------------------------------------
create table if not exists products (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  code        text not null unique,          -- short slug, e.g. 'krongage'
  description text,
  color       text not null default '#2563eb',
  currency    text not null default 'GHS',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

insert into products (name, code, description)
values ('Krongage', 'krongage', 'Krongage customer engagement platform')
on conflict (code) do nothing;

-- 2. PRODUCT MEMBERS ------------------------------------------------------
create table if not exists product_members (
  product_id uuid not null references products(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, user_id)
);

create index if not exists product_members_user_idx on product_members (user_id);

-- 3. TAG OPPORTUNITIES AND SECTORS WITH A PRODUCT -------------------------
alter table opportunities add column if not exists product_id uuid references products(id);
update opportunities
   set product_id = (select id from products where code = 'krongage')
 where product_id is null;
alter table opportunities alter column product_id set not null;
create index if not exists opportunities_product_idx on opportunities (product_id);

alter table sectors add column if not exists product_id uuid references products(id) on delete cascade;
update sectors
   set product_id = (select id from products where code = 'krongage')
 where product_id is null;
alter table sectors alter column product_id set not null;
-- Sector names were globally unique; now they only need to be unique per product.
alter table sectors drop constraint if exists sectors_name_key;
create unique index if not exists sectors_product_name_key on sectors (product_id, name);

-- 4. EXISTING USERS KEEP ACCESS TO KRONGAGE -------------------------------
insert into product_members (product_id, user_id)
select (select id from products where code = 'krongage'), p.id
  from profiles p
on conflict do nothing;

-- 5. ACCESS HELPERS -------------------------------------------------------
-- Admins can use every product; everyone else only the ones they belong to.
create or replace function can_access_product(pid uuid)
returns boolean as $$
  select get_my_role() = 'admin'
      or exists (
        select 1 from product_members pm
        where pm.product_id = pid and pm.user_id = auth.uid()
      )
$$ language sql stable security definer set search_path = public;

-- A deal is accessible to admins, or to its assigned rep if they are still on the product.
create or replace function can_access_opportunity(opp_id uuid)
returns boolean as $$
  select exists (
    select 1 from opportunities o
    where o.id = opp_id
      and (
        get_my_role() = 'admin'
        or (o.assigned_to = auth.uid() and can_access_product(o.product_id))
      )
  )
$$ language sql stable security definer set search_path = public;

-- 6. SECURITY RULES -------------------------------------------------------
alter table products enable row level security;
alter table product_members enable row level security;

drop policy if exists "View accessible products" on products;
create policy "View accessible products" on products
  for select using (can_access_product(id));

drop policy if exists "Admins manage products" on products;
create policy "Admins manage products" on products
  for all using (get_my_role() = 'admin') with check (get_my_role() = 'admin');

drop policy if exists "View own product memberships" on product_members;
create policy "View own product memberships" on product_members
  for select using (user_id = auth.uid() or get_my_role() = 'admin');

drop policy if exists "Admins manage product memberships" on product_members;
create policy "Admins manage product memberships" on product_members
  for all using (get_my_role() = 'admin') with check (get_my_role() = 'admin');

-- Opportunities
drop policy if exists "Admins see all opportunities" on opportunities;
drop policy if exists "BD reps see own opportunities" on opportunities;
drop policy if exists "Any authenticated user can insert" on opportunities;
drop policy if exists "Admins can update any opportunity" on opportunities;
drop policy if exists "BD reps can update own opportunities" on opportunities;
drop policy if exists "Users insert into their products" on opportunities;

create policy "Admins see all opportunities" on opportunities
  for select using (get_my_role() = 'admin');

create policy "BD reps see own opportunities" on opportunities
  for select using (assigned_to = auth.uid() and can_access_product(product_id));

create policy "Users insert into their products" on opportunities
  for insert with check (auth.uid() is not null and can_access_product(product_id));

create policy "Admins can update any opportunity" on opportunities
  for update using (get_my_role() = 'admin');

create policy "BD reps can update own opportunities" on opportunities
  for update using (assigned_to = auth.uid() and can_access_product(product_id))
  with check (assigned_to = auth.uid() and can_access_product(product_id));
-- (the existing "Admins can delete" policy is unchanged)

-- Child tables follow the opportunity. Existing policies are dropped by
-- lookup so this works whatever they were called.
do $$
declare
  t text;
  pol record;
begin
  foreach t in array array[
    'meddic_scores', 'contacts', 'activities', 'discovery_briefs',
    'proposals', 'outreach_log', 'sub_stage_progress'
  ] loop
    for pol in
      select policyname from pg_policies
       where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy %I on %I', pol.policyname, t);
    end loop;

    execute format(
      'create policy "View %1$s for accessible opps" on %1$I for select using (can_access_opportunity(opportunity_id))', t);
    execute format(
      'create policy "Manage %1$s for accessible opps" on %1$I for all using (can_access_opportunity(opportunity_id)) with check (can_access_opportunity(opportunity_id))', t);
  end loop;
end $$;

-- Sectors: users see their products' sectors; only admins change them.
drop policy if exists "Any user can view sectors" on sectors;
drop policy if exists "Admins manage sectors" on sectors;

create policy "View sectors for accessible products" on sectors
  for select using (can_access_product(product_id));

create policy "Admins manage sectors" on sectors
  for all using (get_my_role() = 'admin') with check (get_my_role() = 'admin');

commit;
