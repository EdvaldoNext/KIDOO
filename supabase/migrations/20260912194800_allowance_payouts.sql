-- Parents record allowance payouts without clearing the monthly total.

create table if not exists public.allowance_payouts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_id uuid not null references public.profiles (id) on delete cascade,
  year integer not null,
  month integer not null check (month between 1 and 12),
  amount numeric(12,2) not null check (amount > 0),
  paid_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists allowance_payouts_family_month_idx
  on public.allowance_payouts (family_id, year, month);

create index if not exists allowance_payouts_child_month_idx
  on public.allowance_payouts (child_id, year, month, created_at desc);

alter table public.allowance_payouts enable row level security;

grant select, insert, delete on public.allowance_payouts to authenticated;

drop policy if exists allowance_payouts_select on public.allowance_payouts;
create policy allowance_payouts_select on public.allowance_payouts
  for select to authenticated
  using (
    family_id = private.current_family_id()
    or private.is_platform_admin()
  );

drop policy if exists allowance_payouts_insert on public.allowance_payouts;
create policy allowance_payouts_insert on public.allowance_payouts
  for insert to authenticated
  with check (
    family_id = private.current_family_id()
    and private.is_parent()
    and exists (
      select 1 from public.profiles p
      where p.id = child_id
        and p.family_id = family_id
        and p.role = 'child'
    )
  );

drop policy if exists allowance_payouts_delete on public.allowance_payouts;
create policy allowance_payouts_delete on public.allowance_payouts
  for delete to authenticated
  using (
    family_id = private.current_family_id()
    and private.is_parent()
  );
