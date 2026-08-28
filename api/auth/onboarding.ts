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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed.' });
  }

  try {
    const userId = getUserIdFromRequest(req);
    const { name, university, department, semester, subjects, monthlyBudget, dailyStudyGoalMinutes } = parseServerlessBody(req);
    const db = loadDB();
    const userIndex = db.users.findIndex((u) => u.id === userId);

    if (userIndex !== -1) {
      if (name) db.users[userIndex].name = name;
      if (university) {
        db.users[userIndex].university = university;
        db.users[userIndex].institution = university;
      }
      if (department) db.users[userIndex].department = department;
      if (semester) {
        db.users[userIndex].semester = semester;
        db.users[userIndex].academicLevel = semester;
      }
      db.users[userIndex].preferences.onboardingCompleted = true;
      if (monthlyBudget) db.users[userIndex].preferences.monthlyBudgetAmount = Number(monthlyBudget);
      if (dailyStudyGoalMinutes) db.users[userIndex].preferences.dailyStudyGoalMinutes = Number(dailyStudyGoalMinutes);

      if (Array.isArray(subjects) && subjects.length > 0) {
        const colors = ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#6366F1'];
        subjects.forEach((subName: string, idx: number) => {
          if (subName && typeof subName === 'string' && subName.trim()) {
            db.subjects.push({
              id: `sub_${Date.now()}_${idx}`,
              userId,
              name: subName.trim(),
              icon: 'BookOpen',
              color: colors[idx % colors.length],
              creditHours: 3,
              createdAt: new Date().toISOString(),
            });
          }
        });
      }

      saveDB(db);
      return res.status(200).json({ user: sanitizeUser(db.users[userIndex]) });
    }

    return res.status(404).json({ error: 'User not found' });
  } catch (error: any) {
    console.error('[Campusly Onboarding Error]:', error);
    return res.status(500).json({ error: error?.message || 'Failed to complete onboarding.' });
  }
}
