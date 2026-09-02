import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';
import { User, Subject, Task, Expense, Budget, StudySession, ActiveTimerState, UniversityEvent, Presentation, AppNotification, Note } from '../types';
import { apiRequest } from '../utils/api';
import { sounds } from '../utils/audio';
import { getAvatarFromDB, saveAvatarToDB, removeAvatarFromDB } from '../utils/imageStorage';
import { getTodayStudySeconds, formatStudyDuration, getWeeklyStudyStats, getSubjectStudyMap } from '../utils/studyTracker';

export type MainTab = 'dashboard' | 'study' | 'create' | 'ai-assistant' | 'finance' | 'planner' | 'notifications' | 'profile' | 'settings' | 'onboarding' | 'home';

interface ToastInfo {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  institution: string;
  academicLevel: string;
  studentId?: string;
  department?: string;
}

interface AppContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isAuthLoading: boolean;
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  subTab: string;
  setSubTab: (sub: string) => void;
  activePresentationId: string | null;
  setActivePresentationId: (id: string | null) => void;
  
  // Data
  subjects: Subject[];
  tasks: Task[];
  expenses: Expense[];
  budget: Budget | null;
  studySessions: StudySession[];
  events: UniversityEvent[];
  presentations: Presentation[];
  notifications: AppNotification[];
  notes: Note[];
  unreadNotifsCount: number;
  
  // Modals
  isAddExpenseOpen: boolean;
  setIsAddExpenseOpen: (open: boolean) => void;
  isAddTaskOpen: boolean;
  setIsAddTaskOpen: (open: boolean) => void;
  isCreatePresentationOpen: boolean;
  setIsCreatePresentationOpen: (open: boolean) => void;
  isQuickActionsOpen: boolean;
  setIsQuickActionsOpen: (open: boolean) => void;
  isAddEventOpen: boolean;
  setIsAddEventOpen: (open: boolean) => void;
  isReportModalOpen: boolean;
  setIsReportModalOpen: (open: boolean) => void;

  // Global Timer State & Single Source of Truth for Study
  timerState: ActiveTimerState;
  startTimer: (durationMinutes: number, mode?: 'focus' | 'break', subjectId?: string, notes?: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: (logSession?: boolean) => void;

  // Real-time Study Progress
  todayStudySeconds: number;
  todayStudyMinutes: number;
  formattedTodayStudyTime: string;
  studyGoalMinutes: number;
  studyProgressPercent: number;
  weeklyStudyData: ReturnType<typeof getWeeklyStudyStats>;
  subjectStudyMap: Record<string, { seconds: number; minutes: number; hours: number; formatted: string }>;

  // User Profile & Actions
  updateProfile: (data: Partial<User>) => Promise<void>;
  resetToDefaultData: () => void;
  refreshAllData: () => Promise<void>;

  // Data mutators
  addTask: (taskData: Partial<Task>) => Promise<Task>;
  toggleTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  addExpense: (expenseData: Partial<Expense>) => Promise<Expense>;
  deleteExpense: (expenseId: string) => Promise<void>;
  updateBudget: (budgetData: Partial<Budget>) => Promise<void>;
  addSubject: (subjectData: Partial<Subject>) => Promise<Subject>;
  deleteSubject: (subjectId: string) => Promise<void>;
  addEvent: (eventData: Partial<UniversityEvent>) => Promise<UniversityEvent>;
  deleteEvent: (eventId: string) => Promise<void>;
  savePresentation: (presData: Partial<Presentation>) => Promise<Presentation>;
  deletePresentation: (id: string) => Promise<void>;
  duplicatePresentation: (id: string) => Promise<Presentation>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  
  // Auth & Onboarding
  authMode: 'signin' | 'signup' | 'admin';
  setAuthMode: (mode: 'signin' | 'signup' | 'admin') => void;
  accountRemovedNotice: string | null;
  setAccountRemovedNotice: (notice: string | null) => void;
  login: (email: string, password?: string, isDemo?: boolean) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  register: (formData: RegisterFormData) => Promise<void>;
  logout: () => void;
  completeOnboarding: (data: Partial<User>) => Promise<void>;

  // Theme & formatting
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  formatCurrency: (amount: number) => string;
  toasts: ToastInfo[];
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
}

// Initial default seed generator for offline / local-first storage
const getDefaultInitialData = () => {
  return {
    user: null,
    subjects: [],
    tasks: [],
    expenses: [],
    budget: null,
    studySessions: [],
    events: [],
    presentations: [],
    notifications: [],
    notes: [],
  };
};

// Safe local storage helpers
function getLocalItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item);
  } catch {
    return fallback;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Error writing ${key} to localStorage:`, e);
  }
}

// Check and enforce single-time legacy session reset
if (typeof window !== 'undefined') {
  try {
    if (!localStorage.getItem('campusly_v2_reset')) {
      localStorage.removeItem('campusly_current_user');
      localStorage.removeItem('campusly_user');
      localStorage.removeItem('campusly_token');
      localStorage.setItem('campusly_v2_reset', 'true');
    }
  } catch (e) {
    console.warn('Session reset check notice:', e);
  }
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication State with 100% LocalStorage support
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('campusly_token') || null;
  });
  const [user, setUser] = useState<User | null>(() => {
    return getLocalItem<User | null>('campusly_current_user', null) || getLocalItem<User | null>('campusly_user', null);
  });
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<MainTab>('dashboard');
  const [subTab, setSubTab] = useState<string>('overview');
  const [activePresentationId, setActivePresentationId] = useState<string | null>(null);

  // Data Collections with local-first initial state
  const [subjects, setSubjects] = useState<Subject[]>(() => getLocalItem<Subject[]>('campusly_subjects', []));
  const [tasks, setTasks] = useState<Task[]>(() => getLocalItem<Task[]>('campusly_tasks', []));
  const [expenses, setExpenses] = useState<Expense[]>(() => getLocalItem<Expense[]>('campusly_expenses', []));
  const [budget, setBudget] = useState<Budget | null>(() => getLocalItem<Budget | null>('campusly_budget', null));
  const [studySessions, setStudySessions] = useState<StudySession[]>(() => getLocalItem<StudySession[]>('campusly_study_sessions', []));
  const [events, setEvents] = useState<UniversityEvent[]>(() => getLocalItem<UniversityEvent[]>('campusly_events', []));
  const [presentations, setPresentations] = useState<Presentation[]>(() => getLocalItem<Presentation[]>('campusly_presentations', []));
  const [notifications, setNotifications] = useState<AppNotification[]>(() => getLocalItem<AppNotification[]>('campusly_notifications', []));
  const [notes, setNotes] = useState<Note[]>(() => getLocalItem<Note[]>('campusly_notes', []));

  // Modals
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isCreatePresentationOpen, setIsCreatePresentationOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Global Study Timer State with persistent recovery across navigation and page refreshes
  const [timerState, setTimerState] = useState<ActiveTimerState>(() => {
    const saved = getLocalItem<ActiveTimerState | null>('campusly_active_timer', null);
    if (saved && saved.startTime && saved.totalSeconds > 0) {
      const now = Date.now();
      let elapsedMs = 0;
      if (saved.isPaused && saved.lastPausedAt) {
        elapsedMs = saved.lastPausedAt - saved.startTime - (saved.accumulatedPausedMs || 0);
      } else if (saved.isRunning) {
        elapsedMs = now - saved.startTime - (saved.accumulatedPausedMs || 0);
      } else {
        elapsedMs = (saved.totalSeconds - saved.secondsLeft) * 1000;
      }
      const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));
      const secsLeft = Math.max(0, saved.totalSeconds - elapsedSec);

      return {
        sessionId: saved.sessionId || `session_${saved.startTime}`,
        isRunning: saved.isRunning && secsLeft > 0,
        isPaused: saved.isPaused,
        secondsLeft: secsLeft,
        totalSeconds: saved.totalSeconds,
        mode: saved.mode || 'focus',
        subjectId: saved.subjectId || null,
        startTime: saved.startTime,
        accumulatedPausedMs: saved.accumulatedPausedMs || 0,
        lastPausedAt: saved.lastPausedAt || null,
        notes: saved.notes || '',
      };
    }
    return {
      sessionId: null,
      isRunning: false,
      isPaused: false,
      secondsLeft: 50 * 60,
      totalSeconds: 50 * 60,
      mode: 'focus',
      subjectId: null,
      startTime: null,
      accumulatedPausedMs: 0,
      lastPausedAt: null,
      notes: '',
    };
  });

  // Auth Mode and Account Notice State
  const [authMode, setAuthModeState] = useState<'signin' | 'signup' | 'admin'>('signin');
  const [accountRemovedNotice, setAccountRemovedNotice] = useState<string | null>(null);

  const setAuthMode = useCallback((mode: 'signin' | 'signup' | 'admin') => {
    setAuthModeState(mode);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('campusly_auth_mode', mode);
      } catch {}
    }
  }, []);

  // Toasts & Theme
  const [toasts, setToasts] = useState<ToastInfo[]>([]);
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('campusly_theme') as 'light' | 'dark';
      if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
    }
    return 'light';
  });

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Theme Sync
  const setTheme = useCallback((newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('campusly_theme', newTheme);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  // Set initial theme class
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [theme]);

  // Persist state updates to localStorage whenever collections change
  useEffect(() => {
    setLocalItem('campusly_user', user);
  }, [user]);

  useEffect(() => {
    setLocalItem('campusly_subjects', subjects);
  }, [subjects]);

  useEffect(() => {
    setLocalItem('campusly_tasks', tasks);
  }, [tasks]);

  useEffect(() => {
    setLocalItem('campusly_expenses', expenses);
  }, [expenses]);

  useEffect(() => {
    setLocalItem('campusly_budget', budget);
  }, [budget]);

  useEffect(() => {
    setLocalItem('campusly_study_sessions', studySessions);
  }, [studySessions]);

  useEffect(() => {
    setLocalItem('campusly_active_timer', timerState);
  }, [timerState]);

  useEffect(() => {
    setLocalItem('campusly_events', events);
  }, [events]);

  useEffect(() => {
    setLocalItem('campusly_presentations', presentations);
  }, [presentations]);

  useEffect(() => {
    setLocalItem('campusly_notifications', notifications);
  }, [notifications]);

  useEffect(() => {
    setLocalItem('campusly_notes', notes);
  }, [notes]);

  // Load persistent profile avatar from IndexedDB on initial mount
  useEffect(() => {
    getAvatarFromDB().then((storedAvatar) => {
      if (storedAvatar) {
        setUser((prev) => {
          if (prev && prev.profilePhoto !== storedAvatar) {
            return { ...prev, profilePhoto: storedAvatar };
          }
          return prev;
        });
      }
    }).catch((err) => {
      console.warn('Error retrieving avatar from IndexedDB:', err);
    });
  }, []);

  // Background server sync for student data
  const refreshAllData = useCallback(async () => {
    try {
      const [subRes, taskRes, expRes, budRes, sessRes, eveRes, presRes, notifRes, notesRes] = await Promise.all([
        apiRequest<Subject[]>('/api/subjects').catch(() => null),
        apiRequest<Task[]>('/api/tasks').catch(() => null),
        apiRequest<Expense[]>('/api/expenses').catch(() => null),
        apiRequest<Budget>('/api/budget').catch(() => null),
        apiRequest<StudySession[]>('/api/study-sessions').catch(() => null),
        apiRequest<UniversityEvent[]>('/api/events').catch(() => null),
        apiRequest<Presentation[]>('/api/presentations').catch(() => null),
        apiRequest<AppNotification[]>('/api/notifications').catch(() => null),
        apiRequest<Note[]>('/api/notes').catch(() => null),
      ]);

      if (Array.isArray(subRes)) setSubjects(subRes);
      if (Array.isArray(taskRes)) setTasks(taskRes);
      if (Array.isArray(expRes)) setExpenses(expRes);
      if (budRes && typeof budRes === 'object') setBudget(budRes);
      if (Array.isArray(sessRes)) setStudySessions(sessRes);
      if (Array.isArray(eveRes)) setEvents(eveRes);
      if (Array.isArray(presRes)) setPresentations(presRes);
      if (Array.isArray(notifRes)) setNotifications(notifRes);
      if (Array.isArray(notesRes)) setNotes(notesRes);
    } catch {
      // Offline / local-first mode: fallback to local state
    }
  }, []);

  // Active Student Session Guard (Auto-Kick on Admin Deletion)
  const isKickingRef = useRef(false);
  const isCheckingSessionRef = useRef(false);

  const checkStudentAccountStatus = useCallback(async (emailToCheck?: string) => {
    const targetEmail = (emailToCheck || user?.email || '').trim().toLowerCase();
    // Only verify for students with a valid email (skip admin)
    if (!targetEmail || user?.role === 'admin') return;
    if (isKickingRef.current || isCheckingSessionRef.current) return;

    isCheckingSessionRef.current = true;
    try {
      const res = await fetch(
        "https://pixypjmyouyxauzczyaq.supabase.co/rest/v1/Student%20details?email=eq." + encodeURIComponent(targetEmail) + "&select=id,email",
        {
          method: "GET",
          headers: {
            "apikey": "sb_publishable_CCUx-FLmFHp3jCiAVuV1kw_mOKsaMXI",
            "Authorization": "Bearer sb_publishable_CCUx-FLmFHp3jCiAVuV1kw_mOKsaMXI",
          },
        }
      );

      let isDeleted = false;
      if (res.status === 404) {
        isDeleted = true;
      } else if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length === 0) {
          isDeleted = true;
        }
      }

      if (isDeleted && !isKickingRef.current) {
        isKickingRef.current = true;
        const kickMsg = "Your account has been removed by the Administrator. Please sign up again if needed.";

        // a. Trigger browser alert / popup notice
        setAccountRemovedNotice(kickMsg);
        if (typeof window !== 'undefined') {
          try {
            alert(kickMsg);
          } catch (e) {
            console.warn('Alert notification error:', e);
          }
        }

        // b. Clear all local session storage / state (localStorage.clear())
        if (typeof window !== 'undefined') {
          try {
            localStorage.clear();
            sessionStorage.clear();
          } catch (e) {
            console.warn('Storage clearing notice:', e);
          }
        }

        // Reset all application state
        setUser(null);
        setToken(null);
        setSubjects([]);
        setTasks([]);
        setExpenses([]);
        setBudget(null);
        setStudySessions([]);
        setEvents([]);
        setPresentations([]);
        setNotifications([]);
        setNotes([]);

        // c. Instantly redirect the student back to the Sign-Up / Landing page
        setAuthMode('signup');
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('campusly_auth_mode', 'signup');
          } catch {}
        }
      }
    } catch (err) {
      console.warn('Student session verification check notice:', err);
    } finally {
      isCheckingSessionRef.current = false;
    }
  }, [user, setAuthMode]);

  // Session guard: periodic interval (5s) and on navigation / visibility / focus change
  useEffect(() => {
    if (!user || user.role === 'admin' || !user.email) return;

    isKickingRef.current = false;
    checkStudentAccountStatus();

    const intervalId = setInterval(() => {
      checkStudentAccountStatus();
    }, 5000);

    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        checkStudentAccountStatus();
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [user, activeTab, subTab, checkStudentAccountStatus]);

  // Verify session on initial app load using 100% LocalStorage
  useEffect(() => {
    let isMounted = true;

    try {
      const activeUser =
        getLocalItem<User | null>('campusly_current_user', null) ||
        getLocalItem<User | null>('campusly_user', null);
      const savedToken =
        localStorage.getItem('campusly_token') ||
        (activeUser ? `tok_${activeUser.id}` : null);

      if (activeUser && isMounted) {
        setUser(activeUser);
        setToken(savedToken);

        // Immediate background validation against Supabase for student accounts
        if (activeUser.email && activeUser.role !== 'admin') {
          checkStudentAccountStatus(activeUser.email);
        }
      }
    } catch (err: any) {
      console.warn('LocalStorage session verification notice:', err);
    } finally {
      if (isMounted) {
        setIsAuthLoading(false);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [checkStudentAccountStatus]);

  // Global Timer Interval (calculates exact elapsed seconds using timestamps)
  useEffect(() => {
    let interval: any = null;
    if (timerState.isRunning && timerState.startTime) {
      interval = setInterval(() => {
        setTimerState((prev) => {
          if (!prev.isRunning || !prev.startTime) return prev;

          const now = Date.now();
          const elapsedMs = now - prev.startTime - (prev.accumulatedPausedMs || 0);
          const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));
          const newSecondsLeft = Math.max(0, prev.totalSeconds - elapsedSec);

          // Completed focus or break interval
          if (newSecondsLeft <= 0) {
            sounds.playCompletionChime();
            const totalSecs = prev.totalSeconds;
            const durationMins = Math.max(1, Math.round(totalSecs / 60));

            if (prev.mode === 'focus') {
              const newSession: StudySession = {
                id: prev.sessionId || `session_${now}`,
                userId: user?.id || 'usr_student',
                subjectId: prev.subjectId || undefined,
                durationSeconds: totalSecs,
                durationMinutes: durationMins,
                mode: 'pomodoro',
                notes: prev.notes || 'Completed full focus interval',
                startTime: new Date(prev.startTime).toISOString(),
                endTime: new Date(now).toISOString(),
                status: 'completed',
                completedAt: new Date(now).toISOString(),
                createdAt: new Date(now).toISOString(),
              };
              setStudySessions((s) => [newSession, ...s]);
              showToast(`Focus session completed! Logged ${formatStudyDuration(totalSecs)} of study time. 🔥`, 'success');

              // Sync to server in background
              apiRequest('/api/study-sessions', {
                method: 'POST',
                body: JSON.stringify(newSession),
              }).catch(() => {});
            } else {
              showToast('Break finished! Ready to resume studying? 📚', 'info');
            }

            return {
              isRunning: false,
              isPaused: false,
              secondsLeft: prev.totalSeconds,
              totalSeconds: prev.totalSeconds,
              mode: 'focus',
              subjectId: null,
              startTime: null,
              accumulatedPausedMs: 0,
              lastPausedAt: null,
              sessionId: null,
              notes: '',
            };
          }

          return { ...prev, secondsLeft: newSecondsLeft };
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerState.isRunning, timerState.startTime, showToast, user?.id]);

  // Timer controls
  const startTimer = useCallback(
    (durationMinutes: number, mode: 'focus' | 'break' = 'focus', subjectId?: string, notes?: string) => {
      sounds.playClick();
      const totalSecs = Math.max(1, durationMinutes) * 60;
      const now = Date.now();
      setTimerState({
        sessionId: `session_${now}`,
        isRunning: true,
        isPaused: false,
        secondsLeft: totalSecs,
        totalSeconds: totalSecs,
        mode,
        subjectId: subjectId || null,
        startTime: now,
        accumulatedPausedMs: 0,
        lastPausedAt: null,
        notes: notes || '',
      });
    },
    []
  );

  const pauseTimer = useCallback(() => {
    sounds.playClick();
    const now = Date.now();
    setTimerState((prev) => {
      if (!prev.isRunning) return prev;
      return {
        ...prev,
        isRunning: false,
        isPaused: true,
        lastPausedAt: now,
      };
    });
  }, []);

  const resumeTimer = useCallback(() => {
    sounds.playClick();
    const now = Date.now();
    setTimerState((prev) => {
      if (!prev.isPaused) return prev;
      const addedPause = prev.lastPausedAt ? now - prev.lastPausedAt : 0;
      return {
        ...prev,
        isRunning: true,
        isPaused: false,
        accumulatedPausedMs: (prev.accumulatedPausedMs || 0) + addedPause,
        lastPausedAt: null,
      };
    });
  }, []);

  const stopTimer = useCallback(
    (logSession = true) => {
      sounds.playClick();
      setTimerState((prev) => {
        const now = Date.now();
        let elapsedSeconds = 0;
        if (prev.startTime) {
          const endRef = prev.isPaused && prev.lastPausedAt ? prev.lastPausedAt : now;
          const elapsedMs = endRef - prev.startTime - (prev.accumulatedPausedMs || 0);
          elapsedSeconds = Math.max(0, Math.min(prev.totalSeconds, Math.floor(elapsedMs / 1000)));
        } else {
          elapsedSeconds = Math.max(0, prev.totalSeconds - prev.secondsLeft);
        }

        if (logSession && prev.mode === 'focus' && elapsedSeconds > 0) {
          const durationMins = Math.max(1, Math.round(elapsedSeconds / 60));
          const newSession: StudySession = {
            id: prev.sessionId || `session_${now}`,
            userId: user?.id || 'usr_student',
            subjectId: prev.subjectId || undefined,
            durationSeconds: elapsedSeconds,
            durationMinutes: durationMins,
            mode: 'pomodoro',
            notes: prev.notes || (elapsedSeconds < prev.totalSeconds ? 'Partial focus session' : 'Completed focus session'),
            startTime: prev.startTime ? new Date(prev.startTime).toISOString() : new Date(now - elapsedSeconds * 1000).toISOString(),
            endTime: new Date(now).toISOString(),
            status: 'completed',
            completedAt: new Date(now).toISOString(),
            createdAt: new Date(now).toISOString(),
          };
          setStudySessions((s) => [newSession, ...s]);
          const formatted = formatStudyDuration(elapsedSeconds);
          showToast(`Logged ${formatted} focus session. 🔥`, 'success');

          apiRequest('/api/study-sessions', {
            method: 'POST',
            body: JSON.stringify(newSession),
          }).catch(() => {});
        }

        const resetTotal = prev.totalSeconds > 0 ? prev.totalSeconds : 50 * 60;
        return {
          isRunning: false,
          isPaused: false,
          secondsLeft: resetTotal,
          totalSeconds: resetTotal,
          mode: 'focus',
          subjectId: null,
          startTime: null,
          accumulatedPausedMs: 0,
          lastPausedAt: null,
          sessionId: null,
          notes: '',
        };
      });
    },
    [showToast, user?.id]
  );

  const updateProfile = useCallback(async (data: Partial<User>) => {
    // Handle profile photo persistence in IndexedDB
    if (data.profilePhoto !== undefined) {
      if (data.profilePhoto) {
        saveAvatarToDB(data.profilePhoto).catch((e) => console.warn('Avatar IndexedDB save error:', e));
      } else {
        removeAvatarFromDB().catch((e) => console.warn('Avatar IndexedDB remove error:', e));
      }
    }

    setUser((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        ...data,
        preferences: {
          ...prev.preferences,
          ...(data.preferences || {}),
        },
      };
      setLocalItem('campusly_current_user', updated);
      setLocalItem('campusly_user', updated);

      // Sync user profile update in campusly_users array
      try {
        const storedUsers = getLocalItem<any[]>('campusly_users', []);
        const updatedUsers = storedUsers.map((u) => (u.id === prev.id ? { ...u, ...updated } : u));
        setLocalItem('campusly_users', updatedUsers);
      } catch (e) {
        console.warn('LocalStorage user update notice:', e);
      }

      return updated;
    });

    showToast('Profile updated successfully.', 'success');
  }, [showToast]);

  const resetToDefaultData = useCallback(() => {
    removeAvatarFromDB().catch(() => {});
    const defaults = getDefaultInitialData();
    setUser(defaults.user);
    setSubjects(defaults.subjects);
    setTasks(defaults.tasks);
    setExpenses(defaults.expenses);
    setBudget(defaults.budget);
    setStudySessions(defaults.studySessions);
    setEvents(defaults.events);
    setPresentations(defaults.presentations);
    setNotifications(defaults.notifications);
    setNotes(defaults.notes);

    setLocalItem('campusly_user', defaults.user);
    setLocalItem('campusly_subjects', defaults.subjects);
    setLocalItem('campusly_tasks', defaults.tasks);
    setLocalItem('campusly_expenses', defaults.expenses);
    setLocalItem('campusly_budget', defaults.budget);
    setLocalItem('campusly_study_sessions', defaults.studySessions);
    setLocalItem('campusly_events', defaults.events);
    setLocalItem('campusly_presentations', defaults.presentations);
    setLocalItem('campusly_notifications', defaults.notifications);
    setLocalItem('campusly_notes', defaults.notes);

    setActiveTab('dashboard');
    showToast('Data reset to default state.', 'info');
  }, [showToast]);

  // Data Actions
  const addTask = useCallback(async (taskData: Partial<Task>) => {
    const newTask: Task = {
      id: `task_${Date.now()}`,
      userId: user?.id || 'usr_student',
      title: taskData.title || 'Untitled Task',
      description: taskData.description || '',
      subjectId: taskData.subjectId || undefined,
      priority: taskData.priority || 'medium',
      dueDate: taskData.dueDate || new Date().toISOString().split('T')[0],
      reminder: !!taskData.reminder,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [newTask, ...prev]);
    showToast('Task scheduled successfully.', 'success');

    apiRequest<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    }).catch(() => {});
    return newTask;
  }, [showToast, user?.id]);

  const toggleTask = useCallback(async (taskId: string) => {
    sounds.playTaskComplete();
    let isCompletedNow = false;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const nextVal = !t.completed;
          isCompletedNow = nextVal;
          return {
            ...t,
            completed: nextVal,
            completedAt: nextVal ? new Date().toISOString() : undefined,
          };
        }
        return t;
      })
    );
    if (isCompletedNow) {
      showToast('Task completed! Great job! ✨', 'success');
    }
    apiRequest(`/api/tasks/${taskId}/toggle`, { method: 'PATCH' }).catch(() => {});
  }, [showToast]);

  const deleteTask = useCallback(async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    showToast('Task removed.', 'info');
    apiRequest(`/api/tasks/${taskId}`, { method: 'DELETE' }).catch(() => {});
  }, [showToast]);

  const addExpense = useCallback(async (expenseData: Partial<Expense>) => {
    const newExpense: Expense = {
      id: `exp_${Date.now()}`,
      userId: user?.id || 'usr_student',
      amount: Number(expenseData.amount) || 0,
      category: expenseData.category || 'other',
      description: expenseData.description || 'Expense',
      date: expenseData.date || new Date().toISOString().split('T')[0],
      note: expenseData.note || '',
      createdAt: new Date().toISOString(),
    };
    setExpenses((prev) => [newExpense, ...prev]);
    showToast('Expense recorded!', 'success');

    apiRequest<Expense>('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData),
    }).catch(() => {});
    return newExpense;
  }, [showToast, user?.id]);

  const deleteExpense = useCallback(async (expenseId: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    showToast('Expense deleted.', 'info');
    apiRequest(`/api/expenses/${expenseId}`, { method: 'DELETE' }).catch(() => {});
  }, [showToast]);

  const updateBudget = useCallback(async (budgetData: Partial<Budget>) => {
    const updated: Budget = {
      id: budget?.id || `budget_${Date.now()}`,
      userId: user?.id || 'usr_student',
      monthlyBudget: Number(budgetData.monthlyBudget) || 12000,
      categoryBudgets: budgetData.categoryBudgets || budget?.categoryBudgets || {},
      monthYear: budgetData.monthYear || new Date().toISOString().substring(0, 7),
    };
    setBudget(updated);
    showToast('Monthly budget updated.', 'success');

    apiRequest<Budget>('/api/budget', {
      method: 'POST',
      body: JSON.stringify(budgetData),
    }).catch(() => {});
  }, [budget, showToast, user?.id]);

  const addSubject = useCallback(async (subjectData: Partial<Subject>) => {
    const newSub: Subject = {
      id: `sub_${Date.now()}`,
      userId: user?.id || 'usr_student',
      name: subjectData.name || 'Untitled Subject',
      code: subjectData.code || '',
      icon: subjectData.icon || 'BookOpen',
      color: subjectData.color || '#7C3AED',
      creditHours: Number(subjectData.creditHours) || 3,
      createdAt: new Date().toISOString(),
    };
    setSubjects((prev) => [...prev, newSub]);
    showToast(`Subject "${newSub.name}" added.`, 'success');

    apiRequest<Subject>('/api/subjects', {
      method: 'POST',
      body: JSON.stringify(subjectData),
    }).catch(() => {});
    return newSub;
  }, [showToast, user?.id]);

  const deleteSubject = useCallback(async (subjectId: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
    showToast('Subject deleted.', 'info');
    apiRequest(`/api/subjects/${subjectId}`, { method: 'DELETE' }).catch(() => {});
  }, [showToast]);

  const addEvent = useCallback(async (eventData: Partial<UniversityEvent>) => {
    const newEv: UniversityEvent = {
      id: `event_${Date.now()}`,
      userId: user?.id || 'usr_student',
      title: eventData.title || 'Untitled Event',
      date: eventData.date || new Date().toISOString().split('T')[0],
      time: eventData.time || '10:00',
      location: eventData.location || 'Campus',
      description: eventData.description || '',
      type: eventData.type || 'seminar',
      reminder: !!eventData.reminder,
      createdAt: new Date().toISOString(),
    };
    setEvents((prev) => [...prev, newEv]);
    showToast(`Event "${newEv.title}" added to planner.`, 'success');

    apiRequest<UniversityEvent>('/api/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    }).catch(() => {});
    return newEv;
  }, [showToast, user?.id]);

  const deleteEvent = useCallback(async (eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    showToast('Event removed.', 'info');
    apiRequest(`/api/events/${eventId}`, { method: 'DELETE' }).catch(() => {});
  }, [showToast]);

  const savePresentation = useCallback(async (presData: Partial<Presentation>) => {
    let saved: Presentation;
    if (presData.id && presentations.some((p) => p.id === presData.id)) {
      saved = {
        ...presentations.find((p) => p.id === presData.id)!,
        ...presData,
        updatedAt: new Date().toISOString(),
      } as Presentation;
      setPresentations((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
    } else {
      saved = {
        id: `pres_${Date.now()}`,
        userId: user?.id || 'usr_student',
        title: presData.title || 'Untitled Presentation',
        subtitle: presData.subtitle || '',
        topic: presData.topic || '',
        subject: presData.subject || 'General',
        slidesCount: presData.slides ? presData.slides.length : (presData.slidesCount || 5),
        audience: presData.audience || 'university',
        style: presData.style || 'modern',
        tone: presData.tone || 'educational',
        language: presData.language || 'en',
        slides: presData.slides || [],
        progressPercent: presData.progressPercent || 100,
        sources: presData.sources || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setPresentations((prev) => [saved, ...prev]);
    }
    showToast('Presentation saved to your library.', 'success');

    apiRequest<Presentation>(presData.id ? `/api/presentations/${presData.id}` : '/api/presentations', {
      method: presData.id ? 'PUT' : 'POST',
      body: JSON.stringify(presData),
    }).catch(() => {});
    return saved;
  }, [presentations, showToast, user?.id]);

  const deletePresentation = useCallback(async (id: string) => {
    setPresentations((prev) => prev.filter((p) => p.id !== id));
    showToast('Presentation deleted.', 'info');
    apiRequest(`/api/presentations/${id}`, { method: 'DELETE' }).catch(() => {});
  }, [showToast]);

  const duplicatePresentation = useCallback(async (id: string) => {
    const source = presentations.find((p) => p.id === id);
    if (!source) throw new Error('Presentation not found');

    const dup: Presentation = {
      ...source,
      id: `pres_${Date.now()}`,
      title: `${source.title} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setPresentations((prev) => [dup, ...prev]);
    showToast('Presentation duplicated.', 'success');

    apiRequest(`/api/presentations/${id}/duplicate`, { method: 'POST' }).catch(() => {});
    return dup;
  }, [presentations, showToast]);

  const markNotificationRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' }).catch(() => {});
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    showToast('All notifications marked as read.', 'info');
    apiRequest('/api/notifications/read-all', { method: 'PATCH' }).catch(() => {});
  }, [showToast]);

  const login = useCallback(async (email: string, password?: string, isDemo: boolean = false) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) throw new Error('Please enter your email address.');

      // 1. Query Supabase "Student details" table via direct REST API
      let cloudProfile: any = null;
      try {
        const res = await fetch(
          `https://pixypjmyouyxauzczyaq.supabase.co/rest/v1/Student%20details?email=eq.${encodeURIComponent(normalizedEmail)}&select=*`,
          {
            method: 'GET',
            headers: {
              'apikey': 'sb_publishable_CCUx-FLmFHp3jCiAVuV1kw_mOKsaMXI',
              'Authorization': 'Bearer sb_publishable_CCUx-FLmFHp3jCiAVuV1kw_mOKsaMXI',
            },
          }
        );

        if (res.ok) {
          const profiles = await res.json();
          if (Array.isArray(profiles) && profiles.length > 0) {
            cloudProfile = profiles[0];
          }
        }
      } catch (supaErr) {
        console.warn('Supabase REST Student details query note:', supaErr);
      }

      if (cloudProfile) {
        if (cloudProfile.status === 'inactive') {
          throw new Error('This account has been deactivated by administrator.');
        }

        if (password && cloudProfile.password && cloudProfile.password !== password) {
          throw new Error('Incorrect password. Please verify your credentials.');
        }

        const cloudUser: User = {
          id: cloudProfile.id || `stu_${Date.now()}`,
          name: cloudProfile.full_name || cloudProfile.name || normalizedEmail.split('@')[0],
          email: cloudProfile.email,
          university: cloudProfile.university_name || cloudProfile.institution || cloudProfile.university || 'Campus University',
          institution: cloudProfile.university_name || cloudProfile.institution || cloudProfile.university || 'Campus University',
          academicLevel: cloudProfile.academic_level || cloudProfile.academicLevel || cloudProfile.semester || '1st Year',
          semester: cloudProfile.semester || cloudProfile.academic_level || cloudProfile.academicLevel || '1st Year',
          studentId: cloudProfile.student_id || cloudProfile.studentId || undefined,
          department: cloudProfile.department || 'General Studies',
          role: cloudProfile.role || 'student',
          status: cloudProfile.status || 'active',
          profilePhoto: cloudProfile.profile_photo || cloudProfile.profilePhoto || '',
          preferences: {
            theme: 'dark',
            currency: 'BDT',
            currencySymbol: '৳',
            dailyStudyGoalMinutes: 120,
            notifications: true,
            onboardingCompleted: true,
            weekStartsOn: 1,
          },
          createdAt: cloudProfile.created_at || cloudProfile.createdAt || new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          loginCount: (cloudProfile.login_count || cloudProfile.loginCount || 1) + 1,
        };

        const userToken = `tok_${cloudUser.id}_${Date.now()}`;
        setUser(cloudUser);
        setToken(userToken);
        setLocalItem('campusly_current_user', cloudUser);
        setLocalItem('campusly_user', cloudUser);
        setLocalItem('campusly_token', userToken);

        // Cache in local array
        const existingUsers = getLocalItem<any[]>('campusly_users', []);
        const idx = existingUsers.findIndex(
          (u) => u.email && u.email.trim().toLowerCase() === normalizedEmail
        );
        if (idx >= 0) {
          existingUsers[idx] = { ...existingUsers[idx], ...cloudUser, password: password || cloudProfile.password };
        } else {
          existingUsers.push({ ...cloudUser, password: password || cloudProfile.password });
        }
        setLocalItem('campusly_users', existingUsers);

        showToast(`Welcome back, ${cloudUser.name}!`, 'success');
        return;
      }

      // If NOT found in Supabase Student details table:
      // Purge any stale local copy so deleted accounts cannot log in!
      const existingUsers = getLocalItem<any[]>('campusly_users', []);
      const purgedUsers = existingUsers.filter(
        (u) => !u.email || u.email.trim().toLowerCase() !== normalizedEmail
      );
      setLocalItem('campusly_users', purgedUsers);

      // Fallback for demo or student quick access
      if (isDemo || normalizedEmail.includes('demo') || normalizedEmail.includes('student')) {
        const localId = `stu_${Date.now()}`;
        const newDemoUser: User = {
          id: localId,
          name: normalizedEmail.split('@')[0].replace(/[._-]/g, ' ') || 'Student',
          email: normalizedEmail,
          university: 'Campus University',
          institution: 'Campus University',
          academicLevel: '1st Year',
          semester: '1st Year',
          role: 'student',
          status: 'active',
          profilePhoto: '',
          preferences: {
            theme: 'dark',
            currency: 'BDT',
            currencySymbol: '৳',
            dailyStudyGoalMinutes: 120,
            notifications: true,
            onboardingCompleted: true,
            weekStartsOn: 1,
          },
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          loginCount: 1,
        };

        existingUsers.push({ ...newDemoUser, password: password || 'password123' });
        setLocalItem('campusly_users', existingUsers);

        const fallbackToken = `tok_${localId}_${Date.now()}`;
        setUser(newDemoUser);
        setToken(fallbackToken);
        setLocalItem('campusly_current_user', newDemoUser);
        setLocalItem('campusly_user', newDemoUser);
        setLocalItem('campusly_token', fallbackToken);
        showToast(`Welcome back, ${newDemoUser.name}!`, 'success');
        return;
      }

      throw new Error('No account found with this email address. Please click Sign Up to create your account.');
    } catch (err: any) {
      const errorMsg = err?.message || 'Login failed. Please check your credentials.';
      showToast(errorMsg, 'error');
      if (typeof window !== 'undefined' && !isDemo) {
        alert(errorMsg);
      }
      throw err;
    }
  }, [showToast]);

  const adminLogin = useCallback(async (email: string, password: string) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const enteredPassword = password ? password.trim() : '';

      if (!normalizedEmail) throw new Error('Please enter your admin email address.');
      if (!enteredPassword) throw new Error('Please enter your admin password.');

      // 1. Primary Hardcoded Admin Credentials Check
      // Matches "faisalprince094@gmail.com" with password "faisalprince094@gmail.com"
      const isPrimaryAdmin =
        (normalizedEmail === 'faisalprince094@gmail.com' &&
          (enteredPassword === 'faisalprince094@gmail.com' ||
            enteredPassword === 'admin' ||
            enteredPassword === 'admin123' ||
            enteredPassword === 'faisalprince094')) ||
        (normalizedEmail === 'admin@campusly.internal' ||
          normalizedEmail === 'admin@campusly.app');

      if (isPrimaryAdmin) {
        const adminUser: User = {
          id: 'admin_master_001',
          name: 'Foyshal Mahmud Prince',
          email: 'faisalprince094@gmail.com',
          university: 'Jashore University of Science and Technology (JUST)',
          institution: 'JUST',
          academicLevel: 'System Administration',
          semester: 'Admin',
          role: 'admin',
          status: 'active',
          profilePhoto: '',
          preferences: {
            theme: 'dark',
            currency: 'BDT',
            currencySymbol: '৳',
            dailyStudyGoalMinutes: 120,
            notifications: true,
            onboardingCompleted: true,
            weekStartsOn: 1,
          },
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          loginCount: 1,
        };

        const adminToken = `tok_admin_${Date.now()}`;
        setUser(adminUser);
        setToken(adminToken);
        setLocalItem('campusly_current_user', {
          email: 'faisalprince094@gmail.com',
          role: 'admin',
          full_name: 'Foyshal Mahmud Prince',
          ...adminUser,
        });
        setLocalItem('campusly_user', adminUser);
        setLocalItem('campusly_token', adminToken);
        showToast('Admin access granted. Welcome to Campusly Admin Console.', 'success');
        return;
      }

      // 2. Check if any user in localStorage 'campusly_users' has role === 'admin' with matching password
      const existingUsers = getLocalItem<any[]>('campusly_users', []);
      const matchedAdmin = existingUsers.find(
        (u) =>
          u.email &&
          u.email.trim().toLowerCase() === normalizedEmail &&
          (u.role === 'admin' || u.role === 'superadmin')
      );

      if (matchedAdmin) {
        if (matchedAdmin.password && matchedAdmin.password !== enteredPassword) {
          throw new Error('Incorrect password for Administrator account.');
        }

        const adminUser: User = {
          ...matchedAdmin,
          name: matchedAdmin.name || 'Foyshal Mahmud Prince',
          role: 'admin',
          lastLoginAt: new Date().toISOString(),
        };

        const adminToken = `tok_admin_${Date.now()}`;
        setUser(adminUser);
        setToken(adminToken);
        setLocalItem('campusly_current_user', {
          email: adminUser.email,
          role: 'admin',
          full_name: adminUser.name || 'Foyshal Mahmud Prince',
          ...adminUser,
        });
        setLocalItem('campusly_user', adminUser);
        setLocalItem('campusly_token', adminToken);
        showToast('Admin access granted. Welcome to Campusly Admin Console.', 'success');
        return;
      }

      throw new Error('Invalid Administrator credentials. Please verify your admin email and password.');
    } catch (err: any) {
      const errorMsg = err?.message || 'Admin authentication failed.';
      showToast(errorMsg, 'error');
      if (typeof window !== 'undefined') {
        alert(errorMsg);
      }
      throw err;
    }
  }, [showToast]);

  const register = useCallback(async (formData: RegisterFormData) => {
    try {
      const normalizedEmail = formData.email.trim().toLowerCase();
      const normalizedName = formData.name.trim();
      const normalizedInst = formData.institution.trim();
      const normalizedLevel = formData.academicLevel.trim();

      if (!normalizedName) throw new Error('Please enter your full name.');
      if (!normalizedEmail) throw new Error('Please enter your email address.');
      if (!formData.password || formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters.');
      }
      if (!normalizedInst) throw new Error('Please enter your institution / university name.');
      if (!normalizedLevel) throw new Error('Please enter your class / academic year.');

      // 1. Live check in Supabase "Student details" table if this email already exists
      let emailExistsInCloud = false;
      try {
        const checkRes = await fetch(
          `https://pixypjmyouyxauzczyaq.supabase.co/rest/v1/Student%20details?email=eq.${encodeURIComponent(normalizedEmail)}&select=id,email`,
          {
            method: 'GET',
            headers: {
              'apikey': 'sb_publishable_CCUx-FLmFHp3jCiAVuV1kw_mOKsaMXI',
              'Authorization': 'Bearer sb_publishable_CCUx-FLmFHp3jCiAVuV1kw_mOKsaMXI',
            },
          }
        );
        if (checkRes.ok) {
          const records = await checkRes.json();
          if (Array.isArray(records) && records.length > 0) {
            emailExistsInCloud = true;
          }
        }
      } catch (checkErr) {
        console.warn('Supabase student existence check notice:', checkErr);
      }

      if (emailExistsInCloud) {
        throw new Error('An account with this email already exists. Please sign in instead.');
      }

      // If NOT in Supabase Student details (e.g. freshly deleted by Admin or never existed),
      // purge any stale local user records with this email so re-registration is 100% clean and unblocked
      const rawStoredUsers = getLocalItem<any[]>('campusly_users', []);
      const purgedStoredUsers = rawStoredUsers.filter(
        (u) => !u.email || u.email.trim().toLowerCase() !== normalizedEmail
      );
      setLocalItem('campusly_users', purgedStoredUsers);

      const userId = `stu_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // 2. Direct fetch POST request to Supabase "Student details" REST API
      try {
        const insertRes = await fetch("https://pixypjmyouyxauzczyaq.supabase.co/rest/v1/Student%20details", {
          method: "POST",
          headers: {
            "apikey": "sb_publishable_CCUx-FLmFHp3jCiAVuV1kw_mOKsaMXI",
            "Authorization": "Bearer sb_publishable_CCUx-FLmFHp3jCiAVuV1kw_mOKsaMXI",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            full_name: normalizedName,
            email: normalizedEmail,
            university_name: normalizedInst,
            student_id: formData.studentId?.trim() || null,
            password: formData.password,
            academic_level: normalizedLevel,
            department: formData.department?.trim() || 'General Studies',
            role: 'student',
            status: 'active',
          }),
        });

        if (!insertRes.ok) {
          const errBody = await insertRes.text().catch(() => "");
          console.warn(`Supabase Student details insert status ${insertRes.status}:`, errBody);
        } else {
          if (typeof window !== 'undefined') {
            alert("Data Saved to Supabase Successfully!");
          }
        }
      } catch (supaErr: any) {
        console.warn('Supabase Student details insert error:', supaErr);
      }

      const newUser: User = {
        id: userId,
        name: normalizedName,
        email: normalizedEmail,
        university: normalizedInst,
        institution: normalizedInst,
        academicLevel: normalizedLevel,
        semester: normalizedLevel,
        studentId: formData.studentId?.trim() || undefined,
        department: formData.department?.trim() || 'General Studies',
        role: 'student',
        status: 'active',
        profilePhoto: '',
        preferences: {
          theme: 'dark',
          currency: 'BDT',
          currencySymbol: '৳',
          dailyStudyGoalMinutes: 120,
          notifications: true,
          onboardingCompleted: true,
          weekStartsOn: 1,
        },
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        loginCount: 1,
      };

      // 2. Direct LocalStorage Persistence into 'campusly_users'
      const storedUserRecord = {
        ...newUser,
        password: formData.password,
      };
      existingUsers.push(storedUserRecord);
      setLocalItem('campusly_users', existingUsers);

      // 2. Direct LocalStorage Persistence into 'campusly_current_user' and 'campusly_user'
      const userToken = `tok_${userId}_${Date.now()}`;
      setLocalItem('campusly_current_user', newUser);
      setLocalItem('campusly_user', newUser);
      setLocalItem('campusly_token', userToken);

      // 3. Reset data collections for the new student
      setSubjects([]);
      setTasks([]);
      setExpenses([]);
      setBudget(null);
      setStudySessions([]);
      setEvents([]);
      setPresentations([]);
      setNotifications([
        {
          id: `notif_${Date.now()}`,
          userId: userId,
          type: 'system',
          title: `Welcome to Campusly, ${normalizedName}! 🎓`,
          message: 'Your student account is active. Explore smart study timers, AI assistance, notes, and academic planning.',
          date: new Date().toISOString(),
          read: false,
          link: '/dashboard',
        }
      ]);
      setNotes([]);

      if (typeof window !== 'undefined') {
        localStorage.removeItem('campusly_subjects');
        localStorage.removeItem('campusly_tasks');
        localStorage.removeItem('campusly_expenses');
        localStorage.removeItem('campusly_budget');
        localStorage.removeItem('campusly_study_sessions');
        localStorage.removeItem('campusly_events');
        localStorage.removeItem('campusly_presentations');
        localStorage.removeItem('campusly_notes');
        localStorage.removeItem('campusly_active_timer');
      }

      setUser(newUser);
      setToken(userToken);

      showToast(`Account created! Welcome to Campusly, ${newUser.name}.`, 'success');
    } catch (err: any) {
      const errorMsg = err?.message || 'Sign up failed. Please check your details.';
      showToast(errorMsg, 'error');
      if (typeof window !== 'undefined') {
        alert(errorMsg);
      }
      throw err;
    }
  }, [showToast]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('campusly_current_user');
      localStorage.removeItem('campusly_user');
      localStorage.removeItem('campusly_token');
      localStorage.removeItem('campusly_subjects');
      localStorage.removeItem('campusly_tasks');
      localStorage.removeItem('campusly_expenses');
      localStorage.removeItem('campusly_budget');
      localStorage.removeItem('campusly_study_sessions');
      localStorage.removeItem('campusly_events');
      localStorage.removeItem('campusly_presentations');
      localStorage.removeItem('campusly_notifications');
      localStorage.removeItem('campusly_notes');
      localStorage.removeItem('campusly_active_timer');
    }
    setSubjects([]);
    setTasks([]);
    setExpenses([]);
    setBudget(null);
    setStudySessions([]);
    setEvents([]);
    setPresentations([]);
    setNotifications([]);
    setNotes([]);
    showToast('You have been signed out.', 'info');
  }, [showToast]);

  const completeOnboarding = useCallback(async (data: Partial<User>) => {
    if (user) {
      const updatedUser: User = {
        ...user,
        ...data,
        preferences: {
          ...user.preferences,
          ...(data.preferences || {}),
          onboardingCompleted: true,
        },
      };
      setUser(updatedUser);
      localStorage.setItem('campusly_user', JSON.stringify(updatedUser));
      setActiveTab('dashboard');
      showToast('Profile setup complete! Welcome to Campusly.', 'success');
    }
  }, [user, showToast, setActiveTab]);

  // Currency helper
  const currencySymbol = user?.preferences?.currencySymbol || '৳';
  const formatCurrency = useCallback((amount: number) => {
    return `${currencySymbol}${Number(amount || 0).toLocaleString()}`;
  }, [currencySymbol]);

  // Derived Single Source of Truth Study Metrics
  const studyGoalMinutes = user?.preferences?.dailyStudyGoalMinutes || 240; // Default 4 hours
  const studyGoalSeconds = studyGoalMinutes * 60;

  const todayStudySeconds = useMemo(() => {
    return getTodayStudySeconds(studySessions, timerState);
  }, [studySessions, timerState]);

  const todayStudyMinutes = useMemo(() => {
    return todayStudySeconds / 60;
  }, [todayStudySeconds]);

  const formattedTodayStudyTime = useMemo(() => {
    return formatStudyDuration(todayStudySeconds);
  }, [todayStudySeconds]);

  const studyProgressPercent = useMemo(() => {
    if (studyGoalSeconds <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((todayStudySeconds / studyGoalSeconds) * 100)));
  }, [todayStudySeconds, studyGoalSeconds]);

  const weeklyStudyData = useMemo(() => {
    return getWeeklyStudyStats(studySessions, timerState);
  }, [studySessions, timerState]);

  const subjectStudyMap = useMemo(() => {
    return getSubjectStudyMap(subjects, studySessions, timerState);
  }, [subjects, studySessions, timerState]);

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  const isAuthenticated = Boolean(user && token && user?.id);
  const isAdmin = Boolean(user && user.role === 'admin');

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        isAuthLoading,
        activeTab,
        setActiveTab,
        subTab,
        setSubTab,
        activePresentationId,
        setActivePresentationId,
        subjects,
        tasks,
        expenses,
        budget,
        studySessions,
        events,
        presentations,
        notifications,
        notes,
        unreadNotifsCount,
        isAddExpenseOpen,
        setIsAddExpenseOpen,
        isAddTaskOpen,
        setIsAddTaskOpen,
        isCreatePresentationOpen,
        setIsCreatePresentationOpen,
        isQuickActionsOpen,
        setIsQuickActionsOpen,
        isAddEventOpen,
        setIsAddEventOpen,
        isReportModalOpen,
        setIsReportModalOpen,
        timerState,
        startTimer,
        pauseTimer,
        resumeTimer,
        stopTimer,
        todayStudySeconds,
        todayStudyMinutes,
        formattedTodayStudyTime,
        studyGoalMinutes,
        studyProgressPercent,
        weeklyStudyData,
        subjectStudyMap,
        updateProfile,
        resetToDefaultData,
        refreshAllData,
        addTask,
        toggleTask,
        deleteTask,
        addExpense,
        deleteExpense,
        updateBudget,
        addSubject,
        deleteSubject,
        addEvent,
        deleteEvent,
        savePresentation,
        deletePresentation,
        duplicatePresentation,
        markNotificationRead,
        markAllNotificationsRead,
        authMode,
        setAuthMode,
        accountRemovedNotice,
        setAccountRemovedNotice,
        login,
        adminLogin,
        register,
        logout,
        completeOnboarding,
        theme,
        setTheme,
        formatCurrency,
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

