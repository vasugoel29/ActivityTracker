import { supabase } from "../db/supabase";
import { formatISO } from "date-fns";
import { logToTerminal } from "../utils/logger";

const buildPrompt = (job) => {
  const { type, payload } = job;
  const periodLabel =
    type === "daily_report"
      ? "Day"
      : type === "weekly_report"
        ? "Week"
        : "Month";

  return `You are a world-class Life Systems Architect and Strategic Auditor.
    
Analyze the following user data (time logs, habits, expenses) for the past ${periodLabel} and provide a rigorous, unsentimental, and highly insightful life audit.

## INPUT DATA
${payload}

---

## ANALYSIS REQUIREMENTS

1. **Life Balance**: Are all pillars (Health, Finances, Work, Spiritual, Social) consistently maintained?
2. **Trend Analysis**: Detect improvements or declines across the specific ${periodLabel}.
3. **Rhythm Detection**: ${type !== "daily_report" ? "Identify which specific days or times were the most productive/problematic." : "Identify peak and friction moments of the day."}
4. **Discipline**: Are habits stable or inconsistent?
5. **Financial Alignment**: Does spending reflect priorities or impulsivity?

---

## OUTPUT FORMAT (STRICT)

# ${periodLabel} Life Audit

## Life Score
<0-100 score reflecting total effectiveness/sustainability>

${
  type !== "daily_report"
    ? `## Weekly Rhythm
- Peak Performance: [Specific Day + Evidence from logs]
- Critical Friction: [Specific Day + Evidence from logs]`
    : ""
}

## Pillar Audits

For each pillar below, provide a structured analysis:
### [Pillar Name]
Score: [Score]/10
Summary: [One-sentence overview]
Calculation: [Specific logic for the score]
Metrics: [Specific data points/logs analyzed]
Process: [The strategic reasoning/decision process]

PILLARS: Health, Finances, Work, Spiritual, Social

## Executive Summary
<One sentence high-level overview of the ${periodLabel}'s trajectory>

## Strategic Strengths
- <Evidence-based positive pattern>
- <Evidence-based positive pattern>

## Critical Weaknesses
- <Evidence-based negative pattern or neglect>
- <Evidence-based negative pattern or neglect>

## Cross-Domain Insights
- <How one pillar affected another (e.g., poor sleep leading to low focus at work)>

## High-Impact Recommendations
- <Exact, actionable step for the next period>
- <Exact, actionable step for the next period>
- <Exact, actionable step for the next period>

---

## STYLE GUIDELINES
- Be analytical, not generic. 
- Use evidence from the logs (e.g., "The 3PM expense suggests a mid-afternoon energy crash").
- Focus on the *why* behind the *what*.
`;
};

export async function processNextJob() {
  const { data: job } = await supabase
    .from("llm_jobs")
    .select("*")
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();
  if (!job) return;

  await supabase
    .from("llm_jobs")
    .update({ status: "processing" })
    .eq("id", job.id);
  logToTerminal(
    `Found pending job: ${job.type} (ID: ${job.id.split("-")[0]}...)`,
  );

  if (job.meta && !job.meta.end_date && job.meta.start_date) {
    const startD = new Date(job.meta.start_date);
    if (job.type === "daily_report") {
      job.meta.end_date = formatISO(startD);
    } else if (job.type === "weekly_report") {
      const endD = new Date(startD);
      endD.setDate(endD.getDate() + 6);
      job.meta.end_date = formatISO(endD);
    } else if (job.type === "monthly_report") {
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
    logToTerminal(
      `Sending prompt to Ollama (model: mistral, length: ${prompt.length})...`,
    );
    const response = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral",
        prompt,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error("Ollama connection failed");

    const data = await response.json();
    const llmResponse = data.response;

    // Extract score from LLM response (Expected format: "## Life Score: 85")
    let extractedScore = 50;
    const scoreMatch = llmResponse.match(/Life Score[:\s]*(\d+)/i);
    if (scoreMatch) {
      extractedScore = parseInt(scoreMatch[1], 10);
    }

    await supabase.from("reports").insert([
      {
        type: job.type,
        start_date: job.meta?.start_date,
        end_date: job.meta?.end_date,
        content: llmResponse,
        score: extractedScore,
        created_at: Date.now(),
      },
    ]);

    await supabase
      .from("llm_jobs")
      .update({ status: "completed" })
      .eq("id", job.id);
    logToTerminal(
      `Successfully generated ${job.type} report with score: ${extractedScore}.`,
    );
  } catch (error) {
    logToTerminal(`Error processing ${job.type}: ${error.message}`);
    if (error.name === "AbortError") {
      await supabase
        .from("llm_jobs")
        .update({ status: "pending", error: "Ollama model timeout (300s)" })
        .eq("id", job.id);
    } else {
      const prevRetriesMatch = job.error?.match(/^\[Retry (\d+)\]/);
      const retries = prevRetriesMatch
        ? parseInt(prevRetriesMatch[1], 10) + 1
        : 1;

      if (retries >= 5) {
        await supabase
          .from("llm_jobs")
          .update({
            status: "failed",
            error: `Max retries reached: ${error.message}`,
          })
          .eq("id", job.id);
      } else {
        await supabase
          .from("llm_jobs")
          .update({
            status: "pending",
            error: `[Retry ${retries}] ${error.message}`,
          })
          .eq("id", job.id);
      }
    }
  }
}

// eslint-disable-next-line no-unused-vars
let workerTimeoutId = null;
export function startWorker() {
  if (typeof window !== "undefined") {
    supabase
      .from("llm_jobs")
      .update({ status: "pending", error: "Recovered stuck job on startup" })
      .eq("status", "processing")
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
