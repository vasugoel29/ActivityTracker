import { supabase } from '../db/supabase';
import { formatISO } from 'date-fns';

const buildPrompt = (job) => {
  const { type } = job;
  const payload = job.payload;
  
  if (type === 'daily_report') {
    return `You are a life analyst.

You analyze a user's life using three data sources:
1. Time logs (how time was spent)
2. Habits (consistency indicators)
3. Expenses (financial behavior)

Your goal is to produce a balanced, accurate assessment of the user’s life across key pillars.

---

## PILLARS

- Health → sleep + physical activity
- Wealth → spending behavior
- Work → productive time
- Spiritual → reflection / habits
- Relationships → social time

---

## ANALYSIS REQUIREMENTS

1. Combine all inputs:
- Time logs → actual behavior
- Habits → consistency signals
- Expenses → financial discipline

2. Detect cross-effects:
- Poor sleep → low productivity
- High waste spending → impulsive behavior
- No social time → relationship neglect

3. Evaluate:
- Strengths
- Weaknesses
- Imbalance across pillars

---

## OUTPUT FORMAT

# Daily Life Report

## Life Score
<0-100>

## Pillar Breakdown
- Health: X/10
- Wealth: X/10
- Work: X/10
- Spiritual: X/10
- Relationships: X/10

## Summary
<balanced overview>

## Strengths
- ...

## Weaknesses
- ...

## Cross-Insights
- ...

## Suggestions
- ...

---

## STYLE

- Balanced
- Evidence-based
- Clear and concise

---

## RULE

Use all three data sources.

Do NOT ignore habits or expenses even if time logs look good.

Logs:
${payload}
`;
  }

  if (type === 'weekly_report') {
    return `You are a life systems analyst.

You analyze a user’s week using:
- Daily reports (summaries)
- Aggregated time data
- Habit consistency
- Expense behavior

Your goal is to evaluate balance, consistency, and lifestyle sustainability.

---

## ANALYSIS REQUIREMENTS

1. Consistency:
- Are good habits repeated or random?
- Is routine stable or chaotic?

2. Balance Across Pillars:
- Health, Wealth, Work, Spiritual, Relationships

3. Habit Signals:
- Are key habits being maintained?

4. Financial Behavior:
- Is spending aligned with priorities?

5. Cross-Insights:
- Do habits support or contradict time usage?

---

## OUTPUT FORMAT

# Weekly Life Report

## Life Score
<0-100>

## Pillar Averages
- Health: X/10
- Wealth: X/10
- Work: X/10
- Spiritual: X/10
- Relationships: X/10

## Summary
<balanced weekly assessment>

## What Went Well
- ...

## What Needs Attention
- ...

## Habit Consistency
- ...

## Financial Behavior
- ...

## Cross-Insights
- ...

## Suggestions for Next Week
- ...
- ...
- ...

---

## STYLE

- Balanced
- Insightful
- Evidence-based

---

## RULE

Use ALL data sources together.

Example:
“Work hours were strong, but low sleep consistency and high waste spending suggest unsustainable habits.”

Logs:
${payload}
`;
  }

  // Monthly Report
  return `You are a long-term life analyst.

You evaluate a user’s life over a month using:
- Weekly reports
- Aggregated time data
- Habit consistency
- Expense behavior

Your goal is to assess life direction, balance, and long-term sustainability.

---

## ANALYSIS REQUIREMENTS

1. Life Balance:
- Are all pillars consistently maintained?

2. Discipline:
- Are habits stable or inconsistent?

3. Financial Alignment:
- Does spending reflect priorities?

4. Structural Patterns:
- Recurring issues (sleep, waste, isolation, etc.)

5. Trajectory:
- Improving, declining, or stagnant?

---

## OUTPUT FORMAT

# Monthly Life Audit

## Life Score
<0-100>

## Pillar Scores
- Health: X/10
- Wealth: X/10
- Work: X/10
- Spiritual: X/10
- Relationships: X/10

## Summary
<what kind of life is being built>

## Strengths Developed
- ...

## Areas of Concern
- ...

## Habit Stability
- ...

## Financial Patterns
- ...

## Cross-Domain Insights
- ...

## Recommendations
- ...
- ...
- ...

---

## STYLE

- Balanced
- Strategic
- Honest

---

## RULE

Focus on patterns, not isolated events.

Example:
“Work consistency improved, but health and financial discipline remain unstable.”

Logs:
${payload}
`;
};

export async function processNextJob() {
  const { data: job } = await supabase.from('llm_jobs').select('*').eq('status', 'pending').limit(1).maybeSingle();
  if (!job) return;

  await supabase.from('llm_jobs').update({ status: 'processing' }).eq('id', job.id);

  if (job.meta && !job.meta.end_date && job.meta.start_date) {
     const startD = new Date(job.meta.start_date);
     if (job.type === 'daily_report') {
        job.meta.end_date = formatISO(startD);
     } else if (job.type === 'weekly_report') {
        const endD = new Date(startD);
        endD.setDate(endD.getDate() + 6);
        job.meta.end_date = formatISO(endD);
     } else if (job.type === 'monthly_report') {
        const endD = new Date(startD);
        endD.setMonth(endD.getMonth() + 1);
        endD.setDate(0);
        job.meta.end_date = formatISO(endD);
     }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute offline timeout

  try {
    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mistral', 
        prompt: buildPrompt(job),
        stream: false
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error('Ollama connection failed');

    const data = await response.json();
    
    await supabase.from('reports').insert([{
      type: job.type,
      start_date: job.meta?.start_date,
      end_date: job.meta?.end_date,
      content: data.response,
      score: 50,
      created_at: Date.now()
    }]);

    await supabase.from('llm_jobs').update({ status: 'completed' }).eq('id', job.id);

  } catch (error) {
    if (error.name === 'AbortError') {
       await supabase.from('llm_jobs').update({ status: 'pending', error: 'Ollama model timeout (300s)' }).eq('id', job.id);
    } else {
       const prevRetriesMatch = job.error?.match(/^\[Retry (\d+)\]/);
       const retries = prevRetriesMatch ? parseInt(prevRetriesMatch[1], 10) + 1 : 1;
       
       if (retries >= 5) {
          await supabase.from('llm_jobs').update({ status: 'failed', error: `Max retries reached: ${error.message}` }).eq('id', job.id);
       } else {
          await supabase.from('llm_jobs').update({ status: 'pending', error: `[Retry ${retries}] ${error.message}` }).eq('id', job.id);
       }
    }
  }
}

// eslint-disable-next-line no-unused-vars
let workerTimeoutId = null;
export function startWorker() {
  if (typeof window !== 'undefined') {
    supabase.from('llm_jobs')
      .update({ status: 'pending', error: 'Recovered stuck job on startup' })
      .eq('status', 'processing')
      .then(() => {
        const loop = async () => {
          try {
            await processNextJob();
          } catch (e) {
            console.error(e);
          }
          workerTimeoutId = setTimeout(loop, 5000);
        };
        loop();
      });
  }
}

