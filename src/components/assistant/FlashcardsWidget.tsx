import React, { useState } from 'react';
import { FlashcardDeck } from '../../types';
import {
  Layers,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  HelpCircle,
  Shuffle,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FlashcardsWidgetProps {
  deck: FlashcardDeck;
}

export const FlashcardsWidget: React.FC<FlashcardsWidgetProps> = ({ deck }) => {
  const cards = deck.cards || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);

  if (cards.length === 0) return null;

  const currentCard = cards[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setShowHint(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setShowHint(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="mt-4 rounded-2xl bg-white dark:bg-[#101823] border border-slate-200/80 dark:border-[#1E293B] p-4 sm:p-5 shadow-xs transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-[#1E293B]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">
              {deck.title || 'Revision Flashcard Deck'}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-[#94A3B8]">
              {deck.topic || 'Active Recall Deck'} • Click card or button to flip
            </p>
          </div>
        </div>

        <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
          Card {currentIndex + 1} of {cards.length}
        </span>
      </div>

      {/* 3D Flip Card Container */}
      <div className="py-4">
        <div
          onClick={handleFlip}
          className="relative w-full min-h-[220px] sm:min-h-[200px] rounded-2xl cursor-pointer select-none perspective-1000 group transition"
        >
          <div
            className={`w-full min-h-[220px] sm:min-h-[200px] rounded-2xl border transition-all duration-300 p-6 flex flex-col justify-between ${
              isFlipped
                ? 'bg-blue-900/10 dark:bg-blue-950/40 border-blue-500/60 text-slate-900 dark:text-white shadow-md'
                : 'bg-slate-50 dark:bg-[#0B1017] border-slate-200 dark:border-[#1E293B] text-slate-900 dark:text-white hover:border-blue-400 dark:hover:border-blue-600'
            }`}
          >
            {/* Top Indicator */}
            <div className="flex items-center justify-between text-xs font-bold tracking-wider uppercase">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] ${
                isFlipped
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}>
                {isFlipped ? 'Answer / Definition' : 'Question / Term'}
              </span>

              <div className="flex items-center gap-1 text-[11px] text-slate-400 group-hover:text-blue-500 transition">
                <RotateCw className="w-3.5 h-3.5" />
                <span>Flip</span>
              </div>
            </div>

            {/* Content Area */}
            <div className="my-auto py-3 text-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={isFlipped ? 'back' : 'front'}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                >
                  <p className={`font-semibold ${
                    isFlipped
                      ? 'text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed'
                      : 'text-base sm:text-lg text-slate-900 dark:text-[#F8FAFC]'
                  }`}>
                    {isFlipped ? currentCard.back : currentCard.front}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Bottom Hint or Footer */}
            <div className="flex items-center justify-between text-xs">
              {currentCard.hint ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowHint(!showHint);
                  }}
                  className="text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 flex items-center gap-1 transition"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{showHint ? `Hint: ${currentCard.hint}` : 'Show Hint'}</span>
                </button>
              ) : (
                <div />
              )}

              <span className="text-[11px] text-slate-400">
                Space or Click to flip
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#1E293B]">
        <button
          onClick={handlePrev}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#1E293B] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1E293B] transition cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <button
          onClick={handleFlip}
          className="px-4 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>{isFlipped ? 'Show Term' : 'Show Answer'}</span>
        </button>

        <button
          onClick={handleNext}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <span>Next Card</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
