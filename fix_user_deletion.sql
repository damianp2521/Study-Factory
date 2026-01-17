-- Function to completely delete a user (both from authorized_users and auth.users)
-- This is required because simply deleting from authorized_users leaves the auth account active,
-- preventing re-registration with the same name (since email is deterministic based on name).

create or replace function delete_user_completely(target_user_id uuid)
returns void
language plpgsql
security definer -- Run as the creator (admin) to allow deletion from auth.users
as $$
declare
  target_name text;
  target_email text;
  auth_user_id uuid;
begin
  -- 1. Get the user's name from authorized_users before deleting it
  select name into target_name
  from public.authorized_users
  where id = target_user_id;

  if target_name is null then
    raise exception 'User not found in authorized_users';
  end if;

  -- 2. Generate the deterministic email address
  -- Logic matches frontend: 'u_' + hex(name) + '@studyfactory.com'
  target_email := 'u_' || encode(convert_to(trim(target_name), 'UTF8'), 'hex') || '@studyfactory.com';

  -- 3. Find the auth.users record id
  select id into auth_user_id
  from auth.users
  where email = target_email;

  -- 4. Delete from auth.users if exists
  if auth_user_id is not null then
    delete from auth.users where id = auth_user_id;
  end if;

  -- 5. Delete from authorized_users
  delete from public.authorized_users where id = target_user_id;

end;
$$;
