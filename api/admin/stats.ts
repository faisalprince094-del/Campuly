import { setCorsHeaders, getAuthContextFromRequest, loadDB } from '../../src/server/dbCore';

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
    if (!auth || auth.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied. Administrator privileges required.' });
    }

    const db = loadDB();
    const students = db.users.filter((u) => u.role !== 'admin');
    const activeStudents = students.filter((u) => u.status !== 'inactive');
    const inactiveStudents = students.filter((u) => u.status === 'inactive');

    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const recentRegistrationsCount = students.filter(
      (u) => u.createdAt && now - new Date(u.createdAt).getTime() <= sevenDaysMs
    ).length;
    const recentActiveCount = students.filter(
      (u) => u.lastLoginAt && now - new Date(u.lastLoginAt).getTime() <= sevenDaysMs
    ).length;

    const totalStudyMinutes = db.studySessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
    const totalStudyHours = Math.round((totalStudyMinutes / 60) * 10) / 10;

    return res.status(200).json({
      totalStudents: students.length,
      activeStudents: activeStudents.length,
      inactiveStudents: inactiveStudents.length,
      recentRegistrationsCount,
      recentActiveCount,
      totalTasks: db.tasks.length,
      totalStudyHours,
      totalExpensesLogged: db.expenses.length,
      totalPresentationsCreated: db.presentations.length,
    });
  } catch (error: any) {
    console.error('[Campusly Admin Stats Error]:', error);
    return res.status(500).json({ error: error?.message || 'Failed to retrieve admin stats.' });
  }
}
