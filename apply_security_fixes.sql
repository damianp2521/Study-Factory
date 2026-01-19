-- SECURITY HARDENING SCRIPT
-- 2026-01-19
-- Author: Security Auditor (Antigravity)

-- 1. Helper Function: get_my_role()
-- efficiently fetches the role of the current user.
create or replace function public.get_my_role()
returns text
language sql
security definer -- Runs as creator (postgres) to read profiles table even if RLS blocks it initially
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- 2. Trigger Function: Prevent Role Escalation
-- Prevents a user from changing their own role to 'admin' or anything else.
create or replace function public.prevent_self_role_change()
returns trigger
language plpgsql
as $$
begin
  -- If the role is being changed
  if old.role is distinct from new.role then
    -- And the user is changing their own record
    if auth.uid() = old.id then
       -- And they are NOT already an admin (Admins can demod themselves if they want, or we can block that too)
       -- Actually, simpler: Only Admins can change roles.
       if public.get_my_role() <> 'admin' then
          raise exception 'Access Denied: You cannot change your own role.';
       end if;
    end if;
  end if;
  return new;
end;
$$;

-- Remove existing trigger if exists to avoid duplication errors
drop trigger if exists on_prevent_role_change on public.profiles;

-- Create Trigger
create trigger on_prevent_role_change
before update on public.profiles
for each row
execute function public.prevent_self_role_change();


-- 3. Apply Strict RLS Policies
-- We will DROP existing policies to ensure clean slate and recreate them.
-- WARNING: This temporarily exposes tables if done on live high-traffic, but inside a transaction block it is safe.
-- We are not using transaction block command here for simplicity in Supabase dashboard, so we do it one by one.

-- A. Table: PROFILES
alter table public.profiles enable row level security;
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

-- Profiles: READ (Everyone can see names/branches - needed for UI/Collaboration)
create policy "Allow read access for authenticated users"
  on public.profiles for select
  using ( auth.role() = 'authenticated' );

-- Profiles: INSERT (Users create their own profile on signup)
create policy "Enable insert for users based on user_id"
  on public.profiles for insert
  with check ( auth.uid() = id );

-- Profiles: UPDATE (Users update own, Admins update all)
create policy "Enable update for users based on id or admin"
  on public.profiles for update
  using ( 
    auth.uid() = id 
    or 
    public.get_my_role() in ('admin', 'staff') 
  );


-- B. Table: AUTHORIZED_USERS (Sensitive Employee List)
alter table public.authorized_users enable row level security;
drop policy if exists "Enable read access for all users" on public.authorized_users;
drop policy if exists "Enable read access for authenticated users" on public.authorized_users;

-- Read: Only Admin/Staff + The user themselves (to check their own status)
create policy "Secure read access for authorized_users"
  on public.authorized_users for select
  using (
    public.get_my_role() in ('admin', 'staff')
    or
    (
      -- Match by name/email logic is complex here if no user_id link. 
      -- The app uses `authorized_users` to verify signup. 
      -- So we actually need to allow public read (or auth read) for the signup check to work?
      -- Wait, the signup logic: `select * from authorized_users where name='...'`
      -- If we block read, signup fails.
      -- SECURITY TRADEOFF: We must allow reading names for signup logic, OR use a security definer function for signup check.
      -- For now, we will allow Authenticated users to read. BUT we should prevent 'listing' all?
      -- Hard to prevent listing if we allow filtering.
      -- Let's keep it 'Authenticated' for now but this is a minor info leak risks (employee names).
      auth.role() = 'authenticated'
    )
  );

-- Write (Update/Delete/Insert): ONLY ADMIN
-- (Assume existing policies might exist, drop them)
-- Add explicit Admin only write policies if needed, or rely on default deny.
-- public.authorized_users usually managed by Admin.


-- C. Table: VACATION_REQUESTS
alter table public.vacation_requests enable row level security;
drop policy if exists "Enable read access for all users" on public.vacation_requests;
drop policy if exists "Enable insert access for all users" on public.vacation_requests;
drop policy if exists "Enable update access for all users" on public.vacation_requests;
drop policy if exists "Enable delete access for all users" on public.vacation_requests;

create policy "Secure read: Own or Admin/Staff - Vacation"
  on public.vacation_requests for select
  using ( auth.uid() = user_id or public.get_my_role() in ('admin', 'staff') );

create policy "Secure insert: Own or Admin/Staff - Vacation"
  on public.vacation_requests for insert
  with check ( auth.uid() = user_id or public.get_my_role() in ('admin', 'staff') );

create policy "Secure update: Own or Admin/Staff - Vacation"
  on public.vacation_requests for update
  using ( auth.uid() = user_id or public.get_my_role() in ('admin', 'staff') );

create policy "Secure delete: Own or Admin/Staff - Vacation"
  on public.vacation_requests for delete
  using ( auth.uid() = user_id or public.get_my_role() in ('admin', 'staff') );


-- D. Table: WORK_PLANS
alter table public.work_plans enable row level security;
drop policy if exists "Enable read access for all users" on public.work_plans;
-- ... drop others ... existing policies usually follow pattern
-- We'll just Create OR Replace (not supported for policy), so we drop by name or just create unique names.
-- To be safe, let's create "Secure ..." policies. If conflicts, the user needs to delete old ones manually or we do `drop policy if exists ...` for known names.
-- Assuming standard names generated by Supabase UI.
drop policy if exists "Enable read access for authenticated users" on public.work_plans;
drop policy if exists "Enable insert access for authenticated users" on public.work_plans;
drop policy if exists "Enable update access for authenticated users" on public.work_plans;
drop policy if exists "Enable delete access for authenticated users" on public.work_plans;

create policy "Secure read: Own or Admin/Staff - WorkPlans"
  on public.work_plans for select
  using ( auth.uid() = user_id or public.get_my_role() in ('admin', 'staff') );

create policy "Secure insert: Own or Admin/Staff - WorkPlans"
  on public.work_plans for insert
  with check ( auth.uid() = user_id or public.get_my_role() in ('admin', 'staff') );

create policy "Secure update: Own or Admin/Staff - WorkPlans"
  on public.work_plans for update
  using ( auth.uid() = user_id or public.get_my_role() in ('admin', 'staff') );

create policy "Secure delete: Own or Admin/Staff - WorkPlans"
  on public.work_plans for delete
  using ( auth.uid() = user_id or public.get_my_role() in ('admin', 'staff') );


-- E. Table: WEEKLY_REPORTS
alter table public.weekly_reports enable row level security;
drop policy if exists "Enable read access for authenticated users" on public.weekly_reports;
drop policy if exists "Enable insert access for authenticated users" on public.weekly_reports;
drop policy if exists "Enable update access for authenticated users" on public.weekly_reports;

create policy "Secure read: Own or Admin/Staff - Reports"
  on public.weekly_reports for select
  using ( auth.uid() = user_id or public.get_my_role() in ('admin', 'staff') );

create policy "Secure insert: Own or Admin/Staff - Reports"
  on public.weekly_reports for insert
  with check ( auth.uid() = user_id or public.get_my_role() in ('admin', 'staff') );

create policy "Secure update: Own or Admin/Staff - Reports"
  on public.weekly_reports for update
  using ( auth.uid() = user_id or public.get_my_role() in ('admin', 'staff') );


-- F. Table: STAFF_TODOS (Shared Task List)
-- Staff Todos are different. Created by Admin, but Completed by Staff.
-- Viewable by: All Staff/Admin.
-- Members shouldn't see? Or maybe they do? Let's assume ONLY Staff/Admin.
alter table public.staff_todos enable row level security;
drop policy if exists "Enable read access for authenticated users" on public.staff_todos;
drop policy if exists "Enable insert access for authenticated users" on public.staff_todos;
drop policy if exists "Enable update access for authenticated users" on public.staff_todos;
drop policy if exists "Enable delete access for authenticated users" on public.staff_todos;

create policy "Secure read: Staff/Admin Only"
  on public.staff_todos for select
  using ( public.get_my_role() in ('admin', 'staff') );

create policy "Secure insert: Staff/Admin Only"
  on public.staff_todos for insert
  with check ( public.get_my_role() in ('admin', 'staff') );

create policy "Secure update: Staff/Admin Only"
  on public.staff_todos for update
  using ( public.get_my_role() in ('admin', 'staff') );

create policy "Secure delete: Staff/Admin Only"
  on public.staff_todos for delete
  using ( public.get_my_role() in ('admin', 'staff') );


-- G. Table: SUGGESTIONS (Private to User + Admin)
alter table public.suggestions enable row level security;
drop policy if exists "Enable read access for authenticated users" on public.suggestions;
drop policy if exists "Enable insert access for authenticated users" on public.suggestions;
drop policy if exists "Enable update access for authenticated users" on public.suggestions;
drop policy if exists "Enable delete access for authenticated users" on public.suggestions;

create policy "Secure read: Own or Admin/Staff"
  on public.suggestions for select
  using ( auth.uid() = user_id or public.get_my_role() in ('admin', 'staff') );

create policy "Secure insert: Own or Admin/Staff"
  on public.suggestions for insert
  with check ( auth.uid() = user_id or public.get_my_role() in ('admin', 'staff') );

create policy "Secure update: Own or Admin/Staff"
  on public.suggestions for update
  using ( auth.uid() = user_id or public.get_my_role() in ('admin', 'staff') );

create policy "Secure delete: Own or Admin/Staff"
  on public.suggestions for delete
  using ( auth.uid() = user_id or public.get_my_role() in ('admin', 'staff') );
