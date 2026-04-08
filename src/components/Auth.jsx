import React, { useState, useEffect } from 'react';
import { supabase } from '../db/supabase';
import { Mail, Lock, User, ArrowRight, Loader2, BarChart3, Fingerprint } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from './Toaster';

export function Auth({ recoveryMode, onPasswordUpdated }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState(recoveryMode ? 'update' : 'signin'); // modes: signin, signup, forgot, update
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Handle recoveryMode prop change
  useEffect(() => {
    if (recoveryMode) setMode('update');
  }, [recoveryMode]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success('Account created successfully!');
      } else if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Welcome back!');
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin
        });
        if (error) throw error;
        toast.success('Password reset link sent to your email');
        setMode('signin');
      } else if (mode === 'update') {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success('Password updated successfully!');
        if (onPasswordUpdated) onPasswordUpdated();
      }
    } catch (error) {
      let msg = error.message || 'An error occurred';
      if (msg.includes('rate limit') || error.status === 429) {
        msg = "Rate limit reached. Please wait a few minutes before trying again.";
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const titles = {
    signin: 'Welcome Back',
    signup: 'Create Account',
    forgot: 'Reset Password',
    update: 'Set New Password'
  };

  const descriptions = {
    signin: 'Secure access to your performance metrics',
    signup: 'Join the community of performance trackers',
    forgot: 'Enter your email to receive a recovery link',
    update: 'Secure your account with a new password'
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-gray-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl -ml-48 -mb-48 pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="bg-[#12121A] border border-gray-800 p-8 rounded-3xl shadow-2xl backdrop-blur-sm relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
              <BarChart3 className="text-white" size={28} />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
              {titles[mode]}
            </h1>
            <p className="text-gray-400 text-center">
              {descriptions[mode]}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {mode !== 'update' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Email address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 group-focus-within:text-indigo-400 transition-colors">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#181823] border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-600"
                    placeholder="name@example.com"
                    required
                  />
                </div>
              </div>
            )}

            {mode !== 'forgot' && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                    {mode === 'update' ? 'New Password' : 'Password'}
                  </label>
                  {mode === 'signin' && (
                    <button 
                      type="button" 
                      onClick={() => setMode('forgot')}
                      className="text-[10px] text-gray-600 hover:text-indigo-400 transition-colors uppercase font-bold tracking-tighter"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 group-focus-within:text-indigo-400 transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#181823] border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-600"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 mt-4 active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <span>
                    {mode === 'signin' ? 'Sign in' : 
                     mode === 'signup' ? 'Create account' : 
                     mode === 'forgot' ? 'Send Link' : 'Update Password'}
                  </span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex flex-col items-center gap-4">
            {mode === 'forgot' ? (
              <button
                onClick={() => setMode('signin')}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Back to Sign in
              </button>
            ) : mode !== 'update' ? (
              <button
                onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            ) : null}
            
            <div className="flex items-center gap-2 text-[10px] text-gray-600 uppercase tracking-widest">
              <Fingerprint size={12} />
              <span>Encrypted Data Vault</span>
            </div>
          </div>
        </div>
        
        <p className="mt-8 text-center text-xs text-gray-600 leading-relaxed uppercase tracking-tighter opacity-50">
          Strict Multi-Tenant Isolation & Row-Level Security Enforced
        </p>
      </motion.div>
    </div>
  );
}
