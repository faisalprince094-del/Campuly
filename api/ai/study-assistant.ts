import { executeStudyAssistant } from '../../src/server/geminiCore';

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed', reply: 'Only POST method is supported.' });
  }

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

    const result = await executeStudyAssistant(body);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[Campusly Vercel AI Error]:', error?.message || error);
    return res.status(200).json({
      reply: 'Hello! I am ready to help you with your coursework, study questions, or exam preparation. Please ask any question to get started!',
      fallbackUsed: true,
      error: error?.message || 'Recovered with standard tutor response',
    });
  }
}
