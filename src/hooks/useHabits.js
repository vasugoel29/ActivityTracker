import { useSupabase, triggerOptimisticRefetch } from "./useSupabase";
import { supabase } from "../db/supabase";

export function useHabits() {
  return useSupabase("habits", (q) =>
    q.order("created_at", { ascending: true }),
  );
}

export function useHabitLogs() {
  return useSupabase("habit_logs");
}

export async function addHabit(habit) {
  const { error } = await supabase
    .from("habits")
    .insert([{ ...habit, id: crypto.randomUUID(), created_at: Date.now() }]);
  if (error) throw error;
  triggerOptimisticRefetch("habits");
}

export async function deleteHabit(id) {
  const { error } = await supabase.from("habits").delete().eq("id", id);
  if (error) throw error;
  triggerOptimisticRefetch("habits");
  triggerOptimisticRefetch("habit_logs");
}

export async function updateHabit(id, updates) {
  const { error } = await supabase.from("habits").update(updates).eq("id", id);
  if (error) throw error;
  triggerOptimisticRefetch("habits");
}

export async function toggleDailyHabit(habitId, dateString) {
  const { data: existing, error: selectError } = await supabase
    .from("habit_logs")
    .select("id")
    .eq("habit_id", habitId)
    .eq("date_string", dateString)
    .maybeSingle();
  if (selectError) throw selectError;

  if (existing) {
    const { error: deleteError } = await supabase
      .from("habit_logs")
      .delete()
      .eq("id", existing.id);
    if (deleteError) throw deleteError;
  } else {
    const { error: insertError } = await supabase.from("habit_logs").insert([
      {
        habit_id: habitId,
        date_string: dateString,
        timestamp: Date.now(),
      },
    ]);
    if (insertError) throw insertError;
  }
  triggerOptimisticRefetch("habit_logs");
}

export async function logHabitInstance(habitId, dateString) {
  await supabase.from("habit_logs").insert([
    {
      habit_id: habitId,
      date_string: dateString,
      timestamp: Date.now(),
    },
  ]);
}

export async function removeLastHabitLog(habitId, dateString) {
  const { data: last } = await supabase
    .from("habit_logs")
    .select("id")
    .eq("habit_id", habitId)
    .eq("date_string", dateString)
    .order("timestamp", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (last) await supabase.from("habit_logs").delete().eq("id", last.id);
}
