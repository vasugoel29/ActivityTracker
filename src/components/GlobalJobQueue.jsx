import React from 'react';
import { useSupabase } from '../hooks/useSupabase';
import { RefreshCw } from 'lucide-react';
import { format, addDays } from 'date-fns';

export function GlobalJobQueue() {
   // Fetch all jobs not marked strictly as finalized
   const jobs = useSupabase('llm_jobs', q => q.neq('status', 'completed')) || [];
   
   // Keep failed jobs suppressed from this active global counter
   const activeJobs = jobs.filter(j => j.status !== 'failed');
   
   if (activeJobs.length === 0) return null;

   const formatJob = (job) => {
      const type = job.type;
      const date = job.meta?.start_date ? new Date(job.meta.start_date) : new Date(job.created_at || Date.now());
      if (type === 'daily_report') return `Daily (${format(date, 'MMM d')})`;
      if (type === 'weekly_report') return `Weekly (${format(date, 'MMM d')}-${format(addDays(date, 6), 'MMM d')})`;
      if (type === 'monthly_report') return `Monthly (${format(date, 'MMMM yyyy')})`;
      return 'Processing';
   };

   let jobLabels = activeJobs.map(formatJob).join(', ');
   if (activeJobs.length > 2) {
      jobLabels = `${activeJobs.length} Jobs (${activeJobs[0].type.split('_')[0]}...)`;
   }

   return (
       <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-[#12121A]/80 backdrop-blur-md border border-[#818cf8]/40 text-white rounded-full px-5 py-2.5 shadow-[0_5px_20px_rgba(129,140,248,0.25)] flex items-center gap-3 animate-in slide-in-from-top-4 font-bold text-[11px] tracking-widest uppercase pointer-events-none whitespace-nowrap">
          <RefreshCw size={14} className="text-[#818cf8] animate-spin shrink-0" />
          <span>Processing: {jobLabels}</span>
       </div>
   );
}
