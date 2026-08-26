import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Task, UniversityEvent, Priority } from '../../types';
import {
  CalendarDays,
  CheckSquare,
  PartyPopper,
  Plus,
  Trash2,
  Clock,
  MapPin,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Flame,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';

export const PlannerSection: React.FC = () => {
  const {
    subTab,
    setSubTab,
    tasks,
    toggleTask,
    deleteTask,
    events,
    deleteEvent,
    subjects,
    setIsAddTaskOpen,
    setIsAddEventOpen,
  } = useApp();

  const [taskFilter, setTaskFilter] = useState<'all' | 'today' | 'upcoming' | 'completed'>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState<string>(new Date().toISOString().split('T')[0]);

  const todayIso = new Date().toISOString().split('T')[0];

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (selectedSubjectId !== 'all' && t.subjectId !== selectedSubjectId) return false;
      if (taskFilter === 'today') return t.dueDate === todayIso;
      if (taskFilter === 'upcoming') return !t.completed && t.dueDate >= todayIso;
      if (taskFilter === 'completed') return t.completed;
      return true;
    });
  }, [tasks, taskFilter, selectedSubjectId, todayIso]);

  // Calendar Math
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const monthName = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Map tasks and events to calendar dates
  const dateMap = useMemo(() => {
    const map: Record<string, { tasks: Task[]; events: UniversityEvent[] }> = {};

    tasks.forEach((t) => {
      if (!map[t.dueDate]) map[t.dueDate] = { tasks: [], events: [] };
      map[t.dueDate].tasks.push(t);
    });

    events.forEach((e) => {
      if (!map[e.date]) map[e.date] = { tasks: [], events: [] };
      map[e.date].events.push(e);
    });

    return map;
  }, [tasks, events]);

  const activeDayData = dateMap[selectedDayEvents] || { tasks: [], events: [] };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-[#F8FAFC]">
            Planner & Campus Schedule
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] mt-1">
            Assignments, project deadlines, and campus events in one unified schedule.
          </p>
        </div>

        {/* Sub-tabs pills */}
        <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs">
          {[
            { id: 'tasks', label: 'Tasks & Deadlines', icon: CheckSquare },
            { id: 'calendar', label: 'Monthly Calendar', icon: CalendarIcon },
            { id: 'events', label: 'University Events', icon: PartyPopper },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = subTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`planner-tab-${tab.id}`}
                onClick={() => setSubTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* -------------------------------------------------------------
          SUB-TAB 1: TASKS & DEADLINES
         ------------------------------------------------------------- */}
      {subTab === 'tasks' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs">
            {/* Filter pills */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'All Tasks' },
                { id: 'today', label: 'Due Today' },
                { id: 'upcoming', label: 'Upcoming' },
                { id: 'completed', label: 'Completed' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setTaskFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    taskFilter === f.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-50 dark:bg-[#101823] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <select
                id="task-filter-subject-select"
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="all">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <button
                id="add-task-planner-btn"
                onClick={() => setIsAddTaskOpen(true)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Task</span>
              </button>
            </div>
          </div>

          {/* Task list */}
          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12 p-6 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B]">
                <CheckSquare className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No tasks found</h4>
                <p className="text-xs text-slate-400 mt-0.5">You're all organized in this category.</p>
              </div>
            ) : (
              filteredTasks.map((task) => {
                const sub = subjects.find((s) => s.id === task.subjectId);
                const isUrgent = task.priority === 'urgent';
                const isHigh = task.priority === 'high';

                return (
                  <div
                    key={task.id}
                    className={`flex items-start justify-between p-4 rounded-3xl border transition-all group ${
                      task.completed
                        ? 'bg-slate-50/70 dark:bg-[#101823]/50 border-slate-200/60 dark:border-[#1E293B]/60 opacity-60'
                        : 'bg-white dark:bg-[#0B1017] border-slate-200/80 dark:border-[#1E293B] hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <button
                        id={`planner-task-toggle-${task.id}`}
                        onClick={() => toggleTask(task.id)}
                        className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition shrink-0 cursor-pointer ${
                          task.completed
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-slate-300 dark:border-slate-700 hover:border-blue-500'
                        }`}
                      >
                        {task.completed && <CheckSquare className="w-3.5 h-3.5" />}
                      </button>

                      <div className="min-w-0 space-y-1">
                        <h4
                          className={`text-sm font-bold text-slate-900 dark:text-[#F8FAFC] ${
                            task.completed ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {task.title}
                        </h4>

                        {task.description && (
                          <p className="text-xs text-slate-500 dark:text-[#94A3B8] line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {sub && (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                              style={{ backgroundColor: `${sub.color}20`, color: sub.color }}
                            >
                              {sub.name}
                            </span>
                          )}

                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                              isUrgent
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                                : isHigh
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                                : 'bg-slate-100 text-slate-600 dark:bg-[#101823] dark:text-slate-400'
                            }`}
                          >
                            {task.priority}
                          </span>

                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {task.dueDate}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      id={`delete-task-${task.id}`}
                      onClick={() => deleteTask(task.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition rounded-lg cursor-pointer"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          SUB-TAB 2: MONTHLY CALENDAR
         ------------------------------------------------------------- */}
      {subTab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Calendar Grid (8 cols) */}
          <div className="lg:col-span-8 p-6 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs space-y-4">
            {/* Header / Month switch */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1E293B]">
              <h3 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">{monthName}</h3>
              <div className="flex items-center gap-1">
                <button
                  id="calendar-prev-month"
                  onClick={() => setCalendarDate(new Date(year, month - 1, 1))}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#101823] text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  id="calendar-next-month"
                  onClick={() => setCalendarDate(new Date(year, month + 1, 1))}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#101823] text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Days of week */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 uppercase py-1">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Dates Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {/* Empty padding days */}
              {Array.from({ length: firstDay }).map((_, idx) => (
                <div key={`empty-${idx}`} className="h-16 sm:h-20 rounded-2xl bg-transparent" />
              ))}

              {/* Month days */}
              {Array.from({ length: totalDays }).map((_, idx) => {
                const dayNum = idx + 1;
                const dStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${dayNum
                  .toString()
                  .padStart(2, '0')}`;
                const data = dateMap[dStr];
                const isToday = dStr === todayIso;
                const isSelected = dStr === selectedDayEvents;

                return (
                  <div
                    key={dStr}
                    onClick={() => setSelectedDayEvents(dStr)}
                    className={`h-16 sm:h-20 p-2 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-600 dark:border-blue-500'
                        : isToday
                        ? 'bg-slate-50 dark:bg-[#101823] border-blue-400 dark:border-blue-600'
                        : 'bg-white dark:bg-[#0B1017] border-slate-100 dark:border-[#1E293B]/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold ${
                          isToday
                            ? 'w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {dayNum}
                      </span>
                    </div>

                    {/* Dots indicator */}
                    <div className="flex items-center gap-1">
                      {data?.tasks && data.tasks.length > 0 && (
                        <div className="w-1.5 h-1.5 rounded-full bg-sky-500" title={`${data.tasks.length} tasks`} />
                      )}
                      {data?.events && data.events.length > 0 && (
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title={`${data.events.length} events`} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Selected Day's Agenda (4 cols) */}
          <div className="lg:col-span-4 p-6 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#1E293B]">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">Day Schedule</h4>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{selectedDayEvents}</p>
              </div>
            </div>

            {activeDayData.tasks.length === 0 && activeDayData.events.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No tasks or campus events on this date.
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeDayData.events.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-300">
                        {evt.type}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">{evt.time}</span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{evt.title}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{evt.location}</span>
                    </div>
                  </div>
                ))}

                {activeDayData.tasks.map((tsk) => (
                  <div
                    key={tsk.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] space-y-1"
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{tsk.title}</div>
                    <span className="text-[10px] font-bold uppercase text-amber-600">{tsk.priority} Priority</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          SUB-TAB 3: UNIVERSITY EVENTS
         ------------------------------------------------------------- */}
      {subTab === 'events' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">Upcoming Campus Events & Talks</h3>
            <button
              id="add-event-planner-btn"
              onClick={() => setIsAddEventOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Event</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="p-5 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      {evt.type}
                    </span>
                    <button
                      id={`delete-event-${evt.id}`}
                      onClick={() => deleteEvent(evt.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                      title="Delete event"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{evt.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{evt.description}</p>
                  </div>

                  <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <div className="flex items-center gap-1.5 font-medium">
                      <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                      <span>{evt.date} at {evt.time}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      <span>{evt.location}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
