import {
  setCorsHeaders,
  getAuthContextFromRequest,
  getUserIdFromRequest,
  loadDB,
  sanitizeUser,
} from '../../src/server/dbCore';
import { createSessionToken } from '../../src/server/authCore';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed. Expected GET.' });
  }

  try {
    const auth = getAuthContextFromRequest(req);
    if (auth && auth.user) {
      if (auth.user.status === 'inactive') {
        return res.status(403).json({ error: 'Your account has been deactivated. Please contact the administrator.' });
      }
      return res.status(200).json({
        user: sanitizeUser(auth.user),
        token: createSessionToken(auth.user.id, auth.user.role || 'student'),
      });
    }

    const userId = getUserIdFromRequest(req);
    const db = loadDB();
    const fallbackUser = db.users.find((u) => u.id === userId) || db.users[0];
    return res.status(200).json({
      user: sanitizeUser(fallbackUser),
      token: fallbackUser.id,
    });
  } catch (error: any) {
    console.error('[Campusly Auth Me Error]:', error);
    return res.status(500).json({ error: error?.message || 'Failed to verify session.' });
  }
}
