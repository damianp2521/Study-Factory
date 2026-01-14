-- Create staff_todos table
create table public.staff_todos (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  content text not null,
  is_urgent boolean default false,
  status text default 'pending' check (status in ('pending', 'completed')),
  created_by uuid references public.profiles(id),
  completed_by uuid references public.profiles(id),
  completed_at timestamp with time zone
);

-- Enable RLS
alter table public.staff_todos enable row level security;

-- Policies
-- Everyone (Staff/Admin) can read
create policy "Enable read access for authenticated users"
  on public.staff_todos for select
  using ( auth.role() = 'authenticated' );

-- Everyone (Staff/Admin) can insert
create policy "Enable insert access for authenticated users"
  on public.staff_todos for insert
  with check ( auth.role() = 'authenticated' );

-- Everyone (Staff/Admin) can update (for completion)
create policy "Enable update access for authenticated users"
  on public.staff_todos for update
  using ( auth.role() = 'authenticated' );

-- Everyone (Staff/Admin) can delete (we'll handle specific permission logic in Frontend/Edge function if needed, 
-- or we trust the app logic for now since RLS custom logic for 'only admin can delete completed' is complex without role claims in jwt)
create policy "Enable delete access for authenticated users"
  on public.staff_todos for delete
  using ( auth.role() = 'authenticated' );
