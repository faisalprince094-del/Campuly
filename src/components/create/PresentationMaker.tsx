import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Presentation, Slide } from '../../types';
import { apiRequest } from '../../utils/api';
import { isFeatureEnabled } from '../../config/features';
import { UnderImprovementNotice } from '../ui/UnderImprovementNotice';
import {
  Sparkles,
  Plus,
  Play,
  Download,
  Copy,
  Trash2,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  FileText,
  Volume2,
  Wand2,
  Layout,
  Palette,
  Check,
  RefreshCw,
  Share2,
  BookOpen,
  ArrowLeft,
  Quote,
  TrendingUp,
  Wrench,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Preset presentation themes
const THEMES = [
  { id: 'academic_blue', name: 'Campus Electric Blue', bg: 'bg-[#F8FAFC] dark:bg-[#05070A]', text: 'text-slate-900 dark:text-[#F8FAFC]', accent: '#2563EB', cardBg: 'bg-white dark:bg-[#0B1017]' },
  { id: 'minimal_slate', name: 'Minimal Slate', bg: 'bg-[#F8FAFC] dark:bg-[#0F172A]', text: 'text-slate-900 dark:text-white', accent: '#3B82F6', cardBg: 'bg-white dark:bg-[#1E293B]' },
  { id: 'dark_navy', name: 'Deep Black & Blue', bg: 'bg-[#05070A]', text: 'text-[#F8FAFC]', accent: '#3B82F6', cardBg: 'bg-[#0B1017]' },
  { id: 'emerald_academic', name: 'Emerald Scholar', bg: 'bg-[#F4FAF6] dark:bg-[#0C1A14]', text: 'text-slate-900 dark:text-white', accent: '#10B981', cardBg: 'bg-white dark:bg-[#132B21]' },
  { id: 'warm_amber', name: 'Amber Editorial', bg: 'bg-[#FFFBF5] dark:bg-[#1A1612]', text: 'text-slate-900 dark:text-white', accent: '#F59E0B', cardBg: 'bg-white dark:bg-[#26201A]' },
];

export const PresentationMaker: React.FC = () => {
  const {
    presentations,
    activePresentationId,
    setActivePresentationId,
    savePresentation,
    deletePresentation,
    duplicatePresentation,
    subjects,
    showToast,
    setActiveTab,
  } = useApp();

  const isPresentationAiEnabled = isFeatureEnabled('FEATURE_PRESENTATION_AI_ENABLED');

  // Generator form state
  const [isGenerating, setIsGenerating] = useState(false);
  const [topic, setTopic] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [slideCount, setSlideCount] = useState(6);
  const [language, setLanguage] = useState<'english' | 'bangla'>('english');
  const [style, setStyle] = useState<'academic' | 'minimal' | 'modern' | 'creative'>('academic');
  const [audience, setAudience] = useState('University Class');
  const [tone, setTone] = useState('Educational & Structured');

  // Active Presentation in Studio Editor
  const currentDeck = useMemo(() => {
    return presentations.find((p) => p.id === activePresentationId) || null;
  }, [presentations, activePresentationId]);

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSpeakerNotesInPlay, setShowSpeakerNotesInPlay] = useState(false);
  const [activeThemeId, setActiveThemeId] = useState('academic_blue');

  // AI Slide tools state
  const [isAiRewriting, setIsAiRewriting] = useState(false);
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);

  // Sync active slide index
  useEffect(() => {
    if (currentDeck && activeSlideIndex >= (currentDeck.slides?.length || 1)) {
      setActiveSlideIndex(0);
    }
  }, [currentDeck, activeSlideIndex]);

  // Keyboard navigation for Fullscreen Presentation Mode
  useEffect(() => {
    if (!isFullscreen || !currentDeck) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const slidesLen = currentDeck?.slides?.length || 1;
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        setActiveSlideIndex((prev) => Math.min(prev + 1, slidesLen - 1));
      } else if (e.key === 'ArrowLeft') {
        setActiveSlideIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, currentDeck]);

  // Handle Generate with AI
  const handleGenerateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPresentationAiEnabled) {
      showToast('AI presentation generation is temporarily under improvement.', 'info');
      return;
    }
    if (!topic.trim()) return;

    setIsGenerating(true);
    try {
      const result = await apiRequest<Presentation>('/api/presentations/generate', {
        method: 'POST',
        body: JSON.stringify({
          topic: topic.trim(),
          subjectId: subjectId || undefined,
          slideCount,
          language,
          style,
          audience,
          tone,
        }),
      });

      await savePresentation(result);
      setActivePresentationId(result.id);
      setActiveSlideIndex(0);
      setTopic('');
      showToast('AI Presentation generated with speaker notes!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to generate presentation.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Update slide content locally & save
  const handleUpdateCurrentSlide = (updatedSlide: Partial<Slide>) => {
    if (!currentDeck) return;
    const newSlides = [...currentDeck.slides];
    newSlides[activeSlideIndex] = {
      ...newSlides[activeSlideIndex],
      ...updatedSlide,
    };
    savePresentation({
      ...currentDeck,
      slides: newSlides,
      updatedAt: new Date().toISOString(),
    });
  };

  // Add new slide
  const handleAddSlide = () => {
    if (!currentDeck) return;
    const newSlide: Slide = {
      id: `slide_${Date.now()}`,
      slideNumber: currentDeck.slides.length + 1,
      layout: 'bullet_points',
      title: 'New Slide Title',
      body: 'Slide body explanation',
      bullets: ['Key takeaway point 1', 'Key takeaway point 2', 'Supporting academic evidence'],
      speakerNotes: 'Briefly explain this section to the class audience.',
    };
    const newSlides = [...currentDeck.slides, newSlide];
    savePresentation({
      ...currentDeck,
      slides: newSlides,
    });
    setActiveSlideIndex(newSlides.length - 1);
  };

  // Delete slide
  const handleDeleteSlide = (indexToDelete: number) => {
    if (!currentDeck || currentDeck.slides.length <= 1) {
      showToast('A presentation must contain at least 1 slide.', 'warning');
      return;
    }
    const newSlides = currentDeck.slides
      .filter((_, idx) => idx !== indexToDelete)
      .map((s, idx) => ({ ...s, slideNumber: idx + 1 }));

    savePresentation({
      ...currentDeck,
      slides: newSlides,
    });
    setActiveSlideIndex((prev) => Math.min(prev, newSlides.length - 1));
  };

  // AI Rewrite single slide
  const handleAiRewriteSlide = async (mode: 'simplify' | 'expand' | 'formal' | 'bullet_points') => {
    if (!isPresentationAiEnabled) {
      showToast('AI slide rewrite is temporarily under improvement.', 'info');
      return;
    }
    if (!currentDeck) return;
    const activeSlide = currentDeck.slides[activeSlideIndex];
    if (!activeSlide) return;

    setIsAiRewriting(true);
    try {
      const result = await apiRequest<{ slide: Slide }>('/api/presentations/slide/rewrite', {
        method: 'POST',
        body: JSON.stringify({
          slide: activeSlide,
          mode,
        }),
      });

      handleUpdateCurrentSlide(result.slide);
      showToast(`Slide rewritten (${mode}) with Gemini AI!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'AI rewrite failed', 'error');
    } finally {
      setIsAiRewriting(false);
    }
  };

  // AI Generate Speaker Speech
  const handleAiGenerateNotes = async () => {
    if (!isPresentationAiEnabled) {
      showToast('AI speaker notes generation is temporarily under improvement.', 'info');
      return;
    }
    if (!currentDeck) return;
    const activeSlide = currentDeck.slides[activeSlideIndex];
    if (!activeSlide) return;

    setIsGeneratingNotes(true);
    try {
      const result = await apiRequest<{ speakerNotes: string }>('/api/presentations/slide/speaker-notes', {
        method: 'POST',
        body: JSON.stringify({
          slide: activeSlide,
          presentationTitle: currentDeck.title,
          tone: 'Conversational, confident student presenter',
        }),
      });

      handleUpdateCurrentSlide({ speakerNotes: result.speakerNotes });
      showToast('Speaker notes updated with natural presentation speech!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to generate speaker notes', 'error');
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  // Export / Print View
  const handlePrint = () => {
    window.print();
  };

  const activeTheme = THEMES.find((t) => t.id === activeThemeId) || THEMES[0];
  const activeSlide = currentDeck?.slides[activeSlideIndex];

  // -------------------------------------------------------------
  // Fullscreen Slide View
  // -------------------------------------------------------------
  if (isFullscreen && currentDeck && activeSlide) {
    return (
      <div className={`fixed inset-0 z-50 ${activeTheme.bg} flex flex-col justify-between p-8 sm:p-14 select-none`}>
        {/* Fullscreen Controls Bar */}
        <div className="flex items-center justify-between opacity-70 hover:opacity-100 transition">
          <div className="text-xs font-bold text-slate-400">
            {currentDeck.title} • Slide {activeSlideIndex + 1} of {currentDeck.slides.length}
          </div>
          <div className="flex items-center gap-3">
            <button
              id="toggle-notes-play-btn"
              onClick={() => setShowSpeakerNotesInPlay(!showSpeakerNotesInPlay)}
              className="px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs font-semibold backdrop-blur-md hover:bg-white/20 cursor-pointer"
            >
              {showSpeakerNotesInPlay ? 'Hide Notes' : 'Show Speaker Notes'}
            </button>
            <button
              id="exit-fullscreen-btn"
              onClick={() => setIsFullscreen(false)}
              className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 cursor-pointer"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Slide Content Render */}
        <div className="max-w-4xl mx-auto w-full my-auto text-center space-y-6">
          <div className="inline-block text-xs uppercase tracking-widest font-black text-blue-400">
            Slide {activeSlideIndex + 1}
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-white">
            {activeSlide.title}
          </h1>
          {activeSlide.subtitle && (
            <p className="text-lg sm:text-xl text-slate-300 font-medium">{activeSlide.subtitle}</p>
          )}

          {activeSlide.bullets && activeSlide.bullets.length > 0 && (
            <div className="grid grid-cols-1 gap-4 pt-6 text-left max-w-2xl mx-auto">
              {activeSlide.bullets.map((b, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 text-white text-base">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 shrink-0" />
                  <span>{b}</span>
                </div>
              ))}
            </div>
          )}

          {activeSlide.body && (
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
              {activeSlide.body}
            </p>
          )}

          {activeSlide.statNumber && (
            <div className="p-8 rounded-3xl bg-blue-950/40 border border-blue-800 max-w-md mx-auto">
              <div className="text-5xl font-black text-blue-400">{activeSlide.statNumber}</div>
              <div className="text-sm font-bold text-slate-300 mt-2">{activeSlide.statLabel}</div>
            </div>
          )}
        </div>

        {/* Speaker notes drawer in play mode */}
        {showSpeakerNotesInPlay && activeSlide.speakerNotes && (
          <div className="max-w-2xl mx-auto w-full p-4 rounded-2xl bg-blue-950/90 border border-blue-800 text-blue-100 text-xs leading-relaxed mb-4 backdrop-blur-md">
            <span className="font-bold text-blue-300 uppercase tracking-wider block mb-1">🎤 Speaker Speech Notes:</span>
            {activeSlide.speakerNotes}
          </div>
        )}

        {/* Footer Navigation */}
        <div className="flex items-center justify-between">
          <button
            id="prev-slide-play-btn"
            disabled={activeSlideIndex === 0}
            onClick={() => setActiveSlideIndex((p) => Math.max(0, p - 1))}
            className="px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>
          <div className="text-xs text-slate-400">Press Space or Arrow keys to navigate</div>
          <button
            id="next-slide-play-btn"
            disabled={activeSlideIndex === currentDeck.slides.length - 1}
            onClick={() => setActiveSlideIndex((p) => Math.min(currentDeck.slides.length - 1, p + 1))}
            className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Studio Editor View (When a deck is active)
  // -------------------------------------------------------------
  if (currentDeck) {
    return (
      <div className="space-y-6">
        {/* Editor Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs">
          <div className="flex items-center gap-3">
            <button
              id="back-to-decks-btn"
              onClick={() => setActivePresentationId(null)}
              className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-[#101823] transition cursor-pointer"
              title="Back to presentation library"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <input
                id="edit-deck-title-input"
                type="text"
                value={currentDeck.title}
                onChange={(e) => savePresentation({ ...currentDeck, title: e.target.value })}
                className="text-base sm:text-lg font-black text-slate-900 dark:text-[#F8FAFC] bg-transparent border-none p-0 focus:outline-none focus:ring-0 w-full"
              />
              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>{currentDeck.slides?.length || 0} Slides</span>
                <span>•</span>
                <span>Language: {currentDeck.language?.toUpperCase() || 'EN'}</span>
                <span>•</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">Auto-saved</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Theme Selector */}
            <select
              id="presentation-theme-select"
              value={activeThemeId}
              onChange={(e) => setActiveThemeId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] text-xs font-semibold text-slate-700 dark:text-[#F8FAFC] focus:outline-none"
            >
              {THEMES.map((th) => (
                <option key={th.id} value={th.id}>
                  Theme: {th.name}
                </option>
              ))}
            </select>

            {/* Ask AI Study Assistant */}
            <button
              id="presentation-ask-assistant-btn"
              onClick={() => setActiveTab('ai-assistant')}
              className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/80 dark:border-blue-900/80 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Ask AI Study Assistant about this presentation"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI Tutor</span>
            </button>

            {/* Print / Export */}
            <button
              id="print-deck-btn"
              onClick={handlePrint}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#101823] rounded-xl transition cursor-pointer"
              title="Print or Save as PDF"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Fullscreen slideshow */}
            <button
              id="launch-slideshow-btn"
              onClick={() => setIsFullscreen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Present Fullscreen</span>
            </button>
          </div>
        </div>

        {/* 3-Column Studio Grid: Left Thumbnails, Center Slide Preview, Right AI Copilot */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Slide Thumbnails List (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Slides</span>
              <button
                id="add-new-slide-btn"
                onClick={handleAddSlide}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Slide</span>
              </button>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 custom-scroll">
              {currentDeck.slides.map((slide, idx) => {
                const isActive = idx === activeSlideIndex;
                return (
                  <div
                    key={slide.id || idx}
                    onClick={() => setActiveSlideIndex(idx)}
                    className={`relative p-3 rounded-2xl cursor-pointer border transition text-left group ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20'
                        : 'bg-white dark:bg-[#0B1017] border-slate-200/80 dark:border-[#1E293B] hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400">
                        Slide {idx + 1}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          id={`del-slide-${idx}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSlide(idx);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          title="Delete slide"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] truncate">
                      {slide.title || 'Untitled Slide'}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {slide.layout} • {slide.bullets?.length || 0} bullets
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center: Slide Preview & In-line Editable Canvas (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            {activeSlide && (
              <div
                className={`p-8 sm:p-10 rounded-3xl border border-slate-200/80 dark:border-[#1E293B] shadow-md min-h-[460px] flex flex-col justify-between ${activeTheme.cardBg} transition`}
              >
                <div className="space-y-4">
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                    Slide {activeSlideIndex + 1} of {currentDeck.slides.length} • {activeSlide.layout}
                  </div>

                  {/* Title Editable */}
                  <input
                    id="slide-title-input"
                    type="text"
                    value={activeSlide.title}
                    onChange={(e) => handleUpdateCurrentSlide({ title: e.target.value })}
                    placeholder="Enter slide title..."
                    className="w-full text-2xl sm:text-3xl font-black bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none pb-1 transition tracking-tight text-slate-900 dark:text-[#F8FAFC]"
                  />

                  {/* Subtitle Editable */}
                  <input
                    id="slide-subtitle-input"
                    type="text"
                    value={activeSlide.subtitle || ''}
                    onChange={(e) => handleUpdateCurrentSlide({ subtitle: e.target.value })}
                    placeholder="Slide subtitle (optional)..."
                    className="w-full text-sm font-semibold opacity-75 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none pb-1 transition text-slate-700 dark:text-slate-300"
                  />

                  {/* Bullets List Editable */}
                  {activeSlide.bullets && activeSlide.bullets.length > 0 && (
                    <div className="space-y-2 pt-2">
                      {activeSlide.bullets.map((b, bIdx) => (
                        <div key={bIdx} className="flex items-start gap-2.5">
                          <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 shrink-0" />
                          <input
                            type="text"
                            value={b}
                            onChange={(e) => {
                              const newBullets = [...(activeSlide.bullets || [])];
                              newBullets[bIdx] = e.target.value;
                              handleUpdateCurrentSlide({ bullets: newBullets });
                            }}
                            className="w-full text-xs sm:text-sm font-medium bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none pb-0.5 text-slate-800 dark:text-[#F8FAFC]"
                          />
                        </div>
                      ))}

                      <button
                        id="add-bullet-btn"
                        onClick={() => {
                          const newBullets = [...(activeSlide.bullets || []), 'New key argument point'];
                          handleUpdateCurrentSlide({ bullets: newBullets });
                        }}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline pt-1 cursor-pointer"
                      >
                        + Add Bullet Point
                      </button>
                    </div>
                  )}

                  {/* Highlight Stat layout */}
                  {activeSlide.layout === 'highlight_stat' && (
                    <div className="p-6 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 my-4 text-center">
                      <div className="text-3xl font-black text-blue-600 dark:text-blue-400">{activeSlide.statNumber}</div>
                      <div className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-1">{activeSlide.statLabel}</div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-[#1E293B] text-xs text-slate-400">
                  <span>{currentDeck.title}</span>
                  <span>{activeSlideIndex + 1} / {currentDeck.slides.length}</span>
                </div>
              </div>
            )}
          </div>

          {/* Right: AI Slide Copilot & Presentation Speech Notes (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            {/* Speaker Notes Box */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-[#F8FAFC]">
                  <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Speech Notes</span>
                </div>
                <button
                  id="generate-speaker-notes-btn"
                  onClick={handleAiGenerateNotes}
                  disabled={!isPresentationAiEnabled || isGeneratingNotes}
                  className={`text-xs font-bold flex items-center gap-1 ${
                    !isPresentationAiEnabled
                      ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
                      : 'text-blue-600 dark:text-blue-400 hover:underline cursor-pointer'
                  }`}
                  title={!isPresentationAiEnabled ? 'AI speech script is temporarily under improvement' : 'Generate speech notes'}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{isGeneratingNotes ? 'Writing...' : !isPresentationAiEnabled ? 'Under Improvement' : 'AI Script'}</span>
                </button>
              </div>

              <textarea
                id="slide-speaker-notes-input"
                rows={4}
                value={activeSlide?.speakerNotes || ''}
                onChange={(e) => handleUpdateCurrentSlide({ speakerNotes: e.target.value })}
                placeholder="Write what you will say to the class for this slide..."
                className="w-full p-3 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-2xl text-xs text-slate-900 dark:text-[#F8FAFC] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* AI Slide Rewrite Tools */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-[#F8FAFC]">
                  <Wand2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>AI Slide Rewriter</span>
                </div>
                {!isPresentationAiEnabled && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950/80 border border-blue-500/30 text-blue-400">
                    Under Improvement
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <button
                  id="rewrite-simplify-btn"
                  onClick={() => handleAiRewriteSlide('simplify')}
                  disabled={!isPresentationAiEnabled || isAiRewriting}
                  className={`w-full py-2.5 px-3 rounded-xl border text-left text-xs font-semibold transition ${
                    !isPresentationAiEnabled
                      ? 'bg-slate-50 dark:bg-[#101823] border-slate-200 dark:border-[#1E293B] text-slate-400 dark:text-slate-600 cursor-not-allowed'
                      : 'bg-slate-50 dark:bg-[#101823] hover:bg-blue-50 dark:hover:bg-blue-950/40 border-slate-200 dark:border-[#1E293B] text-slate-800 dark:text-[#F8FAFC] cursor-pointer'
                  }`}
                >
                  ✨ Simplify & Shorten Points
                </button>
                <button
                  id="rewrite-formal-btn"
                  onClick={() => handleAiRewriteSlide('formal')}
                  disabled={!isPresentationAiEnabled || isAiRewriting}
                  className={`w-full py-2.5 px-3 rounded-xl border text-left text-xs font-semibold transition ${
                    !isPresentationAiEnabled
                      ? 'bg-slate-50 dark:bg-[#101823] border-slate-200 dark:border-[#1E293B] text-slate-400 dark:text-slate-600 cursor-not-allowed'
                      : 'bg-slate-50 dark:bg-[#101823] hover:bg-blue-50 dark:hover:bg-blue-950/40 border-slate-200 dark:border-[#1E293B] text-slate-800 dark:text-[#F8FAFC] cursor-pointer'
                  }`}
                >
                  🎓 Academic / Formal Tone
                </button>
                <button
                  id="rewrite-expand-btn"
                  onClick={() => handleAiRewriteSlide('expand')}
                  disabled={!isPresentationAiEnabled || isAiRewriting}
                  className={`w-full py-2.5 px-3 rounded-xl border text-left text-xs font-semibold transition ${
                    !isPresentationAiEnabled
                      ? 'bg-slate-50 dark:bg-[#101823] border-slate-200 dark:border-[#1E293B] text-slate-400 dark:text-slate-600 cursor-not-allowed'
                      : 'bg-slate-50 dark:bg-[#101823] hover:bg-blue-50 dark:hover:bg-blue-950/40 border-slate-200 dark:border-[#1E293B] text-slate-800 dark:text-[#F8FAFC] cursor-pointer'
                  }`}
                >
                  📈 Expand with Examples
                </button>
                <button
                  id="rewrite-bullets-btn"
                  onClick={() => handleAiRewriteSlide('bullet_points')}
                  disabled={!isPresentationAiEnabled || isAiRewriting}
                  className={`w-full py-2.5 px-3 rounded-xl border text-left text-xs font-semibold transition ${
                    !isPresentationAiEnabled
                      ? 'bg-slate-50 dark:bg-[#101823] border-slate-200 dark:border-[#1E293B] text-slate-400 dark:text-slate-600 cursor-not-allowed'
                      : 'bg-slate-50 dark:bg-[#101823] hover:bg-blue-50 dark:hover:bg-blue-950/40 border-slate-200 dark:border-[#1E293B] text-slate-800 dark:text-[#F8FAFC] cursor-pointer'
                  }`}
                >
                  📋 Convert to 3-Bullet List
                </button>
              </div>

              {isAiRewriting && (
                <div className="flex items-center justify-center gap-2 py-2 text-xs font-bold text-blue-600 animate-pulse">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Gemini AI is improving slide...</span>
                </div>
              )}
            </div>

            {/* Layout Changer */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-[#F8FAFC]">
                <Layout className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Slide Layout</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  id="layout-bullets-btn"
                  onClick={() =>
                    handleUpdateCurrentSlide({
                      layout: 'bullet_points',
                      bullets: ['Main finding 1', 'Main finding 2', 'Summary evidence'],
                    })
                  }
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-blue-500 text-center cursor-pointer"
                >
                  Bullet List
                </button>
                <button
                  id="layout-stat-btn"
                  onClick={() =>
                    handleUpdateCurrentSlide({
                      layout: 'highlight_stat',
                      statNumber: '94%',
                      statLabel: 'Accuracy or metric impact',
                    })
                  }
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-blue-500 text-center cursor-pointer"
                >
                  Big Stat Card
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Default View: Decks Library + Generator Studio Form
  // -------------------------------------------------------------
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-[#F8FAFC]">
              AI Presentation Maker
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-black uppercase">
              Gemini Powered
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] mt-1">
            Turn your assignment topics, research papers, and syllabus into ready-to-present slide decks with speaker notes.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('ai-assistant')}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-900/80 text-blue-600 dark:text-blue-400 font-bold text-xs transition cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Open AI Study Assistant</span>
        </button>
      </div>

      {/* Notice when AI Presentation is temporarily disabled */}
      {!isPresentationAiEnabled && (
        <UnderImprovementNotice type="presentation" />
      )}

      {/* Generator Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-[#F8FAFC]">Generate New Slide Deck</h2>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Generates structured slides, academic outlines, and speaker scripts</p>
            </div>
          </div>

          {!isPresentationAiEnabled && (
            <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-500/30 text-blue-400 text-xs font-black uppercase">
              <Wrench className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              Under Improvement
            </span>
          )}
        </div>

        <form onSubmit={handleGenerateDeck} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Presentation Topic or Research Subject *
            </label>
            <input
              id="pres-topic-input"
              type="text"
              required
              disabled={!isPresentationAiEnabled}
              placeholder="e.g. Climate Change Impacts on Bangladesh Coastlines, or Microservice Architecture in E-commerce"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-2xl text-sm font-semibold text-slate-900 dark:text-[#F8FAFC] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Subject */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Subject
              </label>
              <select
                id="pres-subject-select"
                value={subjectId}
                disabled={!isPresentationAiEnabled}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-2xl text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">General University Subject</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Slide Count */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Number of Slides
              </label>
              <select
                id="pres-slide-count-select"
                value={slideCount}
                disabled={!isPresentationAiEnabled}
                onChange={(e) => setSlideCount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-2xl text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value={4}>4 Slides (Quick 3-min pitch)</option>
                <option value={6}>6 Slides (Standard 5-min class presentation)</option>
                <option value={8}>8 Slides (Detailed term project)</option>
                <option value={10}>10 Slides (Comprehensive defense / seminar)</option>
              </select>
            </div>

            {/* Language */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Language
              </label>
              <select
                id="pres-language-select"
                value={language}
                disabled={!isPresentationAiEnabled}
                onChange={(e) => setLanguage(e.target.value as 'english' | 'bangla')}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] rounded-2xl text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="english">English (Global Academic)</option>
                <option value="bangla">Bangla (বাংলা প্রেজেন্টেশন)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            {isPresentationAiEnabled ? (
              <button
                id="generate-pres-submit-btn"
                type="submit"
                disabled={isGenerating || !topic.trim()}
                className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/25 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                {isGenerating ? 'Generating Slides & Speech with AI...' : 'Generate Complete Presentation'}
              </button>
            ) : (
              <button
                id="generate-pres-disabled-btn"
                type="button"
                disabled={true}
                className="w-full sm:w-auto px-8 py-3.5 bg-slate-100 dark:bg-[#101823] border border-slate-200 dark:border-[#1E293B] text-slate-400 dark:text-slate-500 rounded-2xl font-bold text-sm cursor-not-allowed flex items-center justify-center gap-2"
                title="Temporarily unavailable while AI presentation generation quality is being improved"
              >
                <Wrench className="w-4 h-4 text-blue-400/60" />
                <span>Currently Unavailable</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Presentations Library / Saved Decks */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-[#F8FAFC]">Your Saved Presentations</h2>
          <span className="text-xs font-semibold text-slate-400">{presentations.length} Decks</span>
        </div>

        {presentations.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-[#0B1017] rounded-3xl border border-slate-200/80 dark:border-[#1E293B] p-6 space-y-2">
            <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">No Saved Presentations Yet</h4>
            <p className="text-xs text-slate-400">Generate a slide deck above to create structured presentations with speech notes.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {presentations.map((deck) => {
              return (
                <motion.div
                  key={deck.id}
                  whileHover={{ y: -3 }}
                  onClick={() => setActivePresentationId(deck.id)}
                  className="p-5 rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-xs hover:border-blue-400 dark:hover:border-blue-600 cursor-pointer transition flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        {deck.slides?.length || 0} Slides
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          id={`dup-deck-btn-${deck.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicatePresentation(deck.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg cursor-pointer"
                          title="Duplicate"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`del-deck-btn-${deck.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePresentation(deck.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] line-clamp-1">{deck.title}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                        {deck.subtitle || 'Custom AI deck with speech notes'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-100 dark:border-[#1E293B] flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Updated {new Date(deck.updatedAt).toLocaleDateString()}
                    </span>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <span>Open Studio</span>
                      <Edit3 className="w-3 h-3" />
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
