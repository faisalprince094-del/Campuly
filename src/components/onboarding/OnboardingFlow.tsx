import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  GraduationCap,
  BookOpen,
  Wallet,
  Timer,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const OnboardingFlow: React.FC = () => {
  const { user, completeOnboarding, addSubject, updateBudget } = useApp();

  const [step, setStep] = useState(1);
  const [university, setUniversity] = useState(user?.institution || user?.university || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [semester, setSemester] = useState(user?.academicLevel || user?.semester || '');
  const [subjectsList, setSubjectsList] = useState<string[]>([]);
  const [newSubInput, setNewSubInput] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState(user?.preferences?.monthlyBudgetAmount || 0);
  const [currencySymbol, setCurrencySymbol] = useState(user?.preferences?.currencySymbol || '৳');
  const [studyGoal, setStudyGoal] = useState(user?.preferences?.dailyStudyGoalMinutes || 240);

  const handleFinish = async () => {
    try {
      // Save subjects
      for (const s of subjectsList) {
        await addSubject({
          name: s,
          credits: 3,
          color: '#2563EB',
          targetHours: 40,
        }).catch(() => {});
      }

      // Save budget
      await updateBudget({
        monthlyLimit: monthlyBudget,
      }).catch(() => {});

      // Complete onboarding
      await completeOnboarding({
        university,
        department,
        semester,
        preferences: {
          theme: user?.preferences?.theme || 'light',
          currencySymbol,
          dailyStudyGoalMinutes: studyGoal,
        },
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-xl p-8 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xl space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              {step}
            </div>
            <span className="text-xs font-bold text-slate-400">Step {step} of 4</span>
          </div>
          <button
            onClick={handleFinish}
            className="text-xs font-semibold text-slate-400 hover:text-blue-600 transition"
          >
            Skip to App →
          </button>
        </div>

        {/* Step 1: Academic Institution */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-[#F8FAFC]">Welcome to Campusly! 🎓</h2>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">Let's set up your university workspace.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">University Name</label>
                <input
                  type="text"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  placeholder="e.g. University of Dhaka, BUET, NSU"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-2xl text-xs font-semibold text-slate-900 dark:text-[#F8FAFC]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Computer Science & Engineering"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-2xl text-xs font-semibold text-slate-900 dark:text-[#F8FAFC]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Current Semester</label>
                <input
                  type="text"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  placeholder="e.g. 5th Semester / 3rd Year"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-2xl text-xs font-semibold text-slate-900 dark:text-[#F8FAFC]"
                />
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-blue-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Next: Enrolled Subjects</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Step 2: Subjects */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-[#F8FAFC]">Your Current Subjects 📚</h2>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">Add the courses you are taking this semester.</p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newSubInput}
                onChange={(e) => setNewSubInput(e.target.value)}
                placeholder="Add a subject (e.g. Artificial Intelligence)"
                className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-2xl text-xs font-semibold text-slate-900 dark:text-[#F8FAFC]"
              />
              <button
                type="button"
                onClick={() => {
                  if (newSubInput.trim()) {
                    setSubjectsList([...subjectsList, newSubInput.trim()]);
                    setNewSubInput('');
                  }
                }}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-2xl text-xs font-bold cursor-pointer"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {subjectsList.map((s, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800 flex items-center gap-1.5"
                >
                  <span>{s}</span>
                  <button
                    onClick={() => setSubjectsList(subjectsList.filter((_, i) => i !== idx))}
                    className="text-blue-400 hover:text-blue-700 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <button
              onClick={() => setStep(3)}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-blue-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Next: Student Budget</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Step 3: Budget & Currency */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-[#F8FAFC]">Monthly Allowance 💳</h2>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">Set a spending target so Campusly can warn you before overspending.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Currency</label>
                <select
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-2xl text-xs font-semibold text-slate-900 dark:text-[#F8FAFC]"
                >
                  <option value="৳">৳ BDT (Taka)</option>
                  <option value="$">$ USD (Dollar)</option>
                  <option value="€">€ EUR (Euro)</option>
                  <option value="₹">₹ INR (Rupee)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Monthly Budget Limit</label>
                <input
                  type="number"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-2xl text-base font-bold text-slate-900 dark:text-[#F8FAFC]"
                />
              </div>
            </div>

            <button
              onClick={() => setStep(4)}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-blue-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Next: Study Goals</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Step 4: Study Goal */}
        {step === 4 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-[#F8FAFC]">Daily Focus Target 🎯</h2>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">How many hours of focused study do you aim for daily?</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { mins: 120, label: '2 Hours', tag: 'Light' },
                { mins: 240, label: '4 Hours', tag: 'Standard' },
                { mins: 360, label: '6 Hours', tag: 'Intensive' },
              ].map((g) => (
                <button
                  key={g.mins}
                  type="button"
                  onClick={() => setStudyGoal(g.mins)}
                  className={`p-4 rounded-2xl border text-center transition cursor-pointer ${
                    studyGoal === g.mins
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-slate-50 dark:bg-[#101823] border-slate-200 dark:border-[#1E293B] text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="text-sm font-bold">{g.label}</div>
                  <div className="text-[10px] opacity-80 mt-0.5">{g.tag}</div>
                </button>
              ))}
            </div>

            <button
              onClick={handleFinish}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-blue-500/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch Campusly Workspace</span>
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};
