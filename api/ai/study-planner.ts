import { Type } from '@google/genai';
import { generateGeminiContentWithFallback } from '../../src/server/geminiCore';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { examDate = 'Upcoming Exam', subjects = ['Core Coursework'], dailyHours = 3, currentProgress = '50%' } = body;
    const activeSubs = Array.isArray(subjects) && subjects.length > 0 ? subjects : ['Core Coursework'];
    const hours = Number(dailyHours) || 3;

    const prompt = `You are a high-performing university study strategist.
Create an actionable, day-by-day exam revision plan for a university student.
Parameters:
- Target Exam Date: ${examDate}
- Enrolled Subjects: ${activeSubs.join(', ')}
- Daily Available Study Hours: ${hours} hours/day
- Current Progress / Mastery: ${currentProgress}

Generate a structured study plan JSON containing:
1. summary: string (high-level executive overview)
2. dailyBlocks: array of 5-8 daily milestone objects with:
  - day: string (e.g. "Day 1 - Fundamentals & Theory")
  - subject: string
  - topic: string
  - durationMins: number
  - strategy: string (e.g. "Active recall + solve 3 past exam problems")
3. strategies: array of 3-4 evidence-based study retention techniques (e.g. Feynman technique, Spaced repetition schedule).`;

    const response = await generateGeminiContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            dailyBlocks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING },
                  subject: { type: Type.STRING },
                  topic: { type: Type.STRING },
                  durationMins: { type: Type.INTEGER },
                  strategy: { type: Type.STRING },
                },
                required: ['day', 'subject', 'topic', 'durationMins', 'strategy'],
              },
            },
            strategies: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['summary', 'dailyBlocks', 'strategies'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.status(200).json({
      plan: parsed,
      summary: parsed.summary,
      dailyBlocks: parsed.dailyBlocks,
      planTitle: 'AI Optimized Exam Strategy',
      totalRecommendedHours: hours * (parsed.dailyBlocks?.length || 7),
      strategies: parsed.strategies,
    });
  } catch (error: any) {
    console.error('[Campusly Study Planner Error]:', error?.message || error);
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const activeSubs = Array.isArray(body.subjects) && body.subjects.length > 0 ? body.subjects : ['Core Coursework'];
    const hours = Number(body.dailyHours) || 3;
    const fallbackBlocks = activeSubs.flatMap((sub: string, i: number) => [
      {
        day: `Day ${i * 2 + 1} - Fundamentals`,
        subject: sub,
        topic: 'Core Theory, Key Formulas & Theorems',
        durationMins: Math.round((hours * 60) / 2),
        strategy: 'Read lecture notes and create active recall flashcards',
      },
      {
        day: `Day ${i * 2 + 2} - Problem Solving`,
        subject: sub,
        topic: 'Past Midterm & Final Exam Questions',
        durationMins: Math.round((hours * 60) / 2),
        strategy: 'Timed problem-solving under exam conditions',
      },
    ]);

    const plan = {
      summary: `Structured ${hours} hours/day revision schedule covering ${activeSubs.length} course subjects.`,
      dailyBlocks: fallbackBlocks,
      strategies: [
        'Use Pomodoro 50/10 focus blocks to avoid cognitive fatigue.',
        'Prioritize high-weightage chapters first thing in the morning.',
        'Dedicate the final 48 hours purely to past paper timed drills.',
      ],
    };

    return res.status(200).json({
      plan,
      summary: plan.summary,
      dailyBlocks: plan.dailyBlocks,
      planTitle: 'Custom Exam Mastery Schedule',
      totalRecommendedHours: hours * 7,
      strategies: plan.strategies,
    });
  }
}
