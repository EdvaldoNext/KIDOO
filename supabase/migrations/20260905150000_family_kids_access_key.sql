-- One door key per family. Children can view siblings' tasks/scores.
-- Completing remains limited to the assigned child.

alter table public.families
  add column if not exists kids_access_key text;

create unique index if not exists families_kids_access_key_uidx
  on public.families (kids_access_key)
  where kids_access_key is not null;

update public.families
set kids_access_key = 'CASA-' || upper(substr(md5(id::text || created_at::text), 1, 6))
where kids_access_key is null;

alter table public.profiles drop constraint if exists child_requires_pin;

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

  insert into public.families (name, lgpd_accepted_at, kids_access_key)
  values (
    trim(p_family_name),
    now(),
    'CASA-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
  )
  returning id into fid;

  insert into public.profiles (id, family_id, role, display_name)
  values (auth.uid(), fid, 'owner', trim(p_display_name));

  return fid;
end;
$$;

drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select to authenticated
  using (
    family_id = private.current_family_id()
    or private.is_platform_admin()
  );

drop policy if exists completions_select on public.task_completions;
create policy completions_select on public.task_completions
  for select to authenticated
  using (
    family_id = private.current_family_id()
    or private.is_platform_admin()
  );

drop policy if exists scores_select on public.monthly_scores;
create policy scores_select on public.monthly_scores
  for select to authenticated
  using (
    family_id = private.current_family_id()
    or private.is_platform_admin()
  );
