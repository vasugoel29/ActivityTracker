import { supabase } from './supabase';
import { triggerOptimisticRefetch } from '../hooks/useSupabase';

export async function saveHourlyLog(slotStart, slotEnd, activity, lifeArea = 'untracked') {
  const { data: existingLogs } = await supabase.from('logs')
    .select('id')
    .lt('start_time', slotEnd)
    .gt('end_time', slotStart);
  
  if (existingLogs && existingLogs.length > 0) {
      const ids = existingLogs.map(l => l.id);
      await supabase.from('logs').delete().in('id', ids);
  }
  
  if (activity.trim()) {
      await supabase.from('logs').insert([{
          start_time: slotStart,
          end_time: slotEnd,
          activity: activity.trim(),
          life_area: lifeArea,
          energy_level: 2,
          created_at: Date.now()
      }]);
  }
  
  triggerOptimisticRefetch('logs');
}
