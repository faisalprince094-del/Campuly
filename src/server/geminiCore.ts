import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

// Ensure environment variables are loaded in all runtime contexts
try {
  dotenv.config();
} catch {
  // Ignore in serverless environments where dotenv is not required
}

/**
 * Resilient API Key Resolver supporting multiple common Vercel/Production env var aliases.
 * Cleans surrounding quotes, whitespace, and carriage returns.
 */
export function getGeminiApiKey(): string {
  const rawKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    process.env.REACT_APP_GEMINI_API_KEY ||
    process.env.AI_STUDIO_KEY ||
    process.env.API_KEY ||
    '';
  return rawKey.trim().replace(/^["']|["']$/g, '').replace(/[\r\n]+/g, '');
}

/**
 * Lazy Gemini SDK client factory with user-agent telemetry header.
 */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = getGeminiApiKey();
  return new GoogleGenAI({
    apiKey: apiKey || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Production-ready Gemini Model List with fast execution and fallback resilience.
 * 'gemini-3.6-flash' and 'gemini-3.1-flash-lite' provide high speed and stability under Vercel serverless timeouts.
 */
const customModel = process.env.GEMINI_MODEL?.trim();
export const GEMINI_MODELS = [
  ...(customModel ? [customModel] : []),
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.7-flash',
];
export const PRIMARY_GEMINI_MODEL = GEMINI_MODELS[0];

/**
 * Helper to race a promise against a timeout (default 8.5s to fit within Vercel's 10-15s serverless limit)
 */
function withTimeout<T>(promise: Promise<T>, ms: number = 8500, errorMsg: string = 'Operation timed out'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMsg));
    }, ms);

    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Generates content using the Gemini SDK with automatic multi-model fallback and timeout management.
 */
export async function generateGeminiContentWithFallback(params: {
  contents: any;
  config?: any;
}) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured on the production server. Please add GEMINI_API_KEY in your Vercel Project Settings > Environment Variables, then redeploy.'
    );
  }

  const client = getGeminiClient();
  let lastError: any = null;

  for (const modelName of GEMINI_MODELS) {
    try {
      const response = await withTimeout(
        client.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: params.config,
        }),
        8500,
        `Model ${modelName} timed out`
      );
      return response;
    } catch (err: any) {
      console.warn(`[Campusly AI] Model ${modelName} encountered issue, trying fallback:`, err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to generate response with Gemini');
}

/**
 * Comprehensive fallback answer generator when Gemini API key is missing or experiencing quota limits on Vercel.
 * Provides high-quality academic mentoring so students are never presented with a blank or broken state.
 */
export function generateLocalMentorFallback(
  userQuery: string,
  mode: string = 'general',
  profileContext?: { name?: string; university?: string; department?: string; semester?: string }
): string {
  const queryLower = userQuery.toLowerCase();
  const studentName = profileContext?.name || 'Student';

  // 1. Campusly Identity and Background
  if (
    queryLower.includes('campusly') ||
    queryLower.includes('who created') ||
    queryLower.includes('developer') ||
    queryLower.includes('foyshal') ||
    queryLower.includes('creator') ||
    queryLower.includes('about this app')
  ) {
    return `### About Campusly & Campusly AI 🎓

**Campusly** is an all-in-one student productivity and learning platform designed to help university students excel in their academic, study planning, financial management, presentation building, and daily campus workflows.

- **Creator & Developer:** Campusly was built by **Foyshal Mahmud Prince**, a student in the Department of Management at **Jashore University of Science and Technology (JUST)**.
- **Purpose:** To empower students with centralized academic tools—including intelligent AI study assistance, interactive presentation generation, exam revision planners, class schedule management, and expense tracking.

Feel free to ask any academic question, request a concept explanation, create flashcards, or plan your study routine!`;
  }

  // 2. Exam Preparation & Study Strategy
  if (
    queryLower.includes('exam') ||
    queryLower.includes('study') ||
    queryLower.includes('prepare') ||
    queryLower.includes('routine') ||
    queryLower.includes('revision') ||
    queryLower.includes('pariksha') ||
    queryLower.includes('kivabe')
  ) {
    return `### High-Yield Exam Preparation Framework 📚

Here is a structured, science-backed study approach for **${studentName}**:

1. **Active Recall & Feynman Technique:**
   - Don't just re-read notes passively. Close your book and explain core concepts in your own simple words or solve practice questions.
2. **Pomodoro Focus Intervals:**
   - 25 minutes of deep, uninterrupted focus followed by a 5-minute breather. After 4 cycles, take a longer 20-minute break.
3. **Spaced Repetition Schedule:**
   - Review difficult topics on Day 1, Day 3, and Day 7 to commit them to long-term memory.
4. **Prioritize High-Weightage Topics:**
   - Analyze past semester question papers and master foundational formulas, definitions, and case studies first.

*What specific subject or topic are you studying right now? Ask me about any specific concept, and I'll break it down step-by-step for you!*`;
  }

  // 3. Time Management & Productivity
  if (
    queryLower.includes('time') ||
    queryLower.includes('schedule') ||
    queryLower.includes('procrastinat') ||
    queryLower.includes('focus') ||
    queryLower.includes('lazy')
  ) {
    return `### Overcoming Procrastination & Mastering Study Time ⏱️

1. **The 2-Minute Rule:** If a study task takes less than two minutes (organizing notes, checking lecture slides), do it immediately.
2. **Time-Blocking:** Dedicate specific 1-hour slots in your calendar for individual subjects rather than general "study time".
3. **Eliminate Friction:** Keep your study desk clean and put your phone in another room or on Do Not Disturb mode during study blocks.
4. **Task Decomposition:** Break large assignments into micro-steps (e.g., "Outline slide 1-3" instead of "Finish presentation").

How can I help you organize your study session today?`;
  }

  // 4. Default Academic Guidance
  return `### Academic Concept Guidance & Mentorship 💡

Hello **${studentName}**! I'm here to help you understand your coursework, prepare for tests, and clarify academic topics.

Regarding your question:
> *"${userQuery}"*

To give you the most accurate and in-depth breakdown:
1. **Key Concept:** Focus on the foundational principles, definitions, and relationships within this topic.
2. **Practical Application:** Connect the theory to real-world examples or semester exam questions.
3. **Step-by-Step Breakdown:** Break down any formulas, steps, or arguments logically.

*(Note for Administrator: To enable real-time Gemini AI generation on Vercel, ensure \`GEMINI_API_KEY\` is added in your Vercel Project Settings > Environment Variables, then redeploy.)*`;
}

/**
 * Builds the comprehensive system instruction for Campusly AI.
 */
export const buildStudyAssistantSystemInstruction = (
  mode: string = 'general',
  profileContext?: { name?: string; university?: string; department?: string; semester?: string },
  subjectContext?: string,
  providedMaterial?: string
) => {
  let modeSpecific = '';
  switch (mode) {
    case 'study_tutor':
      modeSpecific = `MODE: Study Tutor. Focus on pedagogical explanations, conceptual clarity, step-by-step breakdowns, and active student comprehension.`;
      break;
    case 'exam_prep':
      modeSpecific = `MODE: Exam Preparation. Focus on high-yield exam topics, common traps, key formulas, memorization techniques, and practice problem solving.`;
      break;
    case 'presentation_help':
      modeSpecific = `MODE: Presentation Help. Focus on clear speech structure, slide talking points, hook introductions, concise bullet summaries, and executive delivery.`;
      break;
    case 'writing_help':
      modeSpecific = `MODE: Writing Assistant. Focus on academic clarity, formal vocabulary, paragraph flow, thesis articulation, and grammatical precision.`;
      break;
    case 'general':
    default:
      modeSpecific = `MODE: General Academic Assistant. Provide well-rounded, rigorous academic tutoring tailored for university students.`;
      break;
  }

  let studentProfile = '';
  if (profileContext?.department || profileContext?.university) {
    studentProfile = `STUDENT PROFILE: Studying ${profileContext.department || 'Coursework'} at ${profileContext.university || 'University'}, Semester: ${profileContext.semester || 'Current'}. Adapt explanations to this academic level.`;
  }

  let subjectSnippet = '';
  if (subjectContext && subjectContext !== 'all') {
    subjectSnippet = `ACTIVE SUBJECT SCOPE: ${subjectContext}. Prioritize context, terminology, and standard frameworks for this field.`;
  }

  let materialSnippet = '';
  if (providedMaterial && providedMaterial.trim().length > 0) {
    materialSnippet = `=== USER-PROVIDED STUDY MATERIAL / NOTES ===
"""
${providedMaterial.trim()}
"""
CRITICAL MATERIAL RULES:
1. Answer primarily from the provided material above.
2. Do not contradict the provided notes unless explicitly asked by the student to review them for correctness.
3. If the provided material does NOT contain sufficient information to answer the question:
   State clearly: "This information is not clearly available in the provided material."
4. If you subsequently provide additional general knowledge, clearly separate it using distinct headings:
   "**From your notes:** ..."
   "**Additional context:** ..."`;
  }

  return `You are Campusly AI, the intelligent, friendly, and professional AI student companion inside the Campusly app.

## Identity and App Background
- Campusly is an all-in-one student-focused platform created to help university and college students with their everyday academic, university, productivity, planning, financial, study, and personal-support needs (including study timers, expense tracking, presentation maker, subject planning, and AI assistance).
- Creator & Developer: Campusly was created by Foyshal Mahmud Prince, who is currently studying in the Department of Management at Jashore University of Science and Technology (JUST).
- When a student asks "What is Campusly?", "Who created Campusly?", "Why was Campusly created?", "What can Campusly AI do?", "Who is the developer?", or "What is the purpose of this app?":
  Answer directly, accurately, and naturally that Campusly is a student-focused platform built by Foyshal Mahmud Prince to support students across academic, productivity, study, financial, and planning needs. Do NOT say the app exists only for a simple chatbot—Campusly AI is an integral part of the broader Campusly platform.

## High Intelligence and Direct Answering Rules
- Understand the student's complete question and previous conversation context.
- Always provide a direct, precise answer first. Do NOT start with generic fluff or repeat unnecessary preamble.
- Follow up with a clear, structured explanation and actionable, practical steps or examples.
- Never give generic answers. If a student asks a specific academic or university question, answer that exact subject or topic directly.
- If the student's request is genuinely ambiguous or mistranscribed, ask a short, polite clarifying question instead of guessing blindly.
- Prioritize high factual accuracy. Never fabricate dates, sources, university policies, formulas, or facts. If uncertain, clearly state the uncertainty.
- For calculations (math, accounting, economics, science), verify the steps and math carefully before answering.

## Tone and Mentorship
- Friendly, professional, intelligent, patient, respectful, and supportive — like a knowledgeable, encouraging senior student mentor.
- Use clean, easily readable formatting. Break down complex concepts into digestible insights.

## Student Emotional & Motivational Support
- When students feel stressed, overwhelmed, or anxious about exams or deadlines, provide genuine, context-aware empathy along with practical, manageable next steps (e.g. breaking tasks down, 25-minute focus intervals).
- Safety: Do not pretend to be a doctor, therapist, or mental health professional. For serious distress or crisis, respond with care and encourage them to connect with campus counseling or professional emergency support.

## Multilingual Understanding & English Output
- Students may speak or type in English, Bengali (বাংলা), or mixed Bengali-English ("Banglish", e.g., "Amar exam preparation kivabe korbo?").
- Understand Bengali, English, and Banglish input accurately without losing the student's intended meaning.
- ALWAYS formulate your response in clear, natural, conversational ENGLISH, unless the student explicitly asks you to reply in another language.

${modeSpecific}
${studentProfile}
${subjectSnippet}
${materialSnippet}`;
};

/**
 * Sanitizes and formats chat history into strictly alternating user/model content blocks.
 */
export function formatGeminiContents(
  chatHistory: Array<{ role: string; content: string }>,
  currentMessage?: string,
  actionInstruction?: string
): Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> {
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  // Filter out invalid/empty/error messages from prior turns
  const cleanHistory = (chatHistory || []).filter((m) => {
    if (!m || typeof m.content !== 'string') return false;
    const trimmed = m.content.trim();
    if (!trimmed) return false;
    if (
      trimmed.startsWith('Unable to generate') ||
      trimmed.startsWith('Failed to generate') ||
      trimmed.includes('Something went wrong while generating')
    ) {
      return false;
    }
    return true;
  });

  // Ensure strict alternating roles starting with 'user'
  for (const item of cleanHistory) {
    const role: 'user' | 'model' =
      item.role === 'assistant' || item.role === 'model' ? 'model' : 'user';

    if (contents.length === 0) {
      if (role === 'user') {
        contents.push({ role: 'user', parts: [{ text: item.content.trim() }] });
      }
    } else {
      const prevRole = contents[contents.length - 1].role;
      if (prevRole === role) {
        contents[contents.length - 1].parts[0].text += `\n\n${item.content.trim()}`;
      } else {
        contents.push({ role, parts: [{ text: item.content.trim() }] });
      }
    }
  }

  // If action instruction or extra instruction was passed, append to last user message or add new user turn
  if (actionInstruction) {
    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents[contents.length - 1].parts[0].text += `\n\n${actionInstruction}`;
    } else {
      contents.push({ role: 'user', parts: [{ text: actionInstruction }] });
    }
  }

  // Fallback: ensure there is at least one user message
  if (contents.length === 0) {
    const fallbackText = (currentMessage || 'Explain this academic concept clearly.').trim();
    contents.push({ role: 'user', parts: [{ text: fallbackText }] });
  }

  return contents;
}

/**
 * Core Study Assistant execution handler with high resilience and fallback support.
 */
export async function executeStudyAssistant(payload: {
  messages?: Array<{ role: string; content: string }>;
  message?: string;
  mode?: string;
  action?: string;
  profileContext?: { name?: string; university?: string; department?: string; semester?: string };
  subjectContext?: string;
  previousContext?: string;
  providedMaterial?: string;
}) {
  const {
    messages = [],
    message,
    mode = 'general',
    action = 'normal',
    profileContext,
    subjectContext,
    previousContext,
    providedMaterial,
  } = payload;

  // Normalize conversation history
  let rawChatHistory: Array<{ role: string; content: string }> = [];
  if (Array.isArray(messages) && messages.length > 0) {
    rawChatHistory = messages.slice(-8).map((m: any) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      content: String(m.content || ''),
    }));
  } else if (message) {
    rawChatHistory = [{ role: 'user', content: String(message) }];
  } else {
    rawChatHistory = [{ role: 'user', content: 'Hello' }];
  }

  const lastUserMsg =
    rawChatHistory.filter((m) => m.role === 'user').slice(-1)[0]?.content ||
    message ||
    'Explain this academic concept';

  const systemInstruction = buildStudyAssistantSystemInstruction(
    mode,
    profileContext,
    subjectContext,
    providedMaterial
  );

  const apiKey = getGeminiApiKey();

  // If no API key configured on Vercel yet, provide intelligent fallback response
  if (!apiKey) {
    console.warn('[Campusly AI] GEMINI_API_KEY is not configured in environment variables.');
    return {
      reply: generateLocalMentorFallback(lastUserMsg, mode, profileContext),
      mode,
      action,
      fallbackUsed: true,
    };
  }

  // ==================== QUICK ACTION: MULTIPLE CHOICE QUIZ ====================
  if (action === 'make_quiz') {
    const quizPrompt = `Generate an interactive 5-question multiple choice quiz on this academic topic/context:
Context: "${previousContext || lastUserMsg}"
${providedMaterial ? `Source Material:\n"""\n${providedMaterial}\n"""` : ''}

CRITICAL RULES FOR MCQs:
- Exactly 5 multiple-choice questions.
- Exactly one correct answer per question.
- All 4 options (indices 0, 1, 2, 3) must be plausible, distinct, and unambiguous.
- Do not make the correct answer trivially obvious or repetitive.
- Verify the correctAnswer index (0, 1, 2, or 3) matches the exact correct option.
- Provide a clear, thorough explanation of why the correct option is right and why the other choices are incorrect.`;

    try {
      const response = await generateGeminiContentWithFallback({
        contents: quizPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              topic: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.INTEGER },
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctAnswer: { type: Type.INTEGER },
                    explanation: { type: Type.STRING },
                  },
                  required: ['id', 'question', 'options', 'correctAnswer', 'explanation'],
                },
              },
            },
            required: ['title', 'questions'],
          },
        },
      });

      const parsedQuiz = JSON.parse(response.text || '{}');
      if (Array.isArray(parsedQuiz.questions)) {
        parsedQuiz.questions = parsedQuiz.questions.map((q: any, idx: number) => ({
          id: q.id || idx + 1,
          question: q.question || `Question ${idx + 1}`,
          options:
            Array.isArray(q.options) && q.options.length === 4
              ? q.options
              : ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer:
            typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer <= 3
              ? q.correctAnswer
              : 0,
          explanation: q.explanation || 'Verified academic explanation.',
        }));
      }

      return {
        reply: `Here is an interactive practice quiz on **${parsedQuiz.topic || 'your topic'}** to test your knowledge:`,
        quiz: parsedQuiz,
        action: 'make_quiz',
      };
    } catch (err: any) {
      console.warn('[Campusly AI] Quiz generation fallback triggered:', err?.message || err);
      return {
        reply: `Here is a practice review on **${lastUserMsg}**:\n\n1. Review the key terms and definitions.\n2. Summarize the core theoretical principles.\n3. Test your knowledge by solving sample problems.\n\n*(Tip: Verify GEMINI_API_KEY in Vercel settings for full automated quiz generation)*`,
        action: 'make_quiz',
        fallbackUsed: true,
      };
    }
  }

  // ==================== QUICK ACTION: STUDY FLASHCARDS ====================
  if (action === 'create_flashcards') {
    const flashcardPrompt = `Generate a set of 6 to 8 high-yield study flashcards based on this topic/context:
Context: "${previousContext || lastUserMsg}"
${providedMaterial ? `Source Material:\n"""\n${providedMaterial}\n"""` : ''}

Format as JSON with:
- title: string (deck title)
- topic: string
- cards: array of 6 to 8 objects with:
  - id: number
  - front: string (clear question, term, formula, or concept)
  - back: string (concise, accurate definition or explanation)
  - hint: optional short clue`;

    try {
      const response = await generateGeminiContentWithFallback({
        contents: flashcardPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              topic: { type: Type.STRING },
              cards: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.INTEGER },
                    front: { type: Type.STRING },
                    back: { type: Type.STRING },
                    hint: { type: Type.STRING },
                  },
                  required: ['id', 'front', 'back'],
                },
              },
            },
            required: ['title', 'cards'],
          },
        },
      });

      const parsedDeck = JSON.parse(response.text || '{}');
      if (Array.isArray(parsedDeck.cards)) {
        parsedDeck.cards = parsedDeck.cards.map((c: any, idx: number) => ({
          id: c.id || idx + 1,
          front: c.front || `Card ${idx + 1}`,
          back: c.back || 'Definition / Answer',
          hint: c.hint || '',
        }));
      }

      return {
        reply: `Here are **${parsedDeck.cards?.length || 6} flashcards** to help you review **${parsedDeck.topic || 'this topic'}**:`,
        flashcards: parsedDeck,
        action: 'create_flashcards',
      };
    } catch (err: any) {
      console.warn('[Campusly AI] Flashcard generation fallback:', err?.message || err);
      return {
        reply: `Here are core flashcard review points on **${lastUserMsg}**:\n- **Concept definition**: Master the primary theorem.\n- **Application**: Understand how it applies in practice.\n- **Exam point**: Key points frequently tested in semester exams.`,
        action: 'create_flashcards',
        fallbackUsed: true,
      };
    }
  }

  // ==================== SPECIFIC QUICK ACTION DIRECTIVES ====================
  let actionInstruction = '';
  if (action === 'explain_simpler') {
    actionInstruction = `TASK: Explain the previous answer in simple, intuitive terms using plain language and clear analogies for a student struggling with the concept. Keep it accurate and accessible.`;
  } else if (action === 'summarize') {
    actionInstruction = `TASK: Provide a concise high-yield summary of the core concepts in 3 to 5 clear bullet points.`;
  } else if (action === 'give_example') {
    actionInstruction = `TASK: Provide 2 to 3 vivid, real-world practical or industry examples that illustrate this concept in action.`;
  }

  // Build multi-turn content for Gemini
  const contents = formatGeminiContents(rawChatHistory, message, actionInstruction);

  try {
    const response = await generateGeminiContentWithFallback({
      contents,
      config: {
        systemInstruction,
      },
    });

    const replyText = response.text || '';
    if (!replyText.trim()) {
      throw new Error('Empty response received from AI model');
    }

    return {
      reply: replyText,
      mode,
      action,
    };
  } catch (err: any) {
    console.error('[Campusly AI] Execution failed, using resilient fallback:', err?.message || err);
    return {
      reply: generateLocalMentorFallback(lastUserMsg, mode, profileContext),
      mode,
      action,
      fallbackUsed: true,
    };
  }
}
