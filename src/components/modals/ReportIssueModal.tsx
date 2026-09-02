import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SUPABASE_ANON_KEY } from '../../supabase';
import {
  AlertCircle,
  X,
  Send,
  Loader2,
  Mail,
  FileText,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ReportIssueModal: React.FC = () => {
  const { user, isReportModalOpen, setIsReportModalOpen, showToast } = useApp();

  const [userEmail, setUserEmail] = useState<string>('');
  const [descriptionText, setDescriptionText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pre-fill email when user is logged in or modal opens
  useEffect(() => {
    if (isReportModalOpen) {
      if (user?.email) {
        setUserEmail(user.email);
      }
      setErrorMessage(null);
    }
  }, [isReportModalOpen, user]);

  if (!isReportModalOpen) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    setIsReportModalOpen(false);
    setDescriptionText('');
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const emailToSubmit = (userEmail || user?.email || '').trim().toLowerCase();
    const textToSubmit = descriptionText.trim();

    if (!emailToSubmit || !emailToSubmit.includes('@')) {
      setErrorMessage('Please provide a valid contact email address.');
      return;
    }

    if (!textToSubmit || textToSubmit.length < 5) {
      setErrorMessage('Please describe the issue in at least 5 characters.');
      return;
    }

    setIsSubmitting(true);

    fetch("https://pixypjmyouyxauzczyaq.supabase.co/rest/v1/user_reports", {
      method: "POST",
      headers: {
        "apikey": "sb_publishable_CCUx-FLmFHp3jCiAVuV1kw_mOKsaMXI",
        "Authorization": "Bearer sb_publishable_CCUx-FLmFHp3jCiAVuV1kw_mOKsaMXI",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({
        email: emailToSubmit,
        report_description: textToSubmit
      })
    })
      .then(async (res) => {
        if (!res.ok) {
          const errBody = await res.text().catch(() => "");
          throw new Error(errBody || "Failed to submit to Supabase");
        }
        alert("Report successfully submitted to Supabase!");
        showToast("Report successfully submitted to Supabase!", "success");
        setDescriptionText("");
        setIsReportModalOpen(false);
      })
      .catch((err) => {
        alert("Submission error: " + err.message);
        setErrorMessage(err.message || "Failed to submit report to Supabase.");
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-lg bg-white dark:bg-[#0E1520] border border-slate-200 dark:border-[#1E293B] rounded-3xl shadow-2xl p-6 sm:p-7 text-slate-900 dark:text-white"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/80 dark:border-amber-800/60 shadow-xs">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  Report an Issue
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Notify the Campusly technical support and admin team.
                </p>
              </div>
            </div>

            <button
              id="close-report-modal-btn"
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#152030] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Your Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="report-issue-email-input"
                  type="email"
                  required
                  placeholder="e.g., student@university.edu"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#121B27] border border-slate-200 dark:border-[#1E293B] rounded-2xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                We'll use this email to follow up on your report.
              </p>
            </div>

            {/* Description Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Issue Description <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <textarea
                  id="report-issue-description-input"
                  required
                  rows={4}
                  placeholder="Please describe what happened, what went wrong, or what you were trying to do..."
                  value={descriptionText}
                  onChange={(e) => setDescriptionText(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full p-3.5 bg-slate-50 dark:bg-[#121B27] border border-slate-200 dark:border-[#1E293B] rounded-2xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition resize-none leading-relaxed"
                />
              </div>
              <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                <span>Directly synced with dedicated Supabase support tables.</span>
                <span>{descriptionText.length} characters</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                id="cancel-report-btn"
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#152030] transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                id="submit-report-btn"
                type="submit"
                disabled={isSubmitting || !descriptionText.trim()}
                className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-amber-600/20 active:scale-95 transition flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting Report...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Report</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
