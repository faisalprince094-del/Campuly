import { loginStudent, setCorsHeaders } from '../../src/server/dbCore';

export default function handler(req: any, res: any) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const result = loginStudent(req);
    return res.status(result.status).json(result.data);
  } catch (err: any) {
    console.error('[API /api/auth/login Error]:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Server login processing failed',
      message: err?.message || 'Server login processing failed',
    });
  }
}
