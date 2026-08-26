import React from 'react';
import { useApp, MainTab } from '../../context/AppContext';
import { LayoutDashboard, GraduationCap, Sparkles, Wallet, CalendarDays } from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const { activeTab, setActiveTab, setSubTab, setIsQuickActionsOpen } = useApp();

  const handleNav = (tab: MainTab, defaultSub = 'overview') => {
    setActiveTab(tab);
    setSubTab(defaultSub);
  };

  return (
    <div className="lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-white/90 dark:bg-[#0B1017]/90 backdrop-blur-md border border-slate-200/80 dark:border-[#1E293B] shadow-2xl rounded-full px-6 py-2.5 flex items-center gap-6 sm:gap-8 transition-colors">
      {/* Home */}
      <button
        id="mobile-nav-home"
        onClick={() => handleNav('dashboard')}
        className={`flex flex-col items-center justify-center p-1 transition cursor-pointer ${
          activeTab === 'dashboard'
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
        aria-label="Home"
      >
        <LayoutDashboard className="w-6 h-6" />
      </button>

      {/* Study */}
      <button
        id="mobile-nav-study"
        onClick={() => handleNav('study', 'timer')}
        className={`flex flex-col items-center justify-center p-1 transition cursor-pointer ${
          activeTab === 'study'
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
        aria-label="Study Timer"
      >
        <GraduationCap className="w-6 h-6" />
      </button>

      {/* Center Raised Action Button */}
      <button
        id="mobile-nav-create-prominent"
        onClick={() => setIsQuickActionsOpen(true)}
        className="w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center text-white -mt-9 shadow-lg shadow-blue-600/40 border-4 border-white dark:border-[#05070A] active:scale-95 transition cursor-pointer shrink-0"
        aria-label="Quick Action"
      >
        <Sparkles className="w-6 h-6" />
      </button>

      {/* Finance */}
      <button
        id="mobile-nav-finance"
        onClick={() => handleNav('finance', 'overview')}
        className={`flex flex-col items-center justify-center p-1 transition cursor-pointer ${
          activeTab === 'finance'
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
        aria-label="Finance"
      >
        <Wallet className="w-6 h-6" />
      </button>

      {/* Planner */}
      <button
        id="mobile-nav-planner"
        onClick={() => handleNav('planner', 'tasks')}
        className={`flex flex-col items-center justify-center p-1 transition cursor-pointer ${
          activeTab === 'planner'
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
        aria-label="Planner"
      >
        <CalendarDays className="w-6 h-6" />
      </button>
    </div>
  );
};
