import React, { useState } from 'react';
import { supabase } from '../db/supabase';
import { Target } from 'lucide-react';

export function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password || password.length < 6) return alert("Valid credentials required. Password must be at least 6 characters.");
    
    // Prevent abusive injections in auth inputs
    if (email.length > 100 || password.length > 64) return alert("Inputs too long.");

    setLoading(true);
    let res;
    if (isSignUp) {
      res = await supabase.auth.signUp({ email, password });
    } else {
      res = await supabase.auth.signInWithPassword({ email, password });
    }
    if (res.error) alert(res.error.message);
    setLoading(false);
  };

  return (
    <div className="flex bg-[#0B0B0F] min-h-screen items-center justify-center p-4 text-white">
      <div className="w-full max-w-sm p-8 bg-[#12121A] rounded-3xl border border-gray-800 shadow-2xl animate-in zoom-in-95">
         <div className="flex justify-center mb-6">
            <Target size={40} className="text-[#818cf8]" />
         </div>
         <h1 className="text-2xl font-bold mb-6 text-center">{isSignUp ? 'Create Account' : 'Welcome Back'}</h1>
         <form onSubmit={handleAuth} className="space-y-4">
            <input 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={e=>setEmail(e.target.value)} 
              className="w-full bg-[#0B0B0F] border border-gray-800 p-3.5 rounded-xl focus:border-[#818cf8] outline-none" 
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={e=>setPassword(e.target.value)} 
              className="w-full bg-[#0B0B0F] border border-gray-800 p-3.5 rounded-xl focus:border-[#818cf8] outline-none" 
            />
            <button 
              disabled={loading} 
              type="submit" 
              className="w-full bg-[#818cf8] hover:bg-[#6366f1] transition text-white font-bold p-3.5 rounded-xl disabled:opacity-50"
            >
              {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Log In')}
            </button>
         </form>
         <button 
            onClick={() => setIsSignUp(!isSignUp)} 
            className="w-full text-center mt-5 text-sm font-medium text-gray-500 hover:text-white transition"
         >
            {isSignUp ? 'Already have an account? Log In' : 'Need an account? Sign Up'}
         </button>
      </div>
    </div>
  );
}
