import React, { useState } from "react";
import {
  useExpensesByDate,
  addExpense,
  deleteExpense,
  updateExpense,
  useExpensesByRange,
} from "../hooks/useExpenses";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  Wallet,
  TrendingDown,
  CreditCard,
  Pencil,
  Calendar,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  format,
  subDays,
  addDays,
  isSameDay,
  isToday as isTodayFn,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  addWeeks,
  subMonths,
  addMonths,
} from "date-fns";
import { useToast } from "./Toaster";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";

function FinancialAnalytics({
  expenses,
  filterType,
  filterCategory,
  rawExpenses,
}) {
  if (!rawExpenses || rawExpenses.length === 0) return null;

  const total = expenses.reduce((acc, exp) => acc + exp.amount, 0);

  // Group by category with Need/Want split
  const byCategory = expenses.reduce((acc, exp) => {
    if (!acc[exp.category])
      acc[exp.category] = { total: 0, needs: 0, wants: 0, count: 0 };
    acc[exp.category].total += exp.amount;
    acc[exp.category].count += 1;
    if (exp.necessity === "Want") acc[exp.category].wants += exp.amount;
    else acc[exp.category].needs += exp.amount;
    return acc;
  }, {});

  // Group by Necessity
  const needs = expenses
    .filter((e) => e.necessity !== "Want")
    .reduce((acc, e) => acc + e.amount, 0);
  const wants = total - needs;

  // Group by Type with Need/Want split
  const byType = expenses.reduce((acc, exp) => {
    const t = exp.type || "Personal";
    if (!acc[t]) acc[t] = { total: 0, needs: 0, wants: 0, count: 0 };
    acc[t].total += exp.amount;
    acc[t].count += 1;
    if (exp.necessity === "Want") acc[t].wants += exp.amount;
    else acc[t].needs += exp.amount;
    return acc;
  }, {});

  const sortedCategories = Object.entries(byCategory).sort(
    (a, b) => b[1].total - a[1].total,
  );
  const sortedTypes = Object.entries(byType).sort(
    (a, b) => b[1].total - a[1].total,
  );

  return (
    <div className="space-y-6 mb-8">
      <div className="grid grid-cols-1 gap-4">
        {/* Needs vs Wants */}
        <div className="bg-[#12121A] border border-gray-800 rounded-3xl p-6 relative overflow-hidden group">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
              Priority Audit
            </span>
          </div>

          {total > 0 ? (
            <>
              <div className="flex items-end gap-1 mb-3">
                <span className="text-3xl font-black text-white leading-none">
                  {((needs / total) * 100).toFixed(0)}%
                </span>
                <span className="text-[10px] text-gray-500 font-black uppercase mb-1">
                  Functional ({filterType})
                </span>
              </div>
              <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden flex">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(needs / total) * 100}%` }}
                  className="h-full bg-emerald-500"
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(wants / total) * 100}%` }}
                  className="h-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                />
              </div>
              <div className="flex justify-between mt-3">
                <span className="text-[9px] font-black text-emerald-500/80 uppercase">
                  ₹{needs.toFixed(0)} Needs
                </span>
                <span className="text-[9px] font-black text-amber-500 uppercase">
                  ₹{wants.toFixed(0)} Wants
                </span>
              </div>
            </>
          ) : (
            <div className="py-4 text-center">
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
                No data for selected filters
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filterCategory === "All" && (
          <div className="bg-[#12121A] border border-gray-800 rounded-3xl p-6">
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6">
              Categorical Burn
            </h4>
            <div className="space-y-6">
              {sortedCategories.slice(0, 5).map(([cat, data]) => (
                <div key={cat} className="space-y-2">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-sm font-bold text-gray-200 shrink-0">
                      {cat}{" "}
                      <span className="text-[10px] text-gray-500 font-medium ml-1">
                        ({data.count})
                      </span>
                    </span>
                    <div className="flex flex-wrap justify-end items-baseline gap-x-2 gap-y-0.5 text-right">
                      <span className="text-[10px] font-black text-white">
                        ₹{data.total.toFixed(0)}
                      </span>
                      <span className="text-[8px] font-black text-gray-600 uppercase tracking-tighter">
                        {data.needs > 0 && (
                          <span className="text-emerald-500/60">
                            ₹{data.needs.toFixed(0)} N (
                            {((data.needs / data.total) * 100).toFixed(0)}%)
                          </span>
                        )}
                        {data.needs > 0 && data.wants > 0 && " • "}
                        {data.wants > 0 && (
                          <span className="text-amber-500/60">
                            ₹{data.wants.toFixed(0)} W (
                            {((data.wants / data.total) * 100).toFixed(0)}%)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden flex">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(data.needs / total) * 100}%` }}
                      className="h-full bg-emerald-500/40"
                    />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(data.wants / total) * 100}%` }}
                      className="h-full bg-amber-500/40"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filterType === "All" && (
          <div className="bg-[#12121A] border border-gray-800 rounded-3xl p-6">
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6">
              Entity Allocation
            </h4>
            <div className="space-y-6">
              {sortedTypes.map(([type, data]) => (
                <div key={type} className="space-y-2">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-sm font-bold text-gray-200 shrink-0">
                      {type}{" "}
                      <span className="text-[10px] text-gray-500 font-medium ml-1">
                        ({data.count})
                      </span>
                    </span>
                    <div className="flex flex-wrap justify-end items-baseline gap-x-2 gap-y-0.5 text-right">
                      <span className="text-[10px] font-black text-white">
                        ₹{data.total.toFixed(0)}
                      </span>
                      <span className="text-[8px] font-black text-gray-600 uppercase tracking-tighter">
                        {data.needs > 0 && (
                          <span className="text-emerald-500/60">
                            ₹{data.needs.toFixed(0)} N (
                            {((data.needs / data.total) * 100).toFixed(0)}%)
                          </span>
                        )}
                        {data.needs > 0 && data.wants > 0 && " • "}
                        {data.wants > 0 && (
                          <span className="text-amber-500/60">
                            ₹{data.wants.toFixed(0)} W (
                            {((data.wants / data.total) * 100).toFixed(0)}%)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden flex">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(data.needs / total) * 100}%` }}
                      className="h-full bg-emerald-500/40"
                    />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(data.wants / total) * 100}%` }}
                      className="h-full bg-amber-500/40"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function Expenses() {
  const [viewType, setViewType] = useState("daily"); // 'daily', 'weekly', 'monthly'
  const [filterType, setFilterType] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expenseModalData, setExpenseModalData] = useState(null);
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
  const dateStr = format(currentDate, "yyyy-MM-dd");

  const rawDaily = useExpensesByDate(dateStr) || [];
  const rawRange = useExpensesByRange(start, end) || [];

  const rawExpenses = viewType === "daily" ? rawDaily : rawRange;

  const expenses = rawExpenses.filter((e) => {
    const typeMatch = filterType === "All" || e.type === filterType;
    const catMatch = filterCategory === "All" || e.category === filterCategory;
    return typeMatch && catMatch;
  });

  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);

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
    <div className="space-y-6 pt-4 px-2 pb-6 min-h-screen">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Finances
        </h1>
        <button
          onClick={() => setExpenseModalData({ mode: "add" })}
          className="bg-emerald-500 hover:bg-emerald-400 text-white px-3 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 transition-colors flex items-center gap-1.5"
        >
          <Plus size={16} strokeWidth={3} />
          Log Cost
        </button>
      </header>

      {/* View Switcher Tabs */}
      <div className="flex bg-[#12121A] p-1 rounded-2xl border border-gray-800 shadow-inner">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setViewType(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${viewType === tab.id ? "bg-emerald-500/10 text-emerald-400 shadow-sm border border-emerald-500/20" : "text-gray-500 hover:text-gray-300"}`}
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

      <div className="flex flex-row items-center gap-2 mb-6">
        {/* Type Filter Dropdown */}
        <div className="flex bg-[#12121A] border border-gray-800 rounded-xl p-0.5 shadow-sm flex-1 min-w-0">
          <span className="pl-2 pr-1 py-2 text-[8px] font-black text-gray-600 uppercase flex items-center shrink-0">
            Type:
          </span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-transparent text-[9px] font-black uppercase tracking-widest text-gray-400 outline-none py-2 flex-1 min-w-0"
          >
            {[
              "All",
              "Personal",
              "Manya",
              "Papa",
              "Mumma",
              "Family",
              "Others",
            ].map((t) => (
              <option key={t} value={t} className="bg-[#0B0B0F]">
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter Dropdown */}
        <div className="flex bg-[#12121A] border border-gray-800 rounded-xl p-0.5 shadow-sm flex-1 min-w-0">
          <span className="pl-2 pr-1 py-2 text-[8px] font-black text-gray-600 uppercase flex items-center shrink-0">
            Cat:
          </span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-transparent text-[9px] font-black uppercase tracking-widest text-gray-400 outline-none py-2 flex-1 min-w-0"
          >
            <option value="All">All</option>
            {[
              "Food",
              "Transport",
              "Shopping",
              "Entertainment",
              "Utilities",
              "Health",
              "Subscriptions",
              "Travel",
              "Gifts",
              "Investments",
              "Business Payments",
              "Other",
            ].map((c) => (
              <option key={c} value={c} className="bg-[#0B0B0F]">
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-[#12121A] border border-emerald-500/20 rounded-3xl p-6 shadow-lg relative mb-6 isolate overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mt-20 -z-10 pointer-events-none"></div>

        <div className="flex justify-between items-end">
          <div>
            <span className="text-[11px] text-emerald-500 uppercase tracking-widest font-black mb-1.5 flex items-center gap-1.5">
              <TrendingDown size={14} />{" "}
              {viewType === "daily"
                ? "Daily"
                : viewType === "weekly"
                  ? "Weekly"
                  : "Monthly"}{" "}
              Burn
            </span>
            <div className="flex items-start gap-1">
              <span className="text-2xl font-bold text-gray-500 mt-2">₹</span>
              <span className="text-6xl font-black text-white tracking-tighter tabular-nums leading-none">
                {totalSpent.toFixed(2).split(".")[0]}
                <span className="text-3xl text-gray-400">
                  .{totalSpent.toFixed(2).split(".")[1]}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <FinancialAnalytics
        expenses={expenses}
        filterType={filterType}
        filterCategory={filterCategory}
        rawExpenses={rawExpenses}
      />

      <div className="space-y-3">
        {expenses.length === 0 ? (
          <div className="bg-[#12121A] border border-gray-800 rounded-3xl p-10 flex flex-col items-center justify-center text-center mt-2">
            <div className="w-16 h-16 bg-[#0B0B0F] rounded-full flex items-center justify-center mb-4 border border-gray-800 ring-1 ring-white/5">
              <Wallet size={28} className="text-gray-500" />
            </div>
            <h3 className="text-white font-bold mb-2 text-lg">
              No Expenses Recorded
            </h3>
            <p className="text-gray-500 text-sm max-w-[200px] mt-1 mb-6">
              Financial discipline begins with friction tracking. Log a cost.
            </p>
            <button
              onClick={() => setExpenseModalData({ mode: "add" })}
              className="text-emerald-500 font-bold text-sm bg-emerald-500/10 px-4 py-2 rounded-xl"
            >
              Add Transaction
            </button>
          </div>
        ) : (
          expenses.map((exp) => (
            <div key={exp.id} className="relative overflow-hidden rounded-2xl">
              {/* Delete Action Background */}
              <div className="absolute inset-0 bg-red-500/20 flex items-center justify-end px-6">
                <Trash2 size={24} className="text-red-500" />
              </div>

              <motion.div
                drag="x"
                dragConstraints={{ right: 0, left: -100 }}
                dragElastic={0.1}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -80) setDeleteConfirmId(exp.id);
                }}
                className="bg-[#12121A] border border-gray-800 p-4 rounded-2xl flex justify-between items-center relative z-10 transition-colors hover:border-gray-700 touch-pan-y"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0 mr-4">
                  <div className="h-12 w-12 rounded-2xl bg-[#0B0B0F] border border-gray-800 flex items-center justify-center shrink-0">
                    <CreditCard
                      size={20}
                      className={
                        exp.necessity === "Want"
                          ? "text-amber-500/70"
                          : "text-emerald-500/70"
                      }
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-[15px] truncate">
                        {exp.category}
                      </h3>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter ${exp.type === "Personal" ? "bg-gray-800 text-gray-400" : "bg-indigo-500/10 text-indigo-400"}`}
                      >
                        {exp.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-gray-500 text-xs truncate max-w-[150px]">
                        {exp.description || "No notes"}
                      </p>
                      <span className="text-gray-800 text-[10px]">•</span>
                      <span className="text-[10px] text-gray-600 font-mono">
                        {new Date(exp.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="font-black text-white text-lg tabular-nums tracking-tight block">
                      ₹{parseFloat(exp.amount).toFixed(2)}
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase tracking-widest ${exp.necessity === "Want" ? "text-amber-500" : "text-emerald-500"}`}
                    >
                      {exp.necessity}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setExpenseModalData({ mode: "edit", expense: exp })
                    }
                    className="h-10 w-10 bg-[#0B0B0F] border border-gray-800 rounded-xl flex items-center justify-center text-gray-500 hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
                    title="Edit"
                  >
                    <Pencil size={18} />
                  </button>
                </div>
              </motion.div>
            </div>
          ))
        )}
      </div>

      {expenseModalData && (
        <ExpenseModal
          mode={expenseModalData.mode}
          expense={expenseModalData.expense}
          dateStr={dateStr}
          onClose={() => setExpenseModalData(null)}
        />
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#12121A] p-6 rounded-3xl border border-gray-800 shadow-2xl max-w-sm w-full">
            <h3 className="text-xl font-bold text-white mb-2">
              Delete Transaction?
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              This action cannot be undone.
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
                  await deleteExpense(deleteConfirmId);
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

function ExpenseModal({ mode, expense, dateStr, onClose }) {
  const isEdit = mode === "edit";
  const [amount, setAmount] = useState(isEdit ? expense.amount.toString() : "");
  const [category, setCategory] = useState(isEdit ? expense.category : "");
  const [description, setDescription] = useState(
    isEdit ? expense.description || "" : "",
  );
  const [necessity, setNecessity] = useState(
    isEdit ? expense.necessity || "Need" : "Need",
  );
  const [type, setType] = useState(
    isEdit ? expense.type || "Personal" : "Personal",
  );
  const [selectedDate, setSelectedDate] = useState(
    isEdit ? expense.date_string : dateStr,
  );

  const toast = useToast();

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0)
      return toast.error("Valid amount required");
    if (!category.trim()) return toast.error("Category is required");

    try {
      if (isEdit) {
        await updateExpense(expense.id, {
          amount: parseFloat(amount),
          category: category.trim(),
          description: description.trim(),
          necessity: necessity,
          type: type,
          date_string: selectedDate,
          timestamp: new Date(selectedDate).getTime(),
        });
        toast.success("Transaction updated");
      } else {
        await addExpense({
          amount: parseFloat(amount),
          category: category.trim(),
          description: description.trim(),
          necessity: necessity,
          type: type,
          dateString: selectedDate,
        });
        toast.success("Transaction recorded");
      }
      onClose();
    } catch (error) {
      toast.error(error.message || "Action failed");
    }
  };

  const commonCategories = [
    "Food",
    "Transport",
    "Shopping",
    "Entertainment",
    "Utilities",
    "Health",
    "Subscriptions",
    "Travel",
    "Gifts",
    "Investments",
    "Business Payments",
    "Other",
  ];
  const typeOptions = [
    "Personal",
    "Manya",
    "Papa",
    "Mumma",
    "Family",
    "Others",
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 sm:p-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#12121A] w-full max-w-md max-h-[95vh] overflow-y-auto rounded-[2rem] border border-gray-800 shadow-2xl p-6 sm:p-8 animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-2">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white tracking-tight">
            {isEdit ? "Update Transaction" : "Log Transaction"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-white bg-gray-900 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">
                Cost (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-black">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#0B0B0F] border border-gray-800 rounded-xl pl-8 pr-3 py-3 text-white font-black placeholder-gray-700 outline-none focus:border-emerald-500/50 transition-colors"
                  autoFocus={!isEdit}
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">
                Date
              </label>
              <div className="relative">
                <Calendar
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-[#0B0B0F] border border-gray-800 rounded-xl pl-8 pr-3 py-3 text-white font-bold text-xs outline-none focus:border-emerald-500/50 transition-colors appearance-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">
                Necessity
              </label>
              <div className="flex p-1 bg-[#0B0B0F] rounded-xl border border-gray-800">
                {["Need", "Want"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setNecessity(opt)}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${necessity === opt ? (opt === "Need" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-amber-500 text-white shadow-lg shadow-amber-500/20") : "text-gray-500"}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">
                Allocation Type
              </label>
              <div className="flex flex-wrap p-1 bg-[#0B0B0F] rounded-xl border border-gray-800 gap-1">
                {typeOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setType(opt)}
                    className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${type === opt ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-gray-500 hover:text-gray-400"}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Uber, Groceries..."
              className="w-full bg-[#0B0B0F] border border-gray-800 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 outline-none focus:border-emerald-500/50 transition-colors mb-3"
            />
            <div className="flex flex-wrap gap-1.5">
              {commonCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg border text-[10px] transition-all font-bold uppercase tracking-wider ${category === cat ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" : "bg-[#0B0B0F] border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700"}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">
              Note (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Context for this cost..."
              className="w-full bg-[#0B0B0F] border border-gray-800 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all mt-4 shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
          >
            {isEdit ? "Update Transaction" : "Record Transaction"}
          </button>
        </div>
      </div>
    </div>
  );
}
