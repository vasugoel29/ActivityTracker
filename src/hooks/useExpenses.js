import { useSupabase, triggerOptimisticRefetch } from './useSupabase';
import { supabase } from '../db/supabase';

export function useExpensesByDate(dateString) {
  return useSupabase('expenses', (q) => q.eq('date_string', dateString).order('timestamp', { ascending: false }), [dateString]);
}

export async function addExpense({ amount, category, description, dateString }) {
  const expense = {
    amount: parseFloat(amount) || 0,
    category,
    description: description || '',
    date_string: dateString,
  };
  const { error } = await supabase.from('expenses').insert([{ ...expense, id: crypto.randomUUID(), timestamp: Date.now() }]);
  if (error) throw error;
  triggerOptimisticRefetch('expenses');
}

export async function deleteExpense(id) {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
  triggerOptimisticRefetch('expenses');
}

export async function updateExpense(id, updates) {
  const { error } = await supabase.from('expenses').update(updates).eq('id', id);
  if (error) throw error;
  triggerOptimisticRefetch('expenses');
}
