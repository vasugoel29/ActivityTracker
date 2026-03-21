import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';

export function useHabits() {
  return useLiveQuery(() => db.habits.orderBy('created_at').toArray());
}

export function useHabitLogs() {
  return useLiveQuery(() => db.habit_logs.toArray());
}

export async function addHabit({ name, frequency_type, target_count }) {
  await db.habits.add({
    id: crypto.randomUUID(),
    name,
    frequency_type, 
    target_count: parseInt(target_count, 10) || 1,
    created_at: Date.now()
  });
}

export async function deleteHabit(id) {
  await db.habits.delete(id);
  await db.habit_logs.where('habit_id').equals(id).delete();
}

export async function toggleDailyHabit(habitId, dateString) {
  const existing = await db.habit_logs.where('[habit_id+date_string]').equals([habitId, dateString]).first();
  if (existing) {
     await db.habit_logs.delete(existing.id);
  } else {
     await db.habit_logs.add({
        id: crypto.randomUUID(),
        habit_id: habitId,
        date_string: dateString,
        timestamp: Date.now()
     });
  }
}

export async function logHabitInstance(habitId, dateString) {
    await db.habit_logs.add({
        id: crypto.randomUUID(),
        habit_id: habitId,
        date_string: dateString,
        timestamp: Date.now()
    });
}

export async function removeLastHabitLog(habitId, dateString) {
    const last = await db.habit_logs.where('[habit_id+date_string]').equals([habitId, dateString]).first();
    if (last) await db.habit_logs.delete(last.id);
}
