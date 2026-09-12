-- Store push webhook config in platform_settings (Supabase hosted cannot ALTER DATABASE).

alter table public.platform_settings
  add column if not exists push_webhook_url text,
  add column if not exists push_webhook_secret text;

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

  select push_webhook_url, push_webhook_secret
  into webhook_url, webhook_secret
  from public.platform_settings
  where id = 1;

  webhook_url := nullif(trim(webhook_url), '');
  if webhook_url is null then
    return NEW;
  end if;

  webhook_secret := coalesce(nullif(trim(webhook_secret), ''), '');

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
