import {
  setCorsHeaders,
  parseServerlessBody,
  getUserIdFromRequest,
  loadDB,
  saveDB,
  sanitizeUser,
} from '../../src/server/dbCore';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PUT' && req.method !== 'PATCH' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed.' });
  }

  try {
    const userId = getUserIdFromRequest(req);
    const body = parseServerlessBody(req);
    const db = loadDB();
    const index = db.users.findIndex((u) => u.id === userId);

    if (index !== -1) {
      const currentUser = db.users[index];
      db.users[index] = {
        ...currentUser,
        ...body,
        institution: body.institution || body.university || currentUser.institution,
        academicLevel: body.academicLevel || body.semester || currentUser.academicLevel,
        university: body.university || body.institution || currentUser.university,
        department: body.department || currentUser.department,
        semester: body.semester || body.academicLevel || currentUser.semester,
        studentId: body.studentId !== undefined ? body.studentId : currentUser.studentId,
        preferences: {
          ...currentUser.preferences,
          ...(body.preferences || {}),
        },
      };
      saveDB(db);
      return res.status(200).json({ user: sanitizeUser(db.users[index]) });
    }

    return res.status(404).json({ error: 'User not found' });
  } catch (error: any) {
    console.error('[Campusly Profile Update Error]:', error);
    return res.status(500).json({ error: error?.message || 'Failed to update profile.' });
  }
}
