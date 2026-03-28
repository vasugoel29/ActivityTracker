import React, { useState } from 'react';
import { useExpensesByDate, addExpense, deleteExpense } from '../hooks/useExpenses';
import { Plus, ChevronLeft, ChevronRight, X, Trash2, Wallet, TrendingDown, Tag, CreditCard } from 'lucide-react';
import { format, subDays, addDays, isSameDay, isToday as isTodayFn } from 'date-fns';
import { useToast } from './Toaster';

export function Dashboard() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  
  const dateStr = format(currentDate, 'yyyy-MM-dd');
  const expenses = useExpensesByDate(dateStr) || [];
  
  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  const renderDateLabel = () => {
      if (isSameDay(currentDate, new Date())) return "Today";
      return format(currentDate, 'MMM do, yyyy');
  };

  return (
    <div className="space-y-6 pt-4 px-2 pb-6 min-h-screen">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Finances</h1>
        <button 
           onClick={() => setIsAddModalOpen(true)}
           className="bg-emerald-500 hover:bg-emerald-400 text-white px-3 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 transition-colors flex items-center gap-1.5"
        >
           <Plus size={16} strokeWidth={3} />
           Log Cost
        </button>
      </header>

      <div className="flex justify-between items-center mb-6 bg-[#0B0B0F] border border-gray-800 rounded-2xl p-2 shadow-inner">
        <button onClick={() => setCurrentDate(subDays(currentDate, 1))} className="p-2 text-gray-400 hover:text-white transition rounded-xl hover:bg-gray-800/50">
           <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-0.5">Tracking Canvas</p>
          <p className="text-sm font-bold text-gray-200">{renderDateLabel()}</p>
        </div>
        <button 
           onClick={() => setCurrentDate(addDays(currentDate, 1))} 
           disabled={isTodayFn(currentDate)}
           className={`p-2 transition rounded-xl ${isTodayFn(currentDate) ? 'text-gray-800 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
        >
           <ChevronRight size={20} />
        </button>
      </div>

      <div className="bg-[#12121A] border border-emerald-500/20 rounded-3xl p-6 shadow-lg relative mb-6 isolate overflow-hidden">
         <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mt-20 -z-10 pointer-events-none"></div>
         
         <div className="flex justify-between items-end">
            <div>
               <span className="text-[11px] text-emerald-500 uppercase tracking-widest font-black mb-1.5 flex items-center gap-1.5">
                  <TrendingDown size={14} /> Total Burn
               </span>
               <div className="flex items-start gap-1">
                  <span className="text-2xl font-bold text-gray-500 mt-2">₹</span>
                  <span className="text-6xl font-black text-white tracking-tighter tabular-nums leading-none">
                     {totalSpent.toFixed(2).split('.')[0]}<span className="text-3xl text-gray-400">.{totalSpent.toFixed(2).split('.')[1]}</span>
                  </span>
               </div>
            </div>
         </div>
      </div>

      <div className="space-y-3">
         {expenses.length === 0 ? (
            <div className="bg-[#12121A] border border-gray-800 rounded-3xl p-10 flex flex-col items-center justify-center text-center mt-2">
                <div className="w-16 h-16 bg-[#0B0B0F] rounded-full flex items-center justify-center mb-4 border border-gray-800 ring-1 ring-white/5">
                    <Wallet size={28} className="text-gray-500" />
                </div>
                <h3 className="text-white font-bold mb-2 text-lg">No Expenses Recorded</h3>
                <p className="text-gray-500 text-sm max-w-[200px] mt-1 mb-6">Financial discipline begins with friction tracking. Log a cost.</p>
                <button onClick={() => setIsAddModalOpen(true)} className="text-emerald-500 font-bold text-sm bg-emerald-500/10 px-4 py-2 rounded-xl">Add Transaction</button>
            </div>
         ) : (
            expenses.map(exp => (
               <div key={exp.id} className="bg-[#12121A] border border-gray-800 p-4 rounded-2xl flex justify-between items-center group transition-colors hover:border-gray-700">
                  <div className="flex items-center gap-4 flex-1 min-w-0 mr-4">
                     <div className="h-12 w-12 rounded-2xl bg-[#0B0B0F] border border-gray-800 flex items-center justify-center shrink-0">
                        <CreditCard size={20} className="text-emerald-500/70" />
                     </div>
                     <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white text-[15px] truncate">{exp.category}</h3>
                        {exp.description && (
                           <p className="text-gray-500 text-xs mt-0.5 truncate max-w-[150px]">{exp.description}</p>
                        )}
                        <p className="text-xs text-gray-600 font-mono mt-1">{new Date(exp.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                     </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                     <span className="font-black text-white text-lg tabular-nums tracking-tight">
                        ₹{parseFloat(exp.amount).toFixed(2)}
                     </span>
                     <button 
                        onClick={() => setDeleteConfirmId(exp.id)}
                        className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                     >
                        <Trash2 size={14} />
                     </button>
                  </div>
               </div>
            ))
         )}
      </div>

      {isAddModalOpen && <AddExpenseModal dateStr={dateStr} onClose={() => setIsAddModalOpen(false)} />}
      
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#12121A] p-6 rounded-3xl border border-gray-800 shadow-2xl max-w-sm w-full">
            <h3 className="text-xl font-bold text-white mb-2">Delete Transaction?</h3>
            <p className="text-gray-500 text-sm mb-6">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
               <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 font-bold text-gray-400 hover:text-white transition">Cancel</button>
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

function AddExpenseModal({ dateStr, onClose }) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const toast = useToast();

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) return toast.error("Valid amount required");
    if (!category.trim()) return toast.error("Category is required");

    try {
      await addExpense({ 
         amount: parseFloat(amount), 
         category: category.trim(), 
         description: description.trim(),
         dateString: dateStr 
      });
      
      toast.success("Transaction recorded");
      onClose();
    } catch (error) {
      toast.error(error.message || "Failed to log transaction");
    }
  };

  const commonCategories = ["Food", "Transport", "Shopping", "Entertainment", "Utilities", "Health", "Other"];

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 sm:p-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#12121A] w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[2rem] border border-gray-800 shadow-2xl p-6 sm:p-8 animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-2">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white tracking-tight">Log Transaction</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white bg-gray-900 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="space-y-5">
           <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Cost Amount (₹)</label>
              <div className="relative">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-black text-xl">₹</span>
                 <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                    placeholder="0.00" 
                    className="w-full bg-[#0B0B0F] border border-gray-800 rounded-xl pl-10 pr-4 py-4 text-white font-black text-xl placeholder-gray-700 outline-none focus:border-emerald-500/50 transition-colors"
                    autoFocus
                 />
              </div>
           </div>

           <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Category</label>
              <input 
                 type="text" 
                 value={category} 
                 onChange={e => setCategory(e.target.value)} 
                 placeholder="e.g. Uber, Groceries..." 
                 className="w-full bg-[#0B0B0F] border border-gray-800 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 outline-none focus:border-emerald-500/50 transition-colors mb-2"
              />
              <div className="flex flex-wrap gap-2 text-xs">
                 {commonCategories.map(cat => (
                    <button 
                       key={cat} 
                       onClick={() => setCategory(cat)}
                       className={`px-3 py-1.5 rounded-lg border transition-colors font-medium ${category === cat ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-[#0B0B0F] border-gray-800 text-gray-400 hover:text-gray-300 hover:border-gray-700'}`}
                    >
                       {cat}
                    </button>
                 ))}
              </div>
           </div>

           <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Note (Optional)</label>
              <input 
                 type="text" 
                 value={description} 
                 onChange={e => setDescription(e.target.value)} 
                 placeholder="Context for this cost..." 
                 className="w-full bg-[#0B0B0F] border border-gray-800 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 outline-none focus:border-emerald-500/50 transition-colors"
             />
           </div>

           <button 
              onClick={handleSave}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-white py-4 rounded-xl font-bold text-sm transition-colors mt-2 shadow-lg shadow-emerald-500/20"
           >
              Add Expense
           </button>
        </div>
      </div>
    </div>
  );
}
