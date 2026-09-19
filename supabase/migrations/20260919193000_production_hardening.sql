-- Hide door keys from child sessions and hide push secrets from the Data API.

revoke select (kids_access_key, parent_access_key) on public.families from anon, authenticated;
revoke select (push_webhook_url, push_webhook_secret) on public.platform_settings from anon, authenticated;

drop policy if exists settings_select on public.platform_settings;
create policy settings_select on public.platform_settings
  for select to authenticated
  using (private.is_platform_admin() or private.is_parent());
