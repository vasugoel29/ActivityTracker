import { useEffect } from 'react';
import { supabase } from '../db/supabase';
import { requestReport } from './useReports';
import { buildReportPayload } from '../utils/payloadBuilder';
import { startOfDay, subDays, startOfMonth, startOfWeek, endOfDay, isSameDay } from 'date-fns';

export function useAutoReportGenerator() {
  useEffect(() => {
    // Clear out stuck jobs safely using Supabase
    supabase.from('llm_jobs').delete().neq('status', 'completed').then();

    const checkAndGenerate = async () => {
      const now = new Date();
      
      const generateIfMissing = async (type, targetDate, startObj, endObj) => {
        const { data: reports } = await supabase.from('reports').select('*').eq('type', type);
        const { data: jobs } = await supabase.from('llm_jobs').select('*').eq('type', type).neq('status', 'failed');
        
        const hasReport = (reports || []).some(r => isSameDay(new Date(r.start_date || r.created_at), targetDate)) || 
                          (jobs || []).some(j => isSameDay(new Date(j.meta?.start_date || j.created_at), targetDate));
        
        if (!hasReport) {
           const { payload, isEmpty } = await buildReportPayload(startObj.getTime(), endObj.getTime());
           if (!isEmpty) {
              await requestReport(payload, type, { start_date: targetDate.toISOString() });
           }
        }
      };
      
      // 1. YESTERDAY'S DAILY 
      const yesterday = subDays(startOfDay(now), 1);
      await generateIfMissing('daily_report', yesterday, yesterday, endOfDay(yesterday));

      // 2. LAST WEEK'S WEEKLY 
      const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
      const lastWeekEnd = subDays(currentWeekStart, 1);
      const lastWeekStart = subDays(currentWeekStart, 7);
      await generateIfMissing('weekly_report', lastWeekStart, lastWeekStart, endOfDay(lastWeekEnd));

      // 3. LAST MONTH'S MONTHLY 
      const currentMonthStart = startOfMonth(now);
      const lastMonthEnd = subDays(currentMonthStart, 1);
      const lastMonthStart = startOfMonth(lastMonthEnd);
      await generateIfMissing('monthly_report', lastMonthStart, lastMonthStart, endOfDay(lastMonthEnd));
    };
    
    checkAndGenerate();
    const intervalId = setInterval(checkAndGenerate, 30 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);
}
