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
    const userEvents = db.events.filter((e) => e.userId === userId);
    return res.status(200).json(userEvents);
  }

  if (req.method === 'POST') {
    const body = parseServerlessBody(req);
    const newEvent = {
      id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      title: body.title || 'Untitled Event',
      description: body.description || '',
      date: body.date || new Date().toISOString().split('T')[0],
      startTime: body.startTime || '09:00',
      endTime: body.endTime || '10:00',
      type: body.type || 'class',
      subjectId: body.subjectId || null,
      location: body.location || '',
      reminderMinutesBefore: Number(body.reminderMinutesBefore) || 30,
      createdAt: new Date().toISOString(),
    };
    db.events.unshift(newEvent as any);
    saveDB(db);
    return res.status(201).json(newEvent);
  }

  if (req.method === 'DELETE') {
    const eventId = req.query.id as string;
    if (!eventId) return res.status(400).json({ error: 'Event ID required' });

    db.events = db.events.filter((e) => e.id !== eventId || e.userId !== userId);
    saveDB(db);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
