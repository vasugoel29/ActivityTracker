import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';

export function useExpensesByDate(dateString) {
  return useLiveQuery(() => 
    db.expenses
      .where('date_string')
      .equals(dateString)
      .reverse()
      .sortBy('timestamp')
  , [dateString]);
}

export async function addExpense({ amount, category, description, dateString }) {
  await db.expenses.add({
    id: crypto.randomUUID(),
    amount: parseFloat(amount) || 0,
    category,
    description: description || '',
    date_string: dateString,
    timestamp: Date.now()
  });
}

export async function deleteExpense(id) {
  await db.expenses.delete(id);
}
