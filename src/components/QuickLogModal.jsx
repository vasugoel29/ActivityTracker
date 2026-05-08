import React, { useState } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../db/supabase";
import { triggerOptimisticRefetch } from "../hooks/useSupabase";
import { Zap } from "lucide-react";

export function QuickLogModal({ isOpen, onClose }) {
  const [activity, setActivity] = useState("");

  const handleSave = async () => {
    if (!activity || !activity.trim()) return;

    // Strict input validation & sanitization
    const sanitizedActivity = activity.trim();
    if (sanitizedActivity.length > 200) {
      alert("Activity description is too long (max 200 chars).");
      return;
    }

    const end_time = Date.now();
    const start_time = end_time - 30 * 60000; // Defaulting to an estimated 30-minute block

    await supabase.from("activities").insert([
      {
        activity: sanitizedActivity,
        start_time,
        end_time,
        created_at: Date.now(),
      },
    ]);

    triggerOptimisticRefetch("activities");

    // Reset form
    setActivity("");
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
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
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
                onChange={(e) => setActivity(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                className="w-full bg-[#0B0B0F] border border-gray-800 rounded-xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#818cf8] focus:border-[#818cf8] mb-6 text-lg"
              />

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
