-- Parent door key, generated with the family. Any phone with CASA + PAIS opens the parent panel.

alter table public.families
  add column if not exists parent_access_key text;

create unique index if not exists families_parent_access_key_uidx
  on public.families (parent_access_key)
  where parent_access_key is not null;

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
  casa text;
  pais text;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
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

  loop
    casa := 'CASA-';
    pais := 'PAIS-';
    for i in 1..6 loop
      casa := casa || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
      pais := pais || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.families where kids_access_key = casa)
      and not exists (select 1 from public.families where parent_access_key = pais);
  end loop;

  insert into public.families (name, lgpd_accepted_at, kids_access_key, parent_access_key)
  values (trim(p_family_name), now(), casa, pais)
  returning id into fid;

  insert into public.profiles (id, family_id, role, display_name)
  values (auth.uid(), fid, 'owner', trim(p_display_name));

  return fid;
end;
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
  if not private.is_parent() then
    raise exception 'forbidden';
  end if;
  fid := private.current_family_id();
  delete from public.families where id = fid;
end;
$$;
