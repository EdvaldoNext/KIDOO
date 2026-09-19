-- GoTrue scans email_change as a string. NULL on the family owner breaks
-- admin.getUserById and parent-door session creation.

update auth.users
set email_change = ''
where email_change is null
  and id in (
    select id from public.profiles where role in ('owner', 'parent')
  );
