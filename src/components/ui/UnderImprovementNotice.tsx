import React from 'react';
import { Sparkles, Wrench, ArrowRight, Brain, Presentation, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';

interface UnderImprovementNoticeProps {
  type: 'presentation' | 'revision' | 'custom';
  title?: string;
  subtitle?: string;
  description?: string;
  badgeText?: string;
  showAssistantAlternative?: boolean;
}

export const UnderImprovementNotice: React.FC<UnderImprovementNoticeProps> = ({
  type,
  title,
  subtitle,
  description,
  badgeText = 'Under Improvement',
  showAssistantAlternative = true,
}) => {
  const { setActiveTab } = useApp();

  const content = {
    presentation: {
      title: 'AI Presentation Maker',
      icon: Sparkles,
      tag: '✨ AI Presentation Maker',
      subtitle: 'Temporarily unavailable',
      description:
        "We're improving the AI presentation generation system to provide more accurate, structured, and high-quality presentations. This feature will return with improved AI generation.",
    },
    revision: {
      title: 'Revision AI',
      icon: Brain,
      tag: '🧠 Revision AI',
      subtitle: 'Temporarily unavailable',
      description:
        "We're improving this AI tool to provide more accurate answers, better explanations, and more reliable revision materials. This feature will return after improvement.",
    },
    custom: {
      title: title || 'AI Tool',
      icon: Sparkles,
      tag: title || 'AI Feature',
      subtitle: subtitle || 'Temporarily unavailable',
      description: description || "We're currently enhancing this feature with improved model accuracy.",
    },
  }[type];

  const Icon = content.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl bg-slate-900/90 dark:bg-[#0B1017] border border-blue-500/20 text-slate-100 shadow-[0_0_35px_rgba(37,99,235,0.1)] p-6 sm:p-10"
    >
      {/* Subtle ambient electric blue glow effect */}
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-6 max-w-2xl">
        {/* Badges & Status */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide uppercase bg-blue-950/80 border border-blue-500/30 text-blue-400 shadow-sm">
            <Wrench className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span>{badgeText}</span>
          </span>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800/80 border border-slate-700/60 text-slate-300">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Returning Soon</span>
          </span>
        </div>

        {/* Header content */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Icon className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {content.tag}
            </h2>
          </div>

          <p className="text-sm sm:text-base font-bold text-blue-400">
            {subtitle || content.subtitle}
          </p>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-1">
            {description || content.description}
          </p>
        </div>

        {/* Helpful Alternative Action */}
        {showAssistantAlternative && (
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              id="notice-open-assistant-btn"
              onClick={() => setActiveTab('ai-assistant')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Brain className="w-4 h-4" />
              <span>Use Active AI Study Assistant</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-80" />
            </button>
            <span className="text-[11px] text-slate-400">
              Instant tutoring, concepts, quizzes & flashcards
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
