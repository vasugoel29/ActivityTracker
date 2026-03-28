import React, { useState, useEffect } from 'react';
import { supabase } from './db/supabase';
import { Layout } from './components/Layout';
import { ActivityLog } from './components/ActivityLog';
import { BulkLoggerModal } from './components/BulkLoggerModal';
import { Expenses } from './components/Expenses';
import { Reports } from './components/Reports';
import { Habits } from './components/Habits';
import { FileText } from 'lucide-react';
import { useActivityNotifier } from './hooks/useActivityNotifier';
import { ToastProvider } from './components/Toaster';
import { GlobalJobQueue } from './components/GlobalJobQueue';

function App() {
  useActivityNotifier();

  const [currentTab, setCurrentTab] = useState('home');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  return (
    <ToastProvider>
      <GlobalJobQueue />
      <Layout currentTab={currentTab} setCurrentTab={setCurrentTab}>
        <div className="animate-in fade-in duration-300">
          {currentTab === 'home' && (
            <div className="flex justify-end p-2 -mb-2">
              <button 
                onClick={() => setIsBulkModalOpen(true)}
                className="text-xs font-bold text-gray-500 hover:text-[#818cf8] transition-colors flex items-center gap-1 bg-[#12121A] px-3 py-1.5 rounded-lg border border-gray-800 shadow-sm z-20"
              >
                <FileText size={14} />
                Paste Raw text
              </button>
            </div>
          )}

          {currentTab === 'home' && <ActivityLog />}
          {currentTab === 'dashboard' && <Expenses />}
          {currentTab === 'reports' && <Reports />}
          {currentTab === 'goals' && <Habits />}
        </div>

        <BulkLoggerModal isOpen={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} />
      </Layout>
    </ToastProvider>
  );
}

export default App;
