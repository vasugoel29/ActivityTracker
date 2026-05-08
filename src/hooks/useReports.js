import { useSupabase } from "./useSupabase";
import { supabase } from "../db/supabase";

export function useReportsByType(type) {
  return useSupabase(
    "reports",
    (q) => q.eq("type", type).order("created_at", { ascending: false }),
    [type],
  );
}

export function useJobsByType(type) {
  return useSupabase(
    "llm_jobs",
    (q) => q.eq("type", type).order("created_at", { ascending: false }),
    [type],
  );
}

export async function requestReport(payloadText, type, meta = {}) {
  await supabase.from("llm_jobs").insert([
    {
      type,
      status: "pending",
      payload: payloadText,
      meta,
      created_at: Date.now(),
    },
  ]);
}
