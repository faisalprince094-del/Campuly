import { generateGeminiContentWithFallback, buildStudyAssistantSystemInstruction } from '../../src/server/geminiCore';

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

  let userQuery = 'Explain this academic concept';
  let subject = 'General Academics';

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    } else if (Buffer.isBuffer(body)) {
      try {
        body = JSON.parse(body.toString('utf-8'));
      } catch {
        body = {};
      }
    } else if (!body) {
      body = {};
    }

    const { question, prompt: rawPrompt, subject: reqSubject = 'General Academics', providedMaterial } = body;
    userQuery = question || rawPrompt || 'Explain this academic concept';
    subject = reqSubject;
    const systemInstruction = buildStudyAssistantSystemInstruction('study_tutor', undefined, subject, providedMaterial);

    const response = await generateGeminiContentWithFallback({
      contents: `Subject Context: ${subject}\n\nStudent Question:\n${userQuery}`,
      config: { systemInstruction },
    });

    const answerText = response.text || '';
    return res.status(200).json({
      explanation: answerText,
      answer: answerText,
    });
  } catch (error: any) {
    console.error('[Campusly Academic Assist Fallback]:', error?.message || error);
    const fallbackAnswer = `### Concept Explanation: ${userQuery}\n\n**Key Academic Principles in ${subject}:**\n1. **Foundational Definition:** Break down the core theoretical terms and relationships.\n2. **Mechanisms & Steps:** Observe how this concept functions in realistic academic scenarios.\n3. **Practical Examples:** Connect this theory with university coursework and exam problems.`;
    return res.status(200).json({
      explanation: fallbackAnswer,
      answer: fallbackAnswer,
      fallbackUsed: true,
    });
  }
}
