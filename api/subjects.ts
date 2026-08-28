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
    const userSubjects = db.subjects.filter((s) => s.userId === userId);
    return res.status(200).json(userSubjects);
  }

  if (req.method === 'POST') {
    const body = parseServerlessBody(req);
    const newSubject = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      name: body.name || 'Untitled Subject',
      code: body.code || '',
      color: body.color || '#3B82F6',
      icon: body.icon || 'BookOpen',
      instructor: body.instructor || '',
      creditHours: Number(body.creditHours) || 3,
      targetGrade: body.targetGrade || 'A',
      currentGrade: body.currentGrade || 'A',
      syllabusProgress: Number(body.syllabusProgress) || 0,
      roomNumber: body.roomNumber || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.subjects.push(newSubject as any);
    saveDB(db);
    return res.status(201).json(newSubject);
  }

  if (req.method === 'DELETE') {
    const subjectId = req.query.id as string;
    if (!subjectId) return res.status(400).json({ error: 'Subject ID required' });

    db.subjects = db.subjects.filter((s) => s.id !== subjectId || s.userId !== userId);
    saveDB(db);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
