import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Timer,
  CheckSquare,
  Wallet,
  Calendar,
  Sparkles,
  ArrowRight,
  PlusCircle,
  Play,
  Clock,
  BookOpen,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  CalendarDays,
  Flame,
  Award,
} from 'lucide-react';
import { motion } from 'motion/react';

export const HomeDashboard: React.FC = () => {
  const {
    user,
    tasks,
    expenses,
    events,
    presentations,
    subjects,
    setActiveTab,
    setSubTab,
    setActivePresentationId,
    setIsAddExpenseOpen,
    setIsAddTaskOpen,
    startTimer,
    toggleTask,
    formatCurrency,
    timerState,
    todayStudyMinutes,
    formattedTodayStudyTime,
    studyGoalMinutes,
    studyProgressPercent,
    weeklyStudyData,
  } = useApp();

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
  const firstName = user?.name ? user.name.split(' ')[0] : 'Student';

  // Format today's date
  const todayDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const todayIso = new Date().toISOString().split('T')[0];

  // Tasks metrics
  const todayTasks = useMemo(() => {
    return tasks.filter((t) => t.dueDate === todayIso || !t.completed);
  }, [tasks, todayIso]);

  const completedTodayCount = tasks.filter((t) => t.completed && (t.completedAt?.startsWith(todayIso) || t.dueDate === todayIso)).length;
  const totalTasksCount = Math.max(tasks.length, 1);

  // Today's spending
  const todaySpending = useMemo(() => {
    return expenses
      .filter((e) => e.date === todayIso)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses, todayIso]);

  // Upcoming items (deadlines + events within next 7 days)
  const upcomingDeadlines = useMemo(() => {
    return tasks.filter((t) => !t.completed && t.dueDate >= todayIso).slice(0, 3);
  }, [tasks, todayIso]);

  const upcomingEvents = useMemo(() => {
    return events.filter((e) => e.date >= todayIso).slice(0, 3);
  }, [events, todayIso]);

  const upcomingCount = upcomingDeadlines.length + upcomingEvents.length;

  // Continue presentation
  const continuePresentation = useMemo(() => {
    if (presentations.length === 0) return null;
    return [...presentations].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0];
  }, [presentations]);

  const maxWeeklyMins = Math.max(...(weeklyStudyData?.data || []).map((d) => d.mins || 0), 60);

  // Subject lookup helper
  const getSubject = (id?: string) => (subjects || []).find((s) => s.id === id);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* 4 Metric Overview Cards (Clean Utility Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Study Session */}
        <div
          id="stat-card-study"
          onClick={() => {
            setActiveTab('study');
            setSubTab('timer');
          }}
          className="bg-white dark:bg-[#0B1017] p-5 rounded-[22px] border border-slate-200/80 dark:border-[#1E293B] shadow-xs hover:border-blue-300 dark:hover:border-blue-700/80 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-slate-500 dark:text-[#94A3B8] font-medium">Study Session</p>
            {timerState.isRunning && (
              <span className={`flex items-center gap-1 text-[10px] font-bold ${
                timerState.mode === 'break'
                  ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800'
                  : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800'
              } px-2 py-0.5 rounded-full animate-pulse border`}>
                <span className={`w-1.5 h-1.5 rounded-full ${timerState.mode === 'break' ? 'bg-amber-500' : 'bg-blue-600 animate-ping'}`} />
                {timerState.mode === 'break' ? 'Break' : 'Live Focus'}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight">
            {formattedTodayStudyTime}
          </p>
          <div className="mt-3 flex items-center text-xs text-emerald-500 font-semibold">
            <TrendingUp className="w-3.5 h-3.5 mr-1 shrink-0" />
            <span>{studyProgressPercent}% of daily goal</span>
          </div>
        </div>

        {/* Tasks Due */}
        <div
          id="stat-card-tasks"
          onClick={() => {
            setActiveTab('planner');
            setSubTab('tasks');
          }}
          className="bg-white dark:bg-[#0B1017] p-5 rounded-[22px] border border-slate-200/80 dark:border-[#1E293B] shadow-xs hover:border-blue-300 dark:hover:border-blue-700/80 transition-all cursor-pointer group"
        >
          <p className="text-sm text-slate-500 dark:text-[#94A3B8] mb-1 font-medium">Tasks Due</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight">
            {tasks.filter((t) => t.completed).length} / {tasks.length}
          </p>
          <div className="mt-3 h-1.5 w-full bg-slate-100 dark:bg-[#101823] rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{
                width: `${tasks.length > 0 ? Math.round((tasks.filter((t) => t.completed).length / tasks.length) * 100) : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Today's Spending */}
        <div
          id="stat-card-spending"
          onClick={() => {
            setActiveTab('finance');
            setSubTab('overview');
          }}
          className="bg-white dark:bg-[#0B1017] p-5 rounded-[22px] border border-slate-200/80 dark:border-[#1E293B] shadow-xs hover:border-blue-300 dark:hover:border-blue-700/80 transition-all cursor-pointer group"
        >
          <p className="text-sm text-slate-500 dark:text-[#94A3B8] mb-1 font-medium">Today's Spending</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight">
            {formatCurrency(todaySpending)}
          </p>
          <div className="mt-3 flex items-center text-xs text-amber-500 font-semibold">
            <Wallet className="w-3.5 h-3.5 mr-1 shrink-0" />
            <span>Recorded expenses</span>
          </div>
        </div>

        {/* Upcoming */}
        <div
          id="stat-card-upcoming"
          onClick={() => {
            setActiveTab('planner');
            setSubTab('calendar');
          }}
          className="bg-white dark:bg-[#0B1017] p-5 rounded-[22px] border border-slate-200/80 dark:border-[#1E293B] shadow-xs hover:border-blue-300 dark:hover:border-blue-700/80 transition-all cursor-pointer group"
        >
          <p className="text-sm text-slate-500 dark:text-[#94A3B8] mb-1 font-medium">Upcoming</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight">
            {upcomingCount}
          </p>
          <p className="mt-3 text-xs text-slate-500 dark:text-[#94A3B8] truncate">
            {upcomingDeadlines[0] ? `Next: ${upcomingDeadlines[0].title}` : 'No immediate deadlines'}
          </p>
        </div>
      </div>

      {/* Main 2-Column Split Layout */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Left Column (Hero Feature Card + Tasks) */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Hero Feature Banner */}
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 p-6 sm:p-8 rounded-[32px] text-white relative overflow-hidden shrink-0 shadow-lg shadow-blue-600/20">
            <div className="relative z-10">
              <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold mb-4 inline-block tracking-wider uppercase">
                IN PROGRESS
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                {continuePresentation ? continuePresentation.title : 'AI Academic Presentation'}
              </h2>
              <p className="text-white/80 text-sm mb-6 max-w-lg">
                {continuePresentation
                  ? `${continuePresentation.progressPercent || 65}% completed • ${continuePresentation.slides?.length || 8} slides generated with speaker notes`
                  : 'Generate complete slide decks with academic outlines & speech notes in seconds.'}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  id="hero-continue-editing-btn"
                  onClick={() => {
                    if (continuePresentation) {
                      setActivePresentationId(continuePresentation.id);
                    }
                    setActiveTab('create');
                    setSubTab('presentation');
                  }}
                  className="bg-white text-blue-700 px-5 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-lg active:scale-95 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{continuePresentation ? 'Continue Slides' : 'Presentation Maker'}</span>
                </button>

                <button
                  id="hero-ask-ai-tutor-btn"
                  onClick={() => setActiveTab('ai-assistant')}
                  className="bg-white/15 hover:bg-white/25 border border-white/20 text-white px-5 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 transition-colors active:scale-95 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>AI Study Assistant</span>
                </button>
              </div>
            </div>
            {/* Ambient decorative blur circle */}
            <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* Today's Tasks Card */}
          <div className="flex-1 bg-white dark:bg-[#0B1017] rounded-[32px] border border-slate-200/80 dark:border-[#1E293B] p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-[#F8FAFC]">Today's Tasks</h3>
              <span
                id="home-view-all-tasks-link"
                onClick={() => {
                  setActiveTab('planner');
                  setSubTab('tasks');
                }}
                className="text-sm text-blue-600 dark:text-blue-400 font-semibold cursor-pointer hover:underline"
              >
                View All
              </span>
            </div>

            <div className="space-y-3">
              {todayTasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckSquare className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">All caught up for today!</p>
                  <button
                    id="add-task-empty-state-btn"
                    onClick={() => setIsAddTaskOpen(true)}
                    className="mt-3 px-4 py-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    + Add New Task
                  </button>
                </div>
              ) : (
                todayTasks.slice(0, 4).map((task) => {
                  const subject = getSubject(task.subjectId);
                  return (
                    <div
                      key={task.id}
                      className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                        task.completed
                          ? 'bg-blue-50/40 dark:bg-blue-950/20 border-transparent opacity-60'
                          : 'bg-slate-50 dark:bg-[#101823] border-slate-200/60 dark:border-[#1E293B] hover:border-blue-300 dark:hover:border-blue-700'
                      }`}
                    >
                      <button
                        id={`task-check-${task.id}`}
                        onClick={() => toggleTask(task.id)}
                        className={`w-6 h-6 border-2 rounded-lg flex items-center justify-center cursor-pointer transition shrink-0 ${
                          task.completed
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-blue-500 bg-white dark:bg-[#0B1017]'
                        }`}
                      >
                        {task.completed && <CheckSquare className="w-4 h-4 fill-white text-blue-600" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-semibold text-sm text-slate-800 dark:text-slate-100 truncate ${
                            task.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''
                          }`}
                        >
                          {task.title}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-[#94A3B8] truncate">
                          {subject?.name || 'Academic'} • {task.priority.toUpperCase()} Priority
                        </p>
                      </div>

                      <span className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-[#0B1017] px-2.5 py-1 rounded-md border border-slate-200 dark:border-[#1E293B] shrink-0">
                        {task.dueDate === todayIso ? 'Due Today' : task.dueDate}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Study Goal Circle + Quick Actions + Weekly Progress) */}
        <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
          {/* Study Goal Circular Card */}
          <div className="bg-white dark:bg-[#0B1017] rounded-[32px] border border-slate-200/80 dark:border-[#1E293B] p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-[#F8FAFC]">Today's Study Goal</h3>
              {timerState.isRunning && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  timerState.mode === 'break'
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                    : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                } border flex items-center gap-1`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${timerState.mode === 'break' ? 'bg-amber-500' : 'bg-blue-600 animate-ping'}`} />
                  {timerState.mode === 'break' ? 'On Break' : 'Live Tracking'}
                </span>
              )}
            </div>
            
            <div className="relative flex items-center justify-center mb-6">
              {/* Circular SVG Gauge */}
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  className="text-slate-100 dark:text-[#101823]"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray="351.85"
                  strokeDashoffset={351.85 - (351.85 * studyProgressPercent) / 100}
                  className="text-blue-600 transition-all duration-700"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute text-center">
                <p className="text-xl font-bold text-slate-900 dark:text-[#F8FAFC]">
                  {formattedTodayStudyTime}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] font-bold uppercase tracking-wider">
                  of {(studyGoalMinutes / 60).toFixed(0)}h goal
                </p>
              </div>
            </div>

            <button
              id="start-focus-session-btn"
              onClick={() => {
                setActiveTab('study');
                setSubTab('timer');
                if (!timerState.isRunning && !timerState.isPaused) {
                  startTimer(50, 'focus');
                }
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white py-3 rounded-2xl font-bold text-sm transition-colors cursor-pointer active:scale-95 shadow-xs shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              {timerState.isRunning ? (
                <>
                  <Timer className="w-4 h-4 animate-spin" />
                  <span>
                    {timerState.mode === 'break' ? 'Break in Progress' : 'Focus in Progress'} ({Math.floor(timerState.secondsLeft / 60)}m left)
                  </span>
                </>
              ) : timerState.isPaused ? (
                <>
                  <Play className="w-4 h-4" />
                  <span>{timerState.mode === 'break' ? 'Resume Break' : 'Resume Focus Session'}</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Start Focus Session</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Actions 2x2 Grid + Weekly Mini-Chart */}
          <div className="bg-white dark:bg-[#0B1017] rounded-[32px] border border-slate-200/80 dark:border-[#1E293B] p-6 flex flex-col">
            <h3 className="text-lg font-bold text-slate-900 dark:text-[#F8FAFC] mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {/* Add Task */}
              <div
                id="quick-action-task"
                onClick={() => setIsAddTaskOpen(true)}
                className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl flex flex-col items-center gap-2 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-xs">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300">Add Task</span>
              </div>

              {/* Expense */}
              <div
                id="quick-action-expense"
                onClick={() => setIsAddExpenseOpen(true)}
                className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl flex flex-col items-center gap-2 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-colors"
              >
                <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-xs">
                  <Wallet className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Expense</span>
              </div>

              {/* New Event */}
              <div
                id="quick-action-event"
                onClick={() => {
                  setActiveTab('planner');
                  setSubTab('calendar');
                }}
                className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl flex flex-col items-center gap-2 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-colors"
              >
                <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center text-white shadow-xs">
                  <Calendar className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300">New Event</span>
              </div>

              {/* Generate */}
              <div
                id="quick-action-generate"
                onClick={() => {
                  setActiveTab('create');
                  setSubTab('presentation');
                }}
                className="p-4 bg-sky-50 dark:bg-sky-950/40 rounded-2xl flex flex-col items-center gap-2 cursor-pointer hover:bg-sky-100 dark:hover:bg-sky-950/60 transition-colors"
              >
                <div className="w-10 h-10 bg-sky-600 rounded-xl flex items-center justify-center text-white shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-sky-700 dark:text-sky-300">AI Slide Deck</span>
              </div>
            </div>

            {/* This Week Mini Chart */}
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-[#1E293B]">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  This Week
                </h4>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {Math.round(weeklyStudyData.totalMinutes / 60)}h {weeklyStudyData.totalMinutes % 60}m total
                </span>
              </div>
              <div className="flex items-end justify-between h-20 gap-1.5">
                {weeklyStudyData.data.map((item, idx) => {
                  const heightPercent = Math.max(15, Math.min(100, Math.round((item.mins / maxWeeklyMins) * 100)));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="w-full flex justify-center items-end h-14">
                        <div
                          title={`${item.day}: ${item.mins} mins`}
                          className={`w-full rounded-t-sm transition-all ${
                            item.isToday
                              ? 'bg-blue-600 shadow-xs'
                              : 'bg-blue-200 dark:bg-blue-950/60 group-hover:bg-blue-400'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                      <span
                        className={`text-[10px] font-bold ${
                          item.isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {item.day.charAt(0)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
