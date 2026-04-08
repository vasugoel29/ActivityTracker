import React, { useState, useEffect } from 'react';
import { supabase } from './db/supabase';
import { Layout } from './components/Layout';
import { ActivityLog } from './components/ActivityLog';
import { BulkLoggerModal } from './components/BulkLoggerModal';
import { Expenses } from './components/Expenses';
import { Reports } from './components/Reports';
import { Habits } from './components/Habits';
import { Auth } from './components/Auth';
import { FileText, Loader2 } from 'lucide-react';
import { useActivityNotifier } from './hooks/useActivityNotifier';
import { ToastProvider } from './components/Toaster';
import { GlobalJobQueue } from './components/GlobalJobQueue';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [currentTab, setCurrentTab] = useState('home');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useActivityNotifier();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  if (!session || isRecoveryMode) {
    return (
      <ToastProvider>
        <Auth recoveryMode={isRecoveryMode} onPasswordUpdated={() => setIsRecoveryMode(false)} />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <GlobalJobQueue />
      <Layout currentTab={currentTab} setCurrentTab={setCurrentTab} user={session.user}>
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
