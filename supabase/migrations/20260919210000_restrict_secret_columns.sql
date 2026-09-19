-- Table-level SELECT still exposed secret columns. Grant only safe columns to clients.

revoke select on public.families from anon, authenticated;
grant select (
  id, name, plan, status, reward_mode, points_per_currency, currency_amount,
  reward_note, location_24h_enabled, lgpd_accepted_at, created_at
) on public.families to authenticated;

revoke select on public.platform_settings from anon, authenticated;
grant select (
  id, plan_limits, feature_flags, updated_at
) on public.platform_settings to authenticated;
