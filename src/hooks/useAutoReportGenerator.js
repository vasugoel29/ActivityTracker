import { useEffect } from 'react';
import { db } from '../db/db';
import { requestReport } from './useReports';
import { startOfDay, subDays, startOfMonth, startOfWeek, endOfDay, isSameDay } from 'date-fns';

function createPayload(logs) {
  return JSON.stringify(logs.map(l => ({
    activity: l.activity,
    time: `${new Date(l.start_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - ${new Date(l.end_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`,
    date: new Date(l.start_time).toLocaleDateString()
  })), null, 2);
}

export function useAutoReportGenerator() {
  useEffect(() => {
    // Fulfilling user request to wipe job queue: 
    db.llm_jobs.clear().catch(console.error);

    const checkAndGenerate = async () => {
      const now = new Date();
      
      // 1. YESTERDAY'S DAILY (Generated today after midnight)
      const yesterday = subDays(startOfDay(now), 1);
      
      const dailyReports = await db.reports.where('type').equals('daily_report').toArray();
      const dailyJobs = await db.llm_jobs.where('type').equals('daily_report').filter(j => j.status !== 'failed').toArray();
      
      const hasDaily = dailyReports.some(r => isSameDay(new Date(r.start_date || r.created_at), yesterday)) || 
                       dailyJobs.some(j => isSameDay(new Date(j.meta?.start_date), yesterday));
      
      if (!hasDaily) {
         const logs = await db.logs.where('start_time').between(yesterday.getTime(), endOfDay(yesterday).getTime()).toArray();
         if (logs.length > 0) {
            await requestReport(createPayload(logs), 'daily_report', { start_date: yesterday.toISOString() });
         }
      }

      // 2. LAST WEEK'S WEEKLY (Generated Monday morning for last Mon-Sun)
      const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
      const lastWeekEnd = subDays(currentWeekStart, 1); // Last Sunday 23:59
      const lastWeekStart = subDays(currentWeekStart, 7); // Last Monday 00:00
      
      const weeklyReports = await db.reports.where('type').equals('weekly_report').toArray();
      const weeklyJobs = await db.llm_jobs.where('type').equals('weekly_report').filter(j => j.status !== 'failed').toArray();
      
      const hasWeekly = weeklyReports.some(r => isSameDay(new Date(r.start_date || r.created_at), lastWeekEnd)) || 
                        weeklyJobs.some(j => isSameDay(new Date(j.meta?.start_date), lastWeekEnd));

      if (!hasWeekly) {
         const logs = await db.logs.where('start_time').between(lastWeekStart.getTime(), endOfDay(lastWeekEnd).getTime()).toArray();
         if (logs.length > 0) {
            await requestReport(createPayload(logs), 'weekly_report', { start_date: lastWeekEnd.toISOString() });
         }
      }

      // 3. LAST MONTH'S MONTHLY (Generated 1st of month for last month)
      const currentMonthStart = startOfMonth(now);
      const lastMonthEnd = subDays(currentMonthStart, 1); // Last day of last month
      const lastMonthStart = startOfMonth(lastMonthEnd);
      
      const monthlyReports = await db.reports.where('type').equals('monthly_report').toArray();
      const monthlyJobs = await db.llm_jobs.where('type').equals('monthly_report').filter(j => j.status !== 'failed').toArray();
      
      const hasMonthly = monthlyReports.some(r => isSameDay(new Date(r.start_date || r.created_at), lastMonthEnd)) || 
                         monthlyJobs.some(j => isSameDay(new Date(j.meta?.start_date), lastMonthEnd));

      if (!hasMonthly) {
         const logs = await db.logs.where('start_time').between(lastMonthStart.getTime(), endOfDay(lastMonthEnd).getTime()).toArray();
         if (logs.length > 0) {
            await requestReport(createPayload(logs), 'monthly_report', { start_date: lastMonthEnd.toISOString() });
         }
      }
    };
    
    checkAndGenerate();
    // Re-check every 30 minutes to catch midnight rollovers while app is left open
    const intervalId = setInterval(checkAndGenerate, 30 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);
}
