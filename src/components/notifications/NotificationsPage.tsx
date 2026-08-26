import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Sparkles,
  Timer,
  Wallet,
  CheckCheck,
} from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const { notifications, markNotificationRead, markAllNotificationsRead, setActiveTab } = useApp();

  const getIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'study':
        return <Timer className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'budget':
        return <Wallet className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case 'event':
        return <Calendar className="w-5 h-5 text-sky-600 dark:text-sky-400" />;
      case 'presentation':
        return <Sparkles className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />;
      default:
        return <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-[#F8FAFC]">
            Notifications Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] mt-1">
            Stay on top of upcoming exams, focus streaks, and budget reminders.
          </p>
        </div>

        {notifications.some((n) => !n.read) && (
          <button
            id="mark-all-read-btn"
            onClick={markAllNotificationsRead}
            className="px-4 py-2 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-16 p-8 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B]">
            <Bell className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-[#F8FAFC]">No notifications yet</h3>
            <p className="text-xs text-slate-400 mt-1">You're completely up to date with your university tasks!</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => {
                markNotificationRead(notif.id);
                if (notif.link) {
                  if (notif.link.includes('study')) setActiveTab('study');
                  if (notif.link.includes('finance')) setActiveTab('finance');
                  if (notif.link.includes('planner')) setActiveTab('planner');
                  if (notif.link.includes('create')) setActiveTab('create');
                }
              }}
              className={`p-4 rounded-3xl border transition cursor-pointer flex items-start gap-4 ${
                notif.read
                  ? 'bg-white/60 dark:bg-[#0B1017]/50 border-slate-200/60 dark:border-[#1E293B]/60 opacity-75'
                  : 'bg-white dark:bg-[#0B1017] border-blue-200 dark:border-blue-800/80 shadow-xs'
              }`}
            >
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-[#101823] shrink-0">
                {getIcon(notif.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-[#F8FAFC] truncate">
                    {notif.title}
                  </h4>
                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5 leading-relaxed">
                  {notif.message}
                </p>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {new Date(notif.createdAt || notif.date || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
