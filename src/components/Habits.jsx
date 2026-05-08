import React, { useState } from "react";

import {
  useHabits,
  useHabitLogs,
  addHabit,
  deleteHabit,
  updateHabit,
  toggleDailyHabit,
  logHabitInstance,
  removeLastHabitLog,
} from "../hooks/useHabits";
import {
  Plus,
  Check,
  ChevronLeft,
  ChevronRight,
  X,
  Target,
  Trash2,
  Minus,
  Pencil,
  Calendar,
  TrendingUp,
} from "lucide-react";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  addDays,
  isSameDay,
  parseISO,
  isToday as isTodayFn,
  subWeeks,
  addWeeks,
  subMonths,
  addMonths,
  getDaysInMonth,
} from "date-fns";
import { useToast } from "./Toaster";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";

function HabitAnalytics({ habits, logs, viewType, start, end }) {
  if (habits.length === 0) return null;

  const getCompletions = (habit, s, e) => {
    const relevantLogs = logs.filter((l) => {
      if (l.habit_id !== habit.id) return false;
      const logTs = l.timestamp || new Date(l.date_string).getTime();
      return logTs >= s && logTs <= e;
    });
    return relevantLogs.length;
  };

  const getEffectiveTarget = (habit) => {
    const baseTarget = habit.target_count || 1;
    if (
      habit.frequency_type === "daily" ||
      habit.frequency_type === "multiple_daily"
    ) {
      if (viewType === "weekly") return baseTarget * 7;
      if (viewType === "monthly") return baseTarget * getDaysInMonth(start);
    }
    return baseTarget;
  };

  const completedCount = habits.filter((h) => {
    const count = getCompletions(h, start, end);
    const target = getEffectiveTarget(h);
    return count >= target;
  }).length;

  const percentage = (completedCount / habits.length) * 100;

  return (
    <div className="space-y-6 mb-8">
      <div className="bg-[#12121A] border border-[#818cf8]/20 rounded-3xl p-6 shadow-lg relative isolate overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#818cf8]/5 rounded-full blur-3xl -mr-20 -mt-20 -z-10 pointer-events-none"></div>

        <div className="flex justify-between items-end">
          <div>
            <span className="text-[11px] text-[#818cf8] uppercase tracking-widest font-black mb-1.5 flex items-center gap-1.5">
              <Target size={14} /> Overall Discipline
            </span>
            <div className="flex items-end gap-2">
              <span className="text-6xl font-black text-white tracking-tighter leading-none">
                {percentage.toFixed(0)}
                <span className="text-2xl text-gray-500 font-bold">%</span>
              </span>
              <span className="text-xs font-bold text-gray-500 mb-1">
                {completedCount}/{habits.length} goals met
              </span>
            </div>
          </div>
        </div>

        <div className="h-1.5 w-full bg-gray-900 rounded-full mt-6 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            className="h-full bg-[#818cf8] shadow-[0_0_15px_rgba(129,140,248,0.3)]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#12121A] border border-gray-800 rounded-3xl p-5">
          <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">
            Adherence Audit
          </h4>
          <div className="space-y-3">
            {habits.slice(0, 5).map((h) => {
              const count = getCompletions(h, start, end);
              const target = getEffectiveTarget(h);
              const p = Math.min(100, (count / target) * 100);
              return (
                <div key={h.id} className="flex items-center gap-3">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${p >= 100 ? "bg-emerald-500" : "bg-[#818cf8]"}`}
                  />
                  <span className="text-xs font-bold text-gray-300 flex-1 truncate">
                    {h.name}
                  </span>
                  <span className="text-[10px] font-black text-white">
                    {count}/{target}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-[#12121A] border border-gray-800 rounded-3xl p-5 flex flex-col justify-center text-center">
          <span className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-1">
            Consistency Score
          </span>
          <span className="text-2xl font-black text-white">
            {percentage > 80
              ? "EXCEPTIONAL"
              : percentage > 50
                ? "STABLE"
                : "FRAGILE"}
          </span>
        </div>
      </div>
    </div>
  );
}

export function Habits() {
  const habits = useHabits() || [];
  const logs = useHabitLogs() || [];

  const [viewType, setViewType] = useState("daily"); // 'daily', 'weekly', 'monthly'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [habitModalData, setHabitModalData] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const getRange = () => {
    if (viewType === "daily") {
      const start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(currentDate);
      end.setHours(23, 59, 59, 999);
      return { start: start.getTime(), end: end.getTime() };
    } else if (viewType === "weekly") {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 1 }).getTime(),
        end: endOfWeek(currentDate, { weekStartsOn: 1 }).getTime(),
      };
    } else {
      return {
        start: startOfMonth(currentDate).getTime(),
        end: endOfMonth(currentDate).getTime(),
      };
    }
  };

  const { start, end } = getRange();

  const getProgress = (habit) => {
    const type = habit.frequency_type;
    let relevantLogs = [];

    if (type.includes("daily")) {
      const dStr = format(currentDate, "yyyy-MM-dd");
      relevantLogs = logs.filter(
        (l) => l.habit_id === habit.id && l.date_string === dStr,
      );
    } else if (type.includes("weekly")) {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      relevantLogs = logs.filter((l) => {
        if (l.habit_id !== habit.id) return false;
        const logDate = parseISO(l.date_string);
        return logDate >= start && logDate <= end;
      });
    } else if (type.includes("monthly")) {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      relevantLogs = logs.filter((l) => {
        if (l.habit_id !== habit.id) return false;
        const logDate = parseISO(l.date_string);
        return logDate >= start && logDate <= end;
      });
    }

    const count = relevantLogs.length;
    const target = habit.target_count || 1;
    return { count, target, isCompleted: count >= target };
  };

  const renderDateLabel = () => {
    if (viewType === "daily") {
      if (isSameDay(currentDate, new Date())) return "Today";
      return format(currentDate, "MMM do, yyyy");
    } else if (viewType === "weekly") {
      return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
    } else {
      return format(currentDate, "MMMM yyyy");
    }
  };

  const handlePrev = () => {
    if (viewType === "daily") setCurrentDate(subDays(currentDate, 1));
    else if (viewType === "weekly") setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNext = () => {
    let nextD;
    if (viewType === "daily") nextD = addDays(currentDate, 1);
    else if (viewType === "weekly") nextD = addWeeks(currentDate, 1);
    else nextD = addMonths(currentDate, 1);

    if (nextD > new Date()) nextD = new Date();
    setCurrentDate(nextD);
  };

  const isAtLimit = () => {
    if (viewType === "daily") return isTodayFn(currentDate);
    if (viewType === "weekly")
      return isSameDay(
        startOfWeek(new Date(), { weekStartsOn: 1 }),
        startOfWeek(currentDate, { weekStartsOn: 1 }),
      );
    if (viewType === "monthly")
      return isSameDay(startOfMonth(new Date()), startOfMonth(currentDate));
    return false;
  };

  const tabs = [
    { id: "daily", label: "Daily", icon: <Calendar size={14} /> },
    { id: "weekly", label: "Weekly", icon: <Target size={14} /> },
    { id: "monthly", label: "Monthly", icon: <TrendingUp size={14} /> },
  ];

  return (
    <div className="space-y-6 pt-4 px-2 pb-6 relative min-h-screen">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Habit Tracker
        </h1>
        <button
          onClick={() => setHabitModalData({ mode: "add" })}
          className="bg-[#818cf8] hover:bg-[#6366f1] text-white px-3 py-2 rounded-xl text-sm font-bold shadow-lg shadow-[#818cf8]/20 transition-colors flex items-center gap-1.5"
        >
          <Plus size={16} strokeWidth={3} />
          New
        </button>
      </header>

      {/* View Switcher Tabs */}
      <div className="flex bg-[#12121A] p-1 rounded-2xl border border-gray-800 shadow-inner">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setViewType(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${viewType === tab.id ? "bg-[#818cf8]/10 text-[#818cf8] shadow-sm border border-[#818cf8]/20" : "text-gray-500 hover:text-gray-300"}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center mb-6 bg-[#0B0B0F] border border-gray-800 rounded-2xl p-2 shadow-inner">
        <button
          onClick={handlePrev}
          className="p-2 text-gray-400 hover:text-white transition rounded-xl hover:bg-gray-800/50"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-0.5">
            Tracking Canvas
          </p>
          <p className="text-sm font-bold text-gray-200">{renderDateLabel()}</p>
        </div>
        <button
          onClick={handleNext}
          disabled={isAtLimit()}
          className={`p-2 transition rounded-xl ${isAtLimit() ? "text-gray-800 cursor-not-allowed" : "text-gray-400 hover:text-white hover:bg-gray-800/50"}`}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <HabitAnalytics
        habits={habits}
        logs={logs}
        viewType={viewType}
        start={start}
        end={end}
      />

      <div className="space-y-4">
        {habits.length === 0 ? (
          <div className="bg-[#12121A] border border-gray-800 rounded-3xl p-10 flex flex-col items-center justify-center text-center mt-6">
            <div className="w-16 h-16 bg-[#0B0B0F] rounded-full flex items-center justify-center mb-4 border border-gray-800">
              <Target size={28} className="text-gray-500" />
            </div>
            <h3 className="text-white font-bold mb-2 text-lg">
              No Habits Found
            </h3>
            <p className="text-gray-500 text-sm max-w-[200px] mt-1 mb-6">
              Build constructive routines by adding your first habit constraint.
            </p>
            <button
              onClick={() => setHabitModalData({ mode: "add" })}
              className="text-[#818cf8] font-bold text-sm bg-[#818cf8]/10 px-4 py-2 rounded-xl"
            >
              Add Habit
            </button>
          </div>
        ) : (
          habits.map((habit) => {
            const { count, target, isCompleted } = getProgress(habit);
            const percentage = Math.min(100, (count / target) * 100);
            const dateStr = format(currentDate, "yyyy-MM-dd");

            return (
              <div
                key={habit.id}
                className="relative overflow-hidden rounded-2xl"
              >
                {/* Delete Action Background */}
                <div className="absolute inset-0 bg-red-500/20 flex items-center justify-end px-6 rounded-2xl mb-px">
                  <Trash2 size={24} className="text-red-500" />
                </div>

                <motion.div
                  drag="x"
                  dragConstraints={{ right: 0, left: -100 }}
                  dragElastic={0.1}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -80) setDeleteConfirmId(habit.id);
                  }}
                  className="bg-[#12121A] border border-gray-800 p-4 rounded-2xl relative z-10 overflow-hidden group touch-pan-y"
                >
                  <div className="absolute top-0 left-0 h-1 bg-[#0B0B0F] w-full">
                    <div
                      className="h-full bg-[#818cf8] transition-all duration-500 ease-out"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center gap-4 mt-1">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3
                        className={`font-bold text-lg transition-colors truncate ${isCompleted ? "text-gray-400 line-through decoration-2 decoration-gray-600" : "text-white"}`}
                      >
                        {habit.name}
                      </h3>
                      <p className="text-gray-500 text-[11px] mt-0.5 uppercase tracking-widest font-bold truncate">
                        {habit.frequency_type.replace("_", " ")} • Goal:{" "}
                        {target}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-gray-500 tracking-tighter w-8 text-right shrink-0">
                        {count}/{target}
                      </span>

                      <div className="flex items-center gap-1.5 p-1 bg-[#0B0B0F] border border-gray-800 rounded-xl">
                        <button
                          onClick={() =>
                            setHabitModalData({ mode: "edit", habit: habit })
                          }
                          className="h-8 w-8 rounded-lg bg-gray-900 text-gray-400 flex items-center justify-center hover:bg-gray-800 hover:text-[#818cf8] transition"
                        >
                          <Pencil size={15} />
                        </button>
                        <div className="w-[1px] h-4 bg-gray-800" />
                        {target === 1 ? (
                          <button
                            onClick={() => toggleDailyHabit(habit.id, dateStr)}
                            className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all ${isCompleted ? "bg-emerald-500 text-white" : "text-gray-500 hover:text-white"}`}
                          >
                            <Check
                              size={18}
                              strokeWidth={isCompleted ? 4 : 2}
                            />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() =>
                                removeLastHabitLog(habit.id, dateStr)
                              }
                              disabled={count === 0}
                              className="h-8 w-8 rounded-lg bg-gray-900 text-gray-400 flex items-center justify-center hover:bg-gray-800 disabled:opacity-30 transition"
                            >
                              <Minus size={16} strokeWidth={3} />
                            </button>
                            <button
                              onClick={() =>
                                logHabitInstance(habit.id, dateStr)
                              }
                              className={`h-8 w-8 rounded-lg flex items-center justify-center transition ${isCompleted ? "bg-emerald-500/20 text-emerald-400" : "bg-[#818cf8]/20 text-[#818cf8]"}`}
                            >
                              <Plus size={16} strokeWidth={3} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })
        )}
      </div>

      {habitModalData && (
        <HabitModal
          mode={habitModalData.mode}
          habit={habitModalData.habit}
          onClose={() => setHabitModalData(null)}
        />
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#12121A] p-6 rounded-3xl border border-gray-800 shadow-2xl max-w-sm w-full">
            <h3 className="text-xl font-bold text-white mb-2">Delete Habit?</h3>
            <p className="text-gray-500 text-sm mb-6">
              This action will erase the habit constraint fully.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 font-bold text-gray-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await deleteHabit(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 font-bold bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HabitModal({ mode, habit, onClose }) {
  const isEdit = mode === "edit";
  const [name, setName] = useState(isEdit ? habit.name : "");
  const [type, setType] = useState(isEdit ? habit.frequency_type : "daily");
  const [target, setTarget] = useState(isEdit ? habit.target_count || 1 : 1);
  const toast = useToast();

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Habit name is required");
    try {
      if (isEdit) {
        await updateHabit(habit.id, {
          name: name.trim(),
          frequency_type: type,
          target_count: target,
        });
        toast.success("Routine updated!");
      } else {
        await addHabit({
          name: name.trim(),
          frequency_type: type,
          target_count: target,
        });
        toast.success("Habit constraint added!");
      }
      onClose();
    } catch (error) {
      toast.error(error.message || "Action failed");
    }
  };

  const isMultiple = ["multiple_daily", "weekly", "monthly"].includes(type);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 sm:p-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#12121A] w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[2rem] border border-gray-800 shadow-2xl p-6 sm:p-8 animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-2">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white tracking-tight">
            {isEdit ? "Refine Routine" : "Define Routine"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-white bg-gray-900 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
              Habit Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Read 10 Pages"
              className="w-full bg-[#0B0B0F] border border-gray-800 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#818cf8] transition-colors"
              autoFocus={!isEdit}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
              Frequency
            </label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                if (e.target.value === "daily") setTarget(1);
                else if (e.target.value === "weekly") setTarget(3);
              }}
              className="w-full bg-[#0B0B0F] border border-gray-800 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#818cf8] appearance-none"
            >
              <option value="daily">Once a Day</option>
              <option value="multiple_daily">Multiple times a Day</option>
              <option value="weekly">Weekly Goal</option>
              <option value="monthly">Monthly Goal</option>
            </select>
          </div>

          {isMultiple && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                Target Count
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={target}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    setTarget(Number.isNaN(parsed) ? 1 : Math.max(parsed, 1));
                  }}
                  className="w-24 bg-[#0B0B0F] border border-gray-800 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#818cf8] text-center font-bold"
                />
                <span className="text-gray-500 font-bold text-sm">
                  {type === "multiple_daily"
                    ? "completions per day"
                    : type === "weekly"
                      ? "times out of the week"
                      : "times over the month"}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={handleSave}
            className="w-full bg-[#818cf8] hover:bg-[#6366f1] text-white py-4 rounded-xl font-bold text-sm transition-colors mt-2 shadow-lg shadow-[#818cf8]/20"
          >
            {isEdit ? "Update Routine" : "Deploy Constraint"}
          </button>
        </div>
      </div>
    </div>
  );
}
