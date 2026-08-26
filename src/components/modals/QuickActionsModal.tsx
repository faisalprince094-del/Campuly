import React from 'react';
import { useApp } from '../../context/AppContext';
import { isFeatureEnabled } from '../../config/features';
import { Presentation, PlusCircle, Timer, CheckSquare, Calendar, Sparkles, X, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const QuickActionsModal: React.FC = () => {
  const {
    isQuickActionsOpen,
    setIsQuickActionsOpen,
    setIsAddExpenseOpen,
    setIsAddTaskOpen,
    setIsAddEventOpen,
    setActiveTab,
    setSubTab,
    startTimer,
  } = useApp();

  if (!isQuickActionsOpen) return null;

  const isPresEnabled = isFeatureEnabled('FEATURE_PRESENTATION_AI_ENABLED');

  const actions = [
    {
      id: 'create_presentation',
      title: 'Create Presentation',
      description: isPresEnabled ? 'Generate AI slide deck with speaker notes' : 'Browse saved slides & presentation studio',
      icon: Presentation,
      color: 'bg-blue-600 text-white',
      badge: isPresEnabled ? 'AI Powered' : 'Under Improvement',
      onClick: () => {
        setIsQuickActionsOpen(false);
        setActiveTab('create');
        setSubTab('presentation');
      },
    },
    {
      id: 'quick_expense',
      title: 'Add Expense',
      description: 'Record food, transport or books in 3s',
      icon: PlusCircle,
      color: 'bg-emerald-600 text-white',
      badge: 'Fast',
      onClick: () => {
        setIsQuickActionsOpen(false);
        setIsAddExpenseOpen(true);
      },
    },
    {
      id: 'start_focus',
      title: 'Start Focus Study',
      description: 'Launch 50-minute Pomodoro focus block',
      icon: Timer,
      color: 'bg-blue-600 text-white',
      badge: '50m Focus',
      onClick: () => {
        setIsQuickActionsOpen(false);
        setActiveTab('study');
        setSubTab('timer');
        startTimer(50, 'focus');
      },
    },
    {
      id: 'add_task',
      title: 'Add Task / Deadline',
      description: 'Schedule assignment or exam review',
      icon: CheckSquare,
      color: 'bg-amber-600 text-white',
      badge: 'Organize',
      onClick: () => {
        setIsQuickActionsOpen(false);
        setIsAddTaskOpen(true);
      },
    },
    {
      id: 'add_event',
      title: 'Add Campus Event',
      description: 'Seminar, contest, or workshop',
      icon: Calendar,
      color: 'bg-sky-600 text-white',
      badge: 'Campus',
      onClick: () => {
        setIsQuickActionsOpen(false);
        setIsAddEventOpen(true);
      },
    },
    {
      id: 'ai_tutor',
      title: 'AI Study Assistant',
      description: 'Chat, clarify concepts, quizzes & flashcards',
      icon: Brain,
      color: 'bg-blue-600 text-white',
      badge: 'AI Tutor',
      onClick: () => {
        setIsQuickActionsOpen(false);
        setActiveTab('ai-assistant');
      },
    },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white dark:bg-[#0B1017] w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/80 dark:border-[#1E293B] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#1E293B]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">Quick Actions</h2>
            </div>
            <button
              id="close-quick-actions-btn"
              onClick={() => setIsQuickActionsOpen(false)}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-[#101823] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
            {actions.map((act) => {
              const Icon = act.icon;
              return (
                <button
                  key={act.id}
                  id={`quick-act-${act.id}`}
                  onClick={act.onClick}
                  className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#101823] hover:bg-blue-50/60 dark:hover:bg-blue-950/30 border border-slate-200/70 dark:border-[#1E293B] text-left transition group cursor-pointer"
                >
                  <div className={`w-11 h-11 rounded-2xl ${act.color} flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] truncate">{act.title}</h4>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 shrink-0">
                        {act.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] truncate">{act.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
