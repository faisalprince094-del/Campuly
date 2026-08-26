import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const app = express();
app.use(express.json({ limit: '10mb' }));

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Centralized Gemini Model Configuration with fallback resilience
const GEMINI_MODELS = ['gemini-3.7-flash', 'gemini-3.1-flash-lite'];
const GEMINI_MODEL = GEMINI_MODELS[0];

async function generateGeminiContentWithFallback(params: {
  contents: any;
  config?: any;
}) {
  let lastError: any = null;
  for (const modelName of GEMINI_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: params.contents,
        config: params.config,
      });
      if (response && (response.text || response.functionCalls)) {
        return response;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Gemini model ${modelName} attempt failed:`, err?.message || err);
    }
  }
  throw lastError || new Error('Failed to generate response with Gemini');
}

// Database storage setup
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'campusly.json');

interface DatabaseSchema {
  users: any[];
  subjects: any[];
  tasks: any[];
  expenses: any[];
  budgets: any[];
  studySessions: any[];
  events: any[];
  presentations: any[];
  notifications: any[];
  notes: any[];
  aiFeedback: any[];
}

// Initial demo seed data for quick evaluation
const getInitialSeed = (): DatabaseSchema => {
  const demoUserId = 'user_demo_101';
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

  return {
    users: [
      {
        id: demoUserId,
        name: 'Faisal Prince',
        email: 'faisalprince094@gmail.com',
        profilePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        university: 'University of Dhaka',
        department: 'Computer Science & Engineering',
        semester: '6th Semester',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        preferences: {
          theme: 'light',
          language: 'en',
          currency: 'BDT',
          currencySymbol: '৳',
          dailyStudyGoalMinutes: 240, // 4 hours
          monthlyBudgetAmount: 12000,
          onboardingCompleted: true,
        },
      },
    ],
    subjects: [
      {
        id: 'sub_1',
        userId: demoUserId,
        name: 'Database Management Systems',
        code: 'CSE-301',
        icon: 'Database',
        color: '#7C3AED', // Violet
        creditHours: 3,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sub_2',
        userId: demoUserId,
        name: 'Artificial Intelligence',
        code: 'CSE-305',
        icon: 'Brain',
        color: '#3B82F6', // Blue
        creditHours: 3,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sub_3',
        userId: demoUserId,
        name: 'Software Engineering & Design',
        code: 'CSE-311',
        icon: 'Code2',
        color: '#10B981', // Emerald
        creditHours: 3,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sub_4',
        userId: demoUserId,
        name: 'Financial Accounting',
        code: 'BBA-202',
        icon: 'BarChart3',
        color: '#F59E0B', // Amber
        creditHours: 2,
        createdAt: new Date().toISOString(),
      },
    ],
    tasks: [
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
    ],
    expenses: [
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
    ],
    budgets: [
      {
        id: 'budget_1',
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
      },
    ],
    studySessions: [
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
      {
        id: 'session_3',
        userId: demoUserId,
        subjectId: 'sub_3',
        durationMinutes: 50,
        breakMinutes: 10,
        mode: 'pomodoro',
        notes: 'Refactored backend REST routes for term project.',
        completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'session_4',
        userId: demoUserId,
        subjectId: 'sub_1',
        durationMinutes: 90,
        breakMinutes: 15,
        mode: 'custom',
        notes: 'Index scan vs full table scan benchmarking.',
        completedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      },
    ],
    events: [
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
        description: 'Keynote by visiting professor from Oxford University.',
        type: 'seminar',
        reminder: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'event_3',
        userId: demoUserId,
        title: 'Midterm Exam: Database Systems',
        date: inFiveDaysStr,
        time: '10:00',
        location: 'Exam Hall B',
        description: 'Modules 1 to 5. Bring ID card and non-programmable calculator.',
        type: 'exam',
        reminder: true,
        createdAt: new Date().toISOString(),
      },
    ],
    presentations: [
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
              'Presented by Faisal Prince',
              'Department of Computer Science & Engineering',
              'University of Dhaka',
            ],
            body: 'An exploration into how machine learning workloads and intelligent orchestration are transforming modern hyperscale cloud infrastructure.',
            speakerNotes: 'Good morning everyone. Today, I am excited to present our analysis on how Artificial Intelligence is reshaping the fundamentals of cloud architecture and autonomous resource scheduling.',
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
            speakerNotes: 'When we look at the core drivers, traditional cloud management relied on static CPU thresholds. However, deep learning models demand dynamic, multi-dimensional tensor orchestration.',
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
            speakerNotes: 'To conclude, the future belongs to frictionless, self-governing clouds. Thank you for your attention, and I now welcome any questions or discussion.',
            layout: 'summary',
            keyTakeaway: 'The ultimate vision is zero-configuration, universally adaptive computing.',
          },
        ],
      },
    ],
    notifications: [
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
        type: 'budget_warning',
        title: 'Food Budget Update',
        message: 'You have utilized 42% of your monthly food allowance.',
        date: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        read: false,
        link: '/finance',
      },
      {
        id: 'notif_3',
        userId: demoUserId,
        type: 'study_reminder',
        title: 'Daily Study Goal on Track 🎯',
        message: '2h 15m completed today towards your 4h target.',
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        read: true,
        link: '/study',
      },
    ],
    notes: [
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
    ],
    aiFeedback: [],
  };
};

// Ensure data folder and file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadDB(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      // Ensure all collections exist
      const defaultSeed = getInitialSeed();
      return {
        users: parsed.users || defaultSeed.users,
        subjects: parsed.subjects || defaultSeed.subjects,
        tasks: parsed.tasks || defaultSeed.tasks,
        expenses: parsed.expenses || defaultSeed.expenses,
        budgets: parsed.budgets || defaultSeed.budgets,
        studySessions: parsed.studySessions || defaultSeed.studySessions,
        events: parsed.events || defaultSeed.events,
        presentations: parsed.presentations || defaultSeed.presentations,
        notifications: parsed.notifications || defaultSeed.notifications,
        notes: parsed.notes || defaultSeed.notes,
        aiFeedback: parsed.aiFeedback || defaultSeed.aiFeedback,
      };
    }
  } catch (err) {
    console.error('Error reading database file, resetting to initial seed:', err);
  }
  const seed = getInitialSeed();
  saveDB(seed);
  return seed;
}

function saveDB(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database file:', err);
  }
}

// User context middleware
function getUserId(req: express.Request): string {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token && token !== 'null' && token !== 'undefined') {
      return token;
    }
  }
  const queryUser = req.query.userId as string;
  if (queryUser) return queryUser;
  // Default to demo user
  return 'user_demo_101';
}

// ======================== API ROUTES ========================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication
app.post('/api/auth/login', (req, res) => {
  const { email, password, isGoogle, isDemo } = req.body;
  const db = loadDB();

  if (isDemo) {
    const demoUser = db.users[0];
    return res.json({ user: demoUser, token: demoUser.id });
  }

  if (isGoogle) {
    // Google Sign-In simulation / lookup
    let user = db.users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase());
    if (!user) {
      const newUserId = `user_${Date.now()}`;
      user = {
        id: newUserId,
        name: req.body.name || 'Campus Student',
        email: email || 'student@university.edu',
        profilePhoto: req.body.profilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        university: 'University',
        department: 'General Studies',
        semester: '1st Semester',
        createdAt: new Date().toISOString(),
        preferences: {
          theme: 'light',
          language: 'en',
          currency: 'BDT',
          currencySymbol: '৳',
          dailyStudyGoalMinutes: 180,
          monthlyBudgetAmount: 10000,
          onboardingCompleted: false,
        },
      };
      db.users.push(user);
      saveDB(db);
    }
    return res.json({ user, token: user.id });
  }

  // Standard email login
  const user = db.users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase());
  if (user) {
    return res.json({ user, token: user.id });
  } else {
    // Auto-create for friendly prototyping if not found, or prompt
    const newUserId = `user_${Date.now()}`;
    const newUser = {
      id: newUserId,
      name: email.split('@')[0],
      email: email,
      profilePhoto: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      university: 'My University',
      department: 'Department',
      semester: '1st Semester',
      createdAt: new Date().toISOString(),
      preferences: {
        theme: 'light',
        language: 'en',
        currency: 'BDT',
        currencySymbol: '৳',
        dailyStudyGoalMinutes: 180,
        monthlyBudgetAmount: 10000,
        onboardingCompleted: false,
      },
    };
    db.users.push(newUser);
    saveDB(db);
    return res.json({ user: newUser, token: newUser.id });
  }
});

app.post('/api/auth/signup', (req, res) => {
  const { name, email, university, department, semester } = req.body;
  const db = loadDB();

  let user = db.users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase());
  if (user) {
    return res.json({ user, token: user.id });
  }

  const newUserId = `user_${Date.now()}`;
  user = {
    id: newUserId,
    name: name || 'Student',
    email: email || `student_${Date.now()}@university.edu`,
    profilePhoto: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    university: university || 'University of Dhaka',
    department: department || 'Computer Science',
    semester: semester || '1st Semester',
    createdAt: new Date().toISOString(),
    preferences: {
      theme: 'light',
      language: 'en',
      currency: 'BDT',
      currencySymbol: '৳',
      dailyStudyGoalMinutes: 240,
      monthlyBudgetAmount: 12000,
      onboardingCompleted: false,
    },
  };
  db.users.push(user);

  // Add default subjects for new user
  const defaultSubs = [
    { id: `sub_${Date.now()}_1`, userId: newUserId, name: 'Core Major Course', icon: 'BookOpen', color: '#7C3AED', creditHours: 3, createdAt: new Date().toISOString() },
    { id: `sub_${Date.now()}_2`, userId: newUserId, name: 'General Elective', icon: 'Lightbulb', color: '#3B82F6', creditHours: 3, createdAt: new Date().toISOString() },
  ];
  db.subjects.push(...defaultSubs);

  saveDB(db);
  return res.json({ user, token: user.id });
});

app.get('/api/auth/me', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  const user = db.users.find((u) => u.id === userId) || db.users[0];
  res.json({ user, token: user.id });
});

app.put('/api/auth/profile', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  const index = db.users.findIndex((u) => u.id === userId);
  if (index !== -1) {
    db.users[index] = {
      ...db.users[index],
      ...req.body,
      preferences: {
        ...db.users[index].preferences,
        ...(req.body.preferences || {}),
      },
    };
    saveDB(db);
    return res.json({ user: db.users[index] });
  }
  res.status(404).json({ error: 'User not found' });
});

app.post('/api/auth/onboarding', (req, res) => {
  const userId = getUserId(req);
  const { name, university, department, semester, subjects, monthlyBudget, dailyStudyGoalMinutes } = req.body;
  const db = loadDB();
  const userIndex = db.users.findIndex((u) => u.id === userId);

  if (userIndex !== -1) {
    db.users[userIndex].name = name || db.users[userIndex].name;
    db.users[userIndex].university = university || db.users[userIndex].university;
    db.users[userIndex].department = department || db.users[userIndex].department;
    db.users[userIndex].semester = semester || db.users[userIndex].semester;
    db.users[userIndex].preferences.onboardingCompleted = true;
    if (monthlyBudget) db.users[userIndex].preferences.monthlyBudgetAmount = Number(monthlyBudget);
    if (dailyStudyGoalMinutes) db.users[userIndex].preferences.dailyStudyGoalMinutes = Number(dailyStudyGoalMinutes);

    // Save initial subjects if provided
    if (Array.isArray(subjects) && subjects.length > 0) {
      subjects.forEach((subName: string, idx: number) => {
        if (subName && subName.trim()) {
          const colors = ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#6366F1'];
          db.subjects.push({
            id: `sub_${Date.now()}_${idx}`,
            userId,
            name: subName.trim(),
            icon: 'BookOpen',
            color: colors[idx % colors.length],
            creditHours: 3,
            createdAt: new Date().toISOString(),
          });
        }
      });
    }

    saveDB(db);
    return res.json({ user: db.users[userIndex] });
  }
  res.status(404).json({ error: 'User not found' });
});

// ======================== SUBJECTS ========================
app.get('/api/subjects', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  const userSubjects = db.subjects.filter((s) => s.userId === userId);
  res.json(userSubjects);
});

app.post('/api/subjects', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  const newSubject = {
    id: `sub_${Date.now()}`,
    userId,
    name: req.body.name || 'Untitled Subject',
    code: req.body.code || '',
    icon: req.body.icon || 'BookOpen',
    color: req.body.color || '#7C3AED',
    creditHours: Number(req.body.creditHours) || 3,
    createdAt: new Date().toISOString(),
  };
  db.subjects.push(newSubject);
  saveDB(db);
  res.status(201).json(newSubject);
});

app.put('/api/subjects/:id', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  const index = db.subjects.findIndex((s) => s.id === req.params.id && s.userId === userId);
  if (index !== -1) {
    db.subjects[index] = { ...db.subjects[index], ...req.body };
    saveDB(db);
    return res.json(db.subjects[index]);
  }
  res.status(404).json({ error: 'Subject not found' });
});

app.delete('/api/subjects/:id', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  db.subjects = db.subjects.filter((s) => !(s.id === req.params.id && s.userId === userId));
  saveDB(db);
  res.json({ success: true });
});

// ======================== TASKS ========================
app.get('/api/tasks', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  const userTasks = db.tasks.filter((t) => t.userId === userId);
  res.json(userTasks);
});

app.post('/api/tasks', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  const newTask = {
    id: `task_${Date.now()}`,
    userId,
    title: req.body.title || 'Untitled Task',
    description: req.body.description || '',
    subjectId: req.body.subjectId || undefined,
    priority: req.body.priority || 'medium',
    dueDate: req.body.dueDate || new Date().toISOString().split('T')[0],
    reminder: !!req.body.reminder,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  db.tasks.unshift(newTask);
  saveDB(db);
  res.status(201).json(newTask);
});

app.put('/api/tasks/:id', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  const index = db.tasks.findIndex((t) => t.id === req.params.id && t.userId === userId);
  if (index !== -1) {
    db.tasks[index] = { ...db.tasks[index], ...req.body };
    saveDB(db);
    return res.json(db.tasks[index]);
  }
  res.status(404).json({ error: 'Task not found' });
});

app.patch('/api/tasks/:id/toggle', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  const index = db.tasks.findIndex((t) => t.id === req.params.id && t.userId === userId);
  if (index !== -1) {
    const isCompleted = !db.tasks[index].completed;
    db.tasks[index].completed = isCompleted;
    db.tasks[index].completedAt = isCompleted ? new Date().toISOString() : undefined;
    saveDB(db);
    return res.json(db.tasks[index]);
  }
  res.status(404).json({ error: 'Task not found' });
});

app.delete('/api/tasks/:id', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  db.tasks = db.tasks.filter((t) => !(t.id === req.params.id && t.userId === userId));
  saveDB(db);
  res.json({ success: true });
});

// ======================== EXPENSES & BUDGET ========================
app.get('/api/expenses', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  const userExpenses = db.expenses.filter((e) => e.userId === userId);
  // Sort most recent first
  userExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json(userExpenses);
});

app.post('/api/expenses', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  const newExpense = {
    id: `exp_${Date.now()}`,
    userId,
    amount: Number(req.body.amount) || 0,
    category: req.body.category || 'other',
    description: req.body.description || 'Expense',
    date: req.body.date || new Date().toISOString().split('T')[0],
    note: req.body.note || '',
    createdAt: new Date().toISOString(),
  };
  db.expenses.unshift(newExpense);
  saveDB(db);
  res.status(201).json(newExpense);
});

app.delete('/api/expenses/:id', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  db.expenses = db.expenses.filter((e) => !(e.id === req.params.id && e.userId === userId));
  saveDB(db);
  res.json({ success: true });
});

app.get('/api/budget', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  const user = db.users.find((u) => u.id === userId);
  const budget = db.budgets.find((b) => b.userId === userId) || {
    id: `budget_${userId}`,
    userId,
    monthlyBudget: user?.preferences?.monthlyBudgetAmount || 12000,
    categoryBudgets: {
      food: 4500,
      transport: 2500,
      education: 3000,
      entertainment: 1000,
      shopping: 500,
      bills: 500,
    },
    monthYear: new Date().toISOString().substring(0, 7),
  };
  res.json(budget);
});

app.post('/api/budget', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  const index = db.budgets.findIndex((b) => b.userId === userId);
  const updatedBudget = {
    id: index !== -1 ? db.budgets[index].id : `budget_${Date.now()}`,
    userId,
    monthlyBudget: Number(req.body.monthlyBudget) || 12000,
    categoryBudgets: req.body.categoryBudgets || {},
    monthYear: req.body.monthYear || new Date().toISOString().substring(0, 7),
  };
  if (index !== -1) {
    db.budgets[index] = updatedBudget;
  } else {
    db.budgets.push(updatedBudget);
  }

  // Also sync user profile preference
  const userIndex = db.users.findIndex((u) => u.id === userId);
  if (userIndex !== -1) {
    db.users[userIndex].preferences.monthlyBudgetAmount = updatedBudget.monthlyBudget;
  }

  saveDB(db);
  res.json(updatedBudget);
});

// ======================== STUDY SESSIONS ========================
app.get('/api/study-sessions', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  const userSessions = db.studySessions.filter((s) => s.userId === userId);
  userSessions.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  res.json(userSessions);
});

app.post('/api/study-sessions', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  const durationSeconds = req.body.durationSeconds !== undefined ? Number(req.body.durationSeconds) : (Number(req.body.durationMinutes) || 25) * 60;
  const durationMinutes = Number(req.body.durationMinutes) || Math.max(1, Math.round(durationSeconds / 60));
  
  const newSession = {
    id: req.body.id || `session_${Date.now()}`,
    userId,
    subjectId: req.body.subjectId || undefined,
    durationSeconds,
    durationMinutes,
    breakMinutes: Number(req.body.breakMinutes) || 5,
    mode: req.body.mode || 'pomodoro',
    notes: req.body.notes || '',
    startTime: req.body.startTime || undefined,
    endTime: req.body.endTime || req.body.completedAt || new Date().toISOString(),
    status: req.body.status || 'completed',
    completedAt: req.body.completedAt || new Date().toISOString(),
    createdAt: req.body.createdAt || new Date().toISOString(),
  };
  db.studySessions.unshift(newSession);

  // Send achievement notification if reached streak or milestone
  if (durationMinutes >= 45) {
    db.notifications.unshift({
      id: `notif_${Date.now()}`,
      userId,
      type: 'study_reminder',
      title: 'Focus Session Completed! 🔥',
      message: `You focused for ${durationMinutes} minutes! Great academic discipline.`,
      date: new Date().toISOString(),
      read: false,
      link: '/study',
    });
  }

  saveDB(db);
  res.status(201).json(newSession);
});

// ======================== EVENTS ========================
app.get('/api/events', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  const userEvents = db.events.filter((e) => e.userId === userId);
  userEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  res.json(userEvents);
});

app.post('/api/events', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  const newEvent = {
    id: `event_${Date.now()}`,
    userId,
    title: req.body.title || 'Untitled Event',
    date: req.body.date || new Date().toISOString().split('T')[0],
    time: req.body.time || '10:00',
    location: req.body.location || 'Campus',
    description: req.body.description || '',
    type: req.body.type || 'seminar',
    reminder: !!req.body.reminder,
    createdAt: new Date().toISOString(),
  };
  db.events.push(newEvent);
  saveDB(db);
  res.status(201).json(newEvent);
});

app.delete('/api/events/:id', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  db.events = db.events.filter((e) => !(e.id === req.params.id && e.userId === userId));
  saveDB(db);
  res.json({ success: true });
});

// ======================== PRESENTATIONS ========================
app.get('/api/presentations', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  const userPres = db.presentations.filter((p) => p.userId === userId);
  userPres.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  res.json(userPres);
});

app.get('/api/presentations/:id', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  const pres = db.presentations.find((p) => p.id === req.params.id && p.userId === userId);
  if (pres) return res.json(pres);
  res.status(404).json({ error: 'Presentation not found' });
});

app.post('/api/presentations', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  const newPres = {
    id: `pres_${Date.now()}`,
    userId,
    title: req.body.title || 'Untitled Presentation',
    subtitle: req.body.subtitle || '',
    topic: req.body.topic || '',
    subject: req.body.subject || 'General',
    slidesCount: req.body.slides ? req.body.slides.length : (req.body.slidesCount || 5),
    audience: req.body.audience || 'university',
    style: req.body.style || 'modern',
    tone: req.body.tone || 'educational',
    language: req.body.language || 'en',
    slides: req.body.slides || [],
    progressPercent: req.body.progressPercent || 100,
    sources: req.body.sources || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.presentations.unshift(newPres);
  saveDB(db);
  res.status(201).json(newPres);
});

app.put('/api/presentations/:id', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  const index = db.presentations.findIndex((p) => p.id === req.params.id && p.userId === userId);
  if (index !== -1) {
    db.presentations[index] = {
      ...db.presentations[index],
      ...req.body,
      slidesCount: req.body.slides ? req.body.slides.length : db.presentations[index].slidesCount,
      updatedAt: new Date().toISOString(),
    };
    saveDB(db);
    return res.json(db.presentations[index]);
  }
  res.status(404).json({ error: 'Presentation not found' });
});

app.post('/api/presentations/:id/duplicate', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  const source = db.presentations.find((p) => p.id === req.params.id && p.userId === userId);
  if (!source) return res.status(404).json({ error: 'Source presentation not found' });

  const duplicated = {
    ...source,
    id: `pres_${Date.now()}`,
    title: `${source.title} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.presentations.unshift(duplicated);
  saveDB(db);
  res.status(201).json(duplicated);
});

app.delete('/api/presentations/:id', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  db.presentations = db.presentations.filter((p) => !(p.id === req.params.id && p.userId === userId));
  saveDB(db);
  res.json({ success: true });
});

// ======================== NOTIFICATIONS ========================
app.get('/api/notifications', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  const userNotifs = db.notifications.filter((n) => n.userId === userId);
  userNotifs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json(userNotifs);
});

app.patch('/api/notifications/read-all', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  db.notifications = db.notifications.map((n) => (n.userId === userId ? { ...n, read: true } : n));
  saveDB(db);
  res.json({ success: true });
});

app.patch('/api/notifications/:id/read', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  const notif = db.notifications.find((n) => n.id === req.params.id && n.userId === userId);
  if (notif) {
    notif.read = true;
    saveDB(db);
    return res.json(notif);
  }
  res.status(404).json({ error: 'Notification not found' });
});

app.delete('/api/notifications/:id', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  db.notifications = db.notifications.filter((n) => !(n.id === req.params.id && n.userId === userId));
  saveDB(db);
  res.json({ success: true });
});

// ======================== NOTES ========================
app.get('/api/notes', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  const userNotes = db.notes.filter((n) => n.userId === userId);
  userNotes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  res.json(userNotes);
});

app.post('/api/notes', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  const newNote = {
    id: `note_${Date.now()}`,
    userId,
    subjectId: req.body.subjectId || undefined,
    title: req.body.title || 'Untitled Note',
    content: req.body.content || '',
    tags: req.body.tags || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.notes.unshift(newNote);
  saveDB(db);
  res.status(201).json(newNote);
});

app.put('/api/notes/:id', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  const index = db.notes.findIndex((n) => n.id === req.params.id && n.userId === userId);
  if (index !== -1) {
    db.notes[index] = {
      ...db.notes[index],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    saveDB(db);
    return res.json(db.notes[index]);
  }
  res.status(404).json({ error: 'Note not found' });
});

app.delete('/api/notes/:id', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  db.notes = db.notes.filter((n) => !(n.id === req.params.id && n.userId === userId));
  saveDB(db);
  res.json({ success: true });
});

// ======================== DASHBOARD AGGREGATE ========================
app.get('/api/dashboard/summary', (req, res) => {
  const userId = getUserId(req);
  const db = loadDB();
  const user = db.users.find((u) => u.id === userId) || db.users[0];

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentMonthPrefix = now.toISOString().substring(0, 7);

  // Today study time
  const todaySessions = db.studySessions.filter((s) => s.userId === userId && s.completedAt.startsWith(todayStr));
  const todayStudyMinutes = todaySessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

  // Tasks count
  const userTasks = db.tasks.filter((t) => t.userId === userId);
  const totalTasks = userTasks.length;
  const completedTasks = userTasks.filter((t) => t.completed).length;

  // Spending
  const userExpenses = db.expenses.filter((e) => e.userId === userId);
  const todayExpenses = userExpenses.filter((e) => e.date === todayStr);
  const todaySpending = todayExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  const monthExpenses = userExpenses.filter((e) => e.date.startsWith(currentMonthPrefix));
  const monthSpending = monthExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  // Upcoming items (tasks with dueDate >= today + events >= today)
  const upcomingTasks = userTasks.filter((t) => !t.completed && t.dueDate >= todayStr);
  const upcomingEvents = db.events.filter((e) => e.userId === userId && e.date >= todayStr);
  const upcomingCount = upcomingTasks.length + upcomingEvents.length;

  // Continue where left off presentation
  const userPres = db.presentations.filter((p) => p.userId === userId);
  userPres.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const continuePresentation = userPres[0] || null;

  // Weekly study data for chart (last 7 days: Mon..Sun)
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyStudyMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = daysOfWeek[d.getDay()];
    const mins = db.studySessions
      .filter((s) => s.userId === userId && s.completedAt.startsWith(dateStr))
      .reduce((acc, s) => acc + s.durationMinutes, 0);
    weeklyStudyMap[dayName] = mins;
  }

  res.json({
    user,
    todayStudyMinutes,
    studyGoalMinutes: user.preferences?.dailyStudyGoalMinutes || 240,
    totalTasks,
    completedTasks,
    todaySpending,
    monthSpending,
    monthlyBudget: user.preferences?.monthlyBudgetAmount || 12000,
    upcomingCount,
    continuePresentation,
    todayTasks: userTasks.slice(0, 5),
    upcomingEvents: upcomingEvents.slice(0, 3),
    weeklyStudyMap,
  });
});

// ======================== AI ENDPOINTS (GEMINI API) ========================

// AI Presentation Maker Endpoints
const handleGeneratePresentation = async (req: express.Request, res: express.Response) => {
  const userId = getUserId(req);
  const db = loadDB();
  
  const {
    topic = 'Academic Overview',
    subject: rawSubject,
    subjectId,
    slidesCount,
    slideCount,
    audience = 'university',
    style = 'modern',
    tone = 'educational',
    language = 'en',
  } = req.body;

  // Resolve subject name if subjectId is provided
  let subjectName = rawSubject;
  if (!subjectName && subjectId) {
    const foundSub = db.subjects.find((s) => s.id === subjectId && s.userId === userId);
    if (foundSub) subjectName = foundSub.name;
  }
  if (!subjectName) subjectName = 'General Coursework';

  const count = Math.max(3, Math.min(10, Number(slidesCount || slideCount) || 5));

  const prompt = `You are a world-class university professor and presentation designer.
Generate a structured, professional academic presentation deck for a university student.

Parameters:
- Topic: "${topic}"
- Subject: "${subjectName}"
- Number of Slides: ${count}
- Target Audience: ${audience}
- Presentation Visual Style: ${style}
- Tone: ${tone}
- Language: ${language === 'bn' ? 'Bangla (Bengali)' : 'English'}

Provide a clean JSON structure with:
- title: string (engaging presentation title)
- subtitle: string (academic subtitle)
- keyTakeaway: string
- sources: array of 2-3 realistic academic reference sources/books
- slides: array of ${count} slides, each having:
  - slideNumber: number (1 to ${count})
  - title: clear, compelling slide heading
  - subtitle: concise sub-heading
  - layout: one of ["title_slide", "bullet_points", "two_column", "highlight_stat", "quote", "summary"]
  - bullets: array of 2 to 4 punchy, clear bullet points
  - body: comprehensive, informative explanatory paragraph for the slide
  - speakerNotes: natural, friendly script for what the student should say aloud during this slide
  - statNumber: (optional string e.g. "78%", "3.4x", "99.9%" if highlight_stat layout)
  - statLabel: (optional string explaining the stat)
  - keyTakeaway: single sentence summary of the slide`;

  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured on the server.');
    }

    const response = await generateGeminiContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            subtitle: { type: Type.STRING },
            keyTakeaway: { type: Type.STRING },
            sources: { type: Type.ARRAY, items: { type: Type.STRING } },
            slides: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  slideNumber: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  subtitle: { type: Type.STRING },
                  layout: { type: Type.STRING },
                  bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
                  body: { type: Type.STRING },
                  speakerNotes: { type: Type.STRING },
                  statNumber: { type: Type.STRING },
                  statLabel: { type: Type.STRING },
                  keyTakeaway: { type: Type.STRING },
                },
                required: ['slideNumber', 'title', 'bullets', 'body', 'speakerNotes', 'layout'],
              },
            },
          },
          required: ['title', 'subtitle', 'slides'],
        },
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);

    // Ensure slides have unique IDs
    const slidesWithIds = (parsed.slides || []).map((s: any, idx: number) => ({
      id: `slide_${Date.now()}_${idx + 1}`,
      slideNumber: idx + 1,
      title: s.title || `Slide ${idx + 1}`,
      subtitle: s.subtitle || '',
      bullets: Array.isArray(s.bullets) ? s.bullets : [],
      body: s.body || '',
      speakerNotes: s.speakerNotes || '',
      layout: s.layout || (idx === 0 ? 'title_slide' : idx === parsed.slides.length - 1 ? 'summary' : 'bullet_points'),
      statNumber: s.statNumber || undefined,
      statLabel: s.statLabel || undefined,
      keyTakeaway: s.keyTakeaway || '',
    }));

    const presentationObj = {
      id: `pres_${Date.now()}`,
      userId,
      title: parsed.title || topic,
      subtitle: parsed.subtitle || `An In-depth Study on ${subjectName}`,
      topic,
      subject: subjectName,
      slidesCount: slidesWithIds.length,
      audience,
      style,
      tone,
      language,
      slides: slidesWithIds,
      progressPercent: 100,
      sources: parsed.sources || ['University Course Materials & Academic Journals'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return res.json(presentationObj);
  } catch (error: any) {
    console.error('Gemini presentation generation fallback:', error?.message || error);
    
    // Graceful fallback structure if Gemini fails or key is missing
    const fallbackSlides = Array.from({ length: count }, (_, i) => {
      const isFirst = i === 0;
      const isLast = i === count - 1;
      return {
        id: `slide_${Date.now()}_${i + 1}`,
        slideNumber: i + 1,
        title: isFirst ? topic : isLast ? 'Key Takeaways & Academic Conclusion' : `${topic}: Core Concept ${i}`,
        subtitle: isFirst ? `Academic Overview - ${subjectName}` : `Section ${i} Analysis`,
        bullets: [
          `Key principle regarding ${topic} in contemporary university coursework.`,
          `Methodological framework and practical problem-solving applications.`,
          `Empirical findings and theoretical foundation for exam revision.`,
        ],
        body: `This slide explores foundational concepts in ${topic}. Understanding these relationships provides clarity for complex coursework assignments.`,
        speakerNotes: `Hello everyone, on this slide we examine the central components of ${topic} and how they integrate into our study of ${subjectName}.`,
        layout: isFirst ? 'title_slide' : isLast ? 'summary' : (i % 2 === 0 ? 'two_column' : 'bullet_points'),
        keyTakeaway: `Core conclusion for slide ${i + 1}: maintain structured understanding of key principles.`,
      };
    });

    const fallbackPresentation = {
      id: `pres_${Date.now()}`,
      userId,
      title: topic,
      subtitle: `Academic Study & Presentation Deck for ${subjectName}`,
      topic,
      subject: subjectName,
      slidesCount: fallbackSlides.length,
      audience,
      style,
      tone,
      language,
      slides: fallbackSlides,
      progressPercent: 100,
      sources: ['Standard University Course Text', 'Academic Research Publications'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fallbackUsed: true,
    };

    return res.json(fallbackPresentation);
  }
};

app.post('/api/presentations/generate', handleGeneratePresentation);
app.post('/api/ai/generate-presentation', handleGeneratePresentation);

// AI Slide Rewriter & Refiner Endpoints
const handleRewriteSlide = async (req: express.Request, res: express.Response) => {
  const { slide, mode, action, title: rawTitle, body: rawBody, bullets: rawBullets, language = 'en' } = req.body;

  const currentTitle = slide?.title || rawTitle || 'Slide Title';
  const currentBody = slide?.body || rawBody || '';
  const currentBullets = slide?.bullets || rawBullets || [];
  const currentNotes = slide?.speakerNotes || '';
  const rewriteAction = mode || action || 'improve';

  const prompt = `You are an AI university presentation editor.
Refine this university presentation slide according to the requested mode.

Current Slide Content:
- Title: "${currentTitle}"
- Body: "${currentBody}"
- Bullets: ${JSON.stringify(currentBullets)}
- Speaker Notes: "${currentNotes}"

Requested Action: "${rewriteAction}" (Options: 'simplify', 'expand', 'formal', 'formalize', 'casual', 'bullet_points', 'improve')
Language: ${language === 'bn' ? 'Bangla' : 'English'}

Return a clean JSON object with:
- title: string (refined slide title)
- body: string (refined body text)
- bullets: array of strings (2-4 refined concise bullet points)
- speakerNotes: string (natural speech script reflecting the change)
- keyTakeaway: string`;

  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured.');
    }

    const response = await generateGeminiContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            body: { type: Type.STRING },
            bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
            speakerNotes: { type: Type.STRING },
            keyTakeaway: { type: Type.STRING },
          },
          required: ['title', 'body', 'bullets', 'speakerNotes'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const updatedSlide = {
      ...(slide || {}),
      title: parsed.title || currentTitle,
      body: parsed.body || currentBody,
      bullets: Array.isArray(parsed.bullets) && parsed.bullets.length > 0 ? parsed.bullets : currentBullets,
      speakerNotes: parsed.speakerNotes || currentNotes,
      keyTakeaway: parsed.keyTakeaway || (slide?.keyTakeaway || ''),
    };

    res.json({
      slide: updatedSlide,
      title: updatedSlide.title,
      body: updatedSlide.body,
      bullets: updatedSlide.bullets,
      speakerNotes: updatedSlide.speakerNotes,
      keyTakeaway: updatedSlide.keyTakeaway,
    });
  } catch (error: any) {
    console.error('Slide rewrite fallback:', error?.message || error);
    const updatedSlide = {
      ...(slide || {}),
      title: currentTitle,
      body: currentBody ? `${currentBody} (Refined with academic clarity)` : 'Updated explanatory slide text.',
      bullets: currentBullets.length > 0 ? currentBullets : ['Key concept refined for presentation clarity', 'Supporting academic evidence'],
      speakerNotes: currentNotes || `On this slide, we summarize the refined concepts for clarity.`,
      keyTakeaway: slide?.keyTakeaway || 'Key principle reinforced.',
    };

    res.json({
      slide: updatedSlide,
      title: updatedSlide.title,
      body: updatedSlide.body,
      bullets: updatedSlide.bullets,
      speakerNotes: updatedSlide.speakerNotes,
      keyTakeaway: updatedSlide.keyTakeaway,
    });
  }
};

app.post('/api/presentations/slide/rewrite', handleRewriteSlide);
app.post('/api/ai/rewrite-slide', handleRewriteSlide);

// AI Speaker Notes Generator Endpoints
const handleSpeakerNotes = async (req: express.Request, res: express.Response) => {
  const { slide, presentationTitle, slideTitle, slideBody, bullets, tone = 'educational' } = req.body;

  const targetTitle = slide?.title || slideTitle || presentationTitle || 'Academic Concept';
  const targetBody = slide?.body || slideBody || '';
  const targetBullets = slide?.bullets || bullets || [];

  const prompt = `Write natural, engaging, spoken speaker notes for a student presenting this slide to a university classroom:
Presentation Context: "${presentationTitle || 'University Course'}"
Slide Title: "${targetTitle}"
Slide Body: "${targetBody}"
Slide Bullets: ${JSON.stringify(targetBullets)}
Tone: ${tone}

Output 3-5 sentences of natural spoken speech that sounds confident, easy to read aloud, and engaging. Avoid robotic phrasing.`;

  try {
    if (!process.env.GEMINI_API_KEY) throw new Error('No API key');
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });
    res.json({ speakerNotes: response.text?.trim() || '' });
  } catch (err: any) {
    res.json({
      speakerNotes: `Moving to ${targetTitle}, the key aspect to focus on is the connection outlined in the bullet points. Notice how this directly reinforces our core thesis for today's seminar.`,
    });
  }
};

app.post('/api/presentations/slide/speaker-notes', handleSpeakerNotes);
app.post('/api/ai/speaker-notes', handleSpeakerNotes);

// AI Financial Insights Analyzer Endpoints
const handleFinancialInsights = async (req: express.Request, res: express.Response) => {
  const userId = getUserId(req);
  const db = loadDB();
  const user = db.users.find((u) => u.id === userId);
  const currency = user?.preferences?.currencySymbol || '৳';

  const expenses = req.body.expenses || db.expenses.filter((e) => e.userId === userId);
  const monthlyBudget = req.body.budget?.monthlyLimit || db.budgets.find((b) => b.userId === userId)?.monthlyBudget || 12000;

  const totalSpent = expenses.reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0);

  const prompt = `You are a supportive, smart student financial advisor for university students.
Analyze this student's spending and budget data:

Total Monthly Budget: ${currency}${monthlyBudget}
Total Spent So Far: ${currency}${totalSpent}
Expenses List (${expenses.length} records):
${JSON.stringify(expenses.slice(0, 25))}

Provide:
1. summary: A concise 2-sentence financial overview of their spending patterns, budget health, and biggest categories.
2. tips: An array of 3-4 concise, practical student savings tips (e.g. meal prep, student transport discounts, shared textbooks).
3. insights: Array of 3 objects with { title, message, severity: ("info" | "warning" | "success") }`;

  try {
    if (!process.env.GEMINI_API_KEY) throw new Error('No API key');
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            tips: { type: Type.ARRAY, items: { type: Type.STRING } },
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  message: { type: Type.STRING },
                  severity: { type: Type.STRING },
                },
                required: ['title', 'message', 'severity'],
              },
            },
          },
          required: ['summary', 'tips'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const analysis = {
      summary: parsed.summary || `You have spent ${currency}${totalSpent} out of your ${currency}${monthlyBudget} monthly budget. Tracking regularly keeps your finances healthy.`,
      tips: Array.isArray(parsed.tips) && parsed.tips.length > 0
        ? parsed.tips
        : [
            `Planning weekly cafeteria meals and bringing homemade tea can save around ${currency}800/month.`,
            `Take advantage of student semester passes for metro rail and campus transit.`,
            `Split bulk stationery and printing costs with course study groups.`,
          ],
    };

    res.json({
      analysis,
      summary: analysis.summary,
      tips: analysis.tips,
      insights: parsed.insights || [
        { title: 'Budget Status', message: analysis.summary, severity: totalSpent > monthlyBudget ? 'warning' : 'success' },
      ],
    });
  } catch (err) {
    const analysis = {
      summary: `You have utilized ${Math.round((totalSpent / (monthlyBudget || 1)) * 100)}% of your monthly allowance (${currency}${totalSpent} of ${currency}${monthlyBudget}).`,
      tips: [
        `Dining & Cafeteria: Meal prepping lunches 2 days a week can reduce weekly food expenses by 20%.`,
        `Transit & Commute: Use student concession ID cards for discounted metro and bus passes.`,
        `Course Materials: Check the university central library for reserved textbook copies before purchasing.`,
      ],
    };

    res.json({
      analysis,
      summary: analysis.summary,
      tips: analysis.tips,
      insights: [
        {
          title: 'Food & Dining Trend',
          message: `Food spending accounts for a significant portion of your weekly expenses. Planning lunches ahead saves pocket money.`,
          severity: 'info',
        },
        {
          title: 'Monthly Budget Health',
          message: `You are currently within your target monthly limit of ${currency}${monthlyBudget}.`,
          severity: 'success',
        },
        {
          title: 'Commute Cost Optimization',
          message: `Campus shuttle and monthly transit passes offer discounts for verified student IDs.`,
          severity: 'info',
        },
      ],
    });
  }
};

app.post('/api/ai/financial-insights', handleFinancialInsights);
app.post('/api/ai/finance-insights', handleFinancialInsights);

// AI Study Schedule Planner Endpoints
const handleStudyPlanner = async (req: express.Request, res: express.Response) => {
  const {
    examDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    subjects = [],
    dailyAvailableHours,
    dailyHours = 4,
    currentProgress = 'Moderate',
  } = req.body;

  const hours = Number(dailyAvailableHours || dailyHours) || 4;
  const activeSubs = Array.isArray(subjects) && subjects.length > 0 ? subjects : ['Major Core Subject', 'General Elective'];

  const prompt = `Create a realistic, balanced university study plan for an upcoming exam period.
Exam Date: ${examDate}
Subjects to cover: ${JSON.stringify(activeSubs)}
Available Daily Study Hours: ${hours} hours/day
Current Preparedness: ${currentProgress}

Return a JSON object with:
- summary: string (1-2 sentence overview of study strategy)
- planTitle: string
- totalRecommendedHours: number
- strategies: array of 3 bullet tips
- dailyBlocks: array of 5 to 7 daily revision blocks, each with:
  - day: string (e.g. "Day 1 - Core Theory")
  - subject: string (one of the given subjects)
  - topic: string (specific high-yield topic to master)
  - durationMins: number (e.g. ${hours * 60 / 2})
  - strategy: string (e.g. "Active recall + solve 3 past exam problems")`;

  try {
    if (!process.env.GEMINI_API_KEY) throw new Error('No API key');
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            planTitle: { type: Type.STRING },
            totalRecommendedHours: { type: Type.INTEGER },
            strategies: { type: Type.ARRAY, items: { type: Type.STRING } },
            dailyBlocks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING },
                  subject: { type: Type.STRING },
                  topic: { type: Type.STRING },
                  durationMins: { type: Type.INTEGER },
                  strategy: { type: Type.STRING },
                },
                required: ['day', 'subject', 'topic', 'durationMins', 'strategy'],
              },
            },
          },
          required: ['summary', 'dailyBlocks'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const plan = {
      summary: parsed.summary || `Balanced ${hours}h/day revision plan across ${activeSubs.length} subjects.`,
      dailyBlocks: parsed.dailyBlocks || [],
      strategies: parsed.strategies || [],
    };

    res.json({
      plan,
      summary: plan.summary,
      dailyBlocks: plan.dailyBlocks,
      planTitle: parsed.planTitle || 'Custom Exam Revision Schedule',
      totalRecommendedHours: parsed.totalRecommendedHours || hours * 7,
      strategies: plan.strategies,
    });
  } catch (err) {
    const fallbackBlocks = activeSubs.flatMap((sub: string, i: number) => [
      {
        day: `Day ${i * 2 + 1} - Fundamentals`,
        subject: sub,
        topic: 'Core Theory, Key Formulas & Theorems',
        durationMins: Math.round((hours * 60) / 2),
        strategy: 'Read lecture notes and create active recall flashcards',
      },
      {
        day: `Day ${i * 2 + 2} - Problem Solving`,
        subject: sub,
        topic: 'Past Midterm & Final Exam Questions',
        durationMins: Math.round((hours * 60) / 2),
        strategy: 'Timed problem-solving under exam conditions',
      },
    ]);

    const plan = {
      summary: `Structured ${hours} hours/day revision schedule covering ${activeSubs.length} course subjects before ${examDate}.`,
      dailyBlocks: fallbackBlocks,
      strategies: [
        'Use Pomodoro 50/10 focus blocks to avoid cognitive fatigue.',
        'Prioritize high-weightage chapters first thing in the morning.',
        'Dedicate the final 48 hours purely to past paper timed drills.',
      ],
    };

    res.json({
      plan,
      summary: plan.summary,
      dailyBlocks: plan.dailyBlocks,
      planTitle: 'Custom Exam Mastery Schedule',
      totalRecommendedHours: hours * 7,
      strategies: plan.strategies,
    });
  }
};

app.post('/api/ai/study-planner', handleStudyPlanner);

// AI Academic Assistant Endpoint (Q&A / concept explain / tutor helper)
const handleAcademicAssist = async (req: express.Request, res: express.Response) => {
  const { question, prompt: rawPrompt, subject = 'General Academics', providedMaterial } = req.body;
  const userQuery = question || rawPrompt || 'Explain this academic concept';

  const systemInstruction = buildStudyAssistantSystemInstruction('study_tutor', undefined, subject, providedMaterial);

  try {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Subject Context: ${subject}\n\nStudent Question:\n${userQuery}`,
      config: { systemInstruction },
    });
    const answerText = response.text || '';
    res.json({
      explanation: answerText,
      answer: answerText,
    });
  } catch (err: any) {
    console.error('Academic Assist error:', err?.message || err);
    res.status(500).json({
      error: 'Unable to generate a reliable answer right now. Please try again.',
      explanation: 'Unable to generate a reliable answer right now. Please try again.',
      answer: 'Unable to generate a reliable answer right now. Please try again.',
    });
  }
};

app.post('/api/ai/academic-assist', handleAcademicAssist);
app.post('/api/ai/academic-assistant', handleAcademicAssist);

// ======================== AI STUDY ASSISTANT (CHAT, TUTOR, QUIZ, FLASHCARDS) ========================

interface ChatMessagePayload {
  role: 'user' | 'assistant';
  content: string;
}

const buildStudyAssistantSystemInstruction = (
  mode: string = 'general',
  profileContext?: { name?: string; university?: string; department?: string; semester?: string },
  subjectContext?: string,
  providedMaterial?: string
) => {
  let modeSpecific = '';
  switch (mode) {
    case 'study_tutor':
      modeSpecific = `MODE: Study Tutor. Focus on pedagogical explanations, conceptual clarity, step-by-step breakdowns, and active student comprehension.`;
      break;
    case 'exam_prep':
      modeSpecific = `MODE: Exam Preparation. Focus on high-yield exam topics, common traps, key formulas, memorization techniques, and practice problem solving.`;
      break;
    case 'presentation_help':
      modeSpecific = `MODE: Presentation Help. Focus on clear speech structure, slide talking points, hook introductions, concise bullet summaries, and executive delivery.`;
      break;
    case 'writing_help':
      modeSpecific = `MODE: Writing Assistant. Focus on academic clarity, formal vocabulary, paragraph flow, thesis articulation, and grammatical precision.`;
      break;
    case 'general':
    default:
      modeSpecific = `MODE: General Academic Assistant. Provide well-rounded, rigorous academic tutoring tailored for university students.`;
      break;
  }

  let studentProfile = '';
  if (profileContext?.department || profileContext?.university) {
    studentProfile = `STUDENT PROFILE: Studying ${profileContext.department || 'Coursework'} at ${profileContext.university || 'University'}, Semester: ${profileContext.semester || 'Current'}. Adapt explanations to this academic level.`;
  }

  let subjectSnippet = '';
  if (subjectContext && subjectContext !== 'all') {
    subjectSnippet = `ACTIVE SUBJECT SCOPE: ${subjectContext}. Prioritize context, terminology, and standard frameworks for this field.`;
  }

  let materialSnippet = '';
  if (providedMaterial && providedMaterial.trim().length > 0) {
    materialSnippet = `=== USER-PROVIDED STUDY MATERIAL / NOTES ===
"""
${providedMaterial.trim()}
"""
CRITICAL MATERIAL RULES:
1. Answer primarily from the provided material above.
2. Do not contradict the provided notes unless explicitly asked by the student to review them for correctness.
3. If the provided material does NOT contain sufficient information to answer the question:
   State clearly: "This information is not clearly available in the provided material."
4. If you subsequently provide additional general knowledge, clearly separate it using distinct headings:
   "**From your notes:** ..."
   "**Additional context:** ..."`;
  }

  return `You are Campusly AI, the intelligent, friendly, and professional AI student companion inside the Campusly app.

## Identity and App Background
- Campusly is an all-in-one student-focused platform created to help university and college students with their everyday academic, university, productivity, planning, financial, study, and personal-support needs (including study timers, expense tracking, presentation maker, subject planning, and AI assistance).
- Creator & Developer: Campusly was created by Foyshal Mahmud Prince, who is currently studying in the Department of Management at Jashore University of Science and Technology (JUST).
- When a student asks "What is Campusly?", "Who created Campusly?", "Why was Campusly created?", "What can Campusly AI do?", "Who is the developer?", or "What is the purpose of this app?":
  Answer directly, accurately, and naturally that Campusly is a student-focused platform built by Foyshal Mahmud Prince to support students across academic, productivity, study, financial, and planning needs. Do NOT say the app exists only for a simple chatbot—Campusly AI is an integral part of the broader Campusly platform.

## High Intelligence and Direct Answering Rules
- Understand the student's complete question and previous conversation context.
- Always provide a direct, precise answer first. Do NOT start with generic fluff or repeat unnecessary preamble.
- Follow up with a clear, structured explanation and actionable, practical steps or examples.
- Never give generic answers. If a student asks a specific academic or university question, answer that exact subject or topic directly.
- If the student's request is genuinely ambiguous or mistranscribed, ask a short, polite clarifying question instead of guessing blindly.
- Prioritize high factual accuracy. Never fabricate dates, sources, university policies, formulas, or facts. If uncertain, clearly state the uncertainty.
- For calculations (math, accounting, economics, science), verify the steps and math carefully before answering.

## Tone and Mentorship
- Friendly, professional, intelligent, patient, respectful, and supportive — like a knowledgeable, encouraging senior student mentor.
- Use clean, easily readable formatting. Break down complex concepts into digestible insights.

## Student Emotional & Motivational Support
- When students feel stressed, overwhelmed, or anxious about exams or deadlines, provide genuine, context-aware empathy along with practical, manageable next steps (e.g. breaking tasks down, 25-minute focus intervals).
- Safety: Do not pretend to be a doctor, therapist, or mental health professional. For serious distress or crisis, respond with care and encourage them to connect with campus counseling or professional emergency support.

## Multilingual Understanding & English Output
- Students may speak or type in English, Bengali (বাংলা), or mixed Bengali-English ("Banglish", e.g., "Amar exam preparation kivabe korbo?").
- Understand Bengali, English, and Banglish input accurately without losing the student's intended meaning.
- ALWAYS formulate your response in clear, natural, conversational ENGLISH, unless the student explicitly asks you to reply in another language.

${modeSpecific}
${studentProfile}
${subjectSnippet}
${materialSnippet}`;
};

// Helper to sanitize and format conversation history for Gemini multi-turn API
function formatGeminiContents(
  chatHistory: Array<{ role: string; content: string }>,
  currentMessage?: string,
  actionInstruction?: string
): Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> {
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  // Filter out invalid/empty/error messages from prior turns
  const cleanHistory = (chatHistory || []).filter((m) => {
    if (!m || typeof m.content !== 'string') return false;
    const trimmed = m.content.trim();
    if (!trimmed) return false;
    if (
      trimmed.startsWith('Unable to generate') ||
      trimmed.startsWith('Failed to generate') ||
      trimmed.includes('Something went wrong while generating')
    ) {
      return false;
    }
    return true;
  });

  // Ensure strict alternating roles starting with 'user'
  for (const item of cleanHistory) {
    const role: 'user' | 'model' =
      item.role === 'assistant' || item.role === 'model' ? 'model' : 'user';

    if (contents.length === 0) {
      if (role === 'user') {
        contents.push({ role: 'user', parts: [{ text: item.content.trim() }] });
      }
    } else {
      const prevRole = contents[contents.length - 1].role;
      if (prevRole === role) {
        contents[contents.length - 1].parts[0].text += `\n\n${item.content.trim()}`;
      } else {
        contents.push({ role, parts: [{ text: item.content.trim() }] });
      }
    }
  }

  // If action instruction or extra instruction was passed, append to last user message or add new user turn
  if (actionInstruction) {
    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents[contents.length - 1].parts[0].text += `\n\n${actionInstruction}`;
    } else {
      contents.push({ role: 'user', parts: [{ text: actionInstruction }] });
    }
  }

  // Fallback: ensure there is at least one user message
  if (contents.length === 0) {
    const fallbackText = (currentMessage || 'Explain this academic concept clearly.').trim();
    contents.push({ role: 'user', parts: [{ text: fallbackText }] });
  }

  return contents;
}

app.post('/api/ai/study-assistant', async (req, res) => {
  const {
    messages = [],
    message,
    mode = 'general',
    action = 'normal',
    profileContext,
    subjectContext,
    previousContext,
    providedMaterial,
  } = req.body;

  // Normalize conversation history
  let rawChatHistory: Array<{ role: string; content: string }> = [];
  if (Array.isArray(messages) && messages.length > 0) {
    rawChatHistory = messages.slice(-8).map((m: any) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      content: String(m.content || ''),
    }));
  } else if (message) {
    rawChatHistory = [{ role: 'user', content: String(message) }];
  } else {
    rawChatHistory = [{ role: 'user', content: 'Hello' }];
  }

  const lastUserMsg =
    rawChatHistory.filter((m) => m.role === 'user').slice(-1)[0]?.content ||
    message ||
    'Explain this academic concept';

  const systemInstruction = buildStudyAssistantSystemInstruction(
    mode,
    profileContext,
    subjectContext,
    providedMaterial
  );

  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    // ==================== QUICK ACTION: MULTIPLE CHOICE QUIZ ====================
    if (action === 'make_quiz') {
      const quizPrompt = `Generate an interactive 5-question multiple choice quiz on this academic topic/context:
Context: "${previousContext || lastUserMsg}"
${providedMaterial ? `Source Material:\n"""\n${providedMaterial}\n"""` : ''}

CRITICAL RULES FOR MCQs:
- Exactly 5 multiple-choice questions.
- Exactly one correct answer per question.
- All 4 options (indices 0, 1, 2, 3) must be plausible, distinct, and unambiguous.
- Do not make the correct answer trivially obvious or repetitive.
- Verify the correctAnswer index (0, 1, 2, or 3) matches the exact correct option.
- Provide a clear, thorough explanation of why the correct option is right and why the other choices are incorrect.`;

      const response = await generateGeminiContentWithFallback({
        contents: quizPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              topic: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.INTEGER },
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctAnswer: { type: Type.INTEGER },
                    explanation: { type: Type.STRING },
                  },
                  required: ['id', 'question', 'options', 'correctAnswer', 'explanation'],
                },
              },
            },
            required: ['title', 'questions'],
          },
        },
      });

      const parsedQuiz = JSON.parse(response.text || '{}');
      if (Array.isArray(parsedQuiz.questions)) {
        parsedQuiz.questions = parsedQuiz.questions.map((q: any, idx: number) => ({
          id: q.id || idx + 1,
          question: q.question || `Question ${idx + 1}`,
          options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer <= 3 ? q.correctAnswer : 0,
          explanation: q.explanation || 'Verified academic explanation.',
        }));
      }

      return res.json({
        reply: `Here is an interactive practice quiz on **${parsedQuiz.topic || 'your topic'}** to test your knowledge:`,
        quiz: parsedQuiz,
        action: 'make_quiz',
      });
    }

    // ==================== QUICK ACTION: STUDY FLASHCARDS ====================
    if (action === 'create_flashcards') {
      const flashcardPrompt = `Generate a set of 6 to 8 high-yield study flashcards based on this topic/context:
Context: "${previousContext || lastUserMsg}"
${providedMaterial ? `Source Material:\n"""\n${providedMaterial}\n"""` : ''}

Format as JSON with:
- title: string (deck title)
- topic: string
- cards: array of 6 to 8 objects with:
  - id: number
  - front: string (clear question, term, formula, or concept)
  - back: string (concise, accurate definition or explanation)
  - hint: optional short clue`;

      const response = await generateGeminiContentWithFallback({
        contents: flashcardPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              topic: { type: Type.STRING },
              cards: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.INTEGER },
                    front: { type: Type.STRING },
                    back: { type: Type.STRING },
                    hint: { type: Type.STRING },
                  },
                  required: ['id', 'front', 'back'],
                },
              },
            },
            required: ['title', 'cards'],
          },
        },
      });

      const parsedDeck = JSON.parse(response.text || '{}');
      if (Array.isArray(parsedDeck.cards)) {
        parsedDeck.cards = parsedDeck.cards.map((c: any, idx: number) => ({
          id: c.id || idx + 1,
          front: c.front || `Card ${idx + 1}`,
          back: c.back || 'Definition / Answer',
          hint: c.hint || '',
        }));
      }

      return res.json({
        reply: `Here are **${parsedDeck.cards?.length || 6} flashcards** to help you review **${parsedDeck.topic || 'this topic'}**:`,
        flashcards: parsedDeck,
        action: 'create_flashcards',
      });
    }

    // ==================== SPECIFIC QUICK ACTION DIRECTIVES ====================
    let actionInstruction = '';
    if (action === 'explain_simpler') {
      actionInstruction = `TASK: Explain the previous answer in simple, intuitive terms using plain language and clear analogies for a student struggling with the concept. Keep it accurate and accessible.`;
    } else if (action === 'summarize') {
      actionInstruction = `TASK: Provide a concise high-yield summary of the core concepts in 3 to 5 clear bullet points.`;
    } else if (action === 'give_example') {
      actionInstruction = `TASK: Provide 2 to 3 vivid, real-world practical or industry examples that illustrate this concept in action.`;
    }

    // Build multi-turn content for Gemini
    const contents = formatGeminiContents(rawChatHistory, message, actionInstruction);

    const response = await generateGeminiContentWithFallback({
      contents,
      config: {
        systemInstruction,
      },
    });

    const replyText = response.text || '';
    if (!replyText.trim()) {
      throw new Error('Empty response from AI model');
    }

    return res.json({
      reply: replyText,
      mode,
      action,
    });
  } catch (error: any) {
    console.error('Study Assistant Gemini error:', error?.message || error);
    return res.status(500).json({
      reply: 'Unable to generate response right now. Please try again.',
      error: error?.message || 'Gemini API Error',
      isError: true,
      mode,
      action,
    });
  }
});

// ======================== AI VOICE TRANSCRIPTION (MULTILINGUAL BENGALI / ENGLISH / BANGLISH) ========================
app.post('/api/ai/transcribe-voice', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/webm' } = req.body;
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({ error: 'Audio data is required', transcript: '' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured', transcript: '' });
    }

    // Clean any data URI prefix if present
    const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType.split(';')[0] || 'audio/webm',
              data: cleanBase64,
            },
          },
          {
            text: `You are an expert multilingual speech recognition system for university students using the Campusly app.
Accurately transcribe this audio recording into clean text.

Rules:
1. The student may speak in English, Bengali (বাংলা), or mixed Bengali-English ("Banglish", e.g., "Amar exam routine ta dekhao" or "Accounting debit and credit difference ta explain koro").
2. Automatically detect what the student said and transcribe the full prompt accurately.
3. If the student speaks in Bengali or mixed Bengali-English, transcribe what they said clearly.
4. If there is only background noise, breathing, or silence, return an empty string "".
5. Do NOT include markdown styling, asterisks, quotation marks, or meta-commentary like "Here is the transcription:". Output ONLY the raw transcribed text.`,
          },
        ],
      },
    });

    const transcript = (response.text || '').trim().replace(/^["']|["']$/g, '');
    res.json({
      transcript,
      success: true,
    });
  } catch (err: any) {
    console.error('Voice transcription error:', err?.message || err);
    res.status(500).json({
      error: 'Failed to transcribe audio',
      transcript: '',
    });
  }
});

// ======================== AI FEEDBACK ENDPOINT (MVP) ========================
app.post('/api/ai/feedback', (req, res) => {
  try {
    const { messageId, rating, reason, comment, query, response: aiResponse } = req.body;
    const db = loadDB();
    if (!Array.isArray(db.aiFeedback)) {
      db.aiFeedback = [];
    }

    const feedbackEntry = {
      id: `feedback_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      messageId: messageId || `msg_${Date.now()}`,
      rating: rating || 'helpful',
      reason: reason || null,
      comment: comment || null,
      query: query || null,
      responsePreview: typeof aiResponse === 'string' ? aiResponse.slice(0, 200) : null,
      createdAt: new Date().toISOString(),
    };

    db.aiFeedback.push(feedbackEntry);
    saveDB(db);

    res.json({ success: true, feedback: feedbackEntry });
  } catch (err: any) {
    console.error('Feedback recording error:', err);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

// ======================== VITE MIDDLEWARE & STATIC SERVING ========================
async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Campusly Server running on port ${PORT}`);
  });
}

setupServer();
