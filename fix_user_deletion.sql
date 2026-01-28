-- Function to completely delete a user (from profiles and auth.users)
-- Updated: authorized_users is now a VIEW, not a table.
-- We delete from profiles and auth.users directly.

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

  -- 1. Get the user's name and email from profiles
  -- authorized_users is a VIEW, so we read from profiles directly
  select name into target_name
  from public.profiles
  where id = target_user_id;

  if target_name is null then
    raise exception 'User not found in profiles';
  end if;

  -- 2. Use the target_user_id directly (profile.id = auth.users.id)
  auth_user_id := target_user_id;

  -- 3. Delete related records (Safely)
  -- A. Vacation Requests
  if exists (select 1 from information_schema.tables where table_name = 'vacation_requests' and table_schema = 'public') then
      execute 'delete from public.vacation_requests where user_id = $1' using auth_user_id;
  end if;

  -- B. Weekly Reports
  if exists (select 1 from information_schema.tables where table_name = 'weekly_reports' and table_schema = 'public') then
      execute 'delete from public.weekly_reports where user_id = $1' using auth_user_id;
  end if;

  -- C. Inquiries
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

  -- F. Beverage Selections
  if exists (select 1 from information_schema.tables where table_name = 'user_beverage_selections' and table_schema = 'public') then
      execute 'delete from public.user_beverage_selections where user_id = $1' using auth_user_id;
  end if;

  -- G. Attendance Records
  if exists (select 1 from information_schema.tables where table_name = 'attendance' and table_schema = 'public') then
      execute 'delete from public.attendance where user_id = $1' using auth_user_id;
  end if;

  -- H. Attendance Memos
  if exists (select 1 from information_schema.tables where table_name = 'attendance_memos' and table_schema = 'public') then
      execute 'delete from public.attendance_memos where user_id = $1' using auth_user_id;
  end if;

  -- I. Member Memos
  if exists (select 1 from information_schema.tables where table_name = 'member_memos' and table_schema = 'public') then
      execute 'delete from public.member_memos where user_id = $1' using auth_user_id;
  end if;

  -- J. Delete from profiles
  delete from public.profiles where id = auth_user_id;

  -- K. Finally Delete from auth.users
  delete from auth.users where id = auth_user_id;

  -- NOTE: No need to delete from authorized_users because it's a VIEW
  -- that joins auth.users and profiles. Deleting from both source tables
  -- automatically removes the record from the view.

end;
$$;
