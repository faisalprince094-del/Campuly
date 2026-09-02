import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  fetchUserReportsDirectRest,
  updateUserReportStatusDirectRest,
  SUPABASE_ANON_KEY,
} from '../../supabase';
import {
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle2,
  HelpCircle,
  Eye,
  Mail,
  Copy,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  Shield,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface UserReportRecord {
  id: string;
  email: string;
  report_description: string;
  status: 'pending' | 'in_progress' | 'resolved' | string;
  created_at: string;
  source?: 'supabase' | 'local' | 'hybrid';
}

export const AdminReportsSection: React.FC = () => {
  const { showToast } = useApp();

  const [reports, setReports] = useState<UserReportRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'resolved'>('all');
  const [selectedReport, setSelectedReport] = useState<UserReportRecord | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Fetch reports from Supabase REST endpoint and merge with local storage backup
  const fetchReports = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      let supaReports: any[] = [];
      try {
        // Direct REST call to Supabase as specified
        const res = await fetch(
          'https://pixypjmyouyxauzczyaq.supabase.co/rest/v1/user_reports?select=*&order=created_at.desc',
          {
            method: 'GET',
            headers: {
              'apikey': 'sb_publishable_CCUx-FLmFHp3jCiAVuV1kw_mOKsaMXI',
              'Authorization': 'Bearer sb_publishable_CCUx-FLmFHp3jCiAVuV1kw_mOKsaMXI',
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            supaReports = data.map((r) => ({ ...r, source: 'supabase' }));
          }
        }
      } catch (err) {
        console.warn('Supabase reports fetch notice:', err);
      }

      // Merge with local storage reports to ensure zero data loss
      let localReports: any[] = [];
      try {
        const raw = localStorage.getItem('campusly_user_reports');
        if (raw) {
          localReports = JSON.parse(raw);
        }
      } catch {
        localReports = [];
      }

      // Also try fetching from local backend /api/user-reports if available
      let backendReports: any[] = [];
      try {
        const bRes = await fetch('/api/user-reports');
        if (bRes.ok) {
          const bData = await bRes.json();
          if (Array.isArray(bData.reports)) {
            backendReports = bData.reports;
          }
        }
      } catch {
        // Safe ignore
      }

      // Combine by id or unique signature (email + created_at)
      const combinedMap = new Map<string, UserReportRecord>();

      // Local/backend first
      [...localReports, ...backendReports].forEach((item) => {
        if (!item) return;
        const key = item.id || `${item.email}_${item.created_at}`;
        combinedMap.set(key, {
          id: item.id || key,
          email: item.email || 'anonymous@campusly.internal',
          report_description: item.report_description || item.description || '',
          status: (item.status || 'pending').toLowerCase(),
          created_at: item.created_at || new Date().toISOString(),
          source: item.source || 'local',
        });
      });

      // Supabase reports overwrite / take priority
      supaReports.forEach((item) => {
        if (!item) return;
        const key = item.id || `${item.email}_${item.created_at}`;
        combinedMap.set(key, {
          id: item.id || key,
          email: item.email || 'anonymous@campusly.internal',
          report_description: item.report_description || item.description || '',
          status: (item.status || 'pending').toLowerCase(),
          created_at: item.created_at || new Date().toISOString(),
          source: 'supabase',
        });
      });

      const list = Array.from(combinedMap.values());
      // Sort newest first
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setReports(list);
    } catch (err: any) {
      console.error('Error loading reports:', err);
      showToast('Could not load user reports.', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Status update handler
  const handleUpdateStatus = async (reportId: string, newStatus: string) => {
    setUpdatingId(reportId);
    try {
      // 1. Direct PATCH to Supabase
      try {
        await updateUserReportStatusDirectRest(reportId, newStatus);
      } catch (e) {
        console.warn('Supabase status update error:', e);
      }

      // 2. Update local storage cache
      try {
        const raw = localStorage.getItem('campusly_user_reports');
        if (raw) {
          const list = JSON.parse(raw);
          const updated = list.map((r: any) =>
            r.id === reportId ? { ...r, status: newStatus } : r
          );
          localStorage.setItem('campusly_user_reports', JSON.stringify(updated));
        }
      } catch (e) {
        console.warn('Local reports update error:', e);
      }

      // 3. Update backend API
      try {
        await fetch(`/api/user-reports/${reportId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }).catch(() => {});
      } catch {
        // Safe ignore
      }

      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
      );

      if (selectedReport && selectedReport.id === reportId) {
        setSelectedReport((prev) => (prev ? { ...prev, status: newStatus } : null));
      }

      showToast(`Report marked as ${newStatus.replace('_', ' ')}.`, 'success');
    } catch (err: any) {
      showToast('Failed to update status.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  // Copy email helper
  const handleCopyEmail = (email: string) => {
    navigator.clipboard?.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
    showToast('Email copied to clipboard.', 'info');
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = reports.length;
    const pending = reports.filter((r) => !r.status || r.status === 'pending').length;
    const inProgress = reports.filter((r) => r.status === 'in_progress' || r.status === 'review').length;
    const resolved = reports.filter((r) => r.status === 'resolved' || r.status === 'closed').length;
    return { total, pending, inProgress, resolved };
  }, [reports]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      // Status filter
      if (statusFilter === 'pending' && r.status !== 'pending') return false;
      if (statusFilter === 'in_progress' && r.status !== 'in_progress' && r.status !== 'review') return false;
      if (statusFilter === 'resolved' && r.status !== 'resolved' && r.status !== 'closed') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchEmail = (r.email || '').toLowerCase().includes(q);
        const matchDesc = (r.report_description || '').toLowerCase().includes(q);
        return matchEmail || matchDesc;
      }

      return true;
    });
  }, [reports, statusFilter, searchQuery]);

  // Format date helper
  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Recent';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const renderStatusBadge = (status: string) => {
    const s = (status || 'pending').toLowerCase();
    if (s === 'resolved' || s === 'closed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-3 h-3" />
          <span>Resolved</span>
        </span>
      );
    }
    if (s === 'in_progress' || s === 'review') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          <Clock className="w-3 h-3" />
          <span>In Progress</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
        <AlertCircle className="w-3 h-3" />
        <span>Pending</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-[#0B1017] p-4.5 rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Reports
            </span>
            <div className="p-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats.total}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            Submitted by campus students
          </p>
        </div>

        <div className="bg-white dark:bg-[#0B1017] p-4.5 rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pending Review
            </span>
            <div className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {stats.pending}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            Awaiting admin inspection
          </p>
        </div>

        <div className="bg-white dark:bg-[#0B1017] p-4.5 rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              In Progress
            </span>
            <div className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
            {stats.inProgress}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            Under active resolution
          </p>
        </div>

        <div className="bg-white dark:bg-[#0B1017] p-4.5 rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Resolved
            </span>
            <div className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.resolved}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            Completed issues
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#0B1017] p-4 rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="reports-search-input"
            type="text"
            placeholder="Search reports by student email or issue description keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Status:</span>
            <select
              id="reports-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-purple-600 dark:text-purple-400 focus:outline-none cursor-pointer"
            >
              <option value="all">All Reports ({reports.length})</option>
              <option value="pending">Pending ({stats.pending})</option>
              <option value="in_progress">In Progress ({stats.inProgress})</option>
              <option value="resolved">Resolved ({stats.resolved})</option>
            </select>
          </div>

          <button
            id="reports-refresh-btn"
            type="button"
            onClick={() => fetchReports(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-slate-50 dark:bg-[#101823] hover:bg-slate-100 dark:hover:bg-[#172230] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#1E293B] transition cursor-pointer"
            title="Refresh Reports directly from Supabase"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-purple-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Reports Table Card */}
      <div className="bg-white dark:bg-[#0B1017] rounded-3xl border border-slate-200 dark:border-[#1E293B] shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-purple-600 dark:text-purple-400 mb-3" />
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              Connecting to Supabase user_reports...
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Fetching issue tickets from table public.user_reports
            </p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-16 px-4 text-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#121B27] flex items-center justify-center mx-auto mb-3 text-slate-400">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              No reports found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {searchQuery || statusFilter !== 'all'
                ? 'No reports match your current search query or filter selection.'
                : 'There are currently no reported issues submitted to the public.user_reports table.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#0E1520] border-b border-slate-200 dark:border-[#1E293B] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                <tr>
                  <th scope="col" className="py-3.5 px-4 sm:px-6">User Email</th>
                  <th scope="col" className="py-3.5 px-4">Description</th>
                  <th scope="col" className="py-3.5 px-4">Status</th>
                  <th scope="col" className="py-3.5 px-4">Date Submitted</th>
                  <th scope="col" className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#15202E]">
                {filteredReports.map((report) => (
                  <tr
                    key={report.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-[#0F1722] transition-colors group"
                  >
                    {/* User Email */}
                    <td className="py-4 px-4 sm:px-6">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 font-black text-xs flex items-center justify-center shrink-0 border border-purple-200/60 dark:border-purple-800/40">
                          {report.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-white truncate">
                              {report.email}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyEmail(report.email)}
                              className="text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition"
                              title="Copy Email"
                            >
                              {copiedEmail === report.email ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            Ticket ID: {report.id.substring(0, 10)}...
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="py-4 px-4 max-w-xs sm:max-w-md">
                      <p
                        onClick={() => setSelectedReport(report)}
                        className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed font-medium cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition"
                        title="Click to view full description"
                      >
                        {report.report_description || 'No description provided.'}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {renderStatusBadge(report.status)}
                        <select
                          id={`report-status-select-${report.id}`}
                          value={report.status || 'pending'}
                          disabled={updatingId === report.id}
                          onChange={(e) => handleUpdateStatus(report.id, e.target.value)}
                          className="text-[10px] font-bold bg-slate-100 dark:bg-[#131C28] text-slate-600 dark:text-slate-300 rounded-lg px-2 py-1 border border-slate-200 dark:border-[#1E293B] cursor-pointer focus:outline-none"
                          title="Change ticket status"
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </div>
                    </td>

                    {/* Date Submitted */}
                    <td className="py-4 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400 text-xs">
                      {formatDate(report.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          id={`view-report-btn-${report.id}`}
                          type="button"
                          onClick={() => setSelectedReport(report)}
                          className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold text-xs border border-purple-200 dark:border-purple-800/60 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>

                        <a
                          href={`mailto:${encodeURIComponent(report.email)}?subject=${encodeURIComponent(
                            'Regarding your Campusly Report'
                          )}&body=${encodeURIComponent(
                            `Hello,\n\nWe are following up regarding your issue report:\n"${report.report_description}"\n\nBest regards,\nCampusly Support Team`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#131C28] dark:hover:bg-[#1C2636] text-slate-600 dark:text-slate-300 transition cursor-pointer"
                          title="Reply via Email"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Report Inspection Modal */}
      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-white dark:bg-[#0E1520] border border-slate-200 dark:border-[#1E293B] rounded-3xl shadow-2xl p-6 sm:p-7 text-slate-900 dark:text-white"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800/60">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Report Ticket Details
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      ID: {selectedReport.id}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#152030] transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status and Timestamp Bar */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-[#121B27] border border-slate-200/80 dark:border-[#1E293B] mb-4">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                    Current Status
                  </span>
                  <div className="mt-1">{renderStatusBadge(selectedReport.status)}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                    Submitted Date
                  </span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 block">
                    {formatDate(selectedReport.created_at)}
                  </span>
                </div>
              </div>

              {/* User Email Info */}
              <div className="mb-4">
                <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1.5">
                  Student / User Contact Email
                </label>
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#121B27] border border-slate-200/80 dark:border-[#1E293B] rounded-2xl">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {selectedReport.email}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyEmail(selectedReport.email)}
                    className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedEmail === selectedReport.email ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Issue Description */}
              <div className="mb-5">
                <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1.5">
                  Issue / Problem Description
                </label>
                <div className="p-4 bg-slate-50 dark:bg-[#121B27] border border-slate-200/80 dark:border-[#1E293B] rounded-2xl text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
                  {selectedReport.report_description}
                </div>
              </div>

              {/* Quick Status Changers */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/80 dark:border-[#1E293B]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Mark as:</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedReport.id, 'pending')}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold cursor-pointer transition ${
                      selectedReport.status === 'pending'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-100 dark:bg-[#141E2B] text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedReport.id, 'in_progress')}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold cursor-pointer transition ${
                      selectedReport.status === 'in_progress'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-[#141E2B] text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    In Progress
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedReport.id, 'resolved')}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold cursor-pointer transition ${
                      selectedReport.status === 'resolved'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-[#141E2B] text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    Resolved
                  </button>
                </div>

                <a
                  href={`mailto:${encodeURIComponent(selectedReport.email)}?subject=${encodeURIComponent(
                    'Update on your Campusly Issue Report'
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send Email</span>
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
