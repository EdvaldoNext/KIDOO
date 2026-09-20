update public.platform_settings
set
  plan_limits = jsonb_set(
    jsonb_set(
      jsonb_set(plan_limits, '{free,photo_retention_days}', '15'::jsonb),
      '{family,photo_retention_days}',
      '15'::jsonb
    ),
    '{plus,photo_retention_days}',
    '15'::jsonb
  ),
  updated_at = now()
where id = 1;
