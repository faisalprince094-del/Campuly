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
    const { audioBase64, mimeType = 'audio/webm' } = body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'Audio data is required', transcript: '' });
    }

    const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '');

    const response = await generateGeminiContentWithFallback({
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'audio/webm',
              data: cleanBase64,
            },
          },
          {
            text: `You are a multilingual speech-to-text transcriber for university students in Bangladesh and worldwide.
The student might speak in English, Bengali (বাংলা), or mixed Bengali-English ("Banglish").

RULES:
1. Accurately transcribe the spoken words into written text.
2. If spoken in Bengali, transcribe in accurate Bengali script or Romanized Banglish matching the speaker's natural expression.
3. If spoken in English, transcribe into clean English.
4. Output ONLY the raw transcribed text. Do NOT include prefixes, quotes, explanations, or metadata.`,
          },
        ],
      },
    });

    const transcript = response.text?.trim() || '';
    return res.status(200).json({ transcript, success: true });
  } catch (err: any) {
    console.error('[Campusly Voice Transcription Error]:', err?.message || err);
    return res.status(500).json({
      error: err?.message || 'Failed to transcribe audio',
      transcript: '',
    });
  }
}
