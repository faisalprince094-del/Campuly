import { setCorsHeaders, parseServerlessBody, loginStudent } from '../../src/server/dbCore';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Expected POST.' });
  }

  try {
    const body = parseServerlessBody(req);
    const result = loginStudent(body);
    return res.status(result.status).json(result.data);
  } catch (error: any) {
    console.error('[Campusly Login Error]:', error);
    return res.status(500).json({ error: error?.message || 'Authentication failed.' });
  }
}
