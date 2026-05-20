import React from "react";
import { Home, Wallet, BookOpen, Target, LogOut, User } from "lucide-react";
import { supabase } from "../db/supabase";
import { toast } from "sonner";

export function Layout({ children, currentTab, setCurrentTab, user }) {
  const tabs = [
    { id: "home", icon: Home, label: "Timeline" },
    { id: "dashboard", icon: Wallet, label: "Finances" },
    { id: "goals", icon: Target, label: "Habits" },
    { id: "reports", icon: BookOpen, label: "Reports" },
  ];

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error(error.message);
    else toast.success("Signed out");
  };

  return (
    <div className="min-h-screen text-white selection:bg-indigo-500/30 bg-[#0A0A0F] flex flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-[#12121A] border-r border-gray-900 h-screen sticky top-0 shrink-0 p-6 z-40">
        <div className="flex items-center gap-3 mb-10 mt-2">
          <div className="w-9 h-9 bg-indigo-600/20 rounded-xl flex items-center justify-center text-indigo-400">
            <User size={18} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] uppercase tracking-widest text-[#818cf8] font-black">
              Activity Tracker
            </span>
            <span className="text-xs text-gray-400 font-medium truncate w-[140px]" title={user?.email}>
              {user?.email}
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-[#818cf8]/10 text-[#818cf8] border border-[#818cf8]/20 font-bold"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/40"
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-sm tracking-wide">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="pt-6 border-t border-gray-900">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-400/5 transition-all duration-200"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden flex justify-between items-center p-4 border-b border-gray-900/50 bg-[#0A0A0F]/50 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600/20 rounded-full flex items-center justify-center text-indigo-400">
              <User size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                Authenticated
              </span>
              <span className="text-xs text-gray-300 font-medium truncate max-w-[150px]">
                {user?.email}
              </span>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 text-gray-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/5"
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
        </header>

        {/* Dynamic page container width */}
        <main className="p-4 md:p-8 flex-1 w-full max-w-md md:max-w-5xl mx-auto pb-24 md:pb-8 min-h-full">
          {children}
        </main>
      </div>

      {/* Mobile Nav Bar */}
      <nav className="md:hidden fixed bottom-0 w-full bg-[#12121A] border-t border-gray-900 z-50">
        <div className="max-w-md mx-auto flex justify-around items-center h-[68px] pb-safe">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${
                  isActive ? "text-[#818cf8]" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <div
                  className={`p-1 rounded-xl transition-all ${
                    isActive ? "bg-[#818cf8]/10" : "bg-transparent"
                  }`}
                >
                  <Icon
                    size={isActive ? 24 : 22}
                    strokeWidth={isActive ? 2.5 : 2}
                    className="transition-all"
                  />
                </div>
                <span
                  className={`text-[10px] mt-1 tracking-wide transition-all ${
                    isActive ? "font-semibold" : "font-medium"
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
