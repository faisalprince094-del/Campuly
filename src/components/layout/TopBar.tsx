import React from 'react';
import { useApp } from '../../context/AppContext';
import { Bell, Moon, Sun, Timer, Flame, Plus, Sparkles } from 'lucide-react';
import { UserAvatar } from '../ui/UserAvatar';
import { CampuslyLogo } from '../ui/CampuslyLogo';

export const TopBar: React.FC = () => {
  const {
    user,
    unreadNotifsCount,
    setActiveTab,
    setSubTab,
    theme,
    setTheme,
    timerState,
    setIsQuickActionsOpen,
  } = useApp();

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // Format today's date
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
  const firstName = user?.name ? user.name.split(' ')[0] : 'Student';

  const formatTimerMinutes = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 dark:bg-[#0B1017]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-[#1E293B] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Left: Greeting & Date */}
        <div>
          <div className="flex items-center gap-2">
            <div className="lg:hidden">
              <CampuslyLogo size="sm" showText={false} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight">
              {greeting}, {firstName} 👋
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] font-medium">
            {dateStr}
          </p>
        </div>

        {/* Center: Live Timer Badge (if running) */}
        {timerState.isRunning && (
          <button
            id="active-timer-topbar-pill"
            onClick={() => {
              setActiveTab('study');
              setSubTab('timer');
            }}
            className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold animate-pulse shadow-xs cursor-pointer"
          >
            <Timer className="w-3.5 h-3.5" />
            <span>Focus Active: {formatTimerMinutes(timerState.secondsLeft)}</span>
          </button>
        )}

        {/* Right: Controls & User Info */}
        <div className="flex items-center gap-3">
          {/* Quick Action Button */}
          <button
            id="topbar-quick-add-btn"
            onClick={() => setIsQuickActionsOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs shadow-blue-600/20 active:scale-95 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Quick Action</span>
          </button>

          {/* Theme Toggle */}
          <button
            id="theme-toggle-btn"
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full bg-slate-50 dark:bg-[#101823] border border-slate-200/80 dark:border-[#1E293B] flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-[#101823]/80 transition cursor-pointer"
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {/* Notifications Bell */}
          <button
            id="notifications-bell-btn"
            onClick={() => setActiveTab('notifications')}
            className="relative w-10 h-10 rounded-full bg-slate-50 dark:bg-[#101823] border border-slate-200/80 dark:border-[#1E293B] flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-[#101823]/80 transition cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifsCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-[#0B1017] rounded-full"></span>
            )}
          </button>

          {/* User Profile Pill */}
          <div
            id="topbar-profile-container"
            onClick={() => setActiveTab('profile')}
            className="flex items-center gap-3 pl-3 sm:pl-4 border-l border-slate-200 dark:border-[#1E293B] cursor-pointer group"
          >
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                {user?.name || 'Student'}
              </p>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                {user?.institution || user?.university || 'Campusly'}
              </p>
            </div>
            <UserAvatar
              src={user?.profilePhoto}
              name={user?.name || 'Student'}
              size="md"
              className="w-10 h-10"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
