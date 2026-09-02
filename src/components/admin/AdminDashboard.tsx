import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_PROFILES_ENDPOINT,
  updateProfileStatusDirectRest,
  deleteProfileDirectRest,
} from '../../supabase';
import { apiRequest } from '../../utils/api';
import { StudentAdminRecord, AdminDashboardStats } from '../../types';
import { CampuslyLogo } from '../ui/CampuslyLogo';
import { UserAvatar } from '../ui/UserAvatar';
import {
  Users,
  Shield,
  Search,
  RefreshCw,
  LogOut,
  UserCheck,
  UserX,
  Trash2,
  Eye,
  Clock,
  Presentation as PresentationIcon,
  Building,
  GraduationCap,
  Calendar,
  AlertTriangle,
  X,
  Filter,
  Activity,
  KeyRound,
  FileSpreadsheet,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AdminDashboard: React.FC = () => {
  const { user, logout, showToast } = useApp();

  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [students, setStudents] = useState<StudentAdminRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [institutionFilter, setInstitutionFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');

  // Selected student for details inspection modal
  const [selectedStudent, setSelectedStudent] = useState<StudentAdminRecord | null>(null);

  // Student to delete modal state
  const [studentToDelete, setStudentToDelete] = useState<StudentAdminRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Status updating state per student
  const [updatingStudentId, setUpdatingStudentId] = useState<string | null>(null);

  const fetchAdminData = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setIsLoading(true);
      else setIsRefreshing(true);

      try {
        // Fetch all global profiles directly from Supabase Cloud Database via REST API
        let cloudProfiles: any[] = [];
        let isSupabaseLoaded = false;
        try {
          const res = await fetch(`${SUPABASE_PROFILES_ENDPOINT}?select=*&order=created_at.desc`, {
            method: 'GET',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              cloudProfiles = data;
              isSupabaseLoaded = true;
            }
          }
        } catch (supaErr) {
          console.warn('Supabase direct REST fetch notice in Admin Console:', supaErr);
        }

        // Also check local cache for seamless merge if needed
        let localUsers: any[] = [];
        try {
          const raw = localStorage.getItem('campusly_users');
          if (raw) {
            localUsers = JSON.parse(raw);
          }
        } catch {
          localUsers = [];
        }

        // Combine cloud profiles and local cache (prioritizing Supabase cloud records)
        const combinedMap = new Map<string, any>();

        // 1. Add local users first
        (localUsers || []).forEach((u) => {
          const key = (u.email || u.id || '').toLowerCase().trim();
          if (key) combinedMap.set(key, u);
        });

        // 2. Overlay / add cloud profiles from Supabase
        (cloudProfiles || []).forEach((p) => {
          const key = (p.email || p.id || '').toLowerCase().trim();
          if (key) {
            combinedMap.set(key, {
              ...combinedMap.get(key),
              ...p,
              id: p.id || combinedMap.get(key)?.id || key,
              name: p.full_name || p.name || combinedMap.get(key)?.name || 'Student',
              email: p.email || combinedMap.get(key)?.email || '',
              studentId: p.student_id || p.studentId || combinedMap.get(key)?.studentId || 'N/A',
              institution: p.university_name || p.institution || p.university || combinedMap.get(key)?.institution || 'General University',
              academicLevel: p.academic_level || p.academicLevel || combinedMap.get(key)?.academicLevel || '1st Year',
              department: p.department || combinedMap.get(key)?.department || 'General Studies',
              semester: p.semester || p.academic_level || p.academicLevel || combinedMap.get(key)?.semester || '1st Year',
              role: p.role || combinedMap.get(key)?.role || 'student',
              status: p.status || combinedMap.get(key)?.status || 'active',
              profilePhoto: p.profile_photo || p.profilePhoto || combinedMap.get(key)?.profilePhoto || '',
              createdAt: p.created_at || p.createdAt || combinedMap.get(key)?.createdAt || new Date().toISOString(),
              lastLoginAt: p.last_login_at || p.lastLoginAt || p.created_at || combinedMap.get(key)?.lastLoginAt || new Date().toISOString(),
              loginCount: p.login_count || p.loginCount || combinedMap.get(key)?.loginCount || 1,
            });
          }
        });

        const mergedList = Array.from(combinedMap.values());

        // Map to StudentAdminRecord structure
        let studentRecords: StudentAdminRecord[] = mergedList.map((u) => ({
          id: u.id,
          name: u.full_name || u.name || 'Student',
          email: u.email || '',
          studentId: u.student_id || u.studentId || 'N/A',
          institution: u.university_name || u.institution || u.university || 'General University',
          academicLevel: u.academic_level || u.academicLevel || u.semester || '1st Year',
          department: u.department || 'General Studies',
          semester: u.semester || u.academic_level || u.academicLevel || '1st Year',
          role: (u.role as any) || 'student',
          status: (u.status as any) || 'active',
          profilePhoto: u.profile_photo || u.profilePhoto || '',
          createdAt: u.created_at || u.createdAt || new Date().toISOString(),
          lastLoginAt: u.last_login_at || u.lastLoginAt || u.created_at || new Date().toISOString(),
          loginCount: u.login_count || u.loginCount || 1,
          stats: {
            tasksCount: u.stats?.tasksCount || 0,
            completedTasksCount: u.stats?.completedTasksCount || 0,
            studyMinutes: u.stats?.studyMinutes || 0,
            studySessionsCount: u.stats?.studySessionsCount || 0,
            expensesCount: u.stats?.expensesCount || 0,
            presentationsCount: u.stats?.presentationsCount || 0,
            notesCount: u.stats?.notesCount || 0,
          },
        }));

        // Apply filters locally
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          studentRecords = studentRecords.filter(
            (s) =>
              s.name.toLowerCase().includes(q) ||
              s.email.toLowerCase().includes(q) ||
              s.institution.toLowerCase().includes(q) ||
              (s.studentId && s.studentId.toLowerCase().includes(q))
          );
        }

        if (statusFilter !== 'all') {
          studentRecords = studentRecords.filter((s) => s.status === statusFilter);
        }

        if (institutionFilter !== 'all') {
          studentRecords = studentRecords.filter((s) => s.institution === institutionFilter);
        }

        if (levelFilter !== 'all') {
          studentRecords = studentRecords.filter((s) => s.academicLevel === levelFilter);
        }

        // Compute local stats
        const activeCount = studentRecords.filter((s) => s.status === 'active').length;
        const inactiveCount = studentRecords.filter((s) => s.status === 'inactive').length;

        const calculatedStats: AdminDashboardStats = {
          totalStudents: studentRecords.length,
          activeStudents: activeCount,
          inactiveStudents: inactiveCount,
          recentRegistrationsCount: studentRecords.length,
          recentActiveCount: activeCount,
          totalTasks: 0,
          totalStudyHours: 0,
          totalExpensesLogged: 0,
          totalPresentationsCreated: 0,
        };

        setStats(calculatedStats);
        setStudents(studentRecords);
      } catch (err: any) {
        showToast(err.message || 'Failed to load administrative records.', 'error');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [searchQuery, statusFilter, institutionFilter, levelFilter, showToast]
  );

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  // Derive distinct institutions and academic levels for filter dropdowns
  const availableInstitutions = useMemo(() => {
    const set = new Set<string>();
    (students || []).forEach((s) => {
      if (s?.institution && s.institution !== 'N/A') set.add(s.institution);
    });
    return Array.from(set);
  }, [students]);

  const availableLevels = useMemo(() => {
    const set = new Set<string>();
    (students || []).forEach((s) => {
      if (s?.academicLevel && s.academicLevel !== 'N/A') set.add(s.academicLevel);
    });
    return Array.from(set);
  }, [students]);

  const handleToggleStatus = async (student: StudentAdminRecord) => {
    const newStatus = student.status === 'active' ? 'inactive' : 'active';
    setUpdatingStudentId(student.id);

    try {
      // Update in Supabase via direct REST
      try {
        await updateProfileStatusDirectRest(student.email || student.id, newStatus);
      } catch (supaErr) {
        console.warn('Supabase REST profile status update:', supaErr);
      }

      // Update in LocalStorage
      try {
        const raw = localStorage.getItem('campusly_users');
        if (raw) {
          const list = JSON.parse(raw);
          const updated = list.map((u: any) =>
            (u.id === student.id || (u.email && u.email.toLowerCase() === student.email?.toLowerCase())) ? { ...u, status: newStatus } : u
          );
          localStorage.setItem('campusly_users', JSON.stringify(updated));
        }
      } catch (e) {
        console.warn('Local users update notice:', e);
      }

      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, status: newStatus } : s))
      );

      if (selectedStudent && selectedStudent.id === student.id) {
        setSelectedStudent((prev) => (prev ? { ...prev, status: newStatus } : null));
      }

      // Update stats count locally
      if (stats) {
        const delta = newStatus === 'active' ? 1 : -1;
        setStats({
          ...stats,
          activeStudents: stats.activeStudents + delta,
          inactiveStudents: stats.inactiveStudents - delta,
        });
      }

      showToast(
        `Student ${student.name} has been ${newStatus === 'active' ? 'activated' : 'deactivated'}.`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to update student status.', 'error');
    } finally {
      setUpdatingStudentId(null);
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    setIsDeleting(true);

    try {
      // Delete from Supabase via direct REST
      try {
        await deleteProfileDirectRest(studentToDelete.email || studentToDelete.id);
      } catch (supaErr) {
        console.warn('Supabase REST profile delete error:', supaErr);
      }

      // Delete from LocalStorage
      try {
        const raw = localStorage.getItem('campusly_users');
        if (raw) {
          const list = JSON.parse(raw);
          const filtered = list.filter((u: any) => u.id !== studentToDelete.id && (!studentToDelete.email || u.email?.toLowerCase() !== studentToDelete.email.toLowerCase()));
          localStorage.setItem('campusly_users', JSON.stringify(filtered));
        }
      } catch (e) {
        console.warn('Local users delete notice:', e);
      }

      setStudents((prev) => prev.filter((s) => s.id !== studentToDelete.id));
      if (selectedStudent && selectedStudent.id === studentToDelete.id) {
        setSelectedStudent(null);
      }

      // Refresh stats
      fetchAdminData(true);
      showToast(`Student ${studentToDelete.name} and records deleted.`, 'info');
      setStudentToDelete(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete student account.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatActivityTime = (isoString?: string) => {
    if (!isoString) return 'Never';
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 2) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#070A0F] text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Admin Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#0B1017]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#1E293B] px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <CampuslyLogo size="md" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 dark:text-white">Campusly</span>
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 rounded-md border border-purple-200 dark:border-purple-800">
                Admin Console
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Institution & Student Administration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-[#131C28] px-3 py-1.5 rounded-xl border border-slate-200/70 dark:border-[#1E293B]">
            <Shield className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span className="font-semibold">{user?.email || 'admin@campusly.internal'}</span>
          </div>

          <button
            id="admin-refresh-btn"
            type="button"
            onClick={() => fetchAdminData(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-slate-100 dark:bg-[#131C28] hover:bg-slate-200 dark:hover:bg-[#1A2536] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-[#1E293B] transition cursor-pointer"
            title="Refresh Records"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-purple-600' : ''}`} />
          </button>

          <button
            id="admin-logout-btn"
            type="button"
            onClick={logout}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold border border-red-200 dark:border-red-900/60 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Welcome Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-6 rounded-3xl shadow-lg shadow-purple-950/20">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Campus Overview & Student Registry
            </h1>
            <p className="text-xs sm:text-sm text-purple-200/90 mt-1 max-w-xl">
              Monitor student engagement, verify enrollment credentials, manage student accounts, and maintain campus security.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15 text-xs font-semibold">
            <UserCheck className="w-4 h-4 text-emerald-300" />
            <span>Server Authorization: Verified Admin</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Total Students */}
          <div className="bg-white dark:bg-[#0B1017] p-4.5 rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-xs">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Students
              </span>
              <div className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {stats ? stats.totalStudents : '—'}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Registered student base
            </p>
          </div>

          {/* Active Students */}
          <div className="bg-white dark:bg-[#0B1017] p-4.5 rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-xs">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Active Accounts
              </span>
              <div className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {stats ? stats.activeStudents : '—'}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              {stats?.inactiveStudents || 0} suspended / inactive
            </p>
          </div>

          {/* Recently Active Students */}
          <div className="bg-white dark:bg-[#0B1017] p-4.5 rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-xs">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Recently Active
              </span>
              <div className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {stats ? stats.recentActiveCount : '—'}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Logged in within 7 days
            </p>
          </div>

          {/* New Signups */}
          <div className="bg-white dark:bg-[#0B1017] p-4.5 rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-xs">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                New This Week
              </span>
              <div className="p-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
              {stats ? `+${stats.recentRegistrationsCount}` : '—'}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Enrolled in past 7 days
            </p>
          </div>

          {/* Total Study Hours */}
          <div className="bg-white dark:bg-[#0B1017] p-4.5 rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-xs col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Study Logged
              </span>
              <div className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {stats ? `${stats.totalStudyHours}h` : '—'}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              {stats?.totalPresentationsCreated || 0} decks · {stats?.totalTasks || 0} tasks
            </p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white dark:bg-[#0B1017] p-4 rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-xs flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="admin-student-search-input"
              type="text"
              placeholder="Search by student name, email, student ID, university, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Status:</span>
              <select
                id="admin-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-purple-600 dark:text-purple-400 focus:outline-none cursor-pointer"
              >
                <option value="all">All ({stats?.totalStudents || 0})</option>
                <option value="active">Active Only ({stats?.activeStudents || 0})</option>
                <option value="inactive">Inactive Only ({stats?.inactiveStudents || 0})</option>
              </select>
            </div>

            {/* Institution Filter */}
            {availableInstitutions.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>Institution:</span>
                <select
                  id="admin-institution-filter"
                  value={institutionFilter}
                  onChange={(e) => setInstitutionFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-blue-600 dark:text-blue-400 focus:outline-none cursor-pointer max-w-[140px] truncate"
                >
                  <option value="all">All Institutions</option>
                  {availableInstitutions.map((inst) => (
                    <option key={inst} value={inst}>
                      {inst}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Academic Level Filter */}
            {availableLevels.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                <span>Class / Year:</span>
                <select
                  id="admin-level-filter"
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-indigo-600 dark:text-indigo-400 focus:outline-none cursor-pointer max-w-[140px] truncate"
                >
                  <option value="all">All Levels</option>
                  {availableLevels.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Student Table */}
        <div className="bg-white dark:bg-[#0B1017] rounded-3xl border border-slate-200 dark:border-[#1E293B] shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-[#1E293B] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Registered Students Directory
              </h2>
              <span className="px-2 py-0.5 text-[11px] font-bold bg-slate-100 dark:bg-[#131C28] text-slate-600 dark:text-slate-300 rounded-full">
                {students.length}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Passwords securely hashed (Never exposed)</span>
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
              <span>Loading student directory...</span>
            </div>
          ) : students.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <Users className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                No student accounts found.
              </span>
              <span className="text-[11px] text-slate-400">
                {searchQuery ? 'Try adjusting your search criteria or filters.' : 'Registered students will appear here.'}
              </span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-[#101823]/80 border-b border-slate-200 dark:border-[#1E293B] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="py-3 px-4 sm:px-6">Student</th>
                    <th className="py-3 px-4">Institution & Level</th>
                    <th className="py-3 px-4">Student ID</th>
                    <th className="py-3 px-4">Login Activity</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1E293B]">
                  {students.map((student) => (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-[#101823]/60 transition"
                    >
                      {/* Student Info */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            src={student.profilePhoto}
                            name={student.name}
                            size="sm"
                            ring={false}
                          />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {student.name}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {student.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Institution & Level */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {student.institution}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {student.academicLevel} · {student.department}
                        </div>
                      </td>

                      {/* Student ID */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-[#131C28] text-slate-700 dark:text-slate-300 font-mono text-[11px] font-bold border border-slate-200 dark:border-[#1E293B]">
                          {student.studentId || 'N/A'}
                        </span>
                      </td>

                      {/* Login Activity */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col text-[11px]">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            Last: {formatActivityTime(student.lastLoginAt)}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            {student.loginCount || 1} logins recorded
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            student.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              student.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          {student.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            id={`view-student-${student.id}`}
                            type="button"
                            onClick={() => setSelectedStudent(student)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition cursor-pointer"
                            title="Inspect Student Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            id={`toggle-status-${student.id}`}
                            type="button"
                            disabled={updatingStudentId === student.id}
                            onClick={() => handleToggleStatus(student)}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              student.status === 'active'
                                ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                            }`}
                            title={student.status === 'active' ? 'Deactivate Student' : 'Activate Student'}
                          >
                            {student.status === 'active' ? (
                              <UserX className="w-4 h-4" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            id={`delete-student-${student.id}`}
                            type="button"
                            onClick={() => setStudentToDelete(student)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                            title="Delete Student & Clean Data"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Student Details Inspection Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#0B1017] rounded-3xl border border-slate-200 dark:border-[#1E293B] shadow-2xl max-w-lg w-full overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-slate-200 dark:border-[#1E293B] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-purple-600" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Student Profile & Auth Record
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#131C28] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-5 text-xs">
                {/* Header Card */}
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-[#101823] p-4 rounded-2xl border border-slate-200/80 dark:border-[#1E293B]">
                  <UserAvatar
                    src={selectedStudent.profilePhoto}
                    name={selectedStudent.name}
                    size="lg"
                    ring={false}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-base text-slate-900 dark:text-white">
                        {selectedStudent.name}
                      </h4>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          selectedStudent.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {selectedStudent.status}
                      </span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400">{selectedStudent.email}</p>
                  </div>
                </div>

                {/* Password Protection Badge */}
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 text-purple-800 dark:text-purple-300 text-[11px] font-semibold">
                  <Shield className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  <span>Password securely encrypted with PBKDF2 salt & hash. Zero plain text exposure.</span>
                </div>

                {/* Academic Metadata */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 dark:bg-[#101823] rounded-xl border border-slate-200/60 dark:border-[#1E293B]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Institution / University
                    </span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {selectedStudent.institution}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-[#101823] rounded-xl border border-slate-200/60 dark:border-[#1E293B]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Student ID
                    </span>
                    <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {selectedStudent.studentId || 'N/A'}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-[#101823] rounded-xl border border-slate-200/60 dark:border-[#1E293B]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Class / Academic Level
                    </span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {selectedStudent.academicLevel}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-[#101823] rounded-xl border border-slate-200/60 dark:border-[#1E293B]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Department
                    </span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {selectedStudent.department}
                    </p>
                  </div>
                </div>

                {/* Login Activity Metrics */}
                <div className="p-3.5 bg-slate-50 dark:bg-[#101823] rounded-2xl border border-slate-200/60 dark:border-[#1E293B] space-y-2">
                  <h5 className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Login & Authentication Activity</span>
                  </h5>
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <span className="text-slate-400">Account Created:</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {new Date(selectedStudent.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Last Login:</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedStudent.lastLoginAt
                          ? new Date(selectedStudent.lastLoginAt).toLocaleString()
                          : 'Never'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Total Logins Recorded:</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedStudent.loginCount || 1} sessions
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Current Status:</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                        {selectedStudent.status}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Platform Engagement Metrics */}
                <div>
                  <h5 className="font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase text-[10px] tracking-wider">
                    Platform Usage & Isolated Data
                  </h5>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40">
                      <div className="font-black text-sm text-purple-700 dark:text-purple-300">
                        {Math.round((selectedStudent.stats.studyMinutes / 60) * 10) / 10}h
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Study Time
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                      <div className="font-black text-sm text-blue-700 dark:text-blue-300">
                        {selectedStudent.stats.completedTasksCount}/{selectedStudent.stats.tasksCount}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Tasks Done
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                      <div className="font-black text-sm text-emerald-700 dark:text-emerald-300">
                        {selectedStudent.stats.presentationsCount}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Presentations
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer with Direct Status Toggle */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-[#101823] border-t border-slate-200 dark:border-[#1E293B] flex items-center justify-between gap-2">
                <button
                  id="modal-toggle-status-btn"
                  type="button"
                  disabled={updatingStudentId === selectedStudent.id}
                  onClick={() => handleToggleStatus(selectedStudent)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    selectedStudent.status === 'active'
                      ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                  }`}
                >
                  {selectedStudent.status === 'active' ? (
                    <>
                      <UserX className="w-3.5 h-3.5" />
                      <span>Deactivate Account</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Activate Account</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="px-4 py-2 bg-slate-200 dark:bg-[#1E293B] text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-300 dark:hover:bg-[#2A374A] transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {studentToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#0B1017] rounded-3xl border border-rose-200 dark:border-rose-950 shadow-2xl max-w-md w-full p-6 space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Delete Student Account?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Are you sure you want to delete <strong className="text-slate-800 dark:text-slate-200">{studentToDelete.name}</strong> ({studentToDelete.email})? All associated tasks, study sessions, and presentations will be permanently removed.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStudentToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-slate-100 dark:bg-[#131C28] text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteStudent}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 transition cursor-pointer"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete Account'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
