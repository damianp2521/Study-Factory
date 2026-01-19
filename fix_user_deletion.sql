-- Function to completely delete a user (both from authorized_users and auth.users)
-- Updated: Uses DYNAMIC SQL to safely check if tables exist before deleting.
-- This prevents "relation does not exist" errors if some features (like inquiries) aren't set up yet.

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
  -- 0. Security Check: Only Admins can delete users
  if public.get_my_role() <> 'admin' then
    raise exception 'Access Denied: Only Admins can delete users.';
  end if;

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

  -- 4. Delete related records (Safely)
  if auth_user_id is not null then

    -- A. Vacation Requests
    if exists (select 1 from information_schema.tables where table_name = 'vacation_requests' and table_schema = 'public') then
        execute 'delete from public.vacation_requests where user_id = $1' using auth_user_id;
    end if;

    -- B. Weekly Reports
    if exists (select 1 from information_schema.tables where table_name = 'weekly_reports' and table_schema = 'public') then
        execute 'delete from public.weekly_reports where user_id = $1' using auth_user_id;
    end if;

    -- C. Inquiries (This caused the error, so now we check first!)
    if exists (select 1 from information_schema.tables where table_name = 'inquiries' and table_schema = 'public') then
        execute 'delete from public.inquiries where user_id = $1' using auth_user_id;
    end if;

    -- D. Suggestions
    if exists (select 1 from information_schema.tables where table_name = 'suggestions' and table_schema = 'public') then
        execute 'delete from public.suggestions where user_id = $1' using auth_user_id;
    end if;

    -- E. Staff Todos
    if exists (select 1 from information_schema.tables where table_name = 'staff_todos' and table_schema = 'public') then
        execute 'delete from public.staff_todos where created_by = $1 or completed_by = $1' using auth_user_id;
    end if;

    -- F. Profiles (Optional, often implicitly cascaded but good to be sure)
    if exists (select 1 from information_schema.tables where table_name = 'profiles' and table_schema = 'public') then
        execute 'delete from public.profiles where id = $1' using auth_user_id;
    end if;

    -- Finally Delete from auth.users
    delete from auth.users where id = auth_user_id;
  end if;

  -- 5. Delete from authorized_users
  delete from public.authorized_users where id = target_user_id;

end;
$$;
