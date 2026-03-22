import React, { useState } from 'react';
import { useReportsByType, useJobsByType, requestReport } from '../hooks/useReports';
import { buildReportPayload } from '../utils/payloadBuilder';
import { Bot, RefreshCw, AlertCircle, Clock, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, isSameDay, startOfDay, endOfDay, addDays, startOfWeek, endOfWeek, subMonths, addMonths } from 'date-fns';
import { useToast } from './Toaster';
import { motion } from 'framer-motion';
import { supabase } from '../db/supabase';

export function Reports() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('daily_report');
  const [currentDate, setCurrentDate] = useState(new Date());

  const safeIsSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return false;
    return isSameDay(date1, date2);
  };
  
  const allReports = useReportsByType(activeTab) || [];
  const allJobs = useJobsByType(activeTab) || [];
  
  const latestReport = allReports.find(r => safeIsSameDay(r.start_date || r.created_at, currentDate));
  const activeJobs = allJobs.filter(j => j.status !== 'completed' && safeIsSameDay(j.meta?.start_date || j.created_at, currentDate));

  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'daily_report', label: 'Daily' },
    { id: 'weekly_report', label: 'Weekly' },
    { id: 'monthly_report', label: 'Monthly' }
  ];

  const lastRunTime = React.useRef(0);

  const handleGenerate = async () => {
    // Abuse protection: Rate limit Force Run to 1 request per 30 seconds
    if (Date.now() - lastRunTime.current < 30000) {
       toast.error("Rate limit active: Please wait 30 seconds before forcing another run.");
       return;
    }
    lastRunTime.current = Date.now();

    setLoading(true);
    let payload = `Triggered manual ${activeTab} analysis request for period ending ${currentDate.toLocaleDateString()}.`;
    
    let start, end;
    if (activeTab === 'daily_report') {
       start = startOfDay(currentDate).getTime();
       end = endOfDay(currentDate).getTime();
    } else if (activeTab === 'weekly_report') {
       start = startOfWeek(currentDate, { weekStartsOn: 1 }).getTime();
       end = endOfWeek(currentDate, { weekStartsOn: 1 }).getTime();
    } else if (activeTab === 'monthly_report') {
       start = startOfMonth(currentDate).getTime();
       end = endOfMonth(currentDate).getTime();
    }
    try {
      const result = await buildReportPayload(start, end);
      payload = result.payload;
      
      if (result.isEmpty) {
        toast.error('No activities or logs for this period to analyze.');
        return;
      }
      
      const failedIds = activeJobs.filter(j => j.status === 'failed').map(j => j.id);
      if (failedIds.length > 0) {
         await supabase.from('llm_jobs').delete().in('id', failedIds);
      }
      
      await requestReport(payload, activeTab, { start_date: currentDate.toISOString() });
      toast.success(`${tabs.find(t => t.id === activeTab).label} Report generation queued! Check the Job Tracker.`);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to submit report parameters.');
    } finally {
      setLoading(false);
    }
  };

  const isGenerating = activeJobs.some(j => j.status === 'pending' || j.status === 'processing') || loading;

  const renderDateLabel = (dateStr, type) => {
      if (!dateStr) return 'Active Period';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Active Period';
      
      try {
          if (type === 'daily_report') return format(d, 'EEEE, MMM do');
          if (type === 'weekly_report') {
              const dStart = startOfWeek(d, { weekStartsOn: 1 });
              const dEnd = endOfWeek(d, { weekStartsOn: 1 });
              if (dStart.getMonth() === dEnd.getMonth()) {
                  return `${format(dStart, 'd')} - ${format(dEnd, 'd MMM')}`;
              } else {
                  return `${format(dStart, 'd MMM')} - ${format(dEnd, 'd MMM')}`;
              }
          }
          if (type === 'monthly_report') return format(d, 'MMMM yyyy');
          return format(d, 'MMM do, yyyy');
      } catch (e) {
          return 'Analysis Period';
      }
  };

  const isToday = isSameDay(currentDate, new Date());

  // Graphical Text Parser
  const parseReportContent = (content) => {
    try {
      if (!content || typeof content !== 'string') return { pillars: [], textLines: [], discoveredScore: null };

      const textLines = [];
      const pillars = [];
      let discoveredScore = null;
      
      const scoreMatch = content.match(/Life Score[\s\S]*?(\d+)/i);
      if (scoreMatch) discoveredScore = parseInt(scoreMatch[1], 10);
      
      let skipNext = false;
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (skipNext) { 
           skipNext = false; 
           continue; 
        }
        
        let line = lines[i].trim();
        if (!line) continue;
        
        if (line.match(/^\*?\s*\*?(Daily|Weekly|Monthly)\s+Life\s+(Report|Audit)\b/i)) continue;
        if (line.match(/^#+\s*Life Score/i)) {
           if (lines[i+1]?.trim().match(/^\d+/)) skipNext = true; 
           continue;
        }
        if (line.match(/^#+\s*Pillar (Breakdown|Averages|Scores)/i)) continue;
        
        const pillarMatch = line.match(/^[-*]\s*(Health|Wealth|Work|Spiritual|Relationships):\s*(\d+)[^0-9]?\/?10[:\-\.\s\(]*(.*?)\)*$/i);
        if (pillarMatch) {
           pillars.push({
              name: pillarMatch[1],
              score: parseInt(pillarMatch[2], 10),
              note: pillarMatch[3] ? pillarMatch[3].replace(/\)$/, '').trim() : ''
           });
           continue;
        }
        
        textLines.push(line);
      }
      return { pillars, textLines, discoveredScore };
    } catch (e) {
      console.error(e);
      return { pillars: [], textLines: [content || ''], discoveredScore: null };
    }
  };

  const parsed = latestReport && latestReport.content ? parseReportContent(latestReport.content) : null;
  const displayScore = (parsed && parsed.discoveredScore !== null) ? parsed.discoveredScore : (latestReport?.score || 0);

  return (
    <div className="space-y-6 pt-4 px-2 pb-6">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">AI Reports</h1>
        <button 
           onClick={handleGenerate}
           disabled={isGenerating}
           className="bg-[#818cf8]/10 hover:bg-[#818cf8]/20 text-[#818cf8] px-3 py-2 rounded-xl text-sm font-bold border border-[#818cf8]/20 transition-colors disabled:opacity-50 disabled:cursor-wait flex items-center gap-2 shrink-0"
        >
           {isGenerating ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
           Force Run
        </button>
      </header>

      <div className="flex bg-[#12121A] p-1 rounded-xl mb-4 border border-gray-800 shadow-sm">
        {tabs.map(tab => (
           <button 
             key={tab.id}
             onClick={() => setActiveTab(tab.id)}
             className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-colors ${activeTab === tab.id ? 'bg-[#818cf8]/20 text-[#818cf8]' : 'text-gray-500 hover:text-gray-300'}`}
           >
             {tab.label}
           </button>
        ))}
      </div>

      <div className="flex justify-between items-center mb-6 bg-[#0B0B0F] border border-gray-800 rounded-2xl p-2 shadow-inner">
        <button onClick={() => {
            if (activeTab === 'weekly_report') setCurrentDate(subDays(currentDate, 7));
            else if (activeTab === 'monthly_report') setCurrentDate(subMonths(currentDate, 1));
            else setCurrentDate(subDays(currentDate, 1));
        }} className="p-2 text-gray-400 hover:text-white transition rounded-xl hover:bg-gray-800/50">
           <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-0.5">Target Period</p>
          <p className="text-sm font-bold text-gray-200">{renderDateLabel(currentDate.toISOString(), activeTab)}</p>
        </div>
        <button 
           onClick={() => {
              let nextD;
              if (activeTab === 'weekly_report') nextD = addDays(currentDate, 7);
              else if (activeTab === 'monthly_report') nextD = addMonths(currentDate, 1);
              else nextD = addDays(currentDate, 1);
              
              if (nextD > new Date()) nextD = new Date();
              setCurrentDate(nextD);
           }} 
           disabled={isToday}
           className={`p-2 transition rounded-xl ${isToday ? 'text-gray-800 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
        >
           <ChevronRight size={20} />
        </button>
      </div>

      {activeJobs.length > 0 && (
          <div className="space-y-3 mb-6 animate-in fade-in slide-in-from-top-2">
             {activeJobs.map(job => (
                <div key={job.id} className={`flex items-center gap-3 p-4 rounded-2xl border ${job.status === 'failed' ? 'bg-red-950/20 border-red-900/50' : 'bg-[#12121A] border-gray-800'} shadow-sm`}>
                   {job.status === 'pending' && <Clock size={18} className="text-yellow-500" />}
                   {job.status === 'processing' && <RefreshCw size={18} className="text-[#818cf8] animate-spin" />}
                   {job.status === 'failed' && <AlertCircle size={18} className="text-red-400" />}
                   
                   <div className="flex-1">
                      <p className="text-sm font-bold text-white uppercase tracking-widest">{job.status}</p>
                      <p className="text-xs text-gray-500">
                         For {renderDateLabel(job.meta?.start_date || job.created_at, job.type)}
                      </p>
                   </div>
                </div>
             ))}
          </div>
      )}

      {latestReport && parsed ? (
        <div className="bg-[#12121A] border border-[#818cf8]/20 rounded-3xl p-6 shadow-lg relative mt-2 animate-in fade-in slide-in-from-bottom-2 isolate overflow-hidden">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#818cf8]/5 rounded-full blur-3xl -mr-20 -mt-20 -z-10 pointer-events-none"></div>
          
          <div className="flex justify-between items-end mb-8 border-b border-gray-800/60 pb-5">
             <div>
                 <span className="text-[11px] text-[#818cf8] uppercase tracking-widest font-black mb-1.5 block">Analyzed Period</span>
                 <span className="text-2xl font-black text-white tracking-tight">
                     {renderDateLabel(latestReport.start_date, latestReport.type)}
                 </span>
             </div>
             <div className="text-right">
                 <span className="text-gray-500 font-bold text-[10px] uppercase tracking-widest block mb-0.5">Life Score</span>
                 <span className="text-5xl font-black text-white leading-none tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(129,140,248,0.2)]">{displayScore}</span>
             </div>
          </div>

          {parsed.pillars.length > 0 && (
            <div className="grid grid-cols-1 gap-4 mb-8 relative z-10">
               {parsed.pillars.map(p => {
                  const percentage = Math.min(100, Math.max(0, p.score * 10));
                  let colorClass = 'bg-[#818cf8] shadow-[0_0_10px_rgba(129,140,248,0.3)]'; 
                  let textColor = 'text-[#818cf8]';
                  
                  if (p.score <= 3) {
                      colorClass = 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]';
                      textColor = 'text-red-400';
                  } else if (p.score <= 5) {
                      colorClass = 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]';
                      textColor = 'text-amber-400';
                  } else if (p.score >= 8) {
                      colorClass = 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]';
                      textColor = 'text-emerald-400';
                  }
                  
                  return (
                    <div key={p.name} className="bg-[#0B0B0F]/80 border border-gray-800/80 rounded-2xl p-4 transition-all hover:bg-[#0B0B0F]/100">
                       <div className="flex justify-between items-end mb-3">
                          <span className="font-extrabold text-white text-sm uppercase tracking-widest">{p.name}</span>
                          <span className={`font-black text-xl tabular-nums leading-none ${textColor}`}>{p.score}<span className="text-gray-600 text-sm">/10</span></span>
                       </div>
                       
                       <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden mb-3">
                          <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${percentage}%` }} 
                            transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }}
                            className={`h-full rounded-full ${colorClass}`}
                          />
                       </div>
                       
                       {p.note && <p className="text-xs text-gray-400 leading-relaxed font-medium">{p.note}</p>}
                    </div>
                  );
               })}
            </div>
          )}

          <div className="space-y-1 relative z-10 pr-2">
              {parsed.textLines.map((line, i) => {
                 if (line.match(/^#+\s+(.*)/)) {
                     const headerText = line.match(/^#+\s+(.*)/)[1];
                     return (
                        <h3 key={i} className="font-black text-white text-md mt-7 mb-3 uppercase tracking-widest text-[#818cf8]">
                           {headerText.replace(/\*/g, '')}
                        </h3>
                     );
                 }
                 if (line.startsWith('-') || line.startsWith('*')) {
                     return (
                        <div key={i} className="flex gap-3 mb-2.5 items-start">
                           <div className="w-1.5 h-1.5 rounded-full bg-[#818cf8]/50 mt-2 shrink-0"></div>
                           <p className="text-gray-300 text-[15px] font-medium leading-relaxed">
                              {line.replace(/^[-*]\s*/, '').replace(/\*/g, '')}
                           </p>
                        </div>
                     );
                 }
                 if (line.match(/^\d+\./)) {
                     return (
                        <div key={i} className="flex gap-3 mt-4 mb-3 p-4 bg-gray-900/30 border border-gray-800/50 rounded-xl items-start">
                           <span className="font-black text-[#818cf8] text-lg leading-none shrink-0">{line.match(/^(\d+\.)/)[1]}</span>
                           <span className="text-gray-200 text-[15px] font-medium leading-relaxed">
                              {line.replace(/^\d+\.\s*/, '').replace(/\*/g, '')}
                           </span>
                        </div>
                     );
                 }
                 return <p key={i} className="text-[14px] text-gray-400 font-medium leading-relaxed mb-3">{line.replace(/\*/g, '')}</p>
              })}
          </div>
        </div>
      ) : (
        activeJobs.length === 0 && (
            <div className="bg-[#12121A] border border-gray-800 rounded-3xl p-10 flex flex-col items-center justify-center text-center mt-6 animate-in fade-in zoom-in-95">
                <div className="w-16 h-16 bg-[#0B0B0F] rounded-full flex items-center justify-center mb-4 border border-gray-800 ring-1 ring-white/5">
                    <Bot size={28} className="text-gray-500" />
                </div>
                <h3 className="text-white font-bold mb-2 text-lg">No {tabs.find(t => t.id === activeTab).label} Reports</h3>
                <p className="text-gray-500 text-sm max-w-[200px] mt-1">
                   {isToday ? 'Reports automatically generate at midnight' : 'No retroactive analysis found for this date.'}
                </p>
            </div>
        )
      )}
    </div>
  );
}
