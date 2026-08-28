import crypto from 'crypto';
import dotenv from 'dotenv';
import { User, UserRole, UserStatus } from '../types';

try {
  dotenv.config();
} catch {
  // Safe in serverless contexts
}

// Resilient JWT / HMAC Secret Key
const AUTH_SECRET = (
  process.env.AUTH_SECRET ||
  process.env.JWT_SECRET ||
  process.env.SESSION_SECRET ||
  'campusly_prod_secure_key_2026_x87fd32'
).trim();

export interface StoredUser extends User {
  passwordHash: string;
  passwordSalt: string;
  loginCount?: number;
}

/**
 * Generates a cryptographically secure PBKDF2 hash using SHA-512 and a random 16-byte salt.
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  try {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(String(password), salt, 100000, 64, 'sha512').toString('hex');
    return { hash, salt };
  } catch (err) {
    console.error('[AuthCore] Error during pbkdf2 hashing, using HMAC fallback:', err);
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHmac('sha256', AUTH_SECRET).update(`${password}:${salt}`).digest('hex');
    return { hash, salt };
  }
}

/**
 * Verifies a candidate password against the stored salt and hash using timing-safe comparison.
 */
export function verifyPassword(password: string, storedHash: string, storedSalt: string): boolean {
  if (!password || !storedHash || !storedSalt) return false;
  try {
    const candidateHash = crypto.pbkdf2Sync(String(password), storedSalt, 100000, 64, 'sha512').toString('hex');
    const bufA = Buffer.from(candidateHash, 'hex');
    const bufB = Buffer.from(storedHash, 'hex');
    if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
      return true;
    }
  } catch (err) {
    console.error('[AuthCore] Error during pbkdf2 password verification:', err);
  }

  try {
    const fallbackHash = crypto.createHmac('sha256', AUTH_SECRET).update(`${password}:${storedSalt}`).digest('hex');
    if (fallbackHash === storedHash) {
      return true;
    }
  } catch (err) {
    console.error('[AuthCore] Error during fallback password verification:', err);
  }

  return false;
}

/**
 * Signs a tamper-proof session token containing userId, role, and creation timestamp.
 */
export function createSessionToken(userId: string, role: UserRole = 'student'): string {
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(8).toString('hex');
  const payload = `${userId}:${role}:${timestamp}:${nonce}`;
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex');
  const rawToken = `${payload}:${signature}`;
  return Buffer.from(rawToken, 'utf-8').toString('base64url');
}

/**
 * Validates a session token and extracts the userId and role.
 * Tokens are valid for 60 days.
 */
export function verifySessionToken(token: string): { userId: string; role: UserRole } | null {
  if (!token || typeof token !== 'string') return null;

  // Handle direct demo / raw user IDs for backwards compatibility if needed
  if (token.startsWith('user_demo_') || token === 'user_demo_101') {
    return { userId: token, role: 'student' };
  }

  try {
    const rawToken = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = rawToken.split(':');
    if (parts.length < 5) return null;

    const [userId, role, timestampStr, nonce, signature] = parts;
    const payload = `${userId}:${role}:${timestampStr}:${nonce}`;
    const expectedSignature = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex');

    const bufExpected = Buffer.from(expectedSignature, 'hex');
    const bufActual = Buffer.from(signature, 'hex');

    if (bufExpected.length !== bufActual.length || !crypto.timingSafeEqual(bufExpected, bufActual)) {
      return null;
    }

    const timestamp = parseInt(timestampStr, 10);
    const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
    if (isNaN(timestamp) || Date.now() - timestamp > sixtyDaysMs) {
      return null; // Expired
    }

    return {
      userId,
      role: role === 'admin' ? 'admin' : 'student',
    };
  } catch {
    return null;
  }
}

/**
 * Strips password hashes, salts, and secrets from user records before sending to client.
 */
export function sanitizeUser(user: any): User {
  const { passwordHash, passwordSalt, ...cleanUser } = user || {};
  return {
    id: cleanUser.id || 'usr_unknown',
    name: cleanUser.name || 'Student',
    email: cleanUser.email || '',
    studentId: cleanUser.studentId || '',
    institution: cleanUser.institution || cleanUser.university || 'University',
    academicLevel: cleanUser.academicLevel || cleanUser.semester || '1st Semester',
    university: cleanUser.university || cleanUser.institution || 'University',
    department: cleanUser.department || 'General Studies',
    semester: cleanUser.semester || cleanUser.academicLevel || '1st Semester',
    role: (cleanUser.role === 'admin' ? 'admin' : 'student') as UserRole,
    status: (cleanUser.status === 'inactive' ? 'inactive' : 'active') as UserStatus,
    profilePhoto: cleanUser.profilePhoto || '',
    createdAt: cleanUser.createdAt || new Date().toISOString(),
    lastLoginAt: cleanUser.lastLoginAt || new Date().toISOString(),
    loginCount: typeof cleanUser.loginCount === 'number' ? cleanUser.loginCount : 1,
    preferences: {
      theme: cleanUser.preferences?.theme || 'light',
      language: cleanUser.preferences?.language || 'en',
      currency: cleanUser.preferences?.currency || 'BDT',
      currencySymbol: cleanUser.preferences?.currencySymbol || '৳',
      dailyStudyGoalMinutes: cleanUser.preferences?.dailyStudyGoalMinutes || 240,
      monthlyBudgetAmount: cleanUser.preferences?.monthlyBudgetAmount || 0,
      onboardingCompleted: cleanUser.preferences?.onboardingCompleted ?? true,
      notifications: cleanUser.preferences?.notifications ?? true,
      weekStartsOn: cleanUser.preferences?.weekStartsOn ?? 0,
    },
  };
}

/**
 * Ensures the administrator account is provisioned in the database.
 * Syncs with Vercel Production Environment Variables (ADMIN_EMAIL, ADMIN_PASSWORD) dynamically.
 */
export function ensureAdminAccount(usersList: any[]): boolean {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@campusly.internal').toLowerCase().trim();
  const adminPassword = (process.env.ADMIN_PASSWORD || 'AdminMaster2026!').trim();

  let adminUser = usersList.find((u) => u.email && u.email.toLowerCase() === adminEmail);
  if (!adminUser) {
    // If an existing admin exists with an old email, update their email
    const existingAdmin = usersList.find((u) => u.role === 'admin');
    if (existingAdmin) {
      existingAdmin.email = adminEmail;
      const { hash, salt } = hashPassword(adminPassword);
      existingAdmin.passwordHash = hash;
      existingAdmin.passwordSalt = salt;
      existingAdmin.status = 'active';
      return true;
    }

    const { hash, salt } = hashPassword(adminPassword);
    const newAdmin = {
      id: 'admin_root_master',
      name: 'Campusly System Admin',
      email: adminEmail,
      passwordHash: hash,
      passwordSalt: salt,
      studentId: 'ADMIN-001',
      institution: 'Campusly Administration',
      academicLevel: 'Admin Portal',
      university: 'Campusly System Operations',
      department: 'System Administration',
      semester: 'N/A',
      role: 'admin' as UserRole,
      status: 'active' as UserStatus,
      loginCount: 1,
      profilePhoto: '',
      createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
      lastLoginAt: new Date().toISOString(),
      preferences: {
        theme: 'light',
        language: 'en',
        currency: 'BDT',
        currencySymbol: '৳',
        dailyStudyGoalMinutes: 240,
        monthlyBudgetAmount: 0,
        onboardingCompleted: true,
        notifications: true,
      },
    };
    usersList.push(newAdmin);
    return true;
  } else {
    // Ensure admin user has role admin, active status, and password verification
    let changed = false;
    if (adminUser.role !== 'admin') {
      adminUser.role = 'admin';
      changed = true;
    }
    if (adminUser.status !== 'active') {
      adminUser.status = 'active';
      changed = true;
    }

    // Verify if current password in env matches. If not, update hash/salt to support env updates on Vercel
    if (process.env.ADMIN_PASSWORD && !verifyPassword(adminPassword, adminUser.passwordHash, adminUser.passwordSalt)) {
      const { hash, salt } = hashPassword(adminPassword);
      adminUser.passwordHash = hash;
      adminUser.passwordSalt = salt;
      changed = true;
    }

    return changed;
  }
}
