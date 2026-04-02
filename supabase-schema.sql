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
  id uuid not null default gen_random_uuid (),
  student_id uuid not null,
  first_name text not null,
  father_name text not null,
  grandfather_name text not null,
  great_grandfather_name text not null,
  gender text not null,
  date_of_birth date not null,
  mother_name text not null,
  mother_father_name text not null,
  mother_grandfather_name text not null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  district text not null,
  sub_district text not null,
  neighborhood text not null,
  mahalla text not null default ''::text,
  alley text not null default ''::text,
  house_number text not null default ''::text,
  place_of_birth text not null,
  marital_status text not null,
  mobile_number text not null,
  religion text not null,
  ethnicity text not null,
  father_life_status text not null,
  is_gov_employee text not null,
  gov_department text not null,
  national_id_number text not null,
  national_id_date date null,
  national_id_issuer text not null,
  residence_card_number text not null,
  residence_card_date date null,
  residence_card_issuer text not null,
  photo_url text not null default ''::text,
  previous_school_name text not null,
  education_directorate text not null,
  student_number integer generated always as identity not null,
  application_type text not null,
  constraint student_registrations_pkey primary key (id),
  constraint student_registrations_student_id_key unique (student_id),
  constraint student_registrations_student_id_fkey foreign KEY (student_id) references auth.users (id) on delete CASCADE,
  constraint date_of_birth_reasonable check ((date_of_birth >= '1920-01-01'::date)),
  constraint education_directorate_length check ((char_length(education_directorate) <= 100)),
  constraint father_name_length check ((char_length(father_name) <= 100)),
  constraint first_name_length check ((char_length(first_name) <= 100)),
  constraint gov_department_length check ((char_length(gov_department) <= 150)),
  constraint gov_employee_logic check (
    (
      (
        (is_gov_employee = 'نعم'::text)
        and (char_length(gov_department) > 0)
      )
      or (
        (is_gov_employee = 'لا'::text)
        and (gov_department = ''::text)
      )
    )
  ),
  constraint grandfather_name_length check ((char_length(grandfather_name) <= 100)),
  constraint great_grandfather_name_length check ((char_length(great_grandfather_name) <= 100)),
  constraint house_number_length check ((char_length(house_number) <= 50)),
  constraint mahalla_length check ((char_length(mahalla) <= 50)),
  constraint mobile_number_format check (
    (
      (mobile_number ~ '^07[0-9]{9}$'::text)
      or (mobile_number = ''::text)
    )
  ),
  constraint mother_father_name_length check ((char_length(mother_father_name) <= 100)),
  constraint mother_grandfather_name_length check ((char_length(mother_grandfather_name) <= 100)),
  constraint mother_name_length check ((char_length(mother_name) <= 100)),
  constraint national_id_date_past check (
    (
      (national_id_date is null)
      or (national_id_date <= CURRENT_DATE)
    )
  ),
  constraint national_id_issuer_length check ((char_length(national_id_issuer) <= 150)),
  constraint national_id_number_format check ((national_id_number ~ '^[0-9]{12}$'::text)),
  constraint neighborhood_length check ((char_length(neighborhood) <= 100)),
  constraint photo_url_format check (
    (
      (photo_url = ''::text)
      or (photo_url ~ '^https?://'::text)
    )
  ),
  constraint photo_url_length check ((char_length(photo_url) <= 1000)),
  constraint previous_school_name_length check ((char_length(previous_school_name) <= 150)),
  constraint residence_card_date_past check (
    (
      (residence_card_date is null)
      or (residence_card_date <= CURRENT_DATE)
    )
  ),
  constraint residence_card_issuer_length check ((char_length(residence_card_issuer) <= 150)),
  constraint residence_card_number_length check ((char_length(residence_card_number) <= 50)),
  constraint student_registrations_district_check check (
    (
      district = any (array['النجف'::text, 'الكوفة'::text, 'المناذرة'::text, 'المشخاب'::text])
    )
  ),
  constraint student_registrations_ethnicity_check check (
    (
      ethnicity = any (
        array[
          'عربي'::text,
          'كردي'::text,
          'تركماني'::text,
          'أخرى'::text
        ]
      )
    )
  ),
  constraint student_registrations_father_life_status_check check (
    (
      father_life_status = any (array['حي'::text, 'متوفي'::text])
    )
  ),
  constraint student_registrations_gender_check check (
    (
      gender = any (array['male'::text, 'female'::text])
    )
  ),
  constraint student_registrations_is_gov_employee_check check (
    (
      is_gov_employee = any (array['نعم'::text, 'لا'::text])
    )
  ),
  constraint student_registrations_marital_status_check check (
    (
      marital_status = any (
        array[
          'متزوج'::text,
          'باكر'::text,
          'مطلق'::text,
          'ارمل'::text
        ]
      )
    )
  ),
  constraint student_registrations_place_of_birth_check check (
    (
      place_of_birth = any (
        array[
          'بغداد'::text,
          'البصرة'::text,
          'النجف الاشرف'::text,
          'كربلاء المقدسة'::text,
          'بابل'::text,
          'واسط'::text,
          'ميسان'::text,
          'ذي قار'::text,
          'المثنى'::text,
          'القادسية'::text,
          'الأنبار'::text,
          'ديالى'::text,
          'صلاح الدين'::text,
          'نينوى'::text,
          'كركوك'::text,
          'أربيل'::text,
          'السليمانية'::text,
          'دهوك'::text
        ]
      )
    )
  ),
  constraint student_registrations_religion_check check (
    (
      religion = any (
        array[
          'مسلم'::text,
          'مسيحي'::text,
          'صابئي'::text,
          'ايزيدي'::text
        ]
      )
    )
  ),
  constraint alley_length check ((char_length(alley) <= 50)),
  constraint student_registrations_sub_district_check check (
    (
      sub_district = any (array['مركز النجف'::text, 'الحيدرية'::text, 'الرضوية'::text, 'الشبكة'::text, 'بانيقيا'::text, 'مركز الكوفة'::text, 'العباسية'::text, 'الحرية'::text, 'مركز المناذرة'::text, 'الحيرة'::text, 'مركز المشخاب'::text, 'القادسية'::text])
    )
  ),
  constraint application_type_check check (
    (
      application_type = any (
        array[
          'المرحلة الابتدائية'::text,
          'المرحلة المتوسطة'::text,
          'المرحلة الاعدادية (العلمي)'::text,
          'المرحلة الاعدادية (الادبي)'::text,
          'الخريجون'::text
        ]
      )
    )
  ),
  constraint date_of_birth_past check ((date_of_birth <= CURRENT_DATE))
);

create index IF not exists idx_student_registrations_student_number on public.student_registrations using btree (student_number);
create index IF not exists idx_student_registrations_national_id on public.student_registrations using btree (national_id_number);
create index IF not exists idx_student_registrations_names on public.student_registrations using btree (first_name, father_name, grandfather_name);

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
  for update using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- Create storage bucket for student photos
insert into storage.buckets (id, name, public) values ('student_photos', 'student_photos', true) on conflict do nothing;

-- Storage policies
create policy "Anyone can view student photos"
  on storage.objects for select
  using ( bucket_id = 'student_photos' );

create policy "Authenticated users can upload photos"
  on storage.objects for insert
  with check ( bucket_id = 'student_photos' and auth.role() = 'authenticated' );

create policy "Users can update their own photos"
  on storage.objects for update
  using ( bucket_id = 'student_photos' and auth.uid()::text = (storage.foldername(name))[1] );
