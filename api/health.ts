import { getGeminiApiKey } from '../src/server/geminiCore';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const apiKey = getGeminiApiKey();
  const hasKey = Boolean(apiKey && apiKey.length > 5);

  return res.status(200).json({
    status: 'ok',
    service: 'Campusly API',
    hasGeminiKey: hasKey,
    keyPreview: hasKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 3)}` : 'missing',
    environment: process.env.VERCEL ? 'vercel-production' : 'node-server',
    timestamp: new Date().toISOString(),
  });
}
