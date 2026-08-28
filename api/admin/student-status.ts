import {
  setCorsHeaders,
  parseServerlessBody,
  getAuthContextFromRequest,
  loadDB,
  saveDB,
  sanitizeUser,
} from '../../src/server/dbCore';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PATCH' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Expected PATCH.' });
  }

  const auth = getAuthContextFromRequest(req);
  if (!auth || auth.role !== 'admin') {
    return res.status(403).json({ error: 'Access Denied. Administrator privileges required.' });
  }

  const studentId = req.query.id as string;
  const { status } = parseServerlessBody(req);

  if (status !== 'active' && status !== 'inactive') {
    return res.status(400).json({ error: "Invalid status. Must be 'active' or 'inactive'." });
  }

  const db = loadDB();
  const userIndex = db.users.findIndex((u) => u.id === studentId);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'Student not found.' });
  }

  if (db.users[userIndex].role === 'admin') {
    return res.status(400).json({ error: 'Cannot modify administrator account status.' });
  }

  db.users[userIndex].status = status;
  saveDB(db);

  return res.status(200).json({
    success: true,
    student: sanitizeUser(db.users[userIndex]),
    message: `Student account ${status === 'active' ? 'activated' : 'deactivated'} successfully.`,
  });
}
