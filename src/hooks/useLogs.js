import { useSupabase } from './useSupabase';
import { startOfDay, endOfDay } from 'date-fns';

export function useLogsForDate(date) {
  const start = startOfDay(date).getTime();
  const end = endOfDay(date).getTime();
  
  return useSupabase('activities', (q) => q.gte('start_time', start).lte('start_time', end).order('start_time', { ascending: true }), [start, end]);
}
