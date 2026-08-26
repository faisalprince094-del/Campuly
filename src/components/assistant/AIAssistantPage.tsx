import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Conversation,
  ChatMessage,
  AssistantMode,
  AssistantAction,
  FeedbackRating,
  FeedbackReason,
} from '../../types';
import {
  getConversations,
  saveConversation,
  deleteConversation,
  createDefaultConversation,
} from '../../utils/aiChatStorage';
import { aiService } from '../../utils/aiService';
import { MarkdownRenderer } from './MarkdownRenderer';
import { QuizWidget } from './QuizWidget';
import { FlashcardsWidget } from './FlashcardsWidget';
import { UserAvatar } from '../ui/UserAvatar';
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  Edit2,
  Check,
  Copy,
  RotateCcw,
  BookOpen,
  GraduationCap,
  FileText,
  Presentation,
  PenTool,
  HelpCircle,
  Clock,
  Layers,
  MessageSquare,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  AlertCircle,
  Lightbulb,
  ArrowRight,
  Smile,
  ThumbsUp,
  ThumbsDown,
  Paperclip,
  CheckCircle2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Loader2,
  Square,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useContinuousVoiceRecorder } from '../../utils/useContinuousVoiceRecorder';
import { VoiceInputBanner } from './VoiceInputBanner';

const MODE_OPTIONS: Array<{
  id: AssistantMode;
  label: string;
  desc: string;
  icon: any;
}> = [
  { id: 'general', label: 'General', desc: 'Conversational campus & study companion', icon: Sparkles },
  { id: 'study_tutor', label: 'Study Tutor', desc: 'Intuitive explanations & concepts', icon: GraduationCap },
  { id: 'exam_prep', label: 'Exam Prep', desc: 'High-yield topics, formulas & drills', icon: BookOpen },
  { id: 'presentation_help', label: 'Presentation Help', desc: 'Slide structure & speaker notes', icon: Presentation },
  { id: 'writing_help', label: 'Writing Help', desc: 'Academic clarity & essay flow', icon: PenTool },
];

const EMPTY_STATE_PROMPTS = [
  {
    title: 'Explain a difficult topic',
    prompt: 'Explain the difference between assets and liabilities with examples.',
    icon: Lightbulb,
    mode: 'study_tutor' as AssistantMode,
  },
  {
    title: 'Class & Study planning',
    prompt: 'What is the best way to structure my revision schedule before finals?',
    icon: Clock,
    mode: 'exam_prep' as AssistantMode,
  },
  {
    title: 'Quick academic check',
    prompt: 'How does supply and demand determine equilibrium price in economics?',
    icon: HelpCircle,
    mode: 'study_tutor' as AssistantMode,
  },
  {
    title: 'Create a practice quiz',
    prompt: 'Give me 5 multiple choice questions about marketing fundamentals with explanations.',
    icon: Layers,
    mode: 'exam_prep' as AssistantMode,
  },
  {
    title: 'Presentation talking points',
    prompt: 'Give me structured slide talking points and speaker notes for a presentation on Renewable Energy.',
    icon: Presentation,
    mode: 'presentation_help' as AssistantMode,
  },
];

export const AIAssistantPage: React.FC = () => {
  const { user, subjects, showToast } = useApp();

  // Storage & Conversation State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Active chat state
  const [currentMode, setCurrentMode] = useState<AssistantMode>('general');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Voice Speech-to-Text and Text-to-Speech State
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  // User-provided material / notes context
  const [showMaterialContext, setShowMaterialContext] = useState(false);
  const [providedMaterial, setProvidedMaterial] = useState('');
  const [activeFeedbackMenuMsgId, setActiveFeedbackMenuMsgId] = useState<string | null>(null);

  // UI Drawer / Sidebar
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [newTitleText, setNewTitleText] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const handleSendMessageRef = useRef<(customPrompt?: string, action?: AssistantAction) => Promise<void>>(async () => {});

  // Continuous, silence-aware voice recorder hook
  const {
    isRecording,
    isTranscribing,
    audioLevel,
    liveTranscript,
    silenceCountdown,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useContinuousVoiceRecorder({
    silenceDurationMs: 3200, // Generous 3.2s silence threshold: short natural pauses won't stop recording!
    onFinalTranscript: (transcript) => {
      const clean = transcript.trim();
      if (!clean) return;
      setInputMessage(clean);
      // Automatically send the full recognized prompt to Campusly AI
      handleSendMessageRef.current(clean);
    },
    onError: (err) => showToast(err, 'error'),
    onToast: (msg, type) => showToast(msg, type),
  });

  // Toggle voice recording
  const handleToggleVoiceInput = () => {
    if (isRecording) {
      stopRecording();
    } else if (!isTranscribing) {
      startRecording();
    }
  };

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Text-to-Speech Handler for Voice Output
  const handleSpeakText = (text: string, msgId: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      showToast('Voice read-aloud is not supported on this device.', 'warning');
      return;
    }

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Strip markdown formatting, symbols, bullet asterisks for a natural spoken cadence
    const cleanSpoken = text
      .replace(/[*#_`~\[\]]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\n+/g, ' ')
      .trim();

    if (!cleanSpoken) return;

    const utterance = new SpeechSynthesisUtterance(cleanSpoken);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setSpeakingMsgId(null);
    };

    utterance.onerror = () => {
      setSpeakingMsgId(null);
    };

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Load conversations on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await getConversations();
        if (!mounted) return;
        setConversations(stored);
        if (stored.length > 0) {
          setActiveConvId(stored[0].id);
          setCurrentMode(stored[0].mode || 'general');
        } else {
          const fresh = createDefaultConversation();
          setConversations([fresh]);
          setActiveConvId(fresh.id);
          setCurrentMode(fresh.mode);
          saveConversation(fresh);
        }
      } catch (err) {
        console.error('Failed loading chat history:', err);
      } finally {
        if (mounted) setIsLoadingHistory(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Current active conversation object
  const activeConversation = conversations.find((c) => c.id === activeConvId) || conversations[0];

  // Auto scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom('smooth');
  }, [activeConversation?.messages?.length, isGenerating]);

  // Adjust textarea height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputMessage]);

  // Handle Starting a New Chat
  const handleStartNewChat = () => {
    const newConv: Conversation = {
      id: `conv_${Date.now()}`,
      title: 'New Conversation',
      mode: currentMode,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newConv, ...conversations];
    setConversations(updated);
    setActiveConvId(newConv.id);
    saveConversation(newConv);
    setIsHistoryDrawerOpen(false);

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  // Handle Deleting Conversation
  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (conversations.length <= 1) {
      // Clear current messages instead of deleting the last conversation
      const resetConv: Conversation = {
        id: `conv_${Date.now()}`,
        title: 'New Conversation',
        mode: currentMode,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setConversations([resetConv]);
      setActiveConvId(resetConv.id);
      await saveConversation(resetConv);
      showToast('Conversation cleared', 'info');
      return;
    }

    const updated = conversations.filter((c) => c.id !== id);
    setConversations(updated);
    if (activeConvId === id) {
      setActiveConvId(updated[0].id);
      setCurrentMode(updated[0].mode || 'general');
    }
    await deleteConversation(id);
    showToast('Conversation deleted', 'info');
  };

  // Handle Renaming Conversation Title
  const handleStartRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTitleId(conv.id);
    setNewTitleText(conv.title);
  };

  const handleSaveRename = async (id: string) => {
    if (!newTitleText.trim()) {
      setEditingTitleId(null);
      return;
    }
    const updated = conversations.map((c) =>
      c.id === id ? { ...c, title: newTitleText.trim(), updatedAt: new Date().toISOString() } : c
    );
    setConversations(updated);
    const target = updated.find((c) => c.id === id);
    if (target) await saveConversation(target);
    setEditingTitleId(null);
    showToast('Title updated', 'success');
  };

  // Handle Sending a Message
  const handleSendMessage = async (customPrompt?: string, action: AssistantAction = 'normal') => {
    const textToSend = (customPrompt || inputMessage).trim();
    if (!textToSend || isGenerating) return;

    if (!customPrompt) {
      setInputMessage('');
    }

    // Build user message
    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: textToSend,
      createdAt: new Date().toISOString(),
    };

    let conv = activeConversation;
    if (!conv) {
      conv = {
        id: `conv_${Date.now()}`,
        title: textToSend.slice(0, 32) + (textToSend.length > 32 ? '...' : ''),
        mode: currentMode,
        messages: [userMsg],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else {
      const isFirstMsg = conv.messages.length === 0;
      conv = {
        ...conv,
        title: isFirstMsg ? textToSend.slice(0, 36) + (textToSend.length > 36 ? '...' : '') : conv.title,
        mode: currentMode,
        messages: [...conv.messages, userMsg],
        updatedAt: new Date().toISOString(),
      };
    }

    // Optimistically update conversation state
    const updatedConversations = conversations.map((c) => (c.id === conv.id ? conv : c));
    if (!updatedConversations.some((c) => c.id === conv.id)) {
      updatedConversations.unshift(conv);
    }
    setConversations(updatedConversations);
    setActiveConvId(conv.id);
    saveConversation(conv);

    setIsGenerating(true);

    try {
      // Resolve subject context
      let subjectSnippet = '';
      if (selectedSubjectId !== 'all') {
        const foundSub = subjects.find((s) => s.id === selectedSubjectId);
        if (foundSub) subjectSnippet = `${foundSub.name} (${foundSub.code || 'Academic'})`;
      } else if (subjects.length > 0) {
        subjectSnippet = subjects.map((s) => s.name).join(', ');
      }

      // Call reusable server-side Gemini service
      const response = await aiService.generateStudyAssistantResponse({
        messages: conv.messages.map((m) => ({ role: m.role, content: m.content })),
        message: textToSend,
        mode: currentMode,
        action,
        profileContext: {
          name: user?.name,
          university: user?.university,
          department: user?.department,
          semester: user?.semester,
        },
        subjectContext: subjectSnippet,
        providedMaterial: providedMaterial.trim() || undefined,
      });

      const assistantMsg: ChatMessage = {
        id: `msg_ai_${Date.now()}`,
        role: 'assistant',
        content: response.reply || 'Here is what you need to know about this topic.',
        createdAt: new Date().toISOString(),
        quiz: response.quiz,
        flashcards: response.flashcards,
        providedMaterial: providedMaterial.trim() || undefined,
      };

      const finalConv: Conversation = {
        ...conv,
        messages: [...conv.messages, assistantMsg],
        updatedAt: new Date().toISOString(),
      };

      const finalConversations = conversations.map((c) => (c.id === finalConv.id ? finalConv : c));
      setConversations(finalConversations);
      saveConversation(finalConv);
    } catch (err: any) {
      console.error('Study assistant error:', err);
      const errorMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: 'assistant',
        content: err.message || 'Something went wrong while generating the answer. Please check your connection and try again.',
        createdAt: new Date().toISOString(),
        isError: true,
      };

      const finalConv: Conversation = {
        ...conv,
        messages: [...conv.messages, errorMsg],
        updatedAt: new Date().toISOString(),
      };

      const finalConversations = conversations.map((c) => (c.id === finalConv.id ? finalConv : c));
      setConversations(finalConversations);
      saveConversation(finalConv);
      showToast('AI Service issue: fallback response provided', 'warning');
    } finally {
      setIsGenerating(false);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  };

  handleSendMessageRef.current = handleSendMessage;

  // Handle Quick Action on Previous Assistant Message
  const handleQuickAction = async (action: AssistantAction, previousContent: string) => {
    if (isGenerating) return;

    let userPromptText = '';
    switch (action) {
      case 'explain_simpler':
        userPromptText = 'Explain this simpler with easier words and analogies.';
        break;
      case 'summarize':
        userPromptText = 'Give me a concise 3 to 5 bullet point summary of this.';
        break;
      case 'give_example':
        userPromptText = 'Give me real-world practical examples for this concept.';
        break;
      case 'make_quiz':
        userPromptText = 'Create a 5-question practice quiz on this topic.';
        break;
      case 'create_flashcards':
        userPromptText = 'Turn this into study flashcards.';
        break;
      default:
        userPromptText = 'Elaborate on this concept.';
    }

    handleSendMessage(userPromptText, action);
  };

  // Handle Copying Message Text
  const handleCopy = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    showToast('Copied to clipboard', 'info');
    setTimeout(() => {
      setCopiedMsgId((current) => (current === msgId ? null : current));
    }, 2000);
  };

  // Handle Regenerating Last Response
  const handleRegenerate = () => {
    if (!activeConversation || isGenerating) return;
    const msgs = activeConversation.messages;
    if (msgs.length === 0) return;

    // Find the last user message
    const lastUserIndex = msgs.map((m) => m.role).lastIndexOf('user');
    if (lastUserIndex === -1) return;

    const userPrompt = msgs[lastUserIndex].content;

    // Remove trailing messages after last user message
    const trimmedMessages = msgs.slice(0, lastUserIndex + 1);
    const updatedConv: Conversation = {
      ...activeConversation,
      messages: trimmedMessages,
      updatedAt: new Date().toISOString(),
    };

    setConversations(conversations.map((c) => (c.id === updatedConv.id ? updatedConv : c)));
    saveConversation(updatedConv);

    handleSendMessage(userPrompt);
  };

  // Handle Response Feedback (Helpful / Unhelpful)
  const handleFeedback = async (
    msg: ChatMessage,
    rating: FeedbackRating,
    reason?: FeedbackReason
  ) => {
    if (!activeConversation) return;

    // Find user query prior to this assistant response
    const msgIdx = activeConversation.messages.findIndex((m) => m.id === msg.id);
    const priorUserMsg = msgIdx > 0 ? activeConversation.messages[msgIdx - 1]?.content : '';

    const updatedMessages = activeConversation.messages.map((m) => {
      if (m.id === msg.id) {
        return {
          ...m,
          feedback: {
            rating,
            reason,
            timestamp: new Date().toISOString(),
          },
        };
      }
      return m;
    });

    const updatedConv: Conversation = {
      ...activeConversation,
      messages: updatedMessages,
      updatedAt: new Date().toISOString(),
    };

    setConversations(conversations.map((c) => (c.id === updatedConv.id ? updatedConv : c)));
    saveConversation(updatedConv);
    setActiveFeedbackMenuMsgId(null);

    try {
      await aiService.submitFeedback({
        messageId: msg.id,
        rating,
        reason,
        query: priorUserMsg,
        response: msg.content,
      });
      showToast(rating === 'helpful' ? 'Thank you for your feedback!' : 'Feedback submitted. We will use this to improve answer accuracy.', 'info');
    } catch (err) {
      console.error('Failed submitting feedback:', err);
    }
  };

  // Mode Switch
  const handleModeChange = (mode: AssistantMode) => {
    setCurrentMode(mode);
    if (activeConversation) {
      const updated: Conversation = {
        ...activeConversation,
        mode,
        updatedAt: new Date().toISOString(),
      };
      setConversations(conversations.map((c) => (c.id === updated.id ? updated : c)));
      saveConversation(updated);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8.5rem)] sm:h-[calc(100vh-7.5rem)] min-h-[500px] w-full rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0B1017] border border-slate-200/80 dark:border-[#1E293B] shadow-sm overflow-hidden transition-colors">
      {/* ======================== DESKTOP SIDEBAR / CONVERSATION HISTORY ======================== */}
      <aside className="hidden md:flex flex-col w-72 h-full bg-slate-50/80 dark:bg-[#05070A]/80 border-r border-slate-200/80 dark:border-[#1E293B] shrink-0 p-4 transition-colors">
        {/* New Chat Button */}
        <button
          id="assistant-new-chat-btn"
          onClick={handleStartNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs shadow-blue-600/20 active:scale-98 transition cursor-pointer mb-4"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>

        {/* History Header */}
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            History ({conversations.length})
          </span>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 custom-scroll pr-1">
          {conversations.map((conv) => {
            const isActive = conv.id === activeConvId;
            const isEditing = editingTitleId === conv.id;

            return (
              <div
                key={conv.id}
                onClick={() => {
                  setActiveConvId(conv.id);
                  setCurrentMode(conv.mode || 'general');
                }}
                className={`group relative flex items-center justify-between p-2.5 rounded-xl text-xs font-medium cursor-pointer transition ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 border border-blue-200/80 dark:border-blue-900/60 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-[#101823]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                  <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                  {isEditing ? (
                    <input
                      type="text"
                      value={newTitleText}
                      onChange={(e) => setNewTitleText(e.target.value)}
                      onBlur={() => handleSaveRename(conv.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename(conv.id);
                        if (e.key === 'Escape') setEditingTitleId(null);
                      }}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-white dark:bg-[#0B1017] border border-blue-500 rounded px-1.5 py-0.5 text-xs text-slate-900 dark:text-white outline-none"
                    />
                  ) : (
                    <span className="truncate">{conv.title || 'Untitled Session'}</span>
                  )}
                </div>

                {/* Actions (Rename, Delete) */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                  <button
                    onClick={(e) => handleStartRename(conv, e)}
                    className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                    title="Rename"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Student Profile Snip */}
        <div className="pt-3 border-t border-slate-200/80 dark:border-[#1E293B] flex items-center gap-2 text-xs text-slate-500 dark:text-[#94A3B8]">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="truncate font-medium">Gemini 3.7 Flash Active</span>
        </div>
      </aside>

      {/* ======================== MAIN CHAT CONTAINER ======================== */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white dark:bg-[#0B1017]">
        {/* Chat Top Header */}
        <header className="px-4 sm:px-6 py-3 border-b border-slate-100 dark:border-[#1E293B] flex flex-wrap items-center justify-between gap-3 bg-white/90 dark:bg-[#0B1017]/90 backdrop-blur-xs z-10">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile History Drawer Toggle */}
            <button
              onClick={() => setIsHistoryDrawerOpen(true)}
              className="md:hidden p-2 rounded-xl border border-slate-200 dark:border-[#1E293B] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#101823] transition cursor-pointer"
              aria-label="Open History"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="w-9 h-9 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs shadow-blue-600/30">
              <Sparkles className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-[#F8FAFC]">
                  Campusly AI
                </h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                  <Sparkles className="w-2.5 h-2.5" />
                  AI Companion
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-[#94A3B8] truncate max-w-xs sm:max-w-md">
                Your intelligent student companion for academics, study planning, university life, and exam prep.
              </p>
            </div>
          </div>

          {/* Right Controls: Subject filter & New Chat for mobile */}
          <div className="flex items-center gap-2">
            {subjects.length > 0 && (
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#101823] border border-slate-200/80 dark:border-[#1E293B] text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                title="Filter Subject Context"
              >
                <option value="all">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handleStartNewChat}
              className="flex md:hidden items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>
        </header>

        {/* Mode Selector Pill Strip */}
        <div className="px-4 sm:px-6 py-2 bg-slate-50/70 dark:bg-[#05070A]/50 border-b border-slate-100 dark:border-[#1E293B] overflow-x-auto custom-scroll flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mr-1 uppercase tracking-wider shrink-0">
            Mode:
          </span>
          {MODE_OPTIONS.map((m) => {
            const isCurrent = currentMode === m.id;
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => handleModeChange(m.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isCurrent
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-[#101823] text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-[#1E293B] hover:border-blue-300'
                }`}
                title={m.desc}
              >
                <Icon className="w-3 h-3" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* ======================== CONVERSATION MESSAGES AREA ======================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scroll">
          {(!activeConversation?.messages || activeConversation.messages.length === 0) ? (
            /* EMPTY STATE */
            <div className="max-w-2xl mx-auto py-8 sm:py-12 text-center">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Sparkles className="w-8 h-8" />
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight mb-2">
                ✨ Hey! I'm Campusly AI
              </h3>
              <p className="text-sm text-slate-500 dark:text-[#94A3B8] max-w-md mx-auto mb-8">
                Your intelligent campus & study companion. Ask academic questions, explore concepts, prepare for exams, or talk using continuous voice input.
              </p>

              {/* Quick Prompts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {EMPTY_STATE_PROMPTS.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentMode(item.mode);
                        handleSendMessage(item.prompt);
                      }}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#101823] border border-slate-200/70 dark:border-[#1E293B] hover:border-blue-500/60 dark:hover:border-blue-500/60 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 text-left transition group cursor-pointer"
                    >
                      <div className="flex items-center gap-2 mb-1.5 text-blue-600 dark:text-blue-400">
                        <Icon className="w-4 h-4" />
                        <h4 className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC]">
                          {item.title}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-[#94A3B8] line-clamp-2">
                        "{item.prompt}"
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ACTIVE CHAT STREAM */
            activeConversation.messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              const isLastAssistant = !isUser && index === activeConversation.messages.length - 1;

              return (
                <div
                  key={msg.id || index}
                  className={`flex gap-3 sm:gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Assistant Avatar */}
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs shadow-blue-600/30">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}

                  {/* Message Bubble Card */}
                  <div
                    className={`max-w-[88%] sm:max-w-[80%] rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs transition-all ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-tr-xs'
                        : msg.isError
                        ? 'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-slate-900 dark:text-slate-100 rounded-tl-xs'
                        : 'bg-slate-50 dark:bg-[#101823] border border-slate-200/80 dark:border-[#1E293B] text-slate-900 dark:text-[#F8FAFC] rounded-tl-xs'
                    }`}
                  >
                    {/* Role Header & Timestamp */}
                    <div className="flex items-center justify-between gap-2 mb-2 pb-1 border-b border-black/5 dark:border-white/5">
                      <span className={`text-[11px] font-bold ${isUser ? 'text-blue-100' : 'text-blue-600 dark:text-blue-400'}`}>
                        {isUser ? 'You' : 'Campusly AI'}
                      </span>
                      <span className={`text-[10px] ${isUser ? 'text-blue-200' : 'text-slate-400 dark:text-slate-500'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Markdown Body */}
                    {isUser ? (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    ) : (
                      <>
                        {msg.providedMaterial && (
                          <div className="mb-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                            <BookOpen className="w-3 h-3" />
                            <span>Grounded in provided study material</span>
                          </div>
                        )}
                        <MarkdownRenderer content={msg.content} />
                      </>
                    )}

                    {/* Interactive Quiz Widget (if present) */}
                    {msg.quiz && <QuizWidget quiz={msg.quiz} />}

                    {/* Interactive Flashcards Widget (if present) */}
                    {msg.flashcards && <FlashcardsWidget deck={msg.flashcards} />}

                    {/* Quick AI Action Toolbar (Under Assistant Message) */}
                    {!isUser && !msg.isError && (
                      <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-[#1E293B] space-y-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">
                            Quick Actions:
                          </span>

                          <button
                            onClick={() => handleQuickAction('explain_simpler', msg.content)}
                            disabled={isGenerating}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#0B1017] border border-slate-200 dark:border-[#1E293B] hover:border-blue-400 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                          >
                            💡 Explain Simpler
                          </button>

                          <button
                            onClick={() => handleQuickAction('summarize', msg.content)}
                            disabled={isGenerating}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#0B1017] border border-slate-200 dark:border-[#1E293B] hover:border-blue-400 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                          >
                            📌 Summarize
                          </button>

                          <button
                            onClick={() => handleQuickAction('give_example', msg.content)}
                            disabled={isGenerating}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#0B1017] border border-slate-200 dark:border-[#1E293B] hover:border-blue-400 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                          >
                            🌍 Give Example
                          </button>

                          <button
                            onClick={() => handleQuickAction('make_quiz', msg.content)}
                            disabled={isGenerating}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#0B1017] border border-slate-200 dark:border-[#1E293B] hover:border-blue-400 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                          >
                            🎯 Make Quiz
                          </button>

                          <button
                            onClick={() => handleQuickAction('create_flashcards', msg.content)}
                            disabled={isGenerating}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#0B1017] border border-slate-200 dark:border-[#1E293B] hover:border-blue-400 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                          >
                            📇 Create Flashcards
                          </button>

                          <div className="ml-auto flex items-center gap-1">
                            {/* Read Aloud Voice Button */}
                            <button
                              onClick={() => handleSpeakText(msg.content, msg.id)}
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                speakingMsgId === msg.id
                                  ? 'bg-blue-500 text-white animate-pulse'
                                  : 'text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                              }`}
                              title={speakingMsgId === msg.id ? 'Stop Voice Output' : 'Read Aloud with Voice'}
                            >
                              {speakingMsgId === msg.id ? (
                                <VolumeX className="w-3.5 h-3.5" />
                              ) : (
                                <Volume2 className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Feedback Ratings */}
                            <button
                              onClick={() => handleFeedback(msg, 'helpful')}
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                msg.feedback?.rating === 'helpful'
                                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                  : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                              }`}
                              title="Helpful & Accurate"
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                if (activeFeedbackMenuMsgId === msg.id) {
                                  setActiveFeedbackMenuMsgId(null);
                                } else {
                                  setActiveFeedbackMenuMsgId(msg.id);
                                }
                              }}
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                msg.feedback?.rating === 'unhelpful'
                                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                  : 'text-slate-400 hover:text-rose-600 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                              }`}
                              title="Needs Improvement / Inaccurate"
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleCopy(msg.content, msg.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="Copy Response"
                            >
                              {copiedMsgId === msg.id ? (
                                <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Copied
                                </span>
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {isLastAssistant && (
                              <button
                                onClick={handleRegenerate}
                                disabled={isGenerating}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
                                title="Regenerate Answer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Unhelpful Feedback Sub-Menu */}
                        {activeFeedbackMenuMsgId === msg.id && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#0B1017] border border-slate-200 dark:border-[#1E293B] text-xs space-y-1.5"
                          >
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                              What was the issue with this answer?
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {[
                                { id: 'factually_incorrect', label: 'Factually Incorrect' },
                                { id: 'calculation_incorrect', label: 'Calculation / Math Error' },
                                { id: 'did_not_answer', label: 'Did Not Answer Question' },
                                { id: 'too_vague', label: 'Too Vague' },
                                { id: 'too_complicated', label: 'Too Complicated' },
                              ].map((opt) => (
                                <button
                                  key={opt.id}
                                  onClick={() => handleFeedback(msg, 'unhelpful', opt.id as FeedbackReason)}
                                  className="px-2 py-0.5 rounded-md bg-white dark:bg-[#101823] border border-slate-200 dark:border-slate-800 hover:border-rose-400 text-[10px] font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    )}

                    {/* Retry Button for Errors */}
                    {msg.isError && (
                      <div className="mt-3 pt-2 border-t border-rose-200 dark:border-rose-900/60 flex items-center justify-between">
                        <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                          Failed to generate complete response.
                        </span>
                        <button
                          onClick={handleRegenerate}
                          className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Try Again</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* User Avatar */}
                  {isUser && (
                    <UserAvatar
                      src={user?.profilePhoto}
                      name={user?.name || 'Student'}
                      size="sm"
                      className="shrink-0 mt-0.5"
                    />
                  )}
                </div>
              );
            })
          )}

          {/* Thinking Indicator */}
          {isGenerating && (
            <div className="flex items-center gap-3 justify-start">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs shadow-blue-600/30">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#101823] border border-slate-200/80 dark:border-[#1E293B] text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]"></div>
                </div>
                <span>AI Study Assistant is thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ======================== FIXED MESSAGE COMPOSER ======================== */}
        <div className="p-3 sm:p-4 bg-white/95 dark:bg-[#0B1017]/95 border-t border-slate-100 dark:border-[#1E293B] space-y-2">
          {/* Optional Material Context Toggle & Drawer */}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setShowMaterialContext(!showMaterialContext)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                providedMaterial.trim()
                  ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>
                {providedMaterial.trim()
                  ? `Study Material Attached (${providedMaterial.trim().length} chars)`
                  : '+ Attach Lecture Notes / Study Material'}
              </span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showMaterialContext ? 'rotate-180' : ''}`} />
            </button>

            {providedMaterial.trim() && (
              <button
                type="button"
                onClick={() => setProvidedMaterial('')}
                className="text-[11px] text-slate-400 hover:text-rose-500 transition cursor-pointer"
              >
                Clear material
              </button>
            )}
          </div>

          {/* Expandable Material Context Editor */}
          <AnimatePresence>
            {showMaterialContext && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      Study Material / Reference Notes
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Tutor answers will strictly prioritize this content
                    </span>
                  </div>
                  <textarea
                    value={providedMaterial}
                    onChange={(e) => setProvidedMaterial(e.target.value)}
                    placeholder="Paste textbook excerpts, professor's lecture notes, formulas, or syllabus text here..."
                    rows={3}
                    className="w-full bg-white dark:bg-[#0B1017] border border-blue-200 dark:border-blue-900/60 rounded-xl p-2.5 text-xs text-slate-900 dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Continuous Voice Input Waveform Banner */}
          <VoiceInputBanner
            isRecording={isRecording}
            isTranscribing={isTranscribing}
            audioLevel={audioLevel}
            liveTranscript={liveTranscript}
            silenceCountdown={silenceCountdown}
            onStop={() => stopRecording()}
            onCancel={cancelRecording}
          />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="relative flex items-end gap-2 p-2 rounded-2xl bg-slate-50 dark:bg-[#101823] border border-slate-200/80 dark:border-[#1E293B] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all shadow-xs"
          >
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                providedMaterial.trim()
                  ? "Talk to Campusly AI or ask anything about your attached notes..."
                  : "Talk to Campusly AI or type your question... (English, বাংলা, or mixed Banglish)"
              }
              rows={1}
              disabled={isGenerating || isRecording || isTranscribing}
              className="flex-1 bg-transparent border-0 resize-none py-2 px-3 text-sm text-slate-900 dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none max-h-36 custom-scroll"
            />

            <div className="flex items-center gap-1.5 pb-1 pr-1">
              {/* Voice Input Mic Button */}
              <button
                type="button"
                onClick={handleToggleVoiceInput}
                disabled={isTranscribing}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition cursor-pointer ${
                  isRecording
                    ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/40 ring-2 ring-rose-400'
                    : isTranscribing
                    ? 'bg-blue-600/80 text-white opacity-80'
                    : 'bg-slate-200/70 dark:bg-[#1A2332] text-slate-600 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-blue-950/60 hover:text-blue-600'
                }`}
                title={
                  isRecording
                    ? 'Listening... Click to finish speaking and send'
                    : isTranscribing
                    ? 'Transcribing voice...'
                    : 'Speak to Campusly AI with Continuous Voice Input'
                }
                aria-label={isRecording ? 'Stop Recording' : 'Voice Input'}
              >
                {isRecording ? (
                  <Square className="w-3.5 h-3.5 fill-current text-white" />
                ) : isTranscribing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>

              <button
                type="submit"
                id="assistant-send-msg-btn"
                disabled={!inputMessage.trim() || isGenerating || isRecording || isTranscribing}
                className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white flex items-center justify-center shadow-xs shadow-blue-600/30 transition cursor-pointer"
                aria-label="Send Message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="flex items-center justify-between mt-2 px-2 text-[11px] text-slate-400 dark:text-slate-500">
            <span>Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for new line</span>
            <span className="hidden sm:inline">Powered by Gemini 3.7 Flash • Campusly Academic Engine</span>
          </div>
        </div>
      </div>

      {/* ======================== MOBILE CONVERSATION HISTORY DRAWER ======================== */}
      <AnimatePresence>
        {isHistoryDrawerOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-4/5 max-w-sm h-full bg-white dark:bg-[#0B1017] border-r border-slate-200 dark:border-[#1E293B] p-4 flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1E293B] mb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Chat History</h3>
                </div>
                <button
                  onClick={() => setIsHistoryDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <button
                onClick={handleStartNewChat}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs mb-3"
              >
                <Plus className="w-4 h-4" />
                <span>New Conversation</span>
              </button>

              <div className="flex-1 overflow-y-auto space-y-1.5 custom-scroll">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setActiveConvId(conv.id);
                      setCurrentMode(conv.mode || 'general');
                      setIsHistoryDrawerOpen(false);
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-medium cursor-pointer ${
                      conv.id === activeConvId
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#101823]'
                    }`}
                  >
                    <span className="truncate flex-1 mr-2">{conv.title}</span>
                    <button
                      onClick={(e) => handleDeleteConversation(conv.id, e)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
