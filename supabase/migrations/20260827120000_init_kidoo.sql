-- KIDOO v1 schema: multi-tenant families, RLS, storage, admin RPCs.
-- Helper functions live in `private` (not exposed via Data API).

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to postgres, service_role;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('owner', 'parent', 'child');
create type public.age_group as enum ('6_9', '10_13', '14_plus');
create type public.plan_tier as enum ('free', 'family', 'plus');
create type public.task_kind as enum ('points', 'reminder');
create type public.task_status as enum (
  'pending',
  'awaiting_approval',
  'completed',
  'expired'
);
create type public.reward_mode as enum ('points', 'symbolic', 'allowance');
create type public.storage_provider as enum ('supabase', 'r2');
create type public.family_status as enum ('active', 'disabled');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 80),
  plan public.plan_tier not null default 'free',
  status public.family_status not null default 'active',
  reward_mode public.reward_mode not null default 'points',
  points_per_currency numeric(10, 2),
  currency_amount numeric(10, 2),
  reward_note text,
  location_24h_enabled boolean not null default false,
  lgpd_accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  role public.user_role not null,
  display_name text not null check (char_length(trim(display_name)) between 1 and 60),
  age_group public.age_group,
  invite_code text unique,
  pin_hash text,
  created_at timestamptz not null default now(),
  constraint child_requires_pin check (
    (role = 'child' and pin_hash is not null)
    or role in ('owner', 'parent')
  )
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  assigned_child_id uuid not null references public.profiles (id) on delete cascade,
  kind public.task_kind not null default 'points',
  title text not null check (char_length(trim(title)) between 1 and 80),
  description text,
  weight integer not null default 1 check (weight >= 0 and weight <= 20),
  due_at timestamptz,
  require_photo boolean not null default true,
  status public.task_status not null default 'pending',
  score_applied boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.task_completions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  child_id uuid not null references public.profiles (id) on delete cascade,
  photo_key text,
  storage_provider public.storage_provider not null default 'supabase',
  lat double precision,
  lng double precision,
  location_available boolean not null default false,
  captured_at timestamptz not null default now(),
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  rejected_at timestamptz,
  rejection_note text,
  points_awarded integer,
  created_at timestamptz not null default now()
);

create table public.monthly_scores (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_id uuid not null references public.profiles (id) on delete cascade,
  year integer not null,
  month integer not null check (month between 1 and 12),
  credits integer not null default 0,
  debits integer not null default 0,
  balance integer generated always as (credits + debits) stored,
  unique (child_id, year, month)
);

create table public.platform_settings (
  id integer primary key default 1 check (id = 1),
  plan_limits jsonb not null default '{
    "free": {"children": 1, "tasks_per_month": 10, "photo_retention_days": 30},
    "family": {"children": 4, "tasks_per_month": null, "photo_retention_days": 180},
    "plus": {"children": null, "tasks_per_month": null, "photo_retention_days": 730}
  }'::jsonb,
  feature_flags jsonb not null default '{
    "location_24h": false,
    "geofencing": false,
    "auto_approve": false
  }'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (id) values (1);

create table private.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index profiles_family_id_idx on public.profiles (family_id);
create index profiles_invite_code_idx on public.profiles (invite_code);
create index tasks_family_status_idx on public.tasks (family_id, status);
create index tasks_child_idx on public.tasks (assigned_child_id, status);
create index completions_family_idx on public.task_completions (family_id, created_at desc);
create index completions_task_idx on public.task_completions (task_id);

-- ---------------------------------------------------------------------------
-- Private helpers (security definer, not in Data API)
-- ---------------------------------------------------------------------------

create or replace function private.current_family_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id from public.profiles where id = auth.uid();
$$;

create or replace function private.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function private.is_parent()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(private.current_role() in ('owner', 'parent'), false);
$$;

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'platform_admin') = 'true', false)
      or exists (
        select 1 from private.platform_admins a where a.user_id = auth.uid()
      );
$$;

create or replace function private.sync_profile_claims()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  update auth.users
  set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object(
      'role', new.role,
      'family_id', new.family_id,
      'platform_admin', coalesce((raw_app_meta_data ->> 'platform_admin')::boolean, false)
    )
  where id = new.id;
  return new;
end;
$$;

create trigger profiles_sync_claims
after insert or update of role, family_id on public.profiles
for each row execute function private.sync_profile_claims();

create or replace function private.register_parent(
  p_family_name text,
  p_display_name text,
  p_lgpd_accepted boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  fid uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if private.is_platform_admin() then
    raise exception 'admin_cannot_join_family';
  end if;
  if not coalesce(p_lgpd_accepted, false) then
    raise exception 'lgpd_required';
  end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'profile_exists';
  end if;

  insert into public.families (name, lgpd_accepted_at)
  values (trim(p_family_name), now())
  returning id into fid;

  insert into public.profiles (id, family_id, role, display_name)
  values (auth.uid(), fid, 'owner', trim(p_display_name));

  return fid;
end;
$$;

create or replace function public.register_parent(
  p_family_name text,
  p_display_name text,
  p_lgpd_accepted boolean
)
returns uuid
language sql
security invoker
set search_path = public
as $$
  select private.register_parent(p_family_name, p_display_name, p_lgpd_accepted);
$$;

create or replace function private.approve_completion(
  p_completion_id uuid,
  p_approve boolean,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.task_completions%rowtype;
  tsk public.tasks%rowtype;
  y int;
  m int;
begin
  if not private.is_parent() then
    raise exception 'forbidden';
  end if;

  select * into rec from public.task_completions where id = p_completion_id;
  if not found then
    raise exception 'not_found';
  end if;
  if rec.family_id <> private.current_family_id() then
    raise exception 'forbidden';
  end if;

  select * into tsk from public.tasks where id = rec.task_id;

  if p_approve then
    update public.task_completions
    set approved_by = auth.uid(),
        approved_at = now(),
        rejected_at = null,
        points_awarded = case when tsk.kind = 'points' then tsk.weight else 0 end
    where id = p_completion_id;

    update public.tasks
    set status = 'completed'
    where id = tsk.id;

    if tsk.kind = 'points' and not tsk.score_applied then
      y := extract(year from now())::int;
      m := extract(month from now())::int;
      insert into public.monthly_scores (family_id, child_id, year, month, credits, debits)
      values (tsk.family_id, tsk.assigned_child_id, y, m, tsk.weight, 0)
      on conflict (child_id, year, month)
      do update set credits = public.monthly_scores.credits + excluded.credits;

      update public.tasks set score_applied = true where id = tsk.id;
    end if;
  else
    update public.task_completions
    set rejected_at = now(),
        rejection_note = p_note,
        approved_at = null,
        approved_by = null
    where id = p_completion_id;

    update public.tasks
    set status = 'pending'
    where id = tsk.id;
  end if;
end;
$$;

create or replace function public.approve_completion(
  p_completion_id uuid,
  p_approve boolean,
  p_note text default null
)
returns void
language sql
security invoker
set search_path = public
as $$
  select private.approve_completion(p_completion_id, p_approve, p_note);
$$;

create or replace function private.apply_task_penalty(p_task public.tasks)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  y int := extract(year from now())::int;
  m int := extract(month from now())::int;
begin
  if p_task.kind <> 'points' or p_task.score_applied then
    return;
  end if;

  insert into public.monthly_scores (family_id, child_id, year, month, credits, debits)
  values (p_task.family_id, p_task.assigned_child_id, y, m, 0, -p_task.weight)
  on conflict (child_id, year, month)
  do update set debits = public.monthly_scores.debits + excluded.debits;

  update public.tasks
  set score_applied = true, status = 'expired'
  where id = p_task.id;
end;
$$;

create or replace function private.close_month()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.tasks%rowtype;
  n int := 0;
begin
  for t in
    select * from public.tasks
    where status in ('pending', 'awaiting_approval')
      and kind = 'points'
      and (
        (due_at is not null and due_at < now())
        or (
          due_at is null
          and date_trunc('month', created_at) < date_trunc('month', now())
        )
      )
  loop
    perform private.apply_task_penalty(t);
    n := n + 1;
  end loop;
  return n;
end;
$$;

create or replace function public.close_month()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not private.is_platform_admin() then
    raise exception 'forbidden';
  end if;
  return private.close_month();
end;
$$;

create or replace function private.admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not private.is_platform_admin() then
    raise exception 'forbidden';
  end if;

  return jsonb_build_object(
    'families_total', (select count(*) from public.families),
    'families_active', (select count(*) from public.families where status = 'active'),
    'families_7d', (select count(*) from public.families where created_at > now() - interval '7 days'),
    'parents', (select count(*) from public.profiles where role in ('owner', 'parent')),
    'children', (select count(*) from public.profiles where role = 'child'),
    'tasks_total', (select count(*) from public.tasks),
    'completions_total', (select count(*) from public.task_completions),
    'photos_total', (select count(*) from public.task_completions where photo_key is not null),
    'approval_rate', (
      select case when count(*) = 0 then 0
        else round(100.0 * count(*) filter (where approved_at is not null) / count(*), 1)
      end
      from public.task_completions
      where approved_at is not null or rejected_at is not null
    ),
    'plans', (
      select coalesce(jsonb_object_agg(plan, cnt), '{}'::jsonb)
      from (select plan, count(*) as cnt from public.families group by plan) s
    )
  );
end;
$$;

create or replace function public.admin_dashboard_stats()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select private.admin_dashboard_stats();
$$;

create or replace function private.admin_list_families()
returns table (
  id uuid,
  name text,
  plan public.plan_tier,
  status public.family_status,
  children_count bigint,
  created_at timestamptz,
  owner_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not private.is_platform_admin() then
    raise exception 'forbidden';
  end if;

  return query
  select
    f.id,
    f.name,
    f.plan,
    f.status,
    (select count(*) from public.profiles p where p.family_id = f.id and p.role = 'child'),
    f.created_at,
    (select p.display_name from public.profiles p where p.family_id = f.id and p.role = 'owner' limit 1)
  from public.families f
  order by f.created_at desc;
end;
$$;

create or replace function public.admin_list_families()
returns table (
  id uuid,
  name text,
  plan public.plan_tier,
  status public.family_status,
  children_count bigint,
  created_at timestamptz,
  owner_name text
)
language sql
stable
security invoker
set search_path = public
as $$
  select * from private.admin_list_families();
$$;

create or replace function private.update_platform_settings(
  p_plan_limits jsonb,
  p_feature_flags jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.is_platform_admin() then
    raise exception 'forbidden';
  end if;
  update public.platform_settings
  set plan_limits = coalesce(p_plan_limits, plan_limits),
      feature_flags = coalesce(p_feature_flags, feature_flags),
      updated_at = now()
  where id = 1;
end;
$$;

create or replace function public.update_platform_settings(
  p_plan_limits jsonb,
  p_feature_flags jsonb
)
returns void
language sql
security invoker
set search_path = public
as $$
  select private.update_platform_settings(p_plan_limits, p_feature_flags);
$$;

create or replace function private.set_family_status(
  p_family_id uuid,
  p_status public.family_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.is_platform_admin() then
    raise exception 'forbidden';
  end if;
  update public.families set status = p_status where id = p_family_id;
end;
$$;

create or replace function public.set_family_status(
  p_family_id uuid,
  p_status public.family_status
)
returns void
language sql
security invoker
set search_path = public
as $$
  select private.set_family_status(p_family_id, p_status);
$$;

create or replace function private.delete_my_family()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  fid uuid;
begin
  if private.current_role() <> 'owner' then
    raise exception 'forbidden';
  end if;
  fid := private.current_family_id();
  delete from public.families where id = fid;
end;
$$;

create or replace function public.delete_my_family()
returns void
language sql
security invoker
set search_path = public
as $$
  select private.delete_my_family();
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.families to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.task_completions to authenticated;
grant select, insert, update on public.monthly_scores to authenticated;
grant select on public.platform_settings to authenticated;

grant execute on function public.register_parent(text, text, boolean) to authenticated;
grant execute on function public.approve_completion(uuid, boolean, text) to authenticated;
grant execute on function public.admin_dashboard_stats() to authenticated;
grant execute on function public.admin_list_families() to authenticated;
grant execute on function public.update_platform_settings(jsonb, jsonb) to authenticated;
grant execute on function public.set_family_status(uuid, public.family_status) to authenticated;
grant execute on function public.delete_my_family() to authenticated;
grant execute on function public.close_month() to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.families enable row level security;
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.task_completions enable row level security;
alter table public.monthly_scores enable row level security;
alter table public.platform_settings enable row level security;

create policy families_select on public.families
  for select to authenticated
  using (id = private.current_family_id() or private.is_platform_admin());

create policy families_update on public.families
  for update to authenticated
  using (id = private.current_family_id() and private.is_parent())
  with check (id = private.current_family_id() and private.is_parent());

create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or family_id = private.current_family_id()
    or private.is_platform_admin()
  );

create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy profiles_update_parent on public.profiles
  for update to authenticated
  using (
    id = auth.uid()
    or (family_id = private.current_family_id() and private.is_parent())
  )
  with check (
    id = auth.uid()
    or (family_id = private.current_family_id() and private.is_parent())
  );

create policy tasks_select on public.tasks
  for select to authenticated
  using (
    family_id = private.current_family_id()
    and (
      private.is_parent()
      or assigned_child_id = auth.uid()
    )
  );

create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (
    family_id = private.current_family_id()
    and private.is_parent()
    and created_by = auth.uid()
  );

create policy tasks_update on public.tasks
  for update to authenticated
  using (family_id = private.current_family_id() and private.is_parent())
  with check (family_id = private.current_family_id() and private.is_parent());

create policy tasks_delete on public.tasks
  for delete to authenticated
  using (family_id = private.current_family_id() and private.is_parent());

create policy tasks_child_update_status on public.tasks
  for update to authenticated
  using (
    family_id = private.current_family_id()
    and assigned_child_id = auth.uid()
    and private.current_role() = 'child'
  )
  with check (
    family_id = private.current_family_id()
    and assigned_child_id = auth.uid()
  );

create or replace function private.protect_task_child_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if private.current_role() = 'child' then
    if new.weight is distinct from old.weight
       or new.title is distinct from old.title
       or new.kind is distinct from old.kind
       or new.assigned_child_id is distinct from old.assigned_child_id
       or new.family_id is distinct from old.family_id
       or new.require_photo is distinct from old.require_photo
       or new.score_applied is distinct from old.score_applied then
      raise exception 'forbidden';
    end if;
    if new.status not in ('pending', 'awaiting_approval') then
      raise exception 'forbidden';
    end if;
  end if;
  return new;
end;
$$;

create trigger tasks_protect_child_update
before update on public.tasks
for each row execute function private.protect_task_child_update();

create policy completions_select on public.task_completions
  for select to authenticated
  using (
    family_id = private.current_family_id()
    and (private.is_parent() or child_id = auth.uid())
  );

create policy completions_insert on public.task_completions
  for insert to authenticated
  with check (
    family_id = private.current_family_id()
    and child_id = auth.uid()
    and private.current_role() = 'child'
  );

create policy completions_update_parent on public.task_completions
  for update to authenticated
  using (family_id = private.current_family_id() and private.is_parent())
  with check (family_id = private.current_family_id() and private.is_parent());

create policy scores_select on public.monthly_scores
  for select to authenticated
  using (
    family_id = private.current_family_id()
    and (private.is_parent() or child_id = auth.uid())
  );

create policy settings_select on public.platform_settings
  for select to authenticated
  using (private.is_platform_admin() or true);

-- Parents read settings for plan limits; writes only via admin RPC.

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'task-photos',
  'task-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy task_photos_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'task-photos'
    and (storage.foldername(name))[1] = 'families'
    and (storage.foldername(name))[2] = private.current_family_id()::text
    and (
      private.is_parent()
      or (storage.foldername(name))[4] = auth.uid()::text
    )
  );

create policy task_photos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'task-photos'
    and (storage.foldername(name))[1] = 'families'
    and (storage.foldername(name))[2] = private.current_family_id()::text
    and (storage.foldername(name))[4] = auth.uid()::text
    and private.current_role() = 'child'
  );

create policy task_photos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'task-photos'
    and (storage.foldername(name))[2] = private.current_family_id()::text
    and (
      private.is_parent()
      or (storage.foldername(name))[4] = auth.uid()::text
    )
  );

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.task_completions;
alter publication supabase_realtime add table public.monthly_scores;
