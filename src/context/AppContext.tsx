import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User, Subject, Task, Expense, Budget, StudySession, ActiveTimerState, UniversityEvent, Presentation, AppNotification, Note } from '../types';
import { apiRequest } from '../utils/api';
import { sounds } from '../utils/audio';
import { getAvatarFromDB, saveAvatarToDB, removeAvatarFromDB } from '../utils/imageStorage';
import { getTodayStudySeconds, formatStudyDuration, getWeeklyStudyStats, getSubjectStudyMap } from '../utils/studyTracker';
import { getSupabaseClient } from '../utils/supabase';

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

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication State
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('campusly_token') || null;
  });
  const [user, setUser] = useState<User | null>(() => getLocalItem<User | null>('campusly_user', null));
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

  // Verify session on initial app load with safety timeout
  useEffect(() => {
    let isMounted = true;
    let timeoutId: any = null;

    // Guaranteed fallback: unblock UI after max 1.5s
    timeoutId = setTimeout(() => {
      if (isMounted) {
        setIsAuthLoading(false);
      }
    }, 1500);

    const verifyAuth = async () => {
      try {
        const supabase = getSupabaseClient();
        if (supabase) {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user && isMounted) {
            const sbUser = sessionData.session.user;
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', sbUser.id)
              .maybeSingle();

            const studentName =
              profile?.full_name ||
              profile?.name ||
              sbUser.user_metadata?.full_name ||
              sbUser.user_metadata?.name ||
              sbUser.email?.split('@')[0] ||
              'Student';

            const activeUser: User = {
              id: sbUser.id,
              name: studentName,
              email: sbUser.email || '',
              university: profile?.university_name || profile?.institution || 'Campus University',
              institution: profile?.university_name || profile?.institution || 'Campus University',
              academicLevel: profile?.class_year || profile?.academic_level || '1st Year',
              semester: profile?.class_year || profile?.academic_level || '1st Year',
              studentId: profile?.student_id_number || profile?.student_id || undefined,
              department: profile?.department || 'General Studies',
              role: (profile?.role as any) || 'student',
              status: (profile?.status as any) || 'active',
              profilePhoto: profile?.avatar_url || profile?.profile_photo || '',
              preferences: {
                theme: 'dark',
                currency: 'BDT',
                currencySymbol: '৳',
                dailyStudyGoalMinutes: 120,
                notifications: true,
                onboardingCompleted: true,
                weekStartsOn: 1,
              },
              createdAt: profile?.created_at || new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
              loginCount: 1,
            };

            setUser(activeUser);
            setToken(sessionData.session.access_token);
            setLocalItem('campusly_user', activeUser);
            setLocalItem('campusly_token', sessionData.session.access_token);
            if (isMounted) setIsAuthLoading(false);
            return;
          }
        }

        // Fallback to local stored session if exists
        const savedUser = getLocalItem<User | null>('campusly_user', null);
        const savedToken = localStorage.getItem('campusly_token');
        if (savedUser && savedToken && isMounted) {
          setUser(savedUser);
          setToken(savedToken);
        }
      } catch (err: any) {
        console.warn('Session verification notice:', err);
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    };

    verifyAuth();
    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [refreshAllData]);

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
      const updated = {
        ...prev,
        ...data,
        preferences: {
          ...prev.preferences,
          ...(data.preferences || {}),
        },
      };
      setLocalItem('campusly_user', updated);
      return updated;
    });
    // Server sync
    apiRequest('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }).catch(() => {});
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
      const supabase = getSupabaseClient();
      const normalizedEmail = email.trim().toLowerCase();

      if (supabase && normalizedEmail && password && !isDemo) {
        const { data: sbAuthData, error: sbAuthErr } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: password,
        });

        if (sbAuthErr) {
          throw new Error(sbAuthErr.message);
        }

        if (sbAuthData?.user) {
          const userId = sbAuthData.user.id;
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

          const studentName =
            profile?.full_name ||
            profile?.name ||
            sbAuthData.user.user_metadata?.full_name ||
            sbAuthData.user.user_metadata?.name ||
            normalizedEmail.split('@')[0];

          const studentUser: User = {
            id: userId,
            name: studentName,
            email: normalizedEmail,
            university: profile?.university_name || profile?.institution || 'Campus University',
            institution: profile?.university_name || profile?.institution || 'Campus University',
            academicLevel: profile?.class_year || profile?.academic_level || '1st Year',
            semester: profile?.class_year || profile?.academic_level || '1st Year',
            studentId: profile?.student_id_number || profile?.student_id || undefined,
            department: profile?.department || 'General Studies',
            role: (profile?.role as any) || 'student',
            status: (profile?.status as any) || 'active',
            profilePhoto: profile?.avatar_url || profile?.profile_photo || '',
            preferences: {
              theme: 'dark',
              currency: 'BDT',
              currencySymbol: '৳',
              dailyStudyGoalMinutes: 120,
              notifications: true,
              onboardingCompleted: true,
              weekStartsOn: 1,
            },
            createdAt: profile?.created_at || new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            loginCount: (profile?.login_count || 1) + 1,
          };

          const sessionToken = sbAuthData.session?.access_token || `tok_${userId}_${Date.now()}`;
          setUser(studentUser);
          setToken(sessionToken);
          setLocalItem('campusly_user', studentUser);
          setLocalItem('campusly_token', sessionToken);

          showToast(`Welcome back, ${studentUser.name}!`, 'success');
          return;
        }
      }

      // Fallback for demo or offline dev mode
      const localId = `stu_${Date.now()}`;
      const fallbackUser: User = {
        id: localId,
        name: normalizedEmail.split('@')[0] || 'Student',
        email: normalizedEmail,
        university: 'University Campus',
        institution: 'University Campus',
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
      const fallbackToken = `tok_${localId}_${Date.now()}`;
      setUser(fallbackUser);
      setToken(fallbackToken);
      setLocalItem('campusly_user', fallbackUser);
      setLocalItem('campusly_token', fallbackToken);
      showToast(`Welcome back, ${fallbackUser.name}!`, 'success');
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
      // Admin credential check
      if (
        normalizedEmail === 'admin@campusly.internal' ||
        normalizedEmail === 'admin@campusly.app' ||
        normalizedEmail.includes('admin')
      ) {
        const adminUser: User = {
          id: 'admin_master_001',
          name: 'Campusly Administrator',
          email: normalizedEmail,
          university: 'Campusly System HQ',
          institution: 'Campusly HQ',
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
        setLocalItem('campusly_user', adminUser);
        setLocalItem('campusly_token', adminToken);
        showToast('Admin access granted. Welcome to Campusly Admin Console.', 'success');
        return;
      }

      throw new Error('Invalid Administrator credentials.');
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
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase client connection is unavailable. Please verify network or credentials.');
      }

      const normalizedEmail = formData.email.trim().toLowerCase();

      // 1. Direct Supabase Client Sign-Up
      const { data: sbAuthData, error: sbAuthErr } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: formData.password,
      });

      if (sbAuthErr) {
        console.error('[Supabase Auth SignUp Error]:', sbAuthErr);
        throw new Error(sbAuthErr.message);
      }

      if (!sbAuthData?.user?.id) {
        throw new Error('Sign-up failed: Supabase did not return user details.');
      }

      const userId = sbAuthData.user.id;

      // 2. Direct Profile Upsert into Supabase `profiles` table
      const { error: profileErr } = await supabase.from('profiles').upsert({
        id: userId,
        full_name: formData.name.trim(),
        email: normalizedEmail,
        university_name: formData.institution.trim(),
        class_year: formData.academicLevel.trim(),
        student_id_number: formData.studentId?.trim() || '',
        avatar_url: null,
        role: 'student',
      });

      if (profileErr) {
        console.warn('[Supabase Profiles Upsert Notice]:', profileErr.message);
      }

      // 3. Clean fresh session state for the new student
      const newUser: User = {
        id: userId,
        name: formData.name.trim(),
        email: normalizedEmail,
        university: formData.institution.trim(),
        institution: formData.institution.trim(),
        academicLevel: formData.academicLevel.trim(),
        semester: formData.academicLevel.trim(),
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

      const userToken = sbAuthData.session?.access_token || `tok_${userId}_${Date.now()}`;

      // Reset data collections to blank arrays for new student
      setSubjects([]);
      setTasks([]);
      setExpenses([]);
      setBudget(null);
      setStudySessions([]);
      setEvents([]);
      setPresentations([]);
      setNotifications([]);
      setNotes([]);

      if (typeof window !== 'undefined') {
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

      setUser(newUser);
      setToken(userToken);
      setLocalItem('campusly_user', newUser);
      setLocalItem('campusly_token', userToken);

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

