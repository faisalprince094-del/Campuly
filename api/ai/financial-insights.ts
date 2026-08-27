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

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const expenses = Array.isArray(body.expenses) ? body.expenses : [];
  const monthlyBudget = body.budget?.monthlyLimit || 12000;
  const currency = body.currency || '৳';
  const totalSpent = expenses.reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0);

  const prompt = `You are a supportive, smart student financial advisor for university students.
Analyze this student's spending and budget data:

Total Monthly Budget: ${currency}${monthlyBudget}
Total Spent So Far: ${currency}${totalSpent}
Expenses List (${expenses.length} records):
${JSON.stringify(expenses.slice(0, 25))}

Provide:
1. summary: A concise 2-sentence financial overview of their spending patterns, budget health, and biggest categories.
2. tips: An array of 3-4 concise, practical student savings tips (e.g. meal prep, student transport discounts, shared textbooks).
3. insights: Array of 3 objects with { title, message, severity: ("info" | "warning" | "success") }`;

  try {
    const response = await generateGeminiContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            tips: { type: Type.ARRAY, items: { type: Type.STRING } },
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  message: { type: Type.STRING },
                  severity: { type: Type.STRING },
                },
                required: ['title', 'message', 'severity'],
              },
            },
          },
          required: ['summary', 'tips'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const analysis = {
      summary:
        parsed.summary ||
        `You have spent ${currency}${totalSpent} out of your ${currency}${monthlyBudget} monthly budget. Tracking regularly keeps your finances healthy.`,
      tips:
        Array.isArray(parsed.tips) && parsed.tips.length > 0
          ? parsed.tips
          : [
              `Planning weekly cafeteria meals and bringing homemade snacks can save around ${currency}800/month.`,
              `Take advantage of student semester passes for campus transit.`,
              `Split bulk stationery and printing costs with course study groups.`,
            ],
    };

    return res.status(200).json({
      analysis,
      summary: analysis.summary,
      tips: analysis.tips,
      insights: parsed.insights || [
        {
          title: 'Budget Status',
          message: analysis.summary,
          severity: totalSpent > monthlyBudget ? 'warning' : 'success',
        },
      ],
    });
  } catch (err: any) {
    console.error('[Campusly Financial Insights Error]:', err?.message || err);
    const analysis = {
      summary: `You have utilized ${Math.round((totalSpent / (monthlyBudget || 1)) * 100)}% of your monthly allowance (${currency}${totalSpent} of ${currency}${monthlyBudget}).`,
      tips: [
        `Dining & Cafeteria: Meal prepping lunches 2 days a week can reduce weekly food expenses by 20%.`,
        `Transit & Commute: Use student concession ID cards for discounted metro and bus passes.`,
        `Course Materials: Check the university central library for reserved textbook copies before purchasing.`,
      ],
    };

    return res.status(200).json({
      analysis,
      summary: analysis.summary,
      tips: analysis.tips,
      insights: [
        {
          title: 'Food & Dining Trend',
          message: `Food spending accounts for a significant portion of your weekly expenses. Planning lunches ahead saves pocket money.`,
          severity: 'info',
        },
        {
          title: 'Allowance Pacing',
          message: `Track your recurring study costs early in the term to avoid month-end shortages.`,
          severity: totalSpent > monthlyBudget ? 'warning' : 'success',
        },
        {
          title: 'Academic Group Discounts',
          message: `Collaborating on study materials and book rentals saves up to 40% per semester.`,
          severity: 'info',
        },
      ],
    });
  }
}
