import React, { useState, useMemo } from 'react';
import { useReportsByType, useJobsByType, requestReport } from '../hooks/useReports';
import { buildReportPayload } from '../utils/payloadBuilder';
import { 
  Bot, RefreshCw, AlertCircle, Clock, ChevronLeft, 
  ChevronRight, Zap, Target, TrendingUp, TrendingDown, 
  ShieldCheck, AlertTriangle, Lightbulb, Compass,
  Heart, Wallet, Briefcase, Sparkles, Users,
  CheckCircle2, Circle
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, isSameDay, startOfDay, endOfDay, addDays, startOfWeek, endOfWeek, subMonths, addMonths, formatISO, eachDayOfInterval } from 'date-fns';
import { useToast } from './Toaster';
import { useHabitLogs, useHabits } from '../hooks/useHabits';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../db/supabase';

const PILLAR_ICONS = {
  Health: <Heart size={16} />,
  Finances: <Wallet size={16} />,
  Work: <Briefcase size={16} />,
  Spiritual: <Sparkles size={16} />,
  Social: <Users size={16} />
};

const PILLAR_COLORS = {
  Health: 'from-emerald-500 to-teal-600',
  Finances: 'from-amber-400 to-orange-500',
  Work: 'from-blue-500 to-indigo-600',
  Spiritual: 'from-purple-500 to-pink-600',
  Social: 'from-rose-500 to-red-600'
};

function HabitContinuityGrid({ startDate, endDate, type }) {
  const habits = useHabits() || [];
  const logs = useHabitLogs() || [];
  
  const days = useMemo(() => {
    try {
      return eachDayOfInterval({ start: new Date(startDate), end: new Date(endDate) });
    } catch {
      return [];
    }
  }, [startDate, endDate]);

  if (!habits || habits.length === 0 || days.length === 0) return null;

  return (
    <div className="glass-panel p-8 rounded-[32px] overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-[#818cf8]/5 to-transparent opacity-30 group-hover:opacity-60 transition-opacity"></div>
      <div className="relative z-10 space-y-6">
        <div className="flex items-center justify-between gap-4">
           <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">
             {type === 'monthly_report' ? 'Monthly Continuity Audit' : 'Weekly Continuity Audit'}
           </h3>
           {days.length > 7 && (
             <span className="text-[9px] font-bold text-[#818cf8]/60 uppercase tracking-widest animate-pulse">Scroll to View →</span>
           )}
        </div>

        <div className="overflow-x-auto pb-2 -mx-2 px-2 scrollbar-premium">
          <div className="min-w-max space-y-4">
            {/* Header Row: Days */}
            <div className="flex items-center gap-6">
              <div className="w-32 shrink-0 sticky left-0 z-20 bg-[#12121A]/80 backdrop-blur-md rounded-lg"></div>
              <div className="flex gap-1.5 px-2">
                {days.map(d => (
                  <div key={d.toISOString()} className="w-9 flex flex-col items-center gap-1">
                    <span className="text-[9px] font-black text-gray-600 uppercase">
                      {format(d, 'eeeee')}
                    </span>
                    <span className="text-[8px] font-bold text-gray-700">
                      {format(d, 'd')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Habit Rows */}
            <div className="space-y-3">
              {habits.map(habit => (
                <div key={habit.id} className="flex items-center gap-6 group/row">
                  <div className="w-32 shrink-0 sticky left-0 z-20 bg-[#12121A]/90 backdrop-blur-md px-3 py-2 rounded-xl border border-white/5 shadow-xl">
                    <span className="text-sm font-bold text-gray-400 group-hover/row:text-white transition-colors truncate block">
                      {habit.name}
                    </span>
                  </div>
                  <div className="flex gap-1.5 shrink-0 px-2">
                    {days.map(day => {
                      const dayLog = logs?.find(l => l.habit_id === habit.id && isSameDay(new Date(l.date_string), day));
                      const isDone = !!dayLog;
                      const isPartial = dayLog && habit.target_value && (dayLog.value < habit.target_value);

                      return (
                        <motion.div
                          key={day.toISOString()}
                          initial={false}
                          animate={{ 
                            backgroundColor: isDone ? '#818cf8' : 'rgba(255,255,255,0.03)',
                            opacity: isPartial ? 0.45 : 1,
                            boxShadow: (isDone && !isPartial) ? '0 0 12px rgba(129,140,248,0.5)' : 'none'
                          }}
                          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all border border-white/5"
                        >
                          {isDone && (
                            <CheckCircle2 
                              size={16} 
                              className={isPartial ? 'text-white/60' : 'text-white'} 
                            />
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Reports() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('daily_report');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [selectedPillar, setSelectedPillar] = useState(null);

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

  const tabs = [
    { id: 'daily_report', label: 'Daily', icon: <Target size={14} /> },
    { id: 'weekly_report', label: 'Weekly', icon: <Compass size={14} /> },
    { id: 'monthly_report', label: 'Monthly', icon: <TrendingUp size={14} /> }
  ];

  const handleGenerate = async () => {
    setLoading(true);
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
      if (result.isEmpty) {
        toast.error('No activities or logs for this period to analyze.');
        return;
      }
      
      const failedIds = activeJobs.filter(j => j.status === 'failed').map(j => j.id);
      if (failedIds.length > 0) {
         await supabase.from('llm_jobs').delete().in('id', failedIds);
      }
      
      await requestReport(result.payload, activeTab, { start_date: formatISO(currentDate) });
      toast.success(`${tabs.find(t => t.id === activeTab).label} analysis queued!`);
    } catch (error) {
      toast.error(error.message || 'Failed to submit analysis.');
    } finally {
      setLoading(false);
    }
  };

  const isGenerating = activeJobs.some(j => j.status === 'pending' || j.status === 'processing') || loading;

  const parsed = useMemo(() => {
    if (!latestReport?.content) return null;
    const content = latestReport.content;
    const pillars = [];
    const textLines = [];
    let discoveredScore = null;

    // Extract Score
    const scoreMatch = content.match(/Life Score[:\s]*(\d+)/i);
    if (scoreMatch) discoveredScore = parseInt(scoreMatch[1], 10);

    // Extract Weekly Rhythm (New Section)
    const rhythmSectionRegex = /## Weekly Rhythm([\s\S]*?)(##|$)/i;
    const rhythmSectionMatch = content.match(rhythmSectionRegex);
    const weeklyRhythm = { peak: '', friction: '' };
    if (rhythmSectionMatch) {
       const rhythmLines = rhythmSectionMatch[1].trim().split('\n');
       rhythmLines.forEach(line => {
          if (line.match(/Peak Performance:/i)) weeklyRhythm.peak = line.replace(/.*Peak Performance:\s*/i, '').trim();
          if (line.match(/Critical Friction:/i)) weeklyRhythm.friction = line.replace(/.*Critical Friction:\s*/i, '').trim();
       });
    }

    const lines = content.split('\n');
    let currentSection = null;

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      // Structured Pillar Analysis Parsing
      if (line.match(/^###\s*(Health|Wealth|Finances|Work|Spiritual|Relationships|Social)/i)) {
          const nameMatch = line.match(/^###\s*(Health|Wealth|Finances|Work|Spiritual|Relationships|Social)/i);
          let name = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1).toLowerCase();
          if (name === 'Wealth') name = 'Finances';
          if (name === 'Relationships') name = 'Social';
          
          const currentPillar = {
             name,
             score: 0,
             note: '',
             calculation: '',
             metrics: '',
             process: ''
          };

          // Look ahead to find details for this pillar
          let j = lines.indexOf(line) + 1;
          while (j < lines.length && !lines[j].startsWith('###') && !lines[j].startsWith('##')) {
             const subLine = lines[j].trim();
             if (subLine.match(/^Score:\s*(\d+)/i)) currentPillar.score = parseInt(subLine.match(/(\d+)/)[1]);
             if (subLine.match(/^Summary:\s*(.*)/i)) currentPillar.note = subLine.replace(/^Summary:\s*/i, '').trim();
             if (subLine.match(/^Calculation:\s*(.*)/i)) currentPillar.calculation = subLine.replace(/^Calculation:\s*/i, '').trim();
             if (subLine.match(/^Metrics:\s*(.*)/i)) currentPillar.metrics = subLine.replace(/^Metrics:\s*/i, '').trim();
             if (subLine.match(/^Process:\s*(.*)/i)) currentPillar.process = subLine.replace(/^Process:\s*/i, '').trim();
             j++;
          }
          pillars.push(currentPillar);
          continue;
      }

      // Legacy fallback parsing for older reports
      const pillarMatch = line.match(/^[-*]\s*(Health|Wealth|Finances|Work|Spiritual|Relationships|Social):\s*(\d+)[^0-9]?\/10\s*[|:-]\s*(.*)$/i);
      if (pillarMatch) {
         let name = pillarMatch[1].charAt(0).toUpperCase() + pillarMatch[1].slice(1).toLowerCase();
         if (name === 'Wealth') name = 'Finances';
         if (name === 'Relationships') name = 'Social';

         pillars.push({
            name: name,
            score: parseInt(pillarMatch[2], 10),
            note: pillarMatch[3] ? pillarMatch[3].replace(/\)*$/, '').replace(/^\(/, '').trim() : ''
         });
         continue;
      }

      // Handle Sections (Aligned with worker.js prompts)
      if (line.match(/^#+\s*(Strategic )?Strengths/i)) { currentSection = 'strengths'; continue; }
      if (line.match(/^#+\s*(Critical )?Weaknesses/i)) { currentSection = 'weaknesses'; continue; }
      if (line.match(/^#+\s*Cross-Domain Insights/i)) { currentSection = 'insights'; continue; }
      if (line.match(/^#+\s*(High-Impact Recommendations|Recommendations|Suggestions)/i)) { currentSection = 'recommendations'; continue; }
      if (line.match(/^#+\s*(Summary|Executive Summary)/i)) { currentSection = 'summary'; continue; }

      textLines.push({ section: currentSection, text: line });
    }

    return { pillars, textLines, weeklyRhythm, score: discoveredScore || latestReport.score || 0 };
  }, [latestReport]);
  

  const renderDateLabel = (dateStr, type) => {
    if (!dateStr) return 'Active Period';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Active Period';
    if (type === 'daily_report') return format(d, 'EEEE, MMM do');
    if (type === 'weekly_report') {
        const dStart = startOfWeek(d, { weekStartsOn: 1 });
        const dEnd = endOfWeek(d, { weekStartsOn: 1 });
        return `${format(dStart, 'd MMM')} - ${format(dEnd, 'd MMM')}`;
    }
    if (type === 'monthly_report') return format(d, 'MMMM yyyy');
    return format(d, 'MMM do, yyyy');
  };

  const isToday = safeIsSameDay(currentDate, new Date());

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6 pb-20 space-y-10">
      {/* Centered Header Section */}
      <header className="flex flex-col items-center text-center space-y-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-white tracking-tighter glow-text-primary">Life Audit</h1>
          <p className="text-gray-500 font-medium text-sm flex items-center justify-center gap-2">
            <Bot size={14} className="text-[#818cf8]" /> Powered by AI Systems
          </p>
        </div>
        <button 
           onClick={handleGenerate}
           disabled={isGenerating}
           className="relative group overflow-hidden bg-[#818cf8] hover:bg-[#818cf8]/90 text-white px-8 py-3 rounded-2xl text-sm font-black transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-500/25"
        >
           {isGenerating ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
           <span>{isGenerating ? 'Analyzing...' : 'Generate New Audit'}</span>
           <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
        </button>
      </header>

      {/* Tabs & Controls - Explicitly Centered */}
      <div className="space-y-4 max-w-2xl mx-auto w-full">
        <div className="flex bg-[#12121A] p-1.5 rounded-2xl border border-white/5 shadow-inner">
          {tabs.map(tab => (
             <button 
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black rounded-xl transition-all ${activeTab === tab.id ? 'bg-[#818cf8]/10 text-[#818cf8] shadow-sm border border-[#818cf8]/20' : 'text-gray-500 hover:text-gray-300'}`}
             >
               {tab.icon}
               {tab.label}
             </button>
          ))}
        </div>

        <div className="flex justify-between items-center glass-panel rounded-2xl p-2 h-14">
          <button onClick={() => {
              if (activeTab === 'weekly_report') setCurrentDate(subDays(currentDate, 7));
              else if (activeTab === 'monthly_report') setCurrentDate(subMonths(currentDate, 1));
              else setCurrentDate(subDays(currentDate, 1));
          }} className="p-3 text-gray-400 hover:text-white transition rounded-xl hover:bg-white/5">
             <ChevronLeft size={20} />
          </button>
          
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentDate.toISOString() + activeTab}
              initial={{ y: 5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -5, opacity: 0 }}
              className="text-center"
            >
              <p className="text-[10px] font-black text-[#818cf8] uppercase tracking-[0.2em] mb-0.5">Analysis Period</p>
              <p className="text-sm font-bold text-gray-200">{renderDateLabel(currentDate, activeTab)}</p>
            </motion.div>
          </AnimatePresence>

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
             className={`p-3 transition rounded-xl ${isToday ? 'opacity-20 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
             <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Active Jobs Tracker */}
      <AnimatePresence>
        {activeJobs.map(job => (
          <motion.div 
            key={job.id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden max-w-2xl mx-auto w-full"
          >
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#818cf8]/5 border border-[#818cf8]/20 mb-4">
              <RefreshCw size={18} className="text-[#818cf8] animate-spin" />
              <div className="flex-1">
                <p className="text-xs font-black text-white uppercase tracking-widest">Audit in Progress</p>
                <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                  <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="w-1/2 h-full bg-[#818cf8]"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Main Report Content - Centered Symmetry */}
      {parsed ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          {/* Centered Life Score & Summary Card */}
          <div className="glass-panel rounded-[40px] p-10 relative overflow-hidden text-center group">
            <div className="absolute top-0 inset-x-0 mx-auto w-64 h-64 bg-[#818cf8]/10 rounded-full blur-[80px] -mt-32"></div>
            
            <div className="flex flex-col items-center gap-8 relative z-10">
              {/* Score Indicator */}
              <div className="relative w-48 h-48 shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="85"
                    fill="none"
                    stroke="rgba(255,255,255,0.03)"
                    strokeWidth="14"
                  />
                  <motion.circle
                    cx="96"
                    cy="96"
                    r="85"
                    fill="none"
                    stroke="#818cf8"
                    strokeWidth="14"
                    strokeDasharray={534}
                    initial={{ strokeDashoffset: 534 }}
                    animate={{ strokeDashoffset: 534 - (534 * parsed.score) / 100 }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_15px_rgba(129,140,248,0.4)]"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-black text-white tracking-tighter glow-text-primary">{parsed.score}</span>
                  <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest mt-1">Life Score</span>
                </div>
              </div>

              {/* Summary Text */}
              <div className="space-y-4 max-w-2xl px-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[#818cf8] text-[11px] font-black uppercase tracking-[0.25em]">
                  Executive Summary
                </div>
                <p className="text-2xl font-bold text-gray-100 leading-snug">
                  {parsed.textLines.find(l => l.section === 'summary')?.text.replace(/\*/g, '') || "Analyzing your system trajectory..."}
                </p>
              </div>
            </div>
          </div>

          {/* Weekly Rhythm - Dynamic Strategic Insights for Non-Daily Reports */}
          {activeTab !== 'daily_report' && parsed.weeklyRhythm && (parsed.weeklyRhythm.peak || parsed.weeklyRhythm.friction) && (
            <motion.div 
               initial={{ opacity: 0, y: 15 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.2 }}
               className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
               <div className="glass-panel p-8 rounded-[32px] bg-emerald-500/[0.02] border-emerald-500/20 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="flex items-center gap-4 mb-4 relative z-10">
                     <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-900/20">
                        <TrendingUp size={20} />
                     </div>
                     <p className="text-[12px] font-black text-emerald-400 uppercase tracking-[0.25em]">Peak Performance</p>
                  </div>
                  <p className="text-xl font-bold text-emerald-50/90 leading-tight relative z-10">
                     {parsed.weeklyRhythm.peak || "Analyzing peak trajectory..."}
                  </p>
               </div>

               <div className="glass-panel p-8 rounded-[32px] bg-rose-500/[0.02] border-rose-500/20 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-rose-500/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="flex items-center gap-4 mb-4 relative z-10">
                     <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-900/20">
                        <TrendingDown size={20} />
                     </div>
                     <p className="text-[12px] font-black text-rose-400 uppercase tracking-[0.25em]">Critical Friction</p>
                  </div>
                  <p className="text-xl font-bold text-rose-50/90 leading-tight relative z-10">
                     {parsed.weeklyRhythm.friction || "Identifying systemic friction..."}
                  </p>
               </div>
            </motion.div>
          )}

          {/* Weekly Habit Continuity - Only for Non-Daily Reports */}
          {activeTab !== 'daily_report' && (
            <motion.div 
               initial={{ opacity: 0, scale: 0.98 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ delay: 0.3 }}
            >
               <HabitContinuityGrid 
                  startDate={activeTab === 'weekly_report' ? startOfWeek(currentDate, { weekStartsOn: 1 }) : startOfMonth(currentDate)}
                  endDate={activeTab === 'weekly_report' ? endOfWeek(currentDate, { weekStartsOn: 1 }) : endOfMonth(currentDate)}
                  type={activeTab}
               />
            </motion.div>
          )}

          {/* Pillars Grid - Standardized & Improved Metrics */}
          {/* Pillars Grid - Vertically Organized for Clarity */}
          <div className="grid grid-cols-1 gap-6">
            {Object.keys(PILLAR_COLORS).map((pillarName, i) => {
              const p = parsed.pillars.find(x => x.name === pillarName) || { name: pillarName, score: 5, note: 'Insufficient data for active period.' };
              return (
                <motion.div 
                  key={pillarName}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedPillar(p)}
                  className="glass-panel p-8 rounded-[32px] group hover:border-[#818cf8]/50 transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-2 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-black text-[#818cf8] uppercase tracking-widest bg-[#818cf8]/10 px-2.5 py-1 rounded-full border border-[#818cf8]/20">Detailed Analysis</span>
                  </div>
                  <div className="space-y-6">
                    {/* Header Row: Icon, Title, and Score */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${PILLAR_COLORS[pillarName]} flex items-center justify-center text-white shadow-lg shadow-black/20 shrink-0`}>
                          {PILLAR_ICONS[pillarName]}
                        </div>
                        <p className="text-2xl font-black text-white uppercase tracking-tighter">
                          {pillarName}
                        </p>
                      </div>
                      <p className="text-3xl font-black text-white tracking-tighter">
                        {p.score}<span className="text-xs text-gray-600 ml-1 font-bold">/ 10</span>
                      </p>
                    </div>

                    {/* Progress Bar Row */}
                    <div className="h-2.5 w-full bg-gray-900 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${p.score * 10}%` }}
                        transition={{ duration: 1.2, delay: 0.3 + i * 0.1, ease: "easeOut" }}
                        className={`h-full bg-gradient-to-r ${PILLAR_COLORS[pillarName]}`}
                      />
                    </div>

                    {/* Analysis Note Row - Moving to bottom eliminates clutter */}
                    {p.note && (
                      <div className="pt-4 border-t border-white/5">
                        <p className="text-base font-medium text-gray-400 leading-relaxed italic opacity-90">
                          {p.note}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Insight Cards Section - Switch to 1-col for maximum legibility */}
          <div className="space-y-12">
            {/* Mirror Strengths & Weaknesses - Vertical Split for Breathing Room */}
            <div className="space-y-10">
              {/* Strengths */}
              <div className="space-y-5">
                <h3 className="flex items-center gap-2 text-[11px] font-black text-emerald-400 uppercase tracking-[0.2em] px-2">
                  <ShieldCheck size={14} /> Strategic Strengths
                </h3>
                <div className="space-y-4">
                  {parsed.textLines.filter(l => l.section === 'strengths').map((line, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                      className="glass-panel p-6 rounded-3xl border-emerald-500/10 bg-emerald-500/5"
                    >
                      <p className="text-[16px] font-semibold text-emerald-100 leading-relaxed">
                        {line.text.replace(/^[-*]\s*/, '').replace(/\*/g, '')}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Weaknesses */}
              <div className="space-y-5">
                <h3 className="flex items-center gap-2 text-[11px] font-black text-rose-400 uppercase tracking-[0.2em] px-2">
                  <AlertTriangle size={14} /> Critical Weaknesses
                </h3>
                <div className="space-y-4">
                  {parsed.textLines.filter(l => l.section === 'weaknesses').map((line, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                      className="glass-panel p-5 rounded-2xl border-rose-500/10 bg-rose-500/5"
                    >
                      <p className="text-[16px] font-semibold text-rose-100 leading-relaxed">
                        {line.text.replace(/^[-*]\s*/, '').replace(/\*/g, '')}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cross-Domain Insights Section - Full Width Centered */}
            <div className="space-y-5">
              <h3 className="flex items-center gap-2 text-[11px] font-black text-purple-400 uppercase tracking-[0.2em] px-2">
                <Lightbulb size={14} /> Cross-Domain Insights
              </h3>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="glass-panel rounded-[32px] p-10 bg-purple-500/5 border-purple-500/20 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-50"></div>
                <div className="space-y-8 relative z-10">
                  {parsed.textLines.filter(l => l.section === 'insights').map((line, i) => (
                    <div key={i} className="flex gap-6 items-start">
                      <div className="w-2 h-2 rounded-full bg-purple-500 mt-2.5 shrink-0 shadow-[0_0_10px_rgba(168,85,247,0.7)]"></div>
                      <p className="text-[17px] font-medium text-gray-200 leading-relaxed italic">
                        "{line.text.replace(/^[-*]\s*/, '').replace(/\*/g, '')}"
                      </p>
                    </div>
                  ))}
                  {parsed.textLines.filter(l => l.section === 'insights').length === 0 && (
                    <p className="text-gray-600 italic">Identifying patterns across your life systems...</p>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Recommendations - Clean List Layout */}
            <div className="space-y-6">
              <h3 className="flex items-center gap-2 text-[11px] font-black text-[#818cf8] uppercase tracking-[0.25em] px-2">
                <Compass size={14} /> Recommendations
              </h3>
              <div className="flex flex-col gap-5">
                {parsed.textLines.filter(l => l.section === 'recommendations').map((line, i) => (
                  <motion.div 
                    key={i}
                    whileHover={{ scale: 1.005, x: 5 }}
                    className="flex gap-6 p-6 bg-white/5 border border-white/10 rounded-[28px] items-start group transition-all hover:bg-white/10 hover:border-[#818cf8]/40"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#818cf8]/10 flex items-center justify-center text-[#818cf8] font-black text-sm shrink-0 border border-[#818cf8]/20 group-hover:bg-[#818cf8] group-hover:text-white transition-all shadow-lg shadow-black/20">
                      {i + 1}
                    </div>
                    <p className="text-lg font-bold text-gray-200 leading-relaxed mt-1">
                      {line.text.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '').replace(/\*/g, '')}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        !isGenerating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center space-y-4"
          >
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10 relative">
              <Bot size={40} className="text-gray-600" />
              <div className="absolute inset-0 rounded-full bg-[#818cf8]/5 blur-xl animate-pulse"></div>
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight">No Audit Found</h3>
            <p className="text-gray-500 max-w-sm text-sm font-medium leading-relaxed">
              {isToday 
                ? "Your system audit is usually generated at the end of the day. You can force an audit now." 
                : "No retroactive analysis found for this period."}
            </p>
            <button 
              onClick={handleGenerate}
              className="mt-6 px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-sm transition-all border border-white/10"
            >
              Start Analysis Now
            </button>
          </motion.div>
        )
      )}

      {/* Pillar Detail Modal */}
      <AnimatePresence>
        {selectedPillar && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center px-4 py-8 pointer-events-none"
          >
            <div className="absolute inset-0 bg-[#0A0A0F]/90 backdrop-blur-xl pointer-events-auto" onClick={() => setSelectedPillar(null)} />
            
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass-panel w-full max-w-2xl max-h-full overflow-y-auto rounded-[40px] border-[#818cf8]/30 relative z-10 pointer-events-auto"
            >
              <div className="p-10 space-y-10">
                {/* Modal Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${PILLAR_COLORS[selectedPillar.name]} flex items-center justify-center text-white shadow-xl`}>
                      {PILLAR_ICONS[selectedPillar.name]}
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-white tracking-tighter uppercase">{selectedPillar.name} Audit</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex gap-0.5">
                          {[...Array(10)].map((_, i) => (
                            <div 
                              key={i} 
                              className={`w-3 h-1 rounded-full ${i < selectedPillar.score ? PILLAR_COLORS[selectedPillar.name].split(' ')[1] : 'bg-white/5'}`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-black text-gray-500 uppercase tracking-widest">{selectedPillar.score} / 10 Integrity</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedPillar(null)}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-gray-400 hover:text-white transition-all shadow-inner"
                  >
                    <ChevronLeft size={24} className="rotate-90" />
                  </button>
                </div>

                <div className="space-y-8">
                  {/* Summary Section */}
                  <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 space-y-3">
                    <p className="text-[10px] font-black text-[#818cf8] uppercase tracking-[0.25em]">Strategic Summary</p>
                    <p className="text-xl font-bold text-gray-100 leading-relaxed italic">
                      "{selectedPillar.note || 'No high-level summary available.'}"
                    </p>
                  </div>

                  {/* Detailed Analysis Sections */}
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Target size={14} className="text-blue-400" />
                        <p className="text-[11px] font-black text-blue-400 uppercase tracking-widest">Calculation Logic</p>
                      </div>
                      <p className="text-[17px] font-medium text-gray-300 leading-relaxed pl-6 border-l-2 border-blue-400/20">
                        {selectedPillar.calculation || 'Analyzing algorithmic attribution... New reports will include detailed logic.'}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Zap size={14} className="text-amber-400" />
                        <p className="text-[11px] font-black text-amber-400 uppercase tracking-widest">Specific Metrics</p>
                      </div>
                      <p className="text-[17px] font-medium text-gray-300 leading-relaxed pl-6 border-l-2 border-amber-400/20">
                        {selectedPillar.metrics || 'Identifying data correlation points... New reports will include extracted metrics.'}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-purple-400" />
                        <p className="text-[11px] font-black text-purple-400 uppercase tracking-widest">Decision Process</p>
                      </div>
                      <p className="text-[17px] font-medium text-gray-300 leading-relaxed pl-6 border-l-2 border-purple-400/20">
                        {selectedPillar.process || 'Tracing systemic reasoning... New reports will include process documentation.'}
                      </p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedPillar(null)}
                  className="w-full py-5 bg-white/5 hover:bg-white/10 text-white rounded-3xl font-black text-xs uppercase tracking-[0.3em] transition-all border border-white/5"
                >
                  Return to Audit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
