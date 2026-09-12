-- Parent Web Push: device subscriptions + DB trigger when a task awaits approval.

create extension if not exists pg_net with schema extensions;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

grant select, insert, update, delete on public.push_subscriptions to authenticated;

create policy push_subscriptions_select on public.push_subscriptions
  for select to authenticated
  using (
    user_id = auth.uid()
    or private.is_platform_admin()
  );

create policy push_subscriptions_insert on public.push_subscriptions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and private.is_parent()
  );

create policy push_subscriptions_update on public.push_subscriptions
  for update to authenticated
  using (user_id = auth.uid() and private.is_parent())
  with check (user_id = auth.uid() and private.is_parent());

create policy push_subscriptions_delete on public.push_subscriptions
  for delete to authenticated
  using (
    user_id = auth.uid()
    or private.is_platform_admin()
  );

-- ---------------------------------------------------------------------------
-- Notify parents via HTTP webhook (Next.js internal route + web-push).
-- Webhook URL/secret live in platform_settings (see 20260912173000_push_webhook_settings.sql).
-- ---------------------------------------------------------------------------

create or replace function private.notify_parents_task_awaiting_approval()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  webhook_url text;
  webhook_secret text;
begin
  if NEW.status <> 'awaiting_approval' or OLD.status = 'awaiting_approval' then
    return NEW;
  end if;

  webhook_url := nullif(current_setting('app.push_webhook_url', true), '');
  if webhook_url is null then
    return NEW;
  end if;

  webhook_secret := coalesce(nullif(current_setting('app.push_webhook_secret', true), ''), '');

  perform net.http_post(
    url := webhook_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || webhook_secret
    ),
    body := jsonb_build_object(
      'family_id', NEW.family_id,
      'task_id', NEW.id
    )
  );

  return NEW;
end;
$$;

drop trigger if exists tasks_notify_parents_awaiting_approval on public.tasks;

create trigger tasks_notify_parents_awaiting_approval
after update of status on public.tasks
for each row
execute function private.notify_parents_task_awaiting_approval();
