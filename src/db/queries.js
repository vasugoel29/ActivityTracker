import { supabase } from './supabase';
import { triggerOptimisticRefetch } from '../hooks/useSupabase';

export async function saveHourlyLog(slotStart, slotEnd, activity) {
  const { data: existingLogs } = await supabase.from('activities')
    .select('id')
    .lt('start_time', slotEnd)
    .gt('end_time', slotStart);
  
  if (existingLogs && existingLogs.length > 0) {
      const ids = existingLogs.map(l => l.id);
      await supabase.from('activities').delete().in('id', ids);
  }
  
  if (activity.trim()) {
      await supabase.from('activities').insert([{
          start_time: slotStart,
          end_time: slotEnd,
          activity: activity.trim(),
          created_at: Date.now()
      }]);
  }
  
  triggerOptimisticRefetch('activities');
}
