import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { apiRequest } from '../../utils/api';
import { isFeatureEnabled } from '../../config/features';
import { UnderImprovementNotice } from '../ui/UnderImprovementNotice';
import {
  Brain,
  Calendar,
  Sparkles,
  BookOpen,
  Send,
  CheckSquare,
  FileText,
  HelpCircle,
  Layers,
  ArrowRight,
  RefreshCw,
  Plus,
  Wrench,
} from 'lucide-react';
import { motion } from 'motion/react';

export const AIToolsHub: React.FC = () => {
  const { subjects, addTask, showToast, setActiveTab } = useApp();

  const isRevisionAiEnabled = isFeatureEnabled('FEATURE_REVISION_AI_ENABLED');

  // Active sub-tool
  const [activeTool, setActiveTool] = useState<'study_plan' | 'academic_tutor' | 'summary'>('study_plan');

  // Study Plan Generator State
  const [examDate, setExamDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [dailyHours, setDailyHours] = useState(4);
  const [studyPlanSubjects, setStudyPlanSubjects] = useState<string[]>([]);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<{
    summary?: string;
    dailyBlocks?: { day: string; topic: string; subject: string; durationMins: number; strategy: string }[];
  } | null>(null);

  // Academic Tutor State
  const [question, setQuestion] = useState('');
  const [tutorSubject, setTutorSubject] = useState('');
  const [isTutorLoading, setIsTutorLoading] = useState(false);
  const [tutorResponse, setTutorResponse] = useState<string | null>(null);

  // Handle Generate Study Plan
  const handleGenerateStudyPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRevisionAiEnabled) {
      showToast('Revision AI features are temporarily under improvement.', 'info');
      return;
    }
    setIsGeneratingPlan(true);
    try {
      const result = await apiRequest<{ plan: any }>('/api/ai/study-planner', {
        method: 'POST',
        body: JSON.stringify({
          subjects: studyPlanSubjects.length > 0 ? studyPlanSubjects : subjects.map((s) => s.name),
          examDate,
          dailyAvailableHours: dailyHours,
        }),
      });

      setGeneratedPlan(result.plan);
      showToast('AI Study revision schedule generated!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to generate study plan', 'error');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // Convert AI plan blocks into Planner Tasks
  const handleAddPlanToTasks = async () => {
    if (!generatedPlan?.dailyBlocks) return;
    try {
      for (const block of generatedPlan.dailyBlocks) {
        await addTask({
          title: `Study ${block.subject}: ${block.topic}`,
          description: `Strategy: ${block.strategy} (${block.durationMins}m)`,
          dueDate: examDate,
          priority: 'high',
        });
      }
      showToast('All revision sessions added to your planner tasks!', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Ask Tutor
  const handleAskTutor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRevisionAiEnabled) {
      showToast('AI Academic Tutor is temporarily under improvement.', 'info');
      return;
    }
    if (!question.trim()) return;

    setIsTutorLoading(true);
    try {
      const result = await apiRequest<{ explanation: string }>('/api/ai/academic-assist', {
        method: 'POST',
        body: JSON.stringify({
          question: question.trim(),
          subject: tutorSubject || undefined,
        }),
      });

      setTutorResponse(result.explanation);
      showToast('Tutor explanation ready!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to consult AI tutor', 'error');
    } finally {
      setIsTutorLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-[#F8FAFC]">
              AI Academic Hub
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-black uppercase">
              AI Tools
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] mt-1">
            Accelerate your university study workflow with purpose-built AI learning tools.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('ai-assistant')}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Launch AI Study Assistant</span>
        </button>
      </div>

      {/* Under Improvement Notice when Revision AI is disabled */}
      {!isRevisionAiEnabled && (
        <UnderImprovementNotice type="revision" />
      )}

      {/* Tool Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200/80 dark:border-[#1E293B] pb-3">
        <button
          id="ai-tool-tab-study-plan"
          onClick={() => setActiveTool('study_plan')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTool === 'study_plan'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white dark:bg-[#0B1017] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#1E293B]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>AI Revision Timetable</span>
          {!isRevisionAiEnabled && (
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-950/80 text-blue-400 border border-blue-500/30">
              Soon
            </span>
          )}
        </button>

        <button
          id="ai-tool-tab-tutor"
          onClick={() => setActiveTool('academic_tutor')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTool === 'academic_tutor'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white dark:bg-[#0B1017] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#1E293B]'
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          <span>AI Academic Tutor</span>
          {!isRevisionAiEnabled && (
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-950/80 text-blue-400 border border-blue-500/30">
              Soon
            </span>
          )}
        </button>

        <button
          id="ai-tool-tab-notes"
          onClick={() => setActiveTool('summary')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTool === 'summary'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white dark:bg-[#0B1017] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#1E293B]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Upcoming Tools</span>
        </button>
      </div>

      {/* Tool 1: AI Study Schedule Planner */}
      {activeTool === 'study_plan' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">Exam Revision Planner</h3>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Generate an optimal study schedule leading up to exams</p>
                </div>
              </div>

              {!isRevisionAiEnabled && (
                <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-500/30 text-blue-400 text-xs font-black uppercase">
                  <Wrench className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                  Under Improvement
                </span>
              )}
            </div>

            <form onSubmit={handleGenerateStudyPlan} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Target Exam / Deadline Date
                  </label>
                  <input
                    id="plan-exam-date"
                    type="date"
                    disabled={!isRevisionAiEnabled}
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-2xl text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Daily Study Capacity (Hours)
                  </label>
                  <select
                    id="plan-daily-hours"
                    value={dailyHours}
                    disabled={!isRevisionAiEnabled}
                    onChange={(e) => setDailyHours(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-2xl text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value={2}>2 Hours / day (Moderate revision)</option>
                    <option value={4}>4 Hours / day (Standard exam prep)</option>
                    <option value={6}>6 Hours / day (Intensive finals sprint)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Select Subjects to Include
                </label>
                <div className="flex flex-wrap gap-2">
                  {subjects.map((sub) => {
                    const isSelected = studyPlanSubjects.includes(sub.name);
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        disabled={!isRevisionAiEnabled}
                        onClick={() => {
                          if (isSelected) {
                            setStudyPlanSubjects(studyPlanSubjects.filter((s) => s !== sub.name));
                          } else {
                            setStudyPlanSubjects([...studyPlanSubjects, sub.name]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 dark:bg-[#101823] border-slate-200 dark:border-[#1E293B] text-slate-700 dark:text-slate-300'
                        } ${!isRevisionAiEnabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        {sub.name}
                      </button>
                    );
                  })}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {studyPlanSubjects.length === 0 ? 'All enrolled subjects will be balanced evenly.' : `${studyPlanSubjects.length} subjects selected.`}
                </span>
              </div>

              <div className="pt-2">
                {isRevisionAiEnabled ? (
                  <button
                    id="generate-plan-submit-btn"
                    type="submit"
                    disabled={isGeneratingPlan}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isGeneratingPlan ? 'Creating Personalized Schedule...' : 'Generate AI Study Schedule'}
                  </button>
                ) : (
                  <button
                    id="generate-plan-disabled-btn"
                    type="button"
                    disabled={true}
                    className="px-6 py-3 bg-slate-100 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] text-slate-400 dark:text-slate-500 rounded-2xl font-bold text-xs cursor-not-allowed flex items-center gap-2"
                  >
                    <Wrench className="w-4 h-4 text-blue-400/60" />
                    <span>Currently Unavailable</span>
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Generated Plan Output */}
          {generatedPlan && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-3xl bg-white dark:bg-[#0B1017] border border-blue-200 dark:border-blue-800/80 shadow-md space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#1E293B]">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">Your Optimized Study Plan</h4>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8]">{generatedPlan.summary || 'Balanced daily intervals'}</p>
                </div>
                <button
                  id="save-plan-as-tasks-btn"
                  onClick={handleAddPlanToTasks}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Add All as Tasks to Planner</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {generatedPlan.dailyBlocks?.map((block, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#101823]/70 border border-slate-200/80 dark:border-[#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          {block.subject}
                        </span>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC]">{block.topic}</h5>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-[#94A3B8]">{block.strategy}</p>
                    </div>
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400 shrink-0">
                      {block.durationMins} mins
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Tool 2: AI Academic Tutor */}
      {activeTool === 'academic_tutor' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">AI Academic Tutor</h3>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Ask questions, explain complex theories, or get exam tips</p>
                </div>
              </div>

              {!isRevisionAiEnabled && (
                <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-500/30 text-blue-400 text-xs font-black uppercase">
                  <Wrench className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                  Under Improvement
                </span>
              )}
            </div>

            <form onSubmit={handleAskTutor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Subject Context
                </label>
                <input
                  id="tutor-subject-input"
                  type="text"
                  disabled={!isRevisionAiEnabled}
                  placeholder="e.g. Database Systems, Financial Accounting, Organic Chemistry"
                  value={tutorSubject}
                  onChange={(e) => setTutorSubject(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-2xl text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Your Academic Question or Topic *
                </label>
                <textarea
                  id="tutor-question-input"
                  rows={3}
                  required
                  disabled={!isRevisionAiEnabled}
                  placeholder="e.g. Explain Third Normal Form (3NF) vs BCNF with a real-life student database example."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-[#F8FAFC] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              {isRevisionAiEnabled ? (
                <button
                  id="ask-tutor-submit-btn"
                  type="submit"
                  disabled={isTutorLoading || !question.trim()}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  {isTutorLoading ? 'Consulting Gemini Tutor...' : 'Get Clear Academic Explanation'}
                </button>
              ) : (
                <button
                  id="ask-tutor-disabled-btn"
                  type="button"
                  disabled={true}
                  className="px-6 py-3 bg-slate-100 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] text-slate-400 dark:text-slate-500 rounded-2xl font-bold text-xs cursor-not-allowed flex items-center gap-2"
                >
                  <Wrench className="w-4 h-4 text-blue-400/60" />
                  <span>Currently Unavailable</span>
                </button>
              )}
            </form>
          </div>

          {/* Tutor Response */}
          {tutorResponse && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-3xl bg-white dark:bg-[#0B1017] border border-blue-200 dark:border-blue-800/80 shadow-md space-y-3"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h4 className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Tutor Explanation
                </h4>
              </div>
              <div className="text-xs sm:text-sm text-slate-800 dark:text-[#F8FAFC] whitespace-pre-line leading-relaxed">
                {tutorResponse}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Tool 3: Upcoming Tools Showcase */}
      {activeTool === 'summary' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] space-y-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">PDF Research Paper Summarizer</h4>
            <p className="text-xs text-slate-400">Upload assignment slides or research papers to get 1-page structured executive summaries.</p>
            <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600">Coming Next</span>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold">
              <HelpCircle className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">Active Recall Quiz Generator</h4>
            <p className="text-xs text-slate-400">Generate 10 multiple-choice flash questions from any lecture notes to test retention.</p>
            <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600">Coming Next</span>
          </div>
        </div>
      )}
    </div>
  );
};
