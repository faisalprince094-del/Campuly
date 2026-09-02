import React from 'react';
import { useApp, MainTab } from '../../context/AppContext';
import { isFeatureEnabled } from '../../config/features';
import { UserAvatar } from '../ui/UserAvatar';
import { CampuslyLogo } from '../ui/CampuslyLogo';
import {
  LayoutDashboard,
  GraduationCap,
  Sparkles,
  Wallet,
  CalendarDays,
  Bell,
  User,
  Settings,
  Timer,
  BookOpen,
  History,
  BarChart3,
  Presentation,
  Brain,
  Receipt,
  PiggyBank,
  CheckSquare,
  Calendar,
  PartyPopper,
  Flame,
  LogOut,
  AlertCircle,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    subTab,
    setSubTab,
    unreadNotifsCount,
    user,
    logout,
  } = useApp();

  const handleNav = (tab: MainTab, defaultSub = 'overview') => {
    setActiveTab(tab);
    setSubTab(defaultSub);
  };

  const isNavActive = (tab: MainTab) => activeTab === tab;

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-white dark:bg-[#0B1017] border-r border-slate-200/80 dark:border-[#1E293B] shrink-0 transition-colors">
      {/* Brand Header */}
      <div className="p-6 flex items-center">
        <CampuslyLogo size="md" showText={true} />
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto custom-scroll">
        {/* Main Dashboard */}
        <button
          id="sidebar-nav-dashboard"
          onClick={() => handleNav('dashboard')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
            isNavActive('dashboard')
              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#101823]'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Dashboard</span>
        </button>

        {/* Study Section */}
        <div className="space-y-1 pt-1">
          <button
            id="sidebar-nav-study"
            onClick={() => handleNav('study', 'timer')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              isNavActive('study')
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#101823]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Timer className="w-5 h-5" />
              <span>Study Timer</span>
            </div>
          </button>

          {isNavActive('study') && (
            <div className="pl-6 space-y-0.5 py-1">
              <button
                id="sidebar-sub-study-timer"
                onClick={() => {
                  setActiveTab('study');
                  setSubTab('timer');
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  subTab === 'timer'
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-950/60 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Pomodoro Focus</span>
              </button>
              <button
                id="sidebar-sub-study-subjects"
                onClick={() => {
                  setActiveTab('study');
                  setSubTab('subjects');
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  subTab === 'subjects'
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-950/60 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Subjects</span>
              </button>
              <button
                id="sidebar-sub-study-sessions"
                onClick={() => {
                  setActiveTab('study');
                  setSubTab('sessions');
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  subTab === 'sessions'
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-950/60 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>History</span>
              </button>
              <button
                id="sidebar-sub-study-analytics"
                onClick={() => {
                  setActiveTab('study');
                  setSubTab('analytics');
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  subTab === 'analytics'
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-950/60 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Analytics</span>
              </button>
            </div>
          )}
        </div>

        {/* AI Create */}
        <div className="space-y-1 pt-1">
          <button
            id="sidebar-nav-create"
            onClick={() => handleNav('create', 'presentation')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              isNavActive('create')
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#101823]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5" />
              <span>AI Create</span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white">AI</span>
          </button>

          {isNavActive('create') && (
            <div className="pl-6 space-y-0.5 py-1">
              <button
                id="sidebar-sub-create-presentation"
                onClick={() => {
                  setActiveTab('create');
                  setSubTab('presentation');
                }}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  subTab === 'presentation'
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-950/60 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Presentation Maker</span>
                {!isFeatureEnabled('FEATURE_PRESENTATION_AI_ENABLED') && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-950/80 text-blue-400 border border-blue-500/30">
                    Soon
                  </span>
                )}
              </button>
              <button
                id="sidebar-sub-create-ai-tools"
                onClick={() => {
                  setActiveTab('create');
                  setSubTab('ai-tools');
                }}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  subTab === 'ai-tools'
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-950/60 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Revision & AI Tools</span>
                {!isFeatureEnabled('FEATURE_REVISION_AI_ENABLED') && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-950/80 text-blue-400 border border-blue-500/30">
                    Soon
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* AI Study Assistant */}
        <button
          id="sidebar-nav-ai-assistant"
          onClick={() => handleNav('ai-assistant')}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
            isNavActive('ai-assistant')
              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#101823]'
          }`}
        >
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-blue-500" />
            <span>AI Assistant</span>
          </div>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
            Tutor
          </span>
        </button>


        {/* Finance */}
        <div className="space-y-1 pt-1">
          <button
            id="sidebar-nav-finance"
            onClick={() => handleNav('finance', 'overview')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              isNavActive('finance')
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#101823]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5" />
              <span>Finance</span>
            </div>
          </button>

          {isNavActive('finance') && (
            <div className="pl-6 space-y-0.5 py-1">
              <button
                id="sidebar-sub-finance-overview"
                onClick={() => {
                  setActiveTab('finance');
                  setSubTab('overview');
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  subTab === 'overview'
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-950/60 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Overview</span>
              </button>
              <button
                id="sidebar-sub-finance-transactions"
                onClick={() => {
                  setActiveTab('finance');
                  setSubTab('transactions');
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  subTab === 'transactions'
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-950/60 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Transactions</span>
              </button>
              <button
                id="sidebar-sub-finance-budget"
                onClick={() => {
                  setActiveTab('finance');
                  setSubTab('budget');
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  subTab === 'budget'
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-950/60 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Budget & Alerts</span>
              </button>
            </div>
          )}
        </div>

        {/* Planner */}
        <div className="space-y-1 pt-1">
          <button
            id="sidebar-nav-planner"
            onClick={() => handleNav('planner', 'tasks')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              isNavActive('planner')
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#101823]'
            }`}
          >
            <div className="flex items-center gap-3">
              <CalendarDays className="w-5 h-5" />
              <span>Planner</span>
            </div>
          </button>

          {isNavActive('planner') && (
            <div className="pl-6 space-y-0.5 py-1">
              <button
                id="sidebar-sub-planner-tasks"
                onClick={() => {
                  setActiveTab('planner');
                  setSubTab('tasks');
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  subTab === 'tasks'
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-950/60 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Tasks & Deadlines</span>
              </button>
              <button
                id="sidebar-sub-planner-calendar"
                onClick={() => {
                  setActiveTab('planner');
                  setSubTab('calendar');
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  subTab === 'calendar'
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-950/60 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Calendar</span>
              </button>
              <button
                id="sidebar-sub-planner-events"
                onClick={() => {
                  setActiveTab('planner');
                  setSubTab('events');
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  subTab === 'events'
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-950/60 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>University Events</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Support & Quick Settings Box */}
      <div className="p-4 border-t border-slate-100 dark:border-[#1E293B]">
        <div className="bg-slate-50 dark:bg-[#101823] rounded-2xl p-4 border border-slate-200/80 dark:border-[#1E293B]">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Support & Profile</p>
          <button
            id="sidebar-support-profile-btn"
            onClick={() => setActiveTab('profile')}
            className="w-full text-left text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 py-1 transition-colors font-medium flex items-center justify-between cursor-pointer"
          >
            <span>Student Profile</span>
            <UserAvatar src={user?.profilePhoto} name={user?.name} size="xs" ring={false} />
          </button>
          <button
            id="sidebar-support-settings-btn"
            onClick={() => setActiveTab('settings')}
            className="w-full text-left text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 py-1 transition-colors font-medium flex items-center justify-between cursor-pointer"
          >
            <span>Settings</span>
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            id="sidebar-support-notifs-btn"
            onClick={() => setActiveTab('notifications')}
            className="w-full text-left text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 py-1 transition-colors font-medium flex items-center justify-between cursor-pointer"
          >
            <span>Notifications</span>
            {unreadNotifsCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadNotifsCount}
              </span>
            )}
          </button>
          <button
            id="sidebar-support-logout-btn"
            onClick={logout}
            className="w-full text-left text-sm text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 py-1 transition-colors font-medium flex items-center justify-between cursor-pointer mt-1 pt-1.5 border-t border-slate-200/60 dark:border-[#1E293B]"
          >
            <span>Sign Out</span>
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
