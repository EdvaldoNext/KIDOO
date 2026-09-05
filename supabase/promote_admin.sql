-- Promove um usuário Auth a admin da plataforma KIDOO.
-- Substitua o e-mail. Rode no SQL Editor do Supabase (service role).
-- A conta admin NÃO deve ser usada como pai/filho.

update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb) || '{"platform_admin": true}'::jsonb
where email = 'SEU_EMAIL_ADMIN@dominio.com';

insert into private.platform_admins (user_id)
select id from auth.users where email = 'SEU_EMAIL_ADMIN@dominio.com'
on conflict (user_id) do nothing;
