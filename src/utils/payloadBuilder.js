import { supabase } from '../db/supabase';

export async function buildReportPayload(start, end) {
  const { data: logs } = await supabase.from('logs').select('*').gte('start_time', start).lte('start_time', end);
  const { data: expenses } = await supabase.from('expenses').select('*').gte('timestamp', start).lte('timestamp', end);
  
  const { data: habitLogs } = await supabase.from('habit_logs').select('*').gte('timestamp', start).lte('timestamp', end);
  const { data: allHabits } = await supabase.from('habits').select('*');

  const payloadData = {
    TIMELINE_LOGS: (logs || []).map(l => ({
      activity: l.activity,
      life_area: l.life_area,
      time: `${new Date(l.start_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`,
      date: new Date(l.start_time).toLocaleDateString()
    })),
    EXPENSES_LOGGED: (expenses || []).map(e => ({ amount: e.amount, category: e.category, date: e.date_string })),
    HABITS_COMPLETED: (habitLogs || []).map(hl => {
      const h = (allHabits || []).find(x => x.id === hl.habit_id);
      return { habit: h?.name || 'Unknown', date: hl.date_string }
    })
  };

  const isEmpty = (logs?.length || 0) === 0 && (expenses?.length || 0) === 0 && (habitLogs?.length || 0) === 0;

  return {
    payload: JSON.stringify(payloadData, null, 2),
    isEmpty
  };
}
