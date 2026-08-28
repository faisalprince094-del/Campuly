import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { ExpenseCategory } from '../../types';
import { apiRequest } from '../../utils/api';
import {
  Wallet,
  Receipt,
  PiggyBank,
  Sparkles,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Utensils,
  Bus,
  GraduationCap,
  Film,
  ShoppingBag,
  MoreHorizontal,
  RefreshCw,
} from 'lucide-react';
import { motion } from 'motion/react';

const CATEGORY_META: Record<ExpenseCategory, { label: string; icon: any; color: string; bg: string }> = {
  food: { label: 'Food & Dining', icon: Utensils, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/40' },
  transport: { label: 'Transport', icon: Bus, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/40' },
  education: { label: 'Books & Edu', icon: GraduationCap, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-950/40' },
  entertainment: { label: 'Entertainment', icon: Film, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/40' },
  shopping: { label: 'Shopping', icon: ShoppingBag, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
  bills: { label: 'Bills & Fees', icon: Receipt, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/40' },
  other: { label: 'Other', icon: MoreHorizontal, color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-[#101823]' },
};

export const FinanceSection: React.FC = () => {
  const {
    subTab,
    setSubTab,
    expenses,
    budget,
    updateBudget,
    deleteExpense,
    setIsAddExpenseOpen,
    formatCurrency,
    showToast,
  } = useApp();

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [newBudgetAmount, setNewBudgetAmount] = useState<number>(budget?.monthlyBudget || budget?.monthlyLimit || 8000);
  const [aiInsights, setAiInsights] = useState<{ summary?: string; tips?: string[]; categoryBreakdown?: string } | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Month spending calculations
  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  const todayIso = now.toISOString().split('T')[0];

  const monthExpenses = useMemo(() => {
    return (expenses || []).filter((e) => Boolean(e?.date && e.date.startsWith(currentMonthPrefix)));
  }, [expenses, currentMonthPrefix]);

  const totalMonthSpent = useMemo(() => {
    return monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [monthExpenses]);

  const monthlyBudgetLimit = budget?.monthlyBudget || budget?.monthlyLimit || 8000;
  const remainingBudget = monthlyBudgetLimit - totalMonthSpent;
  const budgetSpentPercent = Math.min(100, Math.round((totalMonthSpent / monthlyBudgetLimit) * 100));
  const isNearLimit = budgetSpentPercent >= 80;
  const isOverBudget = remainingBudget < 0;

  // Category breakdown
  const categoryTotals = useMemo(() => {
    const totals: Record<ExpenseCategory, number> = {
      food: 0,
      transport: 0,
      education: 0,
      entertainment: 0,
      shopping: 0,
      bills: 0,
      other: 0,
    };
    monthExpenses.forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + Number(e.amount);
    });
    return totals;
  }, [monthExpenses]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    if (filterCategory === 'all') return expenses;
    return expenses.filter((e) => e.category === filterCategory);
  }, [expenses, filterCategory]);

  // Handle Update Monthly Budget
  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateBudget({
        monthlyBudget: newBudgetAmount,
        monthlyLimit: newBudgetAmount,
        monthYear: currentMonthPrefix,
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Handle AI Insights fetch
  const handleFetchAiInsights = async () => {
    setIsGeneratingAi(true);
    try {
      const result = await apiRequest<{ analysis: any }>('/api/ai/financial-insights', {
        method: 'POST',
        body: JSON.stringify({
          expenses: monthExpenses,
          budget: { monthlyLimit: monthlyBudgetLimit },
        }),
      });
      setAiInsights(result.analysis);
      showToast('AI financial audit generated!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to analyze spending', 'error');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-[#F8FAFC]">
            Student Finance & Budget
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] mt-1">
            Track daily expenses in 3 seconds, control monthly allowances, and receive AI budgeting tips.
          </p>
        </div>

        {/* Sub-tab pills */}
        <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs">
          {[
            { id: 'overview', label: 'Overview', icon: Wallet },
            { id: 'transactions', label: 'Transactions', icon: Receipt },
            { id: 'budget', label: 'Budget Settings', icon: PiggyBank },
            { id: 'ai-insights', label: 'AI Insights', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = subTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`finance-tab-${tab.id}`}
                onClick={() => setSubTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* -------------------------------------------------------------
          SUB-TAB 1: OVERVIEW
         ------------------------------------------------------------- */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          {/* Main Budget Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Monthly Budget</span>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-[#F8FAFC] mt-1">
                  {formatCurrency(totalMonthSpent)}{' '}
                  <span className="text-sm font-semibold text-slate-400">
                    / {formatCurrency(monthlyBudgetLimit)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  id="add-expense-finance-btn"
                  onClick={() => setIsAddExpenseOpen(true)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-blue-500/25 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Expense</span>
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className={isOverBudget ? 'text-rose-600' : isNearLimit ? 'text-amber-600' : 'text-slate-600 dark:text-slate-300'}>
                  {isOverBudget ? 'Over Budget by ' + formatCurrency(Math.abs(remainingBudget)) : `${budgetSpentPercent}% used`}
                </span>
                <span className="text-slate-500">
                  {remainingBudget >= 0 ? `${formatCurrency(remainingBudget)} remaining` : 'Limit reached'}
                </span>
              </div>
              <div className="w-full h-3.5 bg-slate-100 dark:bg-[#101823] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isOverBudget
                      ? 'bg-rose-500'
                      : isNearLimit
                      ? 'bg-amber-500'
                      : 'bg-gradient-to-r from-blue-600 to-sky-500'
                  }`}
                  style={{ width: `${Math.min(100, budgetSpentPercent)}%` }}
                />
              </div>
            </div>

            {/* Alert banner if over 80% */}
            {isNearLimit && (
              <div className={`p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold ${
                isOverBudget
                  ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                  : 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
              }`}>
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  {isOverBudget
                    ? 'You have exceeded your monthly student allowance.'
                    : 'Caution: You have used over 80% of your monthly budget.'}
                </span>
              </div>
            )}
          </div>

          {/* Category Breakdown Cards */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] mb-3">Spending by Category</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(Object.keys(CATEGORY_META) as ExpenseCategory[]).map((cat) => {
                const meta = CATEGORY_META[cat];
                const Icon = meta.icon;
                const spent = categoryTotals[cat] || 0;
                const percentOfTotal = totalMonthSpent > 0 ? Math.round((spent / totalMonthSpent) * 100) : 0;

                return (
                  <div
                    key={cat}
                    className="p-4 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-8 h-8 rounded-xl ${meta.bg} ${meta.color} flex items-center justify-center`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">{percentOfTotal}%</span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC]">{meta.label}</div>
                      <div className="text-sm font-black text-slate-900 dark:text-[#F8FAFC] mt-0.5">{formatCurrency(spent)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          SUB-TAB 2: TRANSACTIONS LIST
         ------------------------------------------------------------- */}
      {subTab === 'transactions' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-[#1E293B]">
            <h3 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">Recent Transactions</h3>

            {/* Filter buttons */}
            <div className="flex flex-wrap gap-1.5">
              {['all', 'food', 'transport', 'education', 'shopping'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterCategory(f)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold uppercase transition cursor-pointer ${
                    filterCategory === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-[#101823] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">
                No recorded expenses in this filter.
              </div>
            ) : (
              filteredTransactions.map((exp) => {
                const meta = CATEGORY_META[exp.category] || CATEGORY_META.other;
                const Icon = meta.icon;

                return (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-[#101823]/60 border border-slate-200/80 dark:border-[#1E293B] group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl ${meta.bg} ${meta.color} flex items-center justify-center font-bold`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC]">{exp.description}</div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {exp.date} • <span className="capitalize">{meta.label}</span> {exp.note ? `• ${exp.note}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-slate-900 dark:text-[#F8FAFC]">
                        -{formatCurrency(exp.amount)}
                      </span>
                      <button
                        id={`delete-exp-${exp.id}`}
                        onClick={() => deleteExpense(exp.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        title="Delete transaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          SUB-TAB 3: BUDGET SETTINGS
         ------------------------------------------------------------- */}
      {subTab === 'budget' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs space-y-6 max-w-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold">
              <PiggyBank className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">Monthly Allowance & Target</h3>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Set your student budget limit to trigger timely warning alerts</p>
            </div>
          </div>

          <form onSubmit={handleSaveBudget} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Monthly Spending Limit
              </label>
              <input
                id="budget-limit-input"
                type="number"
                value={newBudgetAmount}
                onChange={(e) => setNewBudgetAmount(Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-2xl text-base font-bold text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              id="save-budget-btn"
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition cursor-pointer"
            >
              Update Budget
            </button>
          </form>
        </div>
      )}

      {/* -------------------------------------------------------------
          SUB-TAB 4: AI FINANCIAL INSIGHTS
         ------------------------------------------------------------- */}
      {subTab === 'ai-insights' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">AI Financial Copilot</h3>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Analyze current spending trends and spot student savings opportunities</p>
                </div>
              </div>

              <button
                id="generate-ai-finance-btn"
                onClick={handleFetchAiInsights}
                disabled={isGeneratingAi}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                {isGeneratingAi ? 'Analyzing Spend...' : 'Run Financial Audit'}
              </button>
            </div>
          </div>

          {aiInsights && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-3xl bg-white dark:bg-[#0B1017] border border-blue-200 dark:border-blue-800/80 shadow-md space-y-4"
            >
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
                  Summary Analysis
                </h4>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                  {aiInsights.summary}
                </p>
              </div>

              {aiInsights.tips && aiInsights.tips.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#1E293B]">
                  <h4 className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
                    Actionable Student Savings Tips
                  </h4>
                  <div className="space-y-2">
                    {aiInsights.tips.map((tip, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};
