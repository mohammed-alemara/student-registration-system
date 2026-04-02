import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zicaikcajmuegtztawzo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppY2Fpa2Nham11ZWd0enRhd3pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMjYwNjIsImV4cCI6MjA5MDYwMjA2Mn0.sb2e8roTtKlOp3wbReQr17OA6IXfmK480Nc0R14qzow';

// Check if the URL is provided and is not a placeholder
export const isSupabaseConfigured = 
  Boolean(supabaseUrl) && 
  Boolean(supabaseAnonKey) && 
  supabaseUrl !== 'YOUR_SUPABASE_URL' &&
  supabaseUrl.startsWith('http');

// Create client only if configured, otherwise use a dummy URL to prevent immediate crashes
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder'
);

export type Profile = {
  id: string;
  role: 'student' | 'admin';
  created_at: string;
};

export type StudentRegistration = {
  id: string;
  student_id: string;
  student_number?: number;
  first_name: string;
  father_name: string;
  grandfather_name: string;
  great_grandfather_name: string;
  gender: 'male' | 'female';
  date_of_birth: string;
  mother_name: string;
  mother_father_name: string;
  mother_grandfather_name: string;
  district: string;
  sub_district: string;
  neighborhood: string;
  mahalla: string;
  alley: string;
  house_number: string;
  place_of_birth: string;
  marital_status: string;
  mobile_number: string;
  religion: string;
  ethnicity: string;
  father_life_status: string;
  is_gov_employee: string;
  gov_department: string;
  national_id_number: string;
  national_id_date: string;
  national_id_issuer: string;
  residence_card_number: string;
  residence_card_date: string;
  residence_card_issuer: string;
  previous_school_name: string;
  education_directorate: string;
  photo_url: string;
  application_type: string;
  created_at: string;
};
