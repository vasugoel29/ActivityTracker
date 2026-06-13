-- Copy and paste this into the Supabase SQL Editor to natively generate your tables

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  start_time BIGINT NOT NULL,
  end_time BIGINT NOT NULL,
  activity TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  name TEXT NOT NULL,
  frequency_type TEXT NOT NULL,
  target_count INTEGER NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  date_string TEXT NOT NULL,
  timestamp BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  amount FLOAT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  payment_method TEXT DEFAULT 'UPI',
  necessity TEXT DEFAULT 'Need',
  type TEXT DEFAULT 'Personal',
  date_string TEXT NOT NULL,
  timestamp BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  type TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  content TEXT NOT NULL,
  score INTEGER,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS llm_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  payload TEXT NOT NULL,
  meta JSONB,
  error TEXT,
  created_at BIGINT NOT NULL
);

-- Enable Row Level Security
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can manage their own activities" ON activities FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own habits" ON habits FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own habit_logs" ON habit_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own expenses" ON expenses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own reports" ON reports FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own llm_jobs" ON llm_jobs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create B-Tree Indexes
CREATE INDEX IF NOT EXISTS idx_activities_user_time ON activities(user_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON habit_logs(user_id, date_string);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date_string, timestamp);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE activities, habits, habit_logs, expenses, reports, llm_jobs;

/*
  MIGRATION SCRIPT FOR EXISTING DATA:
  1. Add user_id column if not exists:
     ALTER TABLE activities ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
     (Repeat for all tables)
  
  2. Assign orphaned data to first user (run after sign-up):
     UPDATE activities SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
     (Repeat for all tables)
*/

-- ==========================================
-- TRANSACTION AUTOMATION UPGRADES (SMS Integration)
-- ==========================================

-- 1. Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at BIGINT NOT NULL
);

-- 2. Create incoming_sms table
CREATE TABLE IF NOT EXISTS incoming_sms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  body TEXT NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at BIGINT NOT NULL
);

-- 3. Enable RLS on both tables
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE incoming_sms ENABLE ROW LEVEL SECURITY;

-- 4. Set RLS Policies
CREATE POLICY "Users can manage their own settings" ON user_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own incoming_sms" ON incoming_sms FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Trigger function to automatically create settings when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_settings (user_id, api_key, created_at)
  VALUES (new.id, encode(gen_random_bytes(24), 'hex'), (extract(epoch from now()) * 1000)::bigint)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_settings();

-- 6. Secure RPC function to log incoming SMS texts via API key
-- This runs as SECURITY DEFINER so that the webhook can insert a row for the matching user
-- even without standard OAuth / JWT authorization headers.
CREATE OR REPLACE FUNCTION log_sms_via_api_key(
  api_key TEXT,
  body TEXT
) RETURNS VOID AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Look up user associated with this API key
  SELECT user_id INTO target_user_id
  FROM public.user_settings
  WHERE public.user_settings.api_key = log_sms_via_api_key.api_key;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid API Key';
  END IF;
  
  -- Insert into incoming_sms table on behalf of target_user_id
  INSERT INTO public.incoming_sms (user_id, body, processed, created_at)
  VALUES (target_user_id, log_sms_via_api_key.body, FALSE, (extract(epoch from now()) * 1000)::bigint);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Add Realtime for the new tables
ALTER PUBLICATION supabase_realtime ADD TABLE user_settings, incoming_sms;

