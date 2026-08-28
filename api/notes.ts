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
    const userNotes = db.notes.filter((n) => n.userId === userId);
    return res.status(200).json(userNotes);
  }

  if (req.method === 'POST') {
    const body = parseServerlessBody(req);
    const newNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      title: body.title || 'Untitled Note',
      content: body.content || '',
      subjectId: body.subjectId || null,
      tags: Array.isArray(body.tags) ? body.tags : [],
      isPinned: Boolean(body.isPinned),
      color: body.color || '#3B82F6',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.notes.unshift(newNote as any);
    saveDB(db);
    return res.status(201).json(newNote);
  }

  if (req.method === 'DELETE') {
    const noteId = req.query.id as string;
    if (!noteId) return res.status(400).json({ error: 'Note ID required' });

    db.notes = db.notes.filter((n) => n.id !== noteId || n.userId !== userId);
    saveDB(db);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
