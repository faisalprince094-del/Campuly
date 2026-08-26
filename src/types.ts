export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type ExpenseCategory = 
  | 'food'
  | 'transport'
  | 'education'
  | 'entertainment'
  | 'shopping'
  | 'bills'
  | 'other';

export type EventType =
  | 'seminar'
  | 'workshop'
  | 'career_fair'
  | 'club'
  | 'competition'
  | 'cultural'
  | 'exam'
  | 'presentation'
  | 'other';

export type PresentationStyle = 
  | 'academic'
  | 'minimal'
  | 'modern'
  | 'corporate'
  | 'creative'
  | 'dark';

export type PresentationAudience = 
  | 'school'
  | 'college'
  | 'university'
  | 'professional';

export type PresentationTone = 
  | 'formal'
  | 'educational'
  | 'simple'
  | 'persuasive';

export type PresentationLanguage = 'en' | 'bn';

export type SlideLayout = 
  | 'title_slide'
  | 'bullet_points'
  | 'two_column'
  | 'highlight_stat'
  | 'quote'
  | 'summary';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language?: PresentationLanguage;
  currency?: 'BDT' | 'USD' | 'EUR' | 'GBP' | 'INR';
  currencySymbol: string;
  dailyStudyGoalMinutes: number;
  monthlyBudgetAmount?: number;
  onboardingCompleted?: boolean;
  notifications?: boolean;
  weekStartsOn?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  profilePhoto?: string;
  university: string;
  department: string;
  semester: string;
  createdAt: string;
  preferences: UserPreferences;
}

export interface Subject {
  id: string;
  userId: string;
  name: string;
  code?: string;
  icon: string;
  color: string;
  credits?: number;
  creditHours?: number;
  targetHours?: number;
  createdAt: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  subjectId?: string;
  priority: Priority;
  dueDate: string; // YYYY-MM-DD
  reminder?: boolean;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  userId: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  date: string; // YYYY-MM-DD
  note?: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  monthlyBudget: number;
  monthlyLimit?: number;
  categoryBudgets: Partial<Record<ExpenseCategory, number>>;
  monthYear: string; // YYYY-MM
}

export type StudySessionStatus = 'active' | 'completed' | 'cancelled' | 'paused';

export interface StudySession {
  id: string;
  userId: string;
  subjectId?: string;
  durationSeconds?: number;
  durationMinutes: number;
  breakMinutes?: number;
  mode: 'pomodoro' | 'custom' | 'stopwatch' | 'break';
  notes?: string;
  startTime?: string;
  endTime?: string;
  status?: StudySessionStatus;
  completedAt: string;
  createdAt: string;
}

export interface ActiveTimerState {
  sessionId?: string | null;
  isRunning: boolean;
  isPaused: boolean;
  secondsLeft: number;
  totalSeconds: number;
  mode: 'focus' | 'break';
  subjectId?: string | null;
  startTime: number | null;
  accumulatedPausedMs: number;
  lastPausedAt: number | null;
  notes?: string;
}

export interface UniversityEvent {
  id: string;
  userId: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  location: string;
  description?: string;
  type: EventType;
  reminder?: boolean;
  createdAt: string;
}

export interface Slide {
  id: string;
  slideNumber: number;
  title: string;
  subtitle?: string;
  bullets: string[];
  body: string;
  speakerNotes: string;
  layout: SlideLayout;
  keyTakeaway?: string;
  statNumber?: string;
  statLabel?: string;
}

export interface Presentation {
  id: string;
  userId: string;
  title: string;
  subtitle?: string;
  topic: string;
  subject: string;
  slidesCount: number;
  audience: PresentationAudience;
  style: PresentationStyle;
  tone: PresentationTone;
  language: PresentationLanguage;
  slides: Slide[];
  progressPercent: number;
  sources?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: 
    | 'task_reminder'
    | 'deadline_reminder'
    | 'event_reminder'
    | 'study_reminder'
    | 'budget_warning'
    | 'presentation_reminder';
  title: string;
  message: string;
  date: string;
  read: boolean;
  link?: string;
  createdAt?: string;
}

export interface Note {
  id: string;
  userId: string;
  subjectId?: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AIInsight {
  id: string;
  type: 'spending' | 'study' | 'productivity';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'success';
}

export type AssistantMode = 
  | 'general'
  | 'study_tutor'
  | 'exam_prep'
  | 'presentation_help'
  | 'writing_help';

export type AssistantAction =
  | 'normal'
  | 'explain_simpler'
  | 'summarize'
  | 'give_example'
  | 'make_quiz'
  | 'create_flashcards';

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number; // Index 0-3
  explanation: string;
}

export interface QuizData {
  title: string;
  topic: string;
  questions: QuizQuestion[];
}

export interface Flashcard {
  id: number;
  front: string;
  back: string;
  hint?: string;
}

export interface FlashcardDeck {
  title: string;
  topic: string;
  cards: Flashcard[];
}

export type FeedbackRating = 'helpful' | 'unhelpful';

export type FeedbackReason =
  | 'factually_incorrect'
  | 'calculation_incorrect'
  | 'did_not_answer'
  | 'too_vague'
  | 'too_complicated'
  | 'other';

export interface MessageFeedback {
  rating: FeedbackRating;
  reason?: FeedbackReason;
  comment?: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  quiz?: QuizData;
  flashcards?: FlashcardDeck;
  isError?: boolean;
  feedback?: MessageFeedback;
  providedMaterial?: string;
}

export interface Conversation {
  id: string;
  title: string;
  mode: AssistantMode;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  subjectId?: string;
}

