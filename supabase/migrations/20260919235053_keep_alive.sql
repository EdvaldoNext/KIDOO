-- Lightweight ping used by GitHub Actions to keep the Free Plan project awake.
-- Returns the current timestamp so each call is a real user query on Postgres.

create or replace function public.keep_alive()
returns timestamptz
language sql
stable
security invoker
set search_path = public
as $$
  select now();
$$;

revoke all on function public.keep_alive() from public;
grant execute on function public.keep_alive() to anon, authenticated;
