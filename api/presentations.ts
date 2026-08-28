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
    const userPres = db.presentations.filter((p) => p.userId === userId);
    return res.status(200).json(userPres);
  }

  if (req.method === 'POST') {
    const body = parseServerlessBody(req);
    const action = req.query.action as string;
    const presId = req.query.id as string;

    if (action === 'duplicate' && presId) {
      const source = db.presentations.find((p) => p.id === presId && p.userId === userId);
      if (!source) return res.status(404).json({ error: 'Presentation not found' });

      const duplicate = {
        ...source,
        id: `pres_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: `${source.title} (Copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.presentations.unshift(duplicate as any);
      saveDB(db);
      return res.status(201).json(duplicate);
    }

    const newPres = {
      id: body.id || `pres_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      title: body.title || 'Untitled Presentation',
      subtitle: body.subtitle || '',
      subjectId: body.subjectId || null,
      theme: body.theme || 'academic',
      style: body.style || 'academic',
      slideCount: Number(body.slideCount) || (Array.isArray(body.slides) ? body.slides.length : 6),
      slides: Array.isArray(body.slides) ? body.slides : [],
      keyTakeaway: body.keyTakeaway || '',
      sources: Array.isArray(body.sources) ? body.sources : [],
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const existingIdx = db.presentations.findIndex((p) => p.id === newPres.id && p.userId === userId);
    if (existingIdx !== -1) {
      db.presentations[existingIdx] = {
        ...db.presentations[existingIdx],
        ...newPres,
        updatedAt: new Date().toISOString(),
      };
      saveDB(db);
      return res.status(200).json(db.presentations[existingIdx]);
    }

    db.presentations.unshift(newPres as any);
    saveDB(db);
    return res.status(201).json(newPres);
  }

  if (req.method === 'DELETE') {
    const presId = req.query.id as string;
    if (!presId) return res.status(400).json({ error: 'Presentation ID required' });

    db.presentations = db.presentations.filter((p) => p.id !== presId || p.userId !== userId);
    saveDB(db);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
