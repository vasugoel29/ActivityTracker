import React, { useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../db/supabase';
import { triggerOptimisticRefetch } from '../hooks/useSupabase';
import { FileText, Check } from 'lucide-react';
import { useToast } from './Toaster';
import { parseBulkLogs } from '../utils/logParser';
import { format } from 'date-fns';

export function BulkLoggerModal({ isOpen, onClose }) {
  const toast = useToast();
  const [text, setText] = useState('');
  
  // Format today's date for standard <input type="date">
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const handleSave = async () => {
    const baseDate = new Date(selectedDate);
    const logsToSave = parseBulkLogs(text, baseDate);
    
    if (logsToSave.length === 0) {
      toast.error('Could not parse any valid logs from text.');
      return;
    }

    try {
      const formattedLogs = logsToSave.map(log => ({
        start_time: log.start_time,
        end_time: log.end_time,
        activity: log.activity,
        created_at: Date.now()
      }));

      const { error } = await supabase.from('activities').insert(formattedLogs);
      
      if (error) throw error;
      triggerOptimisticRefetch('activities');
      
      toast.success(`${formattedLogs.length} activities logged!`);
      setText('');
      onClose();
    } catch (error) {
       console.error(error);
       toast.error(error.message || 'Failed to sync logs to database');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60] flex flex-col justify-end sm:justify-center p-0 sm:p-4"
            onClick={onClose}
        >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              onClick={e => e.stopPropagation()}
              className="w-full sm:max-w-md mx-auto bg-[#12121A] rounded-t-3xl sm:rounded-3xl p-6 border border-gray-800 shadow-2xl flex flex-col h-[85vh] sm:h-[70vh]"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText size={20} className="text-[#818cf8]" />
                  Paste Timeline
                </h3>
              </div>
              
              <div className="mb-4">
                 <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Target Date</label>
                 <input 
                    type="date" 
                    value={selectedDate}
                    max={todayStr}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="w-full bg-[#0B0B0F] border border-gray-800 rounded-xl p-3 text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#818cf8] font-mono text-sm [color-scheme:dark]"
                 />
              </div>

              <p className="text-[11px] text-gray-500 mb-4 font-mono leading-relaxed bg-[#0B0B0F] p-3 rounded-xl border border-gray-800">
                Format: <code>HH:MM - HH:MM : Activity</code><br/>
                Example:<br/>
                <span className="text-gray-400">10:15 - 10:25 : Subway - 115<br/>
                Midnight - 1:30 : Doomscroll</span>
              </p>

              <textarea 
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Paste your day here..."
                className="w-full flex-1 bg-[#0B0B0F] border border-gray-800 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#818cf8] resize-none text-sm font-mono mb-4 shadow-inner"
              />

              <button 
                onClick={handleSave}
                disabled={!text.trim() || !selectedDate}
                className="w-full bg-white text-black flex items-center justify-center gap-2 font-bold py-4 rounded-xl text-lg hover:bg-gray-200 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
              >
                <Check size={20} />
                Import Logs
              </button>
            </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
