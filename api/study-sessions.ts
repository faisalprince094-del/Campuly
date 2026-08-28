import {
  setCorsHeaders,
  parseServerlessBody,
  getUserIdFromRequest,
  loadDB,
  saveDB,
} from '../src/server/dbCore';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const userId = getUserIdFromRequest(req);
  const db = loadDB();

  if (req.method === 'GET') {
    const userSessions = db.studySessions.filter((s) => s.userId === userId);
    return res.status(200).json(userSessions);
  }

  if (req.method === 'POST') {
    const body = parseServerlessBody(req);
    const newSession = {
      id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      subjectId: body.subjectId || null,
      durationMinutes: Number(body.durationMinutes) || 25,
      actualDurationSeconds: Number(body.actualDurationSeconds) || (Number(body.durationMinutes) || 25) * 60,
      mode: body.mode || 'focus',
      date: body.date || new Date().toISOString().split('T')[0],
      startTime: body.startTime || new Date().toISOString(),
      endTime: body.endTime || new Date().toISOString(),
      notes: body.notes || '',
      rating: Number(body.rating) || 4,
      completedNormally: body.completedNormally !== undefined ? Boolean(body.completedNormally) : true,
      createdAt: new Date().toISOString(),
    };
    db.studySessions.unshift(newSession as any);
    saveDB(db);
    return res.status(201).json(newSession);
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
