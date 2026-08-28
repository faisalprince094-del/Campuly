import fs from 'fs';
import path from 'path';
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  sanitizeUser,
  ensureAdminAccount,
} from './authCore';
export { sanitizeUser };
import { User, Subject, Task, Expense, Budget, StudySession, UniversityEvent, Presentation, AppNotification, Note } from '../types';

// Serverless-safe storage directory (/tmp is writeable in AWS Lambda / Vercel Serverless)
const isServerlessEnv = Boolean(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT
);
const DATA_DIR = isServerlessEnv ? path.join('/tmp', 'campusly_data') : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'campusly.json');

export interface DatabaseSchema {
  users: any[];
  subjects: Subject[];
  tasks: Task[];
  expenses: Expense[];
  budgets: Budget[];
  studySessions: StudySession[];
  events: UniversityEvent[];
  presentations: Presentation[];
  notifications: AppNotification[];
  notes: Note[];
  aiFeedback: any[];
}

let inMemoryDB: DatabaseSchema | null = null;

export const getInitialSeed = (): DatabaseSchema => {
  const demoUserId = 'user_demo_101';
  const demoHash = hashPassword('password123');

  const seed: DatabaseSchema = {
    users: [
      {
        id: demoUserId,
        name: 'Demo Student',
        email: 'student@university.edu',
        passwordHash: demoHash.hash,
        passwordSalt: demoHash.salt,
        studentId: 'STU-2026-001',
        institution: 'University of Dhaka',
        academicLevel: '4th Year, 8th Semester',
        university: 'University of Dhaka',
        department: 'Computer Science & Engineering',
        semester: '8th Semester',
        role: 'student',
        status: 'active',
        profilePhoto: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        createdAt: new Date('2026-01-10T10:00:00Z').toISOString(),
        lastLoginAt: new Date().toISOString(),
        loginCount: 1,
        preferences: {
          theme: 'light',
          language: 'en',
          currency: 'BDT',
          currencySymbol: '৳',
          dailyStudyGoalMinutes: 240,
          monthlyBudgetAmount: 0,
          onboardingCompleted: true,
          notifications: true,
          weekStartsOn: 0,
        },
      },
    ],
    subjects: [],
    tasks: [],
    expenses: [],
    budgets: [],
    studySessions: [],
    events: [],
    presentations: [],
    notifications: [],
    notes: [],
    aiFeedback: [],
  };

  ensureAdminAccount(seed.users);
  return seed;
};

export function loadDB(): DatabaseSchema {
  if (inMemoryDB) {
    ensureAdminAccount(inMemoryDB.users);
    return inMemoryDB;
  }
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      const defaultSeed = getInitialSeed();
      inMemoryDB = {
        users: Array.isArray(parsed.users) ? parsed.users : defaultSeed.users,
        subjects: Array.isArray(parsed.subjects) ? parsed.subjects : defaultSeed.subjects,
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : defaultSeed.tasks,
        expenses: Array.isArray(parsed.expenses) ? parsed.expenses : defaultSeed.expenses,
        budgets: Array.isArray(parsed.budgets) ? parsed.budgets : defaultSeed.budgets,
        studySessions: Array.isArray(parsed.studySessions) ? parsed.studySessions : defaultSeed.studySessions,
        events: Array.isArray(parsed.events) ? parsed.events : defaultSeed.events,
        presentations: Array.isArray(parsed.presentations) ? parsed.presentations : defaultSeed.presentations,
        notifications: Array.isArray(parsed.notifications) ? parsed.notifications : defaultSeed.notifications,
        notes: Array.isArray(parsed.notes) ? parsed.notes : defaultSeed.notes,
        aiFeedback: Array.isArray(parsed.aiFeedback) ? parsed.aiFeedback : defaultSeed.aiFeedback,
      };
      ensureAdminAccount(inMemoryDB.users);
      return inMemoryDB;
    }
  } catch (err) {
    console.warn('Note: Operating with in-memory DB seed:', err);
  }

  const seed = getInitialSeed();
  inMemoryDB = seed;
  saveDB(seed);
  return seed;
}

export function saveDB(db: DatabaseSchema) {
  inMemoryDB = db;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Note: Unable to write to disk, preserved in memory:', err);
  }
}

/**
 * Extracts and verifies the user ID from Authorization header or token query parameter.
 */
export function getUserIdFromRequest(req: any): string {
  const authHeader = req.headers?.['authorization'] || req.headers?.['Authorization'];
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token && token !== 'null' && token !== 'undefined') {
      const verified = verifySessionToken(token);
      if (verified && verified.userId) {
        return verified.userId;
      }
      return token;
    }
  }
  const queryUser = req.query?.userId;
  if (queryUser && typeof queryUser === 'string') return queryUser;
  return 'user_demo_101';
}

/**
 * Resolves full auth context (User record, User ID, and Role)
 */
export function getAuthContextFromRequest(req: any): { user: any; userId: string; role: 'student' | 'admin' } | null {
  const authHeader = req.headers?.['authorization'] || req.headers?.['Authorization'];
  let token = '';
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.query?.token && typeof req.query.token === 'string') {
    token = req.query.token.trim();
  }

  if (!token || token === 'null' || token === 'undefined') {
    return null;
  }

  const db = loadDB();
  const verified = verifySessionToken(token);
  if (verified) {
    const user = db.users.find((u) => u.id === verified.userId);
    if (user) {
      return { user, userId: user.id, role: user.role || verified.role };
    }
  }

  const directUser = db.users.find((u) => u.id === token);
  if (directUser) {
    return { user: directUser, userId: directUser.id, role: directUser.role || 'student' };
  }

  return null;
}

/**
 * Validates password requirement:
 * - 1 to 6 characters in length
 * - Only English letters (A-Z, a-z) and numbers (0-9)
 * - No special characters, spaces, or symbols
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (typeof password !== 'string' || password.length === 0) {
    return { valid: false, error: 'Password is required.' };
  }
  if (password.length > 6) {
    return { valid: false, error: 'Password must be between 1 and 6 characters.' };
  }
  const alphanumericRegex = /^[A-Za-z0-9]+$/;
  if (!alphanumericRegex.test(password)) {
    return { valid: false, error: 'Password must contain only English letters (A-Z, a-z) and numbers (0-9).' };
  }
  return { valid: true };
}

/**
 * Handles student sign up with secure PBKDF2 hashing, complete field validation,
 * and pristine fresh-state data initialization.
 */
export function registerStudent(body: any): { status: number; data: any } {
  const {
    name,
    email,
    password,
    institution,
    university,
    academicLevel,
    semester,
    department,
    studentId,
  } = body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return { status: 400, data: { error: 'Full Name is required.' } };
  }

  if (!email || typeof email !== 'string' || !email.trim()) {
    return { status: 400, data: { error: 'Email address is required.' } };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const normalizedEmail = email.trim().toLowerCase();
  if (!emailRegex.test(normalizedEmail)) {
    return { status: 400, data: { error: 'Please provide a valid email address.' } };
  }

  // Validate Password (1-6 alphanumeric characters)
  const pwValidation = validatePassword(password);
  if (!pwValidation.valid) {
    return { status: 400, data: { error: pwValidation.error } };
  }

  const instName = (institution || university || '').trim();
  if (!instName) {
    return { status: 400, data: { error: 'Institution Name is required.' } };
  }

  const levelName = (academicLevel || semester || '').trim();
  if (!levelName) {
    return { status: 400, data: { error: 'Class / Grade / Year is required.' } };
  }

  const db = loadDB();

  // Check if email already registered
  const existingUser = db.users.find((u) => u.email && u.email.toLowerCase() === normalizedEmail);
  if (existingUser) {
    return {
      status: 400,
      data: { error: 'An account with this email address already exists. Please sign in instead.' },
    };
  }

  // Securely hash password with random salt using PBKDF2 (SHA-512)
  const { hash, salt } = hashPassword(password);
  const newUserId = `stu_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newUser = {
    id: newUserId,
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: hash,
    passwordSalt: salt,
    studentId: (studentId || '').trim(),
    institution: instName,
    academicLevel: levelName,
    university: instName,
    department: (department || 'General Studies').trim(),
    semester: levelName,
    role: 'student' as const,
    status: 'active' as const,
    profilePhoto: '',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    loginCount: 1,
    preferences: {
      theme: 'light' as const,
      language: 'en' as const,
      currency: 'BDT' as const,
      currencySymbol: '৳',
      dailyStudyGoalMinutes: 240,
      monthlyBudgetAmount: 0,
      onboardingCompleted: true,
      notifications: true,
      weekStartsOn: 0,
    },
  };

  db.users.push(newUser);

  // New students start with 0 tasks, 0 expenses, 0 wallet transactions, 0 study sessions, 0 events!
  // Welcome notification only
  db.notifications.push({
    id: `notif_${Date.now()}`,
    userId: newUserId,
    type: 'system',
    title: `Welcome to Campusly, ${name.trim()}! 🎓`,
    message: 'Your student account is active. Explore smart study timers, AI assistance, notes, and academic planning.',
    date: new Date().toISOString(),
    read: false,
    link: '/dashboard',
  });

  saveDB(db);

  const token = createSessionToken(newUserId, 'student');
  return {
    status: 201,
    data: {
      user: sanitizeUser(newUser),
      token,
      message: 'Account created successfully.',
    },
  };
}

/**
 * Handles student login with PBKDF2 password verification.
 */
export function loginStudent(body: any): { status: number; data: any } {
  const { email, password, isDemo } = body || {};
  const db = loadDB();

  if (isDemo) {
    const demoUser = db.users.find((u) => u.email === 'student@university.edu') || db.users[0];
    const token = createSessionToken(demoUser.id, demoUser.role || 'student');
    return { status: 200, data: { user: sanitizeUser(demoUser), token } };
  }

  if (!email || typeof email !== 'string' || !email.trim()) {
    return { status: 400, data: { error: 'Email address is required.' } };
  }

  if (!password || typeof password !== 'string') {
    return { status: 400, data: { error: 'Password is required.' } };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = db.users.find((u) => u.email && u.email.toLowerCase() === normalizedEmail);

  if (!user) {
    return {
      status: 401,
      data: { error: 'Invalid email or password. Please check your credentials or sign up.' },
    };
  }

  if (user.status === 'inactive') {
    return {
      status: 403,
      data: {
        error: 'Your student account has been deactivated. Please contact the campus administrator for assistance.',
        deactivated: true,
      },
    };
  }

  // Verify PBKDF2 hashed password
  if (user.passwordHash && user.passwordSalt) {
    const isMatch = verifyPassword(password, user.passwordHash, user.passwordSalt);
    if (!isMatch) {
      return {
        status: 401,
        data: { error: 'Invalid email or password. Please check your credentials.' },
      };
    }
  }

  user.lastLoginAt = new Date().toISOString();
  user.loginCount = (user.loginCount || 0) + 1;
  saveDB(db);

  const token = createSessionToken(user.id, user.role || 'student');
  return { status: 200, data: { user: sanitizeUser(user), token } };
}

/**
 * Handles administrator login
 */
export function loginAdmin(body: any): { status: number; data: any } {
  const { email, password } = body || {};
  const db = loadDB();

  if (!email || !password) {
    return { status: 400, data: { error: 'Admin email and password are required.' } };
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const adminUser = db.users.find((u) => u.email && u.email.toLowerCase() === normalizedEmail);

  if (!adminUser || adminUser.role !== 'admin') {
    return { status: 403, data: { error: 'Access denied. Valid administrator credentials required.' } };
  }

  if (adminUser.status === 'inactive') {
    return { status: 403, data: { error: 'Admin account has been disabled.' } };
  }

  if (adminUser.passwordHash && adminUser.passwordSalt) {
    const isMatch = verifyPassword(String(password), adminUser.passwordHash, adminUser.passwordSalt);
    if (!isMatch) {
      return { status: 401, data: { error: 'Invalid admin credentials.' } };
    }
  }

  adminUser.lastLoginAt = new Date().toISOString();
  adminUser.loginCount = (adminUser.loginCount || 0) + 1;
  saveDB(db);

  const token = createSessionToken(adminUser.id, 'admin');
  return { status: 200, data: { user: sanitizeUser(adminUser), token } };
}

/**
 * Standard CORS and JSON request body parsing helper for Serverless functions
 */
export function parseServerlessBody(req: any): any {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  } else if (Buffer.isBuffer(body)) {
    try {
      body = JSON.parse(body.toString('utf-8'));
    } catch {
      body = {};
    }
  } else if (!body) {
    body = {};
  }
  return body;
}

export function setCorsHeaders(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
}
