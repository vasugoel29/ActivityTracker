# ActivityTracker (PWA) ✦

An advanced, locally-accelerated Progressive Web App (PWA) designed to operate as your holistic **Life Analyst**.
ActivityTracker seamlessly bridges a global Supabase cluster with a completely local, offline Mistral AI engine running natively on your machine to analyze your Habits, Time, and Finances continuously.

### Features

- 💸 **Financial Dashboard**: High-friction tracker for individual expense logging across customizable categories.
- 🎯 **Habit Tracker**: Defines constraints (Daily, Multiple Daily, Weekly, Monthly) mapping completion scores automatically against the calendar.
- ⚡️ **Timeline Bulk Logger**: Paste raw text formats (`14:00 - 15:30 : Meeting`) directly into a daily canvas matrix visually snapping blocks to an hourly grid.
- 🤖 **Mistral LLM Analyst**: A completely isolated local Ollama background worker that routinely queries your Supabase database, digests your tracked parameters, and generates highly accurate **Daily, Weekly, and Monthly Audits** scoring your lifestyle without sending any data to OpenAI.
- 🌐 **Cross-Device Reactivity**: 100% real-time synchronized UI updates triggered through Supabase Postgres Websockets. Log a cost on your phone natively, watch your Mac dashboard update implicitly with 0-latency React hooks.

---

## 🚀 Setup & Architecture

### 1. Supabase Initialization

ActivityTracker requires a Supabase PostgreSQL instance to persist logging securely across devices.

1. Create a project at [Supabase.com](https://supabase.com).
2. Navigate to the **SQL Editor**.
3. Copy and paste the entire contents of **`supabase_schema.sql`** into the editor and hit **Run**.
   _This script is fully idempotent; it will construct 6 tracking tables, attach B-Tree Indexes explicitly mapped against React query parameters, enforce Row Level Security (RLS) policies allowing Anon access, and natively mount tables into the `supabase_realtime` cross-device publication._

### 2. Environment Configuration

Create a `.env.local` file explicitly at the repository root containing your Supabase keys:

```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Mac Local AI Configuration (Ollama)

Because the background React worker explicitly runs its Mistral generations on your machine targeting `http://127.0.0.1:11434`, you must explicitly configure Ollama to accept requests globally if you plan to host the frontend on a domain like Vercel.

1. Download and start [Ollama](https://ollama.com).
2. Pull the model over terminal: `ollama run mistral`
3. Execute this command globally on your Mac terminal to override Strict CORS:
   ```bash
   launchctl setenv OLLAMA_ORIGINS "*"
   ```
4. Restart the Ollama desktop application implicitly.

### 4. Running and Deployment

**Local Execution:**

```bash
npm install
npm run dev
```

**Global Execution (Phone & Cloud):**
Deploy the codebase to Vercel/Netlify, inject your environment variables into the deployment dashboard, and open the URL on your mobile phone to natively install it to your home screen! Your mobile app pushes telemetry data to Supabase while your Mac sits silently processing the pending AI analytics whenever the browser dashboard is active.
