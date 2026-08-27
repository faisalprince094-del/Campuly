import { apiRequest } from './api';
import {
  AssistantAction,
  AssistantMode,
  ChatMessage,
  QuizData,
  FlashcardDeck,
} from '../types';

export interface StudyAssistantRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  message?: string;
  mode?: AssistantMode;
  action?: AssistantAction;
  profileContext?: {
    name?: string;
    university?: string;
    department?: string;
    semester?: string;
  };
  subjectContext?: string;
  previousContext?: string;
  providedMaterial?: string;
}

export interface StudyAssistantResponse {
  reply: string;
  quiz?: QuizData;
  flashcards?: FlashcardDeck;
  mode?: AssistantMode;
  action?: AssistantAction;
  fallbackUsed?: boolean;
  isError?: boolean;
}

/**
 * Reusable AI Service that interfaces with Campusly's secure server-side Gemini endpoints.
 */
export const aiService = {
  /**
   * Primary AI Study Assistant endpoint (tutor chat, explain simpler, summarize, quizzes, flashcards)
   */
  async generateStudyAssistantResponse(
    params: StudyAssistantRequest
  ): Promise<StudyAssistantResponse> {
    try {
      const result = await apiRequest<StudyAssistantResponse>(
        '/api/ai/study-assistant',
        {
          method: 'POST',
          body: JSON.stringify(params),
        }
      );
      return result;
    } catch (err: any) {
      console.error('Study Assistant API error:', err);
      // Map error codes to friendly student guidance
      let friendlyMessage = err.message || 'Something went wrong while generating the answer. Please try again.';
      if (!navigator.onLine) {
        friendlyMessage = 'Please check your internet connection and try again.';
      } else if (err.message?.includes('429') || err.message?.includes('busy') || err.message?.includes('quota')) {
        friendlyMessage = 'The AI service is currently busy or rate-limited. Please wait a few moments and try again.';
      } else if (err.message?.includes('503') || err.message?.includes('unavailable')) {
        friendlyMessage = 'The AI service is temporarily unavailable. Please try again shortly.';
      } else if (err.message?.includes('GEMINI_API_KEY') || err.message?.includes('API key')) {
        friendlyMessage = 'GEMINI_API_KEY is not configured on the production server. Please check your Vercel Project Settings > Environment Variables.';
      }
      throw new Error(friendlyMessage);
    }
  },

  /**
   * AI Academic Concept Assistant
   */
  async generateAcademicAssist(question: string, subject = 'General Academics') {
    return apiRequest<{ explanation: string; answer: string }>('/api/ai/academic-assist', {
      method: 'POST',
      body: JSON.stringify({ question, subject }),
    });
  },

  /**
   * AI Study Schedule Planner
   */
  async generateStudyPlan(params: {
    examDate: string;
    subjects: string[];
    dailyHours: number;
    currentProgress?: string;
  }) {
    return apiRequest<{ plan: any }>('/api/ai/study-planner', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  /**
   * AI Financial Copilot Insights
   */
  async generateFinancialInsights(params: {
    expenses: any[];
    budget?: any;
  }) {
    return apiRequest<{ analysis: any }>('/api/ai/financial-insights', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  /**
   * Submit user feedback on AI responses for reliability tracking
   */
  async submitFeedback(params: {
    messageId: string;
    rating: 'helpful' | 'unhelpful';
    reason?: string;
    comment?: string;
    query?: string;
    response?: string;
  }) {
    return apiRequest<{ success: boolean; feedback: any }>('/api/ai/feedback', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  /**
   * AI Voice Transcription (supports English, Bengali, mixed Bengali-English/Banglish)
   */
  async transcribeVoice(params: {
    audioBase64: string;
    mimeType?: string;
  }): Promise<{ transcript: string; success?: boolean }> {
    return apiRequest<{ transcript: string; success?: boolean }>(
      '/api/ai/transcribe-voice',
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    );
  },
};
