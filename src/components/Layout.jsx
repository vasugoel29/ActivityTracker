import React from 'react';
import { Home, Wallet, BookOpen, Target } from 'lucide-react';

export function Layout({ children, currentTab, setCurrentTab }) {
  const tabs = [
    { id: 'home', icon: Home, label: 'Timeline' },
    { id: 'dashboard', icon: Wallet, label: 'Finances' },
    { id: 'goals', icon: Target, label: 'Habits' },
    { id: 'reports', icon: BookOpen, label: 'Reports' }
  ];

  return (
    <div className="min-h-screen text-white pb-20 selection:bg-indigo-500/30">
      <main className="p-4 max-w-md mx-auto min-h-full">
        {children}
      </main>

      <nav className="fixed bottom-0 w-full bg-[#12121A] border-t border-gray-900 z-50">
        <div className="max-w-md mx-auto flex justify-around items-center h-[68px] pb-safe">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${isActive ? 'text-[#818cf8]' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-[#818cf8]/10' : 'bg-transparent'}`}>
                  <Icon size={isActive ? 24 : 22} strokeWidth={isActive ? 2.5 : 2} className="transition-all" />
                </div>
                <span className={`text-[10px] mt-1 tracking-wide transition-all ${isActive ? 'font-semibold' : 'font-medium'}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
