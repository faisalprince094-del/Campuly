import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Subject, StudySession } from '../../types';
import {
  Timer,
  BookOpen,
  History,
  BarChart3,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Plus,
  Trash2,
  Clock,
  Flame,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
import { motion } from 'motion/react';

export const StudySection: React.FC = () => {
  const {
    subTab,
    setSubTab,
    subjects,
    addSubject,
    deleteSubject,
    studySessions,
    timerState,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    todayStudySeconds,
    formattedTodayStudyTime,
    weeklyStudyData,
    subjectStudyMap,
    showToast,
  } = useApp();

  // Preset timer durations
  const [selectedDuration, setSelectedDuration] = useState<number>(50);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [sessionNotes, setSessionNotes] = useState('');

  // Add Subject modal state
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubColor, setNewSubColor] = useState('#2563EB');
  const [newSubCredits, setNewSubCredits] = useState(3);
  const [newSubTarget, setNewSubTarget] = useState(40);

  // Subject colors (Black + Blue palette aligned)
  const COLOR_CHOICES = ['#2563EB', '#3B82F6', '#0284C7', '#10B981', '#F59E0B', '#0EA5E9', '#64748B'];

  // Calculate timer circle values
  const progressPercent =
    timerState.totalSeconds > 0
      ? ((timerState.totalSeconds - timerState.secondsLeft) / timerState.totalSeconds) * 100
      : 0;

  const minutes = Math.floor(timerState.secondsLeft / 60);
  const seconds = timerState.secondsLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Handle Add Subject submit
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) return;

    try {
      await addSubject({
        name: newSubName.trim(),
        code: newSubCode.trim().toUpperCase(),
        color: newSubColor,
        credits: newSubCredits,
        targetHours: newSubTarget,
      });
      setNewSubName('');
      setNewSubCode('');
      setIsAddSubjectOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const maxWeeklyMins = Math.max(...weeklyStudyData.data.map((d) => d.mins), 60);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-[#F8FAFC]">
            Study Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] mt-1">
            Focus sessions, subject tracking, and academic analytics in one workspace.
          </p>
        </div>

        {/* Sub-tabs pills */}
        <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs">
          {[
            { id: 'timer', label: 'Focus Timer', icon: Timer },
            { id: 'subjects', label: 'Subjects', icon: BookOpen },
            { id: 'sessions', label: 'Session History', icon: History },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = subTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`study-tab-${tab.id}`}
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
          SUB-TAB 1: FOCUS STUDY TIMER
         ------------------------------------------------------------- */}
      {subTab === 'timer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Interactive Circular Timer (7 cols) */}
          <div className="lg:col-span-7 p-8 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs flex flex-col items-center justify-center text-center space-y-6">
            {/* Mode selection */}
            <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-[#101823] border border-slate-200/60 dark:border-[#1E293B]">
              <button
                id="timer-mode-pomodoro-50"
                onClick={() => {
                  setSelectedDuration(50);
                  if (!timerState.isRunning && !timerState.isPaused) {
                    startTimer(50, 'focus', selectedSubjectId);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  (timerState.isRunning || timerState.isPaused ? (timerState.mode === 'focus' && timerState.totalSeconds === 50 * 60) : selectedDuration === 50)
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                50m Focus
              </button>
              <button
                id="timer-mode-pomodoro-25"
                onClick={() => {
                  setSelectedDuration(25);
                  if (!timerState.isRunning && !timerState.isPaused) {
                    startTimer(25, 'focus', selectedSubjectId);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  (timerState.isRunning || timerState.isPaused ? (timerState.mode === 'focus' && timerState.totalSeconds === 25 * 60) : selectedDuration === 25)
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                25m Focus
              </button>
              <button
                id="timer-mode-break-10"
                onClick={() => {
                  setSelectedDuration(10);
                  if (!timerState.isRunning && !timerState.isPaused) {
                    startTimer(10, 'break');
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  (timerState.isRunning || timerState.isPaused ? timerState.mode === 'break' : selectedDuration === 10)
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                10m Break
              </button>
            </div>

            {/* Circular Timer SVG */}
            <div className="relative w-64 h-64 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-slate-100 dark:stroke-[#101823]"
                  strokeWidth="7"
                  fill="none"
                />
                {/* Active Progress Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className={`transition-all duration-500 ${
                    (timerState.isRunning || timerState.isPaused ? timerState.mode === 'break' : selectedDuration === 10)
                      ? 'stroke-amber-500'
                      : 'stroke-blue-600'
                  }`}
                  strokeWidth="7"
                  strokeDasharray="264"
                  strokeDashoffset={264 - (264 * progressPercent) / 100}
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-1">
                <span className="text-4xl sm:text-5xl font-black tracking-tighter text-slate-900 dark:text-white font-mono">
                  {formattedTime}
                </span>
                <span
                  className={`text-xs font-bold uppercase tracking-widest ${
                    (timerState.isRunning || timerState.isPaused ? timerState.mode === 'break' : selectedDuration === 10)
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-blue-600 dark:text-blue-400'
                  }`}
                >
                  {(timerState.isRunning || timerState.isPaused)
                    ? (timerState.mode === 'focus' ? 'Deep Focus' : 'Relaxing Break (No Goal Tracking)')
                    : (selectedDuration === 10 ? 'Relaxing Break (No Goal Tracking)' : 'Deep Focus')}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {!timerState.isRunning && !timerState.isPaused ? (
                <button
                  id="timer-start-btn"
                  onClick={() => {
                    const isBreak = selectedDuration === 10;
                    startTimer(
                      selectedDuration,
                      isBreak ? 'break' : 'focus',
                      isBreak ? undefined : selectedSubjectId,
                      sessionNotes
                    );
                  }}
                  className={`px-8 py-3.5 ${
                    selectedDuration === 10
                      ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
                  } text-white rounded-2xl font-black text-sm shadow-lg active:scale-95 transition flex items-center gap-2 cursor-pointer`}
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{selectedDuration === 10 ? 'Start Break' : 'Start Focus Session'}</span>
                </button>
              ) : timerState.isRunning ? (
                <>
                  <button
                    id="timer-pause-btn"
                    onClick={pauseTimer}
                    className="px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-amber-500/30 active:scale-95 transition flex items-center gap-2 cursor-pointer"
                  >
                    <Pause className="w-4 h-4 fill-white" />
                    <span>Pause</span>
                  </button>

                  <button
                    id="timer-finish-btn"
                    onClick={() => stopTimer(timerState.mode === 'focus')}
                    className={`px-6 py-3.5 ${
                      timerState.mode === 'break'
                        ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                    } text-white rounded-2xl font-black text-sm shadow-lg active:scale-95 transition flex items-center gap-2 cursor-pointer`}
                    title={timerState.mode === 'break' ? 'End break timer' : 'Finish and log time now'}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{timerState.mode === 'break' ? 'Finish Break' : 'Finish & Log'}</span>
                  </button>

                  <button
                    id="timer-reset-btn"
                    onClick={() => stopTimer(false)}
                    className="p-3.5 rounded-2xl bg-slate-100 dark:bg-[#101823] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white active:scale-95 transition cursor-pointer"
                    title="Cancel and reset"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    id="timer-resume-btn"
                    onClick={resumeTimer}
                    className={`px-6 py-3.5 ${
                      timerState.mode === 'break'
                        ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30'
                        : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
                    } text-white rounded-2xl font-black text-sm shadow-lg active:scale-95 transition flex items-center gap-2 cursor-pointer`}
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>{timerState.mode === 'break' ? 'Resume Break' : 'Resume Focus'}</span>
                  </button>

                  <button
                    id="timer-finish-paused-btn"
                    onClick={() => stopTimer(timerState.mode === 'focus')}
                    className={`px-6 py-3.5 ${
                      timerState.mode === 'break'
                        ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                    } text-white rounded-2xl font-black text-sm shadow-lg active:scale-95 transition flex items-center gap-2 cursor-pointer`}
                    title={timerState.mode === 'break' ? 'End break timer' : 'Finish and log elapsed time'}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{timerState.mode === 'break' ? 'Finish Break' : 'Finish & Log'}</span>
                  </button>

                  <button
                    id="timer-reset-paused-btn"
                    onClick={() => stopTimer(false)}
                    className="p-3.5 rounded-2xl bg-slate-100 dark:bg-[#101823] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white active:scale-95 transition cursor-pointer"
                    title="Discard and reset"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right: Session Configuration & Tagging (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Tag Subject
                </h3>
              </div>

              <div className="space-y-2">
                <select
                  id="timer-subject-select"
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-2xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No subject tagged (General study)</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code || 'Course'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Session Focus Notes
                </label>
                <textarea
                  id="timer-notes-textarea"
                  rows={3}
                  placeholder="What chapter or assignment are you actively working on during this block?"
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-2xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>50/10 University Focus Protocol</span>
                </div>
                <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
                  50 uninterrupted minutes of cognitive study followed by a 10-minute break improves long-term memory retention by 34%.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          SUB-TAB 2: SUBJECTS MANAGER
         ------------------------------------------------------------- */}
      {subTab === 'subjects' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Current Semester Subjects</h3>
            <button
              id="add-subject-btn"
              onClick={() => setIsAddSubjectOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Subject</span>
            </button>
          </div>

          {subjects.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-[#0B1017] rounded-3xl border border-slate-200/80 dark:border-[#1E293B] p-6 space-y-3">
              <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">No Subjects Added Yet</h4>
                <p className="text-xs text-slate-400 mt-1">Add your university courses to track study hours and target goals.</p>
              </div>
              <button
                id="add-first-subject-btn"
                onClick={() => setIsAddSubjectOpen(true)}
                className="px-4 py-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold hover:bg-blue-100 transition cursor-pointer"
              >
                + Add First Subject
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map((sub) => {
                const stats = subjectStudyMap[sub.id] || { seconds: 0, minutes: 0, hours: 0, formatted: '0m' };
                const studiedHours = stats.hours.toFixed(1);
                const target = sub.targetHours || 40;
                const targetProgress = Math.min(100, Math.round((stats.hours / target) * 100));

                return (
                  <div
                    key={sub.id}
                    className="p-5 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs flex flex-col justify-between group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: sub.color || '#2563EB' }}
                          />
                          <span className="text-[10px] font-black uppercase text-slate-400">
                            {sub.code || 'COURSE'}
                          </span>
                        </div>
                        <button
                          id={`delete-subject-${sub.id}`}
                          onClick={() => deleteSubject(sub.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          title="Delete subject"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">{sub.name}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{sub.credits || sub.creditHours || 3} Credit Hours</p>
                      </div>

                      {/* Study Progress */}
                      <div className="space-y-1.5 pt-2">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-500 dark:text-slate-400">Study Tracked</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {studiedHours}h / {target}h
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-[#101823] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${targetProgress}%`,
                              backgroundColor: sub.color || '#2563EB',
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 mt-3 border-t border-slate-100 dark:border-[#1E293B] flex items-center justify-between">
                      <button
                        id={`start-study-for-${sub.id}`}
                        onClick={() => {
                          setSelectedSubjectId(sub.id);
                          setSubTab('timer');
                          startTimer(50, 'focus', sub.id);
                        }}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-blue-600 dark:fill-blue-400" />
                        <span>Start 50m Focus</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Subject Modal */}
          {isAddSubjectOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
              <div className="bg-white dark:bg-[#0B1017] w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-[#1E293B] space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Add New Subject</h3>

                <form onSubmit={handleCreateSubject} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Subject Name *
                    </label>
                    <input
                      id="new-sub-name-input"
                      type="text"
                      required
                      placeholder="e.g. Distributed Operating Systems"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-2xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Course Code
                      </label>
                      <input
                        id="new-sub-code-input"
                        type="text"
                        placeholder="e.g. CSE-412"
                        value={newSubCode}
                        onChange={(e) => setNewSubCode(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-2xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Credits
                      </label>
                      <input
                        id="new-sub-credits-input"
                        type="number"
                        min={1}
                        max={6}
                        value={newSubCredits}
                        onChange={(e) => setNewSubCredits(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-2xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Subject Tag Color
                    </label>
                    <div className="flex gap-2">
                      {COLOR_CHOICES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewSubColor(c)}
                          className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                            newSubColor === c ? 'scale-125 ring-2 ring-blue-500' : ''
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setIsAddSubjectOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      id="save-subject-btn"
                      type="submit"
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                    >
                      Save Subject
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          SUB-TAB 3: SESSION HISTORY
         ------------------------------------------------------------- */}
      {subTab === 'sessions' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Logged Study Sessions</h3>
            <span className="text-xs font-semibold text-slate-400">{studySessions.length} Total Sessions</span>
          </div>

          {studySessions.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Clock className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">No Study Sessions Logged Yet</h4>
                <p className="text-xs text-slate-400 mt-1">Start a focus block with the timer to automatically log your study sessions.</p>
              </div>
              <button
                id="start-first-session-btn"
                onClick={() => setSubTab('timer')}
                className="px-4 py-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold hover:bg-blue-100 transition cursor-pointer"
              >
                Go to Focus Timer
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {studySessions.map((session) => {
                const sub = subjects.find((s) => s.id === session.subjectId);
                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-[#101823] border border-slate-200/80 dark:border-[#1E293B]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {sub ? sub.name : 'General Focus'}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            {session.mode}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {session.notes || 'Completed focus block'} • {new Date(session.completedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                      +{session.durationMinutes}m
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          SUB-TAB 4: STUDY ANALYTICS
         ------------------------------------------------------------- */}
      {subTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly focus graph */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Daily Focus Distribution</h3>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                Avg: {weeklyStudyData.avgDailyMinutes}m / day
              </span>
            </div>

            <div className="h-44 flex items-end justify-between gap-3 pt-6">
              {weeklyStudyData.data.map((item, idx) => {
                const heightPercent = Math.max(10, Math.min(100, Math.round((item.mins / maxWeeklyMins) * 100)));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                    <span className="text-[10px] font-bold text-slate-400">{item.mins}m</span>
                    <div className="w-full flex justify-center items-end h-28">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full max-w-[32px] rounded-t-xl transition-all ${
                          item.isToday ? 'bg-blue-600' : 'bg-blue-100 dark:bg-blue-950/50 group-hover:bg-blue-300'
                        }`}
                      />
                    </div>
                    <span className={`text-[11px] font-bold ${item.isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                      {item.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Subject Breakdown */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Subject Hours Breakdown</h3>
            <div className="space-y-3">
              {subjects.map((sub) => {
                const stats = subjectStudyMap[sub.id] || { seconds: 0, minutes: 0, hours: 0, formatted: '0m' };
                return (
                  <div key={sub.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-800 dark:text-slate-200">{sub.name}</span>
                      <span className="text-slate-500">{stats.formatted}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-[#101823] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(5, stats.minutes / 3))}%`,
                          backgroundColor: sub.color || '#2563EB',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
