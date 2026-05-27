-- ============================================
-- WorkAble AI - Supabase Database Setup
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disabilities table
CREATE TABLE IF NOT EXISTS disabilities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  disability_type TEXT NOT NULL,
  details TEXT,
  document_url TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  description TEXT NOT NULL,
  required_skills TEXT[] DEFAULT '{}',
  work_setup TEXT DEFAULT 'Remote',
  is_flexible_schedule BOOLEAN DEFAULT TRUE,
  accessibility_features TEXT[] DEFAULT '{}',
  icon_type TEXT DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job recommendations table
CREATE TABLE IF NOT EXISTS job_recommendations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  match_score INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Applications table
CREATE TABLE IF NOT EXISTS applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending',
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE disabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own disabilities" ON disabilities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own disabilities" ON disabilities FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Jobs are public" ON jobs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can view own recommendations" ON job_recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recommendations" ON job_recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own applications" ON applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own applications" ON applications FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Seed sample jobs
INSERT INTO jobs (title, company, description, required_skills, work_setup, is_flexible_schedule, accessibility_features, icon_type) VALUES
('Sign Language News Translator', 'MediaBridge PH', 'Translate news broadcasts and content into sign language for deaf and mute viewers across digital platforms.', ARRAY['Sign Language', 'Communication', 'Translation Skills'], 'Remote', true, ARRAY['Inclusive Environment', 'Assistive Tech Provided', 'Equal Opportunity Employer'], 'hands'),
('Online Chat Support Assistant', 'SupportHub Inc.', 'Provide real-time chat support to customers. No voice calls required — fully text-based role.', ARRAY['Written Communication', 'Problem Solving', 'Patience'], 'Remote', true, ARRAY['Screen Reader Compatible', 'Assistive Tech Provided', 'Equal Opportunity Employer'], 'chat'),
('Content Moderator', 'SafeWeb Solutions', 'Review and moderate user-generated content to keep platforms safe and positive for all users.', ARRAY['Attention to Detail', 'Critical Thinking', 'Content Policy Knowledge'], 'Remote', true, ARRAY['Inclusive Environment', 'Equal Opportunity Employer', 'Mental Health Support'], 'monitor'),
('Transcription Specialist', 'AudioText Corp', 'Convert audio recordings to accurate written text. Work at your own pace with flexible deadlines.', ARRAY['Typing Speed', 'Listening Skills', 'Accuracy'], 'Remote', true, ARRAY['Flexible Deadlines', 'Equal Opportunity Employer', 'Assistive Tech Provided'], 'type'),
('Data Entry Analyst', 'DataFlow PH', 'Input and manage data with precision. Fully remote with ergonomic equipment provided.', ARRAY['Accuracy', 'Microsoft Excel', 'Organization'], 'Remote', false, ARRAY['Ergonomic Equipment', 'Inclusive Environment', 'Assistive Tech Provided'], 'database'),
('Graphic Designer', 'CreativeMinds Studio', 'Create visual content for brands. Wheelchair-accessible studio with adaptive tools available.', ARRAY['Adobe Photoshop', 'Illustrator', 'Creativity'], 'Hybrid', true, ARRAY['Wheelchair Accessible', 'Assistive Tech Provided', 'Equal Opportunity Employer'], 'design');
