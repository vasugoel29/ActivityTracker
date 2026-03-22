import React, { useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { addLog } from '../db/queries';
import { Zap } from 'lucide-react';

export function QuickLogModal({ isOpen, onClose }) {
  const [activity, setActivity] = useState('');
  const [lifeArea, setLifeArea] = useState('work');
  const [energyLevel, setEnergyLevel] = useState(2);
  const [notes, setNotes] = useState('');

  const handleSave = async () => {
    if (!activity || !activity.trim()) return;

    // Strict input validation & sanitization
    const sanitizedActivity = activity.trim();
    if (sanitizedActivity.length > 200) {
      alert("Activity description is too long (max 200 chars).");
      return;
    }
    const sanitizedNotes = notes ? notes.trim() : '';
    if (sanitizedNotes.length > 500) {
      alert("Notes are too long (max 500 chars).");
      return;
    }

    await addLog({
      activity: sanitizedActivity,
      life_area: lifeArea,
      energy_level: energyLevel,
      notes: sanitizedNotes,
    });
    // Reset form
    setActivity('');
    setNotes('');
    setEnergyLevel(2);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex flex-col justify-end sm:justify-center p-0 sm:p-4"
            onClick={onClose}
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              onClick={e => e.stopPropagation()}
              className="w-full sm:max-w-md mx-auto bg-[#12121A] rounded-t-3xl sm:rounded-3xl p-6 border border-gray-800 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Zap size={20} className="text-[#818cf8]" />
                  Log Activity
                </h3>
              </div>
              
              <input 
                autoFocus
                type="text" 
                placeholder="What did you just do?" 
                value={activity}
                onChange={e => setActivity(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                className="w-full bg-[#0B0B0F] border border-gray-800 rounded-xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#818cf8] focus:border-[#818cf8] mb-5 text-lg"
              />

              <div className="flex gap-2 mb-5 overflow-x-auto pb-2 scrollbar-hide">
                {['work', 'health', 'learning', 'social', 'leisure', 'waste'].map(area => (
                  <button 
                    key={area}
                    onClick={() => setLifeArea(area)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${lifeArea === area ? 'bg-[#818cf8]/10 text-[#818cf8] border border-[#818cf8]/30' : 'bg-[#0B0B0F] text-gray-400 border border-gray-800 hover:text-gray-300'}`}
                  >
                    {area.charAt(0).toUpperCase() + area.slice(1)}
                  </button>
                ))}
              </div>

              <div className="mb-6">
                <div className="flex gap-2 bg-[#0B0B0F] p-1.5 rounded-2xl border border-gray-800">
                  {[{val: 1, label: 'Low Energy'}, {val: 2, label: 'Normal'}, {val: 3, label: 'High Energy'}].map(lvl => (
                    <button 
                      key={lvl.val}
                      onClick={() => setEnergyLevel(lvl.val)}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${energyLevel === lvl.val ? 'bg-[#12121A] text-white shadow-sm ring-1 ring-white/5' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleSave}
                disabled={!activity.trim()}
                className="w-full bg-white text-black font-bold py-4 rounded-xl text-lg hover:bg-gray-200 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
              >
                Save Log
              </button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
