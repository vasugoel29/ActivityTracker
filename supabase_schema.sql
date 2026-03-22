-- Copy and paste this into the Supabase SQL Editor to natively generate your tables

CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  start_time BIGINT NOT NULL,
  end_time BIGINT NOT NULL,
  activity TEXT NOT NULL,
  life_area TEXT,
  energy_level INTEGER,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  frequency_type TEXT NOT NULL,
  target_count INTEGER NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  date_string TEXT NOT NULL,
  timestamp BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  amount FLOAT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  date_string TEXT NOT NULL,
  timestamp BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  type TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  content TEXT NOT NULL,
  score INTEGER,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS llm_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  payload TEXT NOT NULL,
  meta JSONB,
  error TEXT,
  created_at BIGINT NOT NULL
);

-- Secure existing tables by adding user_id
ALTER TABLE logs ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL DEFAULT auth.uid();
ALTER TABLE habits ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL DEFAULT auth.uid();
ALTER TABLE habit_logs ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL DEFAULT auth.uid();
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL DEFAULT auth.uid();
ALTER TABLE reports ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL DEFAULT auth.uid();
ALTER TABLE llm_jobs ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL DEFAULT auth.uid();

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies enforcing IDOR protection (ownership limits based on auth.uid())
DROP POLICY IF EXISTS "Enable all operations for anon" ON logs;
CREATE POLICY "Enable all operations for anon" ON logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable all operations for anon" ON habits;
CREATE POLICY "Enable all operations for anon" ON habits FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable all operations for anon" ON habit_logs;
CREATE POLICY "Enable all operations for anon" ON habit_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable all operations for anon" ON expenses;
CREATE POLICY "Enable all operations for anon" ON expenses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable all operations for anon" ON reports;
CREATE POLICY "Enable all operations for anon" ON reports FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable all operations for anon" ON llm_jobs;
CREATE POLICY "Enable all operations for anon" ON llm_jobs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create B-Tree Indexes to dramatically speed up REST API fetch times
CREATE INDEX IF NOT EXISTS idx_logs_time ON logs(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(date_string);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date_string, timestamp);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type, start_date);
CREATE INDEX IF NOT EXISTS idx_llm_jobs_status ON llm_jobs(status, type);

-- Enable Realtime WebSockets for cross-device syncing via DO block mapping
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'logs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE logs;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'habits') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE habits;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'habit_logs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE habit_logs;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'expenses') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'reports') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE reports;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'llm_jobs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE llm_jobs;
  END IF;
END $$;


