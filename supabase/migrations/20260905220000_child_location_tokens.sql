create table if not exists public.child_location_tokens (
  token_hash text primary key,
  child_id uuid not null references public.profiles (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists child_location_tokens_child_idx
  on public.child_location_tokens (child_id);

alter table public.child_location_tokens enable row level security;
