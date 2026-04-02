-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  role text not null check (role in ('student', 'admin')) default 'student',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Create student_registrations table
create table public.student_registrations (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references auth.users on delete cascade not null unique,
  first_name text not null,
  father_name text not null,
  grandfather_name text not null,
  great_grandfather_name text not null,
  gender text not null check (gender in ('male', 'female')),
  date_of_birth date not null,
  mother_name text not null,
  mother_father_name text not null,
  mother_grandfather_name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for student_registrations
alter table public.student_registrations enable row level security;

-- Student registrations policies
create policy "Students can view their own registration." on student_registrations
  for select using (auth.uid() = student_id);

create policy "Admins can view all registrations." on student_registrations
  for select using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Students can insert their own registration." on student_registrations
  for insert with check (auth.uid() = student_id);

create policy "Students can update their own registration." on student_registrations
  for update using (auth.uid() = student_id);
