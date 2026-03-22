import React, { useState, useEffect } from 'react';
import { supabase } from './db/supabase';
import { Layout } from './components/Layout';
import { HourlyTimeline } from './components/HourlyTimeline';
import { BulkLoggerModal } from './components/BulkLoggerModal';
import { Dashboard } from './components/Dashboard';
import { Reports } from './components/Reports';
import { Goals } from './components/Goals';
import { FileText } from 'lucide-react';
import { useAutoReportGenerator } from './hooks/useAutoReportGenerator';
import { ToastProvider } from './components/Toaster';
import { GlobalJobQueue } from './components/GlobalJobQueue';
import { Auth } from './components/Auth';

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useAutoReportGenerator();

  const [currentTab, setCurrentTab] = useState('home');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  if (!session) return <Auth />;

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

          {currentTab === 'home' && <HourlyTimeline />}
          {currentTab === 'dashboard' && <Dashboard />}
          {currentTab === 'reports' && <Reports />}
          {currentTab === 'goals' && <Goals />}
        </div>

        <BulkLoggerModal isOpen={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} />
      </Layout>
    </ToastProvider>
  );
}

export default App;
