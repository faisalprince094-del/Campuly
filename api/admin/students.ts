import {
  setCorsHeaders,
  getAuthContextFromRequest,
  loadDB,
  saveDB,
} from '../../src/server/dbCore';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const auth = getAuthContextFromRequest(req);
  if (!auth || auth.role !== 'admin') {
    return res.status(403).json({ error: 'Access Denied. Administrator privileges required.' });
  }

  const db = loadDB();

  // DELETE single student
  if (req.method === 'DELETE') {
    const studentId = req.query.id as string;
    if (!studentId) {
      return res.status(400).json({ error: 'Student ID required.' });
    }

    const userIndex = db.users.findIndex((u) => u.id === studentId);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    if (db.users[userIndex].role === 'admin') {
      return res.status(400).json({ error: 'Cannot delete administrator account.' });
    }

    db.users.splice(userIndex, 1);
    db.tasks = db.tasks.filter((t) => t.userId !== studentId);
    db.expenses = db.expenses.filter((e) => e.userId !== studentId);
    db.budgets = db.budgets.filter((b) => b.userId !== studentId);
    db.studySessions = db.studySessions.filter((s) => s.userId !== studentId);
    db.events = db.events.filter((ev) => ev.userId !== studentId);
    db.presentations = db.presentations.filter((p) => p.userId !== studentId);
    db.notifications = db.notifications.filter((n) => n.userId !== studentId);
    db.notes = db.notes.filter((no) => no.userId !== studentId);
    db.subjects = db.subjects.filter((sub) => sub.userId !== studentId);

    saveDB(db);
    return res.status(200).json({ success: true, message: 'Student account and data deleted successfully.' });
  }

  if (req.method === 'GET') {
    const searchQuery = String(req.query.q || '').trim().toLowerCase();
    const statusFilter = String(req.query.status || 'all').trim().toLowerCase();
    const institutionFilter = String(req.query.institution || 'all').trim().toLowerCase();
    const levelFilter = String(req.query.level || 'all').trim().toLowerCase();

    let students = db.users.filter((u) => u.role !== 'admin');

    if (statusFilter === 'active') {
      students = students.filter((u) => u.status !== 'inactive');
    } else if (statusFilter === 'inactive') {
      students = students.filter((u) => u.status === 'inactive');
    }

    if (institutionFilter && institutionFilter !== 'all') {
      students = students.filter((u) => {
        const inst = (u.institution || u.university || '').toLowerCase();
        return inst === institutionFilter || inst.includes(institutionFilter);
      });
    }

    if (levelFilter && levelFilter !== 'all') {
      students = students.filter((u) => {
        const lvl = (u.academicLevel || u.semester || '').toLowerCase();
        return lvl === levelFilter || lvl.includes(levelFilter);
      });
    }

    if (searchQuery) {
      students = students.filter((u) => {
        const name = (u.name || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const studentId = (u.studentId || '').toLowerCase();
        const institution = (u.institution || u.university || '').toLowerCase();
        const department = (u.department || '').toLowerCase();
        const level = (u.academicLevel || u.semester || '').toLowerCase();
        return (
          name.includes(searchQuery) ||
          email.includes(searchQuery) ||
          studentId.includes(searchQuery) ||
          institution.includes(searchQuery) ||
          department.includes(searchQuery) ||
          level.includes(searchQuery)
        );
      });
    }

    const result = students.map((s) => {
      const userTasks = db.tasks.filter((t) => t.userId === s.id);
      const userSessions = db.studySessions.filter((ss) => ss.userId === s.id);
      const userExpenses = db.expenses.filter((e) => e.userId === s.id);
      const userPres = db.presentations.filter((p) => p.userId === s.id);
      const userNotes = db.notes.filter((n) => n.userId === s.id);

      const studyMinutes = userSessions.reduce((acc, ss) => acc + (ss.durationMinutes || 0), 0);

      return {
        id: s.id,
        name: s.name || 'Student',
        email: s.email,
        studentId: s.studentId || 'N/A',
        institution: s.institution || s.university || 'N/A',
        academicLevel: s.academicLevel || s.semester || 'N/A',
        department: s.department || 'General',
        semester: s.semester || s.academicLevel || 'N/A',
        role: s.role || 'student',
        status: s.status === 'inactive' ? 'inactive' : 'active',
        profilePhoto: s.profilePhoto || '',
        createdAt: s.createdAt || new Date().toISOString(),
        lastLoginAt: s.lastLoginAt || s.createdAt || new Date().toISOString(),
        loginCount: typeof s.loginCount === 'number' ? s.loginCount : 1,
        stats: {
          tasksCount: userTasks.length,
          completedTasksCount: userTasks.filter((t) => t.completed).length,
          studyMinutes,
          studySessionsCount: userSessions.length,
          expensesCount: userExpenses.length,
          presentationsCount: userPres.length,
          notesCount: userNotes.length,
        },
      };
    });

    return res.status(200).json(result);
  }

  return res.status(405).json({ error: 'Method Not Allowed.' });
}
