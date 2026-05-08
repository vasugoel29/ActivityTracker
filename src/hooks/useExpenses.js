import { useSupabase, triggerOptimisticRefetch } from "./useSupabase";
import { supabase } from "../db/supabase";

export function useExpensesByDate(dateString) {
  return useSupabase(
    "expenses",
    (q) =>
      q.eq("date_string", dateString).order("timestamp", { ascending: false }),
    [dateString],
  );
}

export function useExpensesByRange(startMs, endMs) {
  return useSupabase(
    "expenses",
    (q) =>
      q
        .gte("timestamp", startMs)
        .lte("timestamp", endMs)
        .order("timestamp", { ascending: false }),
    [startMs, endMs],
  );
}

export async function addExpense({
  amount,
  category,
  description,
  dateString,
  necessity = "Need",
  type = "Personal",
}) {
  const expense = {
    amount: parseFloat(amount) || 0,
    category,
    description: description || "",
    necessity,
    type,
    date_string: dateString,
  };
  const timestamp = dateString ? new Date(dateString).getTime() : Date.now();
  const { error } = await supabase
    .from("expenses")
    .insert([{ ...expense, id: crypto.randomUUID(), timestamp }]);
  if (error) throw error;
  triggerOptimisticRefetch("expenses");
}

export async function deleteExpense(id) {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw error;
  triggerOptimisticRefetch("expenses");
}

export async function updateExpense(id, updates) {
  const { error } = await supabase
    .from("expenses")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
  triggerOptimisticRefetch("expenses");
}
