import { supabase } from '../db/supabase';
import { formatISO } from 'date-fns';
import { logToTerminal } from '../utils/logger';

const buildPrompt = (job) => {
  const { type } = job;
  const payload = job.payload;
  
  if (type === 'daily_report') {
    return `You are a world-class Life Systems Architect.
    
Analyze the following user data (time logs, habits, expenses) and provide a rigorous, unsentimental, and highly insightful life audit.

## INPUT DATA
${payload}

---

## OUTPUT REQUIREMENTS (STRICT FORMAT)

# Daily Life Report

## Life Score
<Provide a score from 0 to 100 based on discipline, balance, and productivity. Be honest.>

## Pillar Breakdown
- Health: X/10 (Sleep, Exercise, Diet signals)
- Wealth: X/10 (Spending discipline vs goals)
- Work: X/10 (Deep work vs busy work)
- Spiritual: X/10 (Reflection, reading, meditation)
- Relationships: X/10 (Social interaction, family)

## Summary
<A 2-3 sentence high-level executive summary of the day.>

## Strategic Strengths
- <Evidence-based positive pattern>

## Critical Weaknesses
- <Evidence-based negative pattern or neglect>

## Cross-Domain Insights
- <How one pillar affected another (e.g., poor sleep leading to impulsive spending)>

## Recommendations for Tomorrow
- <Exact, actionable step>

---

## STYLE GUIDELINES
- Be analytical, not generic. 
- Use evidence from the logs (e.g., "The 3PM expense on junk food suggests a mid-afternoon energy crash").
- Focus on the *why* behind the *what*.
`;
  }

  if (type === 'weekly_report') {
    return `You are a systems thinker and life strategist.
    
Evaluate the user's week based on aggregated data. Look for trajectories, consistency, and structural life issues.

## INPUT DATA
${payload}

---

## OUTPUT REQUIREMENTS (STRICT FORMAT)

# Weekly Life Systems Audit

## Life Score
<0-100 score reflecting weekly sustainability and progress.>

## Pillar Averages
- Health: X/10
- Wealth: X/10
- Work: X/10
- Spiritual: X/10
- Relationships: X/10

## Executive Summary
<Overview of the week's trajectory.>

## Major Wins
- <High-impact achievements>

## Friction Points
- <What consistently failed or caused stress>

## Habit Sustainability
- <Are habits sticking or breaking down?>

## Financial Alignment
- <Is spending supporting long-term goals or just immediate gratificaton?>

## Strategic Recommendations
- <3 high-level changes for next week>

---

## STYLE
- Macro-focused.
- Look for consistency patterns.
- Be strategic and direct.
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
- Finances: X/10
- Work: X/10
- Spiritual: X/10
- Social: X/10

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
  logToTerminal(`Found pending job: ${job.type} (ID: ${job.id.split('-')[0]}...)`);

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

  const prompt = buildPrompt(job);
  try {
    logToTerminal(`Sending prompt to Ollama (model: mistral, length: ${prompt.length})...`);
    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mistral', 
        prompt,
        stream: false
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error('Ollama connection failed');

    const data = await response.json();
    const llmResponse = data.response;

    // Extract score from LLM response (Expected format: "## Life Score: 85")
    let extractedScore = 50;
    const scoreMatch = llmResponse.match(/Life Score[:\s]*(\d+)/i);
    if (scoreMatch) {
      extractedScore = parseInt(scoreMatch[1], 10);
    }
    
    await supabase.from('reports').insert([{
      type: job.type,
      start_date: job.meta?.start_date,
      end_date: job.meta?.end_date,
      content: llmResponse,
      score: extractedScore,
      created_at: Date.now()
    }]);

    await supabase.from('llm_jobs').update({ status: 'completed' }).eq('id', job.id);
    logToTerminal(`Successfully generated ${job.type} report with score: ${extractedScore}.`);

  } catch (error) {
    logToTerminal(`Error processing ${job.type}: ${error.message}`);
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

