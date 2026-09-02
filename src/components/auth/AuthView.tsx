import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CampuslyLogo } from '../ui/CampuslyLogo';
import {
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Mail,
  User,
  Building,
  BookOpen,
  Hash,
  ShieldAlert,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { motion } from 'motion/react';

type AuthMode = 'signin' | 'signup' | 'admin';

export const AuthView: React.FC = () => {
  const { login, adminLogin, register, showToast, authMode, setAuthMode, accountRemovedNotice, setAccountRemovedNotice } = useApp();

  const [mode, setMode] = useState<AuthMode>(authMode || 'signin');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync mode with context authMode if set externally (e.g. redirected to signup on account deletion)
  useEffect(() => {
    if (authMode) {
      setMode(authMode);
    }
  }, [authMode]);

  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    setAuthMode(newMode);
    setErrorMessage(null);
  };

  // Student Sign In fields (clean initial state, no prefilled values)
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');

  // Student Sign Up fields
  const [signUpName, setSignUpName] = useState<string>('');
  const [signUpEmail, setSignUpEmail] = useState<string>('');
  const [signUpPassword, setSignUpPassword] = useState<string>('');
  const [signUpInstitution, setSignUpInstitution] = useState<string>('');
  const [signUpAcademicLevel, setSignUpAcademicLevel] = useState<string>('');
  const [signUpStudentId, setSignUpStudentId] = useState<string>('');

  // Admin Login fields (clean initial state)
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [adminPassword, setAdminPassword] = useState<string>('');

  // Form submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (mode === 'signup') {
        if (!signUpName.trim()) throw new Error('Please enter your full name.');
        if (!signUpEmail.trim()) throw new Error('Please enter your email address.');
        if (!signUpPassword || signUpPassword.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        if (!signUpInstitution.trim()) throw new Error('Please enter your institution/university name.');
        if (!signUpAcademicLevel.trim()) {
          throw new Error('Please enter your class / grade / academic year.');
        }

        await register({
          name: signUpName.trim(),
          email: signUpEmail.trim(),
          password: signUpPassword,
          institution: signUpInstitution.trim(),
          academicLevel: signUpAcademicLevel.trim(),
          studentId: signUpStudentId.trim() || undefined,
        });
      } else if (mode === 'admin') {
        const trimmedAdminEmail = adminEmail.trim();
        const trimmedAdminPassword = adminPassword.trim();
        if (!trimmedAdminEmail) throw new Error('Please enter your admin email address.');
        if (!trimmedAdminPassword) throw new Error('Please enter your admin password.');

        await adminLogin(trimmedAdminEmail, trimmedAdminPassword);
      } else {
        if (!loginEmail.trim()) throw new Error('Please enter your email address.');
        if (!loginPassword) throw new Error('Please enter your password.');

        await login(loginEmail.trim(), loginPassword);
      }
    } catch (err: any) {
      const msg = err?.message || 'Authentication failed. Please check your credentials.';
      setErrorMessage(msg);
      showToast(msg, 'error');
      if (typeof window !== 'undefined') {
        alert(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFE] dark:bg-[#05070A] flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        {/* Brand Icon */}
        <div className="flex justify-center">
          <CampuslyLogo size="lg" />
        </div>

        <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-[#F8FAFC]">
          Campusly
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8]">
          The AI-Powered All-in-One University Companion
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-[#0B1017] py-7 px-6 sm:px-8 rounded-3xl border border-slate-200/80 dark:border-[#1E293B] shadow-xl space-y-5">
          {/* Mode Switcher Tabs (Sign In, Sign Up, Admin) */}
          <div className="grid grid-cols-3 p-1 bg-slate-100 dark:bg-[#131C28] rounded-2xl border border-slate-200/60 dark:border-[#1E293B]">
            <button
              id="tab-signin"
              type="button"
              onClick={() => handleModeChange('signin')}
              className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'signin'
                  ? 'bg-white dark:bg-[#1C2636] text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>

            <button
              id="tab-signup"
              type="button"
              onClick={() => handleModeChange('signup')}
              className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'signup'
                  ? 'bg-white dark:bg-[#1C2636] text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Sign Up</span>
            </button>

            <button
              id="tab-admin"
              type="button"
              onClick={() => handleModeChange('admin')}
              className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'admin'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-purple-600'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>

          {/* Prominent On-Screen Error Diagnostics Banner */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs"
            >
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
              <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
            </motion.div>
          )}

          <div className="relative flex items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-[#1E293B]"></div>
            <span className="flex-shrink mx-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {mode === 'signup'
                ? 'Create New Student Account'
                : mode === 'admin'
                ? 'Administrator Portal Authentication'
                : 'Student Account Sign In'}
            </span>
            <div className="flex-grow border-t border-slate-200 dark:border-[#1E293B]"></div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* STUDENT SIGN UP FORM */}
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="signup-name-input"
                      type="text"
                      required
                      placeholder="e.g. Alex Johnson"
                      value={signUpName}
                      onChange={(e) => setSignUpName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Student Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="signup-email-input"
                      type="email"
                      required
                      placeholder="student@university.edu"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Password <span className="text-rose-500">* (at least 6 characters)</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="signup-password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter a secure password (min 6 chars)"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Institution / University Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="signup-institution-input"
                      type="text"
                      required
                      placeholder="e.g. University of Dhaka, MIT, BUET"
                      value={signUpInstitution}
                      onChange={(e) => setSignUpInstitution(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Class / Grade / Year <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <BookOpen className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="signup-level-input"
                        type="text"
                        required
                        placeholder="e.g. 4th Year, 8th Sem"
                        value={signUpAcademicLevel}
                        onChange={(e) => setSignUpAcademicLevel(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Student ID <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <Hash className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="signup-studentid-input"
                        type="text"
                        placeholder="e.g. STU-2026-089"
                        value={signUpStudentId}
                        onChange={(e) => setSignUpStudentId(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* STUDENT SIGN IN FORM */}
            {mode === 'signin' && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="signin-email-input"
                      type="email"
                      required
                      placeholder="student@university.edu"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="signin-password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ADMIN LOGIN FORM */}
            {mode === 'admin' && (
              <>
                <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-xl text-xs text-purple-900 dark:text-purple-200">
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <ShieldAlert className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>Administrator Restricted Area</span>
                  </div>
                  <p className="text-[11px] text-purple-700 dark:text-purple-300">
                    Provides global student management, engagement analytics, and account moderation controls.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Admin Email
                  </label>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-500" />
                    <input
                      id="admin-email-input"
                      type="email"
                      required
                      placeholder="Enter admin email"
                      value={adminEmail}
                      onChange={(e) => {
                        setAdminEmail(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#101823] border border-purple-200 dark:border-purple-900/60 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 opacity-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Admin Master Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-500" />
                    <input
                      id="admin-password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter admin password"
                      value={adminPassword}
                      onChange={(e) => {
                        setAdminPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-[#101823] border border-purple-200 dark:border-purple-900/60 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 opacity-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <button
              id="auth-submit-button"
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 text-white rounded-xl font-bold text-xs shadow-md transition active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
                mode === 'admin'
                  ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/20'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
              } disabled:opacity-50`}
            >
              {isLoading ? (
                <span>Authenticating...</span>
              ) : mode === 'signup' ? (
                <>
                  <span>Create Student Profile</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : mode === 'admin' ? (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Access Admin Console</span>
                </>
              ) : (
                <>
                  <span>Sign In to Campusly</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Bottom Switcher */}
          <div className="text-center pt-2 border-t border-slate-100 dark:border-[#1E293B]">
            {mode === 'signin' && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                New student?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Create an account
                </button>
              </p>
            )}

            {mode === 'signup' && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Sign in here
                </button>
              </p>
            )}

            {mode === 'admin' && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you a student?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                >
                  Go to Student Portal
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Feature bullets */}
        <div className="mt-6 grid grid-cols-2 gap-2 text-center text-xs text-slate-500 dark:text-[#94A3B8]">
          <div className="flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>AI Slides with Speech</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>50/10 Pomodoro Timer</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>3-Sec Expense Tracker</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Academic Plan & Calendar</span>
          </div>
        </div>
      </div>
    </div>
  );
};
