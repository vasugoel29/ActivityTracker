import React from 'react';
import { useSupabase } from '../hooks/useSupabase';
import { RefreshCw } from 'lucide-react';

export function GlobalJobQueue() {
   // Fetch all jobs not marked strictly as finalized
   const jobs = useSupabase('llm_jobs', q => q.neq('status', 'completed')) || [];
   
   // Keep failed jobs suppressed from this active global counter
   const activeJobs = jobs.filter(j => j.status !== 'failed');
   
   if (activeJobs.length === 0) return null;

   return (
       <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-[#12121A]/80 backdrop-blur-md border border-[#818cf8]/40 text-white rounded-full px-5 py-2.5 shadow-[0_5px_20px_rgba(129,140,248,0.25)] flex items-center gap-3 animate-in slide-in-from-top-4 font-bold text-[11px] tracking-widest uppercase pointer-events-none">
          <RefreshCw size={14} className="text-[#818cf8] animate-spin" />
          <span>{activeJobs.length} AI Inference{activeJobs.length > 1 ? 's' : ''} Processing</span>
       </div>
   );
}
