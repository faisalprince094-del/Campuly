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
  const currentMonth = new Date().toISOString().slice(0, 7);

  if (req.method === 'GET') {
    let userBudget = db.budgets.find((b) => b.userId === userId && b.monthYear === currentMonth);
    if (!userBudget) {
      userBudget = {
        id: `bud_${Date.now()}`,
        userId,
        monthYear: currentMonth,
        monthlyBudget: 0,
        categoryBudgets: {},
      } as any;
    }
    return res.status(200).json(userBudget);
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    const body = parseServerlessBody(req);
    const budgetIndex = db.budgets.findIndex((b) => b.userId === userId && b.monthYear === currentMonth);

    if (budgetIndex !== -1) {
      db.budgets[budgetIndex] = {
        ...db.budgets[budgetIndex],
        ...body,
      };
      saveDB(db);
      return res.status(200).json(db.budgets[budgetIndex]);
    } else {
      const newBudget = {
        id: `bud_${Date.now()}`,
        userId,
        monthYear: currentMonth,
        monthlyBudget: Number(body.monthlyBudget || body.totalMonthlyBudget) || 0,
        categoryBudgets: body.categoryBudgets || body.categories || {},
      };
      db.budgets.push(newBudget as any);
      saveDB(db);
      return res.status(200).json(newBudget);
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
