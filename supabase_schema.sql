-- Copy and paste this into the Supabase SQL Editor to natively generate your tables

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time BIGINT NOT NULL,
  end_time BIGINT NOT NULL,
  activity TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  frequency_type TEXT NOT NULL,
  target_count INTEGER NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  date_string TEXT NOT NULL,
  timestamp BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount FLOAT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  date_string TEXT NOT NULL,
  timestamp BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  content TEXT NOT NULL,
  score INTEGER,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS llm_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  payload TEXT NOT NULL,
  meta JSONB,
  error TEXT,
  created_at BIGINT NOT NULL
);

-- Create B-Tree Indexes to dramatically speed up REST API fetch times
CREATE INDEX IF NOT EXISTS idx_activities_time ON activities(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(date_string);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date_string, timestamp);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type, start_date);
CREATE INDEX IF NOT EXISTS idx_llm_jobs_status ON llm_jobs(status, type);

-- Enable Realtime WebSockets for cross-device syncing via DO block mapping
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'activities') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE activities;
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
