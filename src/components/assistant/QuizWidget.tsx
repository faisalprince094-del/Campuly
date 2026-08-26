import React, { useState } from 'react';
import { QuizData } from '../../types';
import { CheckCircle2, XCircle, HelpCircle, RotateCcw, Trophy, Award } from 'lucide-react';

interface QuizWidgetProps {
  quiz: QuizData;
}

export const QuizWidget: React.FC<QuizWidgetProps> = ({ quiz }) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSelectOption = (questionId: number, optionIndex: number) => {
    if (submitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const answeredCount = Object.keys(selectedAnswers).length;
  const totalQuestions = quiz.questions?.length || 0;

  // Calculate score
  const correctCount = quiz.questions?.reduce((acc, q) => {
    return selectedAnswers[q.id] === q.correctAnswer ? acc + 1 : acc;
  }, 0) || 0;

  const handleReset = () => {
    setSelectedAnswers({});
    setSubmitted(false);
  };

  return (
    <div className="mt-4 rounded-2xl bg-white dark:bg-[#101823] border border-slate-200/80 dark:border-[#1E293B] p-4 sm:p-5 shadow-xs transition-colors">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-[#1E293B]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">
              {quiz.title || 'Interactive Practice Quiz'}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-[#94A3B8]">
              {totalQuestions} Multiple-Choice Questions • Select your answers below
            </p>
          </div>
        </div>

        {submitted ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />
              Score: {correctCount} / {totalQuestions} ({Math.round((correctCount / totalQuestions) * 100)}%)
            </span>
            <button
              onClick={handleReset}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E293B] transition cursor-pointer"
              title="Retake Quiz"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
            {answeredCount} of {totalQuestions} answered
          </span>
        )}
      </div>

      {/* Questions list */}
      <div className="space-y-4 pt-4">
        {quiz.questions?.map((q, qIndex) => {
          const userChoice = selectedAnswers[q.id];
          const isAnswered = userChoice !== undefined;
          const isCorrect = userChoice === q.correctAnswer;

          return (
            <div
              key={q.id || qIndex}
              className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-[#0B1017] border border-slate-200/60 dark:border-[#1E293B]"
            >
              <div className="flex items-start gap-2.5 mb-3">
                <span className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {qIndex + 1}
                </span>
                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">
                  {q.question}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-2 pl-7">
                {q.options?.map((opt, optIndex) => {
                  const isSelected = userChoice === optIndex;
                  const isOptionCorrect = optIndex === q.correctAnswer;

                  let optionStyle = 'bg-white dark:bg-[#101823] border-slate-200/80 dark:border-[#1E293B] text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-700';

                  if (submitted) {
                    if (isOptionCorrect) {
                      optionStyle = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-300 font-medium';
                    } else if (isSelected && !isOptionCorrect) {
                      optionStyle = 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-900 dark:text-rose-300';
                    }
                  } else if (isSelected) {
                    optionStyle = 'bg-blue-50 dark:bg-blue-950/50 border-blue-600 text-blue-900 dark:text-blue-200 font-semibold';
                  }

                  const optionLetters = ['A', 'B', 'C', 'D'];

                  return (
                    <button
                      key={optIndex}
                      onClick={() => handleSelectOption(q.id, optIndex)}
                      disabled={submitted}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs sm:text-sm text-left transition cursor-pointer ${optionStyle}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {optionLetters[optIndex] || optIndex + 1}
                        </span>
                        <span>{opt}</span>
                      </div>

                      {submitted && isOptionCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                      {submitted && isSelected && !isOptionCorrect && (
                        <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation (Shown when submitted) */}
              {submitted && (
                <div className={`mt-3 ml-7 p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                  isCorrect
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                    : 'bg-amber-50/70 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                }`}>
                  <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">{isCorrect ? 'Correct!' : 'Explanation:'} </span>
                    <span>{q.explanation}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Submit / Check Score */}
      {!submitted && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#1E293B] flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
            {answeredCount === totalQuestions
              ? 'All questions answered! Click submit to check your score.'
              : `Please answer remaining ${totalQuestions - answeredCount} questions.`}
          </p>
          <button
            onClick={() => setSubmitted(true)}
            disabled={answeredCount === 0}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            Submit & View Score
          </button>
        </div>
      )}
    </div>
  );
};
