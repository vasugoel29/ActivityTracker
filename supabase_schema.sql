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

-- 8. Auto-parsing Trigger to process SMS alerts directly in the database
CREATE OR REPLACE FUNCTION process_incoming_sms_trigger()
RETURNS TRIGGER AS $$
DECLARE
  parsed_amount FLOAT;
  parsed_vendor TEXT;
  parsed_category TEXT;
  parsed_necessity TEXT;
  parsed_description TEXT;
  clean_body TEXT;
BEGIN
  -- Normalize spacing
  clean_body := regexp_replace(new.body, '\s+', ' ', 'g');

  -- A. Extract Amount
  -- Matches "Rs. 150", "Rs 150.00", "INR 1,500", "₹500", etc.
  parsed_amount := (regexp_match(clean_body, '(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)', 'i'))[1]::text;
  
  IF parsed_amount IS NOT NULL THEN
    parsed_amount := replace(parsed_amount, ',', '')::float;
  END IF;

  -- B. Extract Vendor/Merchant
  -- Pattern A: "sent Rs.100 to VENDOR"
  parsed_vendor := (regexp_match(clean_body, '(?:sent|paid|transferred|debited)\s+(?:Rs\.?|INR|₹)\s*[\d,.]+\s+to\s+([A-Za-z0-9\s&._#-]+?)(?:\s+on|\s+ref|\s+upi|\s+from|\s+a\/c|\.$)', 'i'))[1];
  
  -- Pattern B: "debited ... at VENDOR"
  IF parsed_vendor IS NULL THEN
    parsed_vendor := (regexp_match(clean_body, '(?:debited|spent|txn of)\s+(?:from\s+A\/c\s+[a-zA-Z0-9*]+\s*:\s*)?(?:Rs\.?|INR|₹)\s*[\d,.]+\s+(?:on\s+[^a-zA-Z]+)?(?:at|info:)\s*([A-Za-z0-9\s&._#-]+?)(?:\s+ref|\s+upi|\s+from|\s+a\/c|\.$)', 'i'))[1];
  END IF;

  -- Pattern C: "txn of Rs.100 at VENDOR"
  IF parsed_vendor IS NULL THEN
    parsed_vendor := (regexp_match(clean_body, '(?:txn|transaction)\s+of\s+(?:Rs\.?|INR|₹)\s*[\d,.]+\s+(?:at|to)\s+([A-Za-z0-9\s&._#-]+?)(?:\s+on|\s+ref|\s+upi|\.|$)', 'i'))[1];
  END IF;

  -- Pattern D: "spent Rs.100 at VENDOR"
  IF parsed_vendor IS NULL THEN
    parsed_vendor := (regexp_match(clean_body, 'spent\s+(?:Rs\.?|INR|₹)\s*[\d,.]+\s+(?:at|on|to)\s+([A-Za-z0-9\s&._#-]+)', 'i'))[1];
  END IF;

  -- Clean merchant name from common suffix noise
  IF parsed_vendor IS NOT NULL THEN
    parsed_vendor := trim(regexp_replace(parsed_vendor, '\b(ref|upi|txn|using|from|acct|balance|avail|avl)\b.*$', '', 'i'));
  ELSE
    parsed_vendor := 'Unknown Merchant';
  END IF;

  -- C. Infer Category based on merchant name
  parsed_category := 'Other';
  IF clean_body ~* 'swiggy|zomato|starbucks|mcdonalds|domino|pizza|restaurant|cafe|eats|food|dine|kitchen|bakery|deli|grocery|groceries|supermarket|instamart|blinkit|zepto' THEN
    parsed_category := 'Food';
  ELSIF clean_body ~* 'uber|ola|metro|fuel|petrol|shell|hpcl|bpcl|cabs|taxi|irctc|railway|train|bus|auto|toll|fastag' THEN
    parsed_category := 'Transport';
  ELSIF clean_body ~* 'amazon|flipkart|myntra|ajio|zara|h&m|retail|store|mall|shopping|clothes|shoes|boutique|superkalam' THEN
    parsed_category := 'Shopping';
  ELSIF clean_body ~* 'netflix|spotify|bookmyshow|hotstar|prime video|steam|playstation|nintendo|theatre|cinema|club|pub|bar|liquor' THEN
    parsed_category := 'Entertainment';
  ELSIF clean_body ~* 'electricity|water|rent|recharge|airtel|jio|vi|broadband|wifi|gas|maintenance|insurance' THEN
    parsed_category := 'Utilities';
  ELSIF clean_body ~* 'pharmacy|chemist|hospital|doctor|clinic|lab|apollo|medplus|dental|gym|fitness|workout' THEN
    parsed_category := 'Health';
  ELSIF clean_body ~* 'youtube premium|medium|openai|chatgpt|github|icloud|google one|adobe|canva|subscription' THEN
    parsed_category := 'Subscriptions';
  ELSIF clean_body ~* 'makemytrip|easemytrip|goibibo|airbnb|hotel|stay|flight|booking|trip|travel' THEN
    parsed_category := 'Travel';
  ELSIF clean_body ~* 'gift|giftcard|shagun|voucher|present' THEN
    parsed_category := 'Gifts';
  ELSIF clean_body ~* 'zerodha|groww|mutual fund|sip|stocks|etf|invest|coindcx|wazirx' THEN
    parsed_category := 'Investments';
  ELSIF clean_body ~* 'vendor|client|business|payroll|invoice|freelance|hosting|aws|gcp' THEN
    parsed_category := 'Business Payments';
  END IF;

  -- D. Map Necessity
  IF parsed_category IN ('Food', 'Transport', 'Utilities', 'Health', 'Investments', 'Business Payments') THEN
    parsed_necessity := 'Need';
  ELSE
    parsed_necessity := 'Want';
  END IF;

  -- E. Insert into expenses table if valid amount was extracted
  IF parsed_amount IS NOT NULL AND parsed_amount > 0 THEN
    parsed_description := 'Auto-fetched from SMS: ' || parsed_vendor;
    
    INSERT INTO public.expenses (user_id, amount, category, description, necessity, type, date_string, timestamp)
    VALUES (
      new.user_id,
      parsed_amount,
      parsed_category,
      parsed_description,
      parsed_necessity,
      'Personal',
      to_char(now(), 'YYYY-MM-DD'),
      new.created_at
    );
    
    -- Auto-approve: mark SMS as processed immediately
    new.processed := TRUE;
  END IF;

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback: If any error occurs, do not block insertion.
    -- Leave processed = FALSE so it can be reviewed and manually logged in the UI.
    new.processed := FALSE;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_incoming_sms_insert
  BEFORE INSERT ON public.incoming_sms
  FOR EACH ROW EXECUTE FUNCTION public.process_incoming_sms_trigger();


