import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Moon,
  Sun,
  DollarSign,
  Shield,
  RotateCcw,
  Database,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, updateProfile, theme, setTheme, resetToDefaultData, logout, showToast } = useApp();

  const [currencySymbol, setCurrencySymbol] = useState(user?.preferences?.currencySymbol || '৳');
  const [studyGoal, setStudyGoal] = useState(user?.preferences?.dailyStudyGoalMinutes || 240);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({
        preferences: {
          ...(user?.preferences || { notifications: true, onboardingCompleted: true, weekStartsOn: 0 }),
          currencySymbol,
          dailyStudyGoalMinutes: studyGoal,
          theme,
        },
      });
      showToast('Settings saved successfully.', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fadeIn">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-[#F8FAFC]">
          Settings & Preferences
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] mt-1">
          Customize currency formatting, focus targets, and local data persistence.
        </p>
      </div>

      <form onSubmit={handleSavePreferences} className="space-y-6">
        {/* Appearance Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">Theme & Appearance</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              id="theme-btn-light"
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center justify-center gap-2.5 p-3.5 rounded-2xl border transition cursor-pointer ${
                theme === 'light'
                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 text-blue-700 dark:text-blue-300 font-bold'
                  : 'bg-slate-50 dark:bg-[#101823] border-slate-200 dark:border-[#1E293B] text-slate-600 dark:text-slate-400'
              }`}
            >
              <Sun className="w-4 h-4" />
              <span className="text-xs">Light Mode</span>
            </button>

            <button
              id="theme-btn-dark"
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-center gap-2.5 p-3.5 rounded-2xl border transition cursor-pointer ${
                theme === 'dark'
                  ? 'bg-blue-950/60 border-blue-500 text-blue-300 font-bold'
                  : 'bg-slate-50 dark:bg-[#101823] border-slate-200 dark:border-[#1E293B] text-slate-600 dark:text-slate-400'
              }`}
            >
              <Moon className="w-4 h-4" />
              <span className="text-xs">Dark Mode</span>
            </button>
          </div>
        </div>

        {/* Currency & Academic Preferences */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">Currency & Study Targets</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Currency Symbol
              </label>
              <select
                id="currency-select"
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-2xl text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="৳">৳ BDT (Bangladeshi Taka)</option>
                <option value="$">$ USD (US Dollar)</option>
                <option value="€">€ EUR (Euro)</option>
                <option value="£">£ GBP (British Pound)</option>
                <option value="₹">₹ INR (Indian Rupee)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Daily Study Target
              </label>
              <select
                id="study-target-select"
                value={studyGoal}
                onChange={(e) => setStudyGoal(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-2xl text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={120}>2 Hours / day (120 mins)</option>
                <option value={180}>3 Hours / day (180 mins)</option>
                <option value={240}>4 Hours / day (240 mins - Recommended)</option>
                <option value={360}>6 Hours / day (360 mins - Intensive)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            id="save-settings-submit-btn"
            type="submit"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition cursor-pointer"
          >
            Save Preferences
          </button>
        </div>
      </form>

      {/* Local Storage & Data Management */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">Local Storage & Reset</h3>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC]">Device Persistence</h4>
            <p className="text-[11px] text-slate-400">All student data is securely isolated and saved automatically to your device.</p>
          </div>

          <button
            id="reset-data-btn"
            type="button"
            onClick={resetToDefaultData}
            className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-[#131C28] dark:hover:bg-[#1C2636] text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>

      {/* Account & Session Sign Out */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1017] border border-rose-200/70 dark:border-rose-950/70 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">Account & Session Security</h3>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC]">Signed In as {user?.email}</h4>
            <p className="text-[11px] text-slate-400">Sign out securely from this browser session.</p>
          </div>

          <button
            id="settings-logout-btn"
            type="button"
            onClick={logout}
            className="px-5 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-900/60 transition flex items-center gap-2 cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Sign Out of Campusly</span>
          </button>
        </div>
      </div>
    </div>
  );
};
