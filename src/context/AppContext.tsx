import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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

interface AppContextType {
  user: User | null;
  isAuthenticated: boolean;
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
  login: (email: string, password?: string) => Promise<void>;
  register: (name: string, email: string, password?: string, university?: string, department?: string) => Promise<void>;
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
  const demoUserId = 'local_user';
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const inThreeDays = new Date(now);
  inThreeDays.setDate(inThreeDays.getDate() + 3);
  const inThreeDaysStr = inThreeDays.toISOString().split('T')[0];

  const inFiveDays = new Date(now);
  inFiveDays.setDate(inFiveDays.getDate() + 5);
  const inFiveDaysStr = inFiveDays.toISOString().split('T')[0];

  const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const defaultUser: User = {
    id: demoUserId,
    name: 'Student',
    email: 'student@university.edu',
    profilePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    university: 'University',
    department: 'Computer Science & Engineering',
    semester: '1st Semester',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    preferences: {
      theme: 'light',
      language: 'en',
      currency: 'BDT',
      currencySymbol: '৳',
      dailyStudyGoalMinutes: 240,
      monthlyBudgetAmount: 12000,
      onboardingCompleted: true,
    },
  };

  const defaultSubjects: Subject[] = [
    {
      id: 'sub_1',
      userId: demoUserId,
      name: 'Database Management Systems',
      code: 'CSE-301',
      icon: 'Database',
      color: '#7C3AED',
      creditHours: 3,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sub_2',
      userId: demoUserId,
      name: 'Artificial Intelligence',
      code: 'CSE-305',
      icon: 'Brain',
      color: '#3B82F6',
      creditHours: 3,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sub_3',
      userId: demoUserId,
      name: 'Software Engineering & Design',
      code: 'CSE-311',
      icon: 'Code2',
      color: '#10B981',
      creditHours: 3,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sub_4',
      userId: demoUserId,
      name: 'Financial Accounting',
      code: 'BBA-202',
      icon: 'BarChart3',
      color: '#F59E0B',
      creditHours: 2,
      createdAt: new Date().toISOString(),
    },
  ];

  const defaultTasks: Task[] = [
    {
      id: 'task_1',
      userId: demoUserId,
      title: 'Complete DBMS Lab Assignment 4 (Query Optimization)',
      description: 'Implement B-Tree indexing and measure execution latency on 100k rows.',
      subjectId: 'sub_1',
      priority: 'urgent',
      dueDate: todayStr,
      reminder: true,
      completed: false,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'task_2',
      userId: demoUserId,
      title: 'Review A* Search Algorithm slides & heuristics',
      description: 'Read Chapter 4 of AI textbook and solve sample state-space graphs.',
      subjectId: 'sub_2',
      priority: 'high',
      dueDate: todayStr,
      reminder: false,
      completed: true,
      completedAt: new Date().toISOString(),
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'task_3',
      userId: demoUserId,
      title: 'Prepare System Architecture Diagram for Sprint Review',
      description: 'Create clean C4 model diagram for team project presentation.',
      subjectId: 'sub_3',
      priority: 'medium',
      dueDate: tomorrowStr,
      reminder: true,
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'task_4',
      userId: demoUserId,
      title: 'Read Ledger Balancing & Trial Balance case study',
      description: 'Pages 45-62 for accounting pop quiz.',
      subjectId: 'sub_4',
      priority: 'low',
      dueDate: inThreeDaysStr,
      reminder: false,
      completed: false,
      createdAt: new Date().toISOString(),
    },
  ];

  const defaultExpenses: Expense[] = [
    {
      id: 'exp_1',
      userId: demoUserId,
      amount: 180,
      category: 'food',
      description: 'University Cafeteria Lunch & Tea',
      date: todayStr,
      note: 'Chicken Biryani and Lemonade',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'exp_2',
      userId: demoUserId,
      amount: 240,
      category: 'transport',
      description: 'Metro Rail & Campus Shuttle Bus',
      date: todayStr,
      note: 'Daily commute round trip',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'exp_3',
      userId: demoUserId,
      amount: 650,
      category: 'education',
      description: 'AI & Machine Learning Reference Handbook',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      note: 'Nilkhet book market',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'exp_4',
      userId: demoUserId,
      amount: 350,
      category: 'entertainment',
      description: 'Movie Night with Study Group',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      note: 'Weekend break',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const defaultBudget: Budget = {
    id: 'budget_default',
    userId: demoUserId,
    monthlyBudget: 12000,
    categoryBudgets: {
      food: 4500,
      transport: 2500,
      education: 3000,
      entertainment: 1000,
      shopping: 500,
      bills: 500,
    },
    monthYear: currentMonthYear,
  };

  const defaultStudySessions: StudySession[] = [
    {
      id: 'session_1',
      userId: demoUserId,
      subjectId: 'sub_1',
      durationMinutes: 75,
      breakMinutes: 15,
      mode: 'pomodoro',
      notes: 'Covered normalization up to BCNF and solved 3 past exam questions.',
      completedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'session_2',
      userId: demoUserId,
      subjectId: 'sub_2',
      durationMinutes: 60,
      breakMinutes: 10,
      mode: 'pomodoro',
      notes: 'Trained neural network backprop walkthrough.',
      completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const defaultEvents: UniversityEvent[] = [
    {
      id: 'event_1',
      userId: demoUserId,
      title: 'National Collegiate Tech Fest & Hackathon',
      date: inThreeDaysStr,
      time: '09:30',
      location: 'Central Auditorium, TSC',
      description: '36-hour product hackathon with mentors from Google & local startups.',
      type: 'competition',
      reminder: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'event_2',
      userId: demoUserId,
      title: 'Research Seminar on Generative AI in Healthcare',
      date: inFiveDaysStr,
      time: '14:00',
      location: 'Auditorium 204, Faculty of Science',
      description: 'Keynote by visiting professor.',
      type: 'seminar',
      reminder: true,
      createdAt: new Date().toISOString(),
    },
  ];

  const defaultPresentations: Presentation[] = [
    {
      id: 'pres_1',
      userId: demoUserId,
      title: 'AI in Modern Cloud Computing',
      subtitle: 'Scalability, Autonomous Systems, and Future Architectures',
      topic: 'AI in Cloud Computing',
      subject: 'Artificial Intelligence',
      slidesCount: 5,
      audience: 'university',
      style: 'modern',
      tone: 'educational',
      language: 'en',
      progressPercent: 65,
      sources: ['IEEE Cloud Engineering 2025', 'ACM Tech Insights'],
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      slides: [
        {
          id: 'slide_1',
          slideNumber: 1,
          title: 'AI in Modern Cloud Computing',
          subtitle: 'Autonomous Systems, Neural Optimization, and Next-Gen Scale',
          bullets: [
            'Presented by Student',
            'Department of Computer Science & Engineering',
            'University Faculty of Science',
          ],
          body: 'An exploration into how machine learning workloads and intelligent orchestration are transforming modern hyperscale cloud infrastructure.',
          speakerNotes: 'Good morning everyone. Today, I am excited to present our analysis on how Artificial Intelligence is reshaping the fundamentals of cloud architecture.',
          layout: 'title_slide',
          keyTakeaway: 'AI is transforming cloud from passive infrastructure to self-healing cognitive systems.',
        },
        {
          id: 'slide_2',
          slideNumber: 2,
          title: 'Core Drivers of the Paradigm Shift',
          subtitle: 'Why Traditional Static Provisioning Fails at Scale',
          bullets: [
            'Exponential growth in LLM parameter sizes and GPU cluster demands',
            'Real-time traffic spikes requiring sub-second predictive scaling',
            'Power consumption and green computing optimization imperatives',
          ],
          body: 'Static threshold-based auto-scaling rules can no longer cope with unpredictable distributed workload spikes. Machine learning forecasting models reduce resource wastage by over 34%.',
          speakerNotes: 'When we look at the core drivers, traditional cloud management relied on static CPU thresholds.',
          layout: 'two_column',
          statNumber: '34%',
          statLabel: 'Average energy & cost reduction with ML autoscaling',
          keyTakeaway: 'Predictive neural schedulers outperform static threshold triggers.',
        },
        {
          id: 'slide_3',
          slideNumber: 3,
          title: 'Intelligent Workload Scheduling',
          subtitle: 'Deep Reinforcement Learning in Cluster Management',
          bullets: [
            'Continuous telemetry collection across millions of CPU/GPU nodes',
            'Reinforcement learning agents selecting optimal microservice placement',
            'Pre-emptive thermal throttling and hardware degradation detection',
          ],
          body: 'By continuously learning from historical telemetry, automated agents preempt node failures before jobs suffer packet loss or cluster re-balancing overhead.',
          speakerNotes: 'On this slide, notice the feedback loop. Rather than reacting to crashes, autonomous controllers predict memory bottlenecks minutes before they manifest.',
          layout: 'bullet_points',
          keyTakeaway: 'Self-healing clusters drastically reduce costly operational downtime.',
        },
        {
          id: 'slide_4',
          slideNumber: 4,
          title: 'Key Industry Benchmarks',
          subtitle: 'Measured Impact Across Leading Production Environments',
          bullets: [
            '99.999% SLA reliability achieved with predictive anomaly isolation',
            '45% faster model training cycle completion through tensor-aware routing',
            'Zero manual intervention required during sudden traffic surges',
          ],
          body: 'Real-world data proves that intelligent orchestration delivers measurable operational velocity and dramatic cost savings.',
          speakerNotes: 'Here are the key metrics. As demonstrated in recent benchmark studies, tensor-aware routing cuts distributed training latency almost in half.',
          layout: 'highlight_stat',
          statNumber: '99.999%',
          statLabel: 'High-availability uptime maintained with zero human intervention',
          keyTakeaway: 'Measurable ROI is the primary catalyst for rapid university and enterprise adoption.',
        },
        {
          id: 'slide_5',
          slideNumber: 5,
          title: 'Conclusion & Future Outlook',
          subtitle: 'The Journey Towards Fully Autonomous Cloud Ecosystems',
          bullets: [
            'Convergence of Edge AI and Serverless architectures',
            'Standardization of open telemetry frameworks for AI models',
            'Ethical considerations in automated infrastructure governance',
          ],
          body: 'As we look toward the next decade, cloud infrastructure will become completely invisible to developers, driven by self-optimizing AI models.',
          speakerNotes: 'To conclude, the future belongs to frictionless, self-governing clouds. Thank you for your attention!',
          layout: 'summary',
          keyTakeaway: 'The ultimate vision is zero-configuration, universally adaptive computing.',
        },
      ],
    },
  ];

  const defaultNotifications: AppNotification[] = [
    {
      id: 'notif_1',
      userId: demoUserId,
      type: 'deadline_reminder',
      title: 'DBMS Assignment Due Tonight',
      message: 'Your query optimization assignment deadline is 11:59 PM.',
      date: new Date().toISOString(),
      read: false,
      link: '/planner',
    },
    {
      id: 'notif_2',
      userId: demoUserId,
      type: 'study_reminder',
      title: 'Daily Study Goal on Track 🎯',
      message: 'Keep going! Log your focus sessions in Study Timer.',
      date: new Date().toISOString(),
      read: false,
      link: '/study',
    },
  ];

  const defaultNotes: Note[] = [
    {
      id: 'note_1',
      userId: demoUserId,
      subjectId: 'sub_1',
      title: 'ACID Properties in Relational Databases',
      content: '# ACID Properties\n- **Atomicity**: All or nothing transaction execution.\n- **Consistency**: Preserves all database integrity constraints.\n- **Isolation**: Concurrent transactions do not interfere.\n- **Durability**: Committed changes persist across system failures.\n\n### BCNF Checklist\nFor every non-trivial functional dependency X -> Y, X must be a superkey.',
      tags: ['Databases', 'DBMS', 'Exam Review'],
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  return {
    user: defaultUser,
    subjects: defaultSubjects,
    tasks: defaultTasks,
    expenses: defaultExpenses,
    budget: defaultBudget,
    studySessions: defaultStudySessions,
    events: defaultEvents,
    presentations: defaultPresentations,
    notifications: defaultNotifications,
    notes: defaultNotes,
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
  const initialSeeds = getDefaultInitialData();

  // Local-First Synchronous State Initialization
  const [user, setUser] = useState<User>(() => getLocalItem<User>('campusly_user', initialSeeds.user));
  const [activeTab, setActiveTab] = useState<MainTab>('dashboard');
  const [subTab, setSubTab] = useState<string>('overview');
  const [activePresentationId, setActivePresentationId] = useState<string | null>(null);

  // Data Collections with local-first initial state
  const [subjects, setSubjects] = useState<Subject[]>(() => getLocalItem<Subject[]>('campusly_subjects', initialSeeds.subjects));
  const [tasks, setTasks] = useState<Task[]>(() => getLocalItem<Task[]>('campusly_tasks', initialSeeds.tasks));
  const [expenses, setExpenses] = useState<Expense[]>(() => getLocalItem<Expense[]>('campusly_expenses', initialSeeds.expenses));
  const [budget, setBudget] = useState<Budget | null>(() => getLocalItem<Budget | null>('campusly_budget', initialSeeds.budget));
  const [studySessions, setStudySessions] = useState<StudySession[]>(() => getLocalItem<StudySession[]>('campusly_study_sessions', initialSeeds.studySessions));
  const [events, setEvents] = useState<UniversityEvent[]>(() => getLocalItem<UniversityEvent[]>('campusly_events', initialSeeds.events));
  const [presentations, setPresentations] = useState<Presentation[]>(() => getLocalItem<Presentation[]>('campusly_presentations', initialSeeds.presentations));
  const [notifications, setNotifications] = useState<AppNotification[]>(() => getLocalItem<AppNotification[]>('campusly_notifications', initialSeeds.notifications));
  const [notes, setNotes] = useState<Note[]>(() => getLocalItem<Note[]>('campusly_notes', initialSeeds.notes));

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
          if (prev.profilePhoto !== storedAvatar) {
            return { ...prev, profilePhoto: storedAvatar };
          }
          return prev;
        });
      }
    }).catch((err) => {
      console.warn('Error retrieving avatar from IndexedDB:', err);
    });
  }, []);

  // Background server sync if available
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

      if (subRes && subRes.length > 0) setSubjects(subRes);
      if (taskRes && taskRes.length > 0) setTasks(taskRes);
      if (expRes && expRes.length > 0) setExpenses(expRes);
      if (budRes) setBudget(budRes);
      if (sessRes && sessRes.length > 0) setStudySessions(sessRes);
      if (eveRes && eveRes.length > 0) setEvents(eveRes);
      if (presRes && presRes.length > 0) setPresentations(presRes);
      if (notifRes && notifRes.length > 0) setNotifications(notifRes);
      if (notesRes && notesRes.length > 0) setNotes(notesRes);
    } catch {
      // Offline / local-first mode: perfectly silent fallback
    }
  }, []);

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
                userId: user.id,
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
  }, [timerState.isRunning, timerState.startTime, showToast, user.id]);

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
            userId: user.id,
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
    [showToast, user.id]
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
      userId: user.id,
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
  }, [showToast, user.id]);

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
      userId: user.id,
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
  }, [showToast, user.id]);

  const deleteExpense = useCallback(async (expenseId: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    showToast('Expense deleted.', 'info');
    apiRequest(`/api/expenses/${expenseId}`, { method: 'DELETE' }).catch(() => {});
  }, [showToast]);

  const updateBudget = useCallback(async (budgetData: Partial<Budget>) => {
    const updated: Budget = {
      id: budget?.id || `budget_${Date.now()}`,
      userId: user.id,
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
  }, [budget, showToast, user.id]);

  const addSubject = useCallback(async (subjectData: Partial<Subject>) => {
    const newSub: Subject = {
      id: `sub_${Date.now()}`,
      userId: user.id,
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
  }, [showToast, user.id]);

  const deleteSubject = useCallback(async (subjectId: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
    showToast('Subject deleted.', 'info');
    apiRequest(`/api/subjects/${subjectId}`, { method: 'DELETE' }).catch(() => {});
  }, [showToast]);

  const addEvent = useCallback(async (eventData: Partial<UniversityEvent>) => {
    const newEv: UniversityEvent = {
      id: `event_${Date.now()}`,
      userId: user.id,
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
  }, [showToast, user.id]);

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
        userId: user.id,
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
  }, [presentations, showToast, user.id]);

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

  const login = useCallback(async (email: string, _password?: string) => {
    if (user) {
      const updatedUser = { ...user, email };
      setUser(updatedUser);
      localStorage.setItem('campusly_user', JSON.stringify(updatedUser));
    }
    showToast(`Welcome back, ${user?.name || 'Student'}!`, 'success');
  }, [user, showToast]);

  const register = useCallback(async (name: string, email: string, _password?: string, university?: string, department?: string) => {
    if (user) {
      const updatedUser: User = {
        ...user,
        name,
        email,
        university: university || user.university,
        department: department || user.department,
      };
      setUser(updatedUser);
      localStorage.setItem('campusly_user', JSON.stringify(updatedUser));
    }
    showToast(`Account created for ${name}!`, 'success');
  }, [user, showToast]);

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

  return (
    <AppContext.Provider
      value={{
        user,
        isAuthenticated: true,
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
        register,
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

