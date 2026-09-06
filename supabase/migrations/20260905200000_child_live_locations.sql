-- Live tracker position, separate from task_completions photo GPS.

create table if not exists public.child_live_locations (
  child_id uuid primary key references public.profiles (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  accuracy_m double precision,
  heading double precision,
  speed_mps double precision,
  captured_at timestamptz not null default now(),
  sharing boolean not null default true,
  source text not null default 'pwa_foreground',
  constraint child_live_locations_source_check
    check (source in ('pwa_foreground', 'native_background'))
);

create index if not exists child_live_locations_family_idx
  on public.child_live_locations (family_id, captured_at desc);

alter table public.child_live_locations replica identity full;

alter table public.child_live_locations enable row level security;

grant select, insert, update, delete on public.child_live_locations to authenticated;

drop policy if exists live_locations_select on public.child_live_locations;
create policy live_locations_select on public.child_live_locations
  for select to authenticated
  using (
    family_id = private.current_family_id()
    or private.is_platform_admin()
  );

drop policy if exists live_locations_insert on public.child_live_locations;
create policy live_locations_insert on public.child_live_locations
  for insert to authenticated
  with check (
    family_id = private.current_family_id()
    and child_id = auth.uid()
    and private.current_role() = 'child'
    and exists (
      select 1 from public.families f
      where f.id = family_id
        and f.location_24h_enabled
    )
  );

drop policy if exists live_locations_update on public.child_live_locations;
create policy live_locations_update on public.child_live_locations
  for update to authenticated
  using (
    family_id = private.current_family_id()
    and child_id = auth.uid()
    and private.current_role() = 'child'
  )
  with check (
    family_id = private.current_family_id()
    and child_id = auth.uid()
    and private.current_role() = 'child'
    and exists (
      select 1 from public.families f
      where f.id = family_id
        and f.location_24h_enabled
    )
  );

do $$
begin
  alter publication supabase_realtime add table public.child_live_locations;
exception
  when duplicate_object then null;
end $$;
