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
    const userExpenses = db.expenses.filter((e) => e.userId === userId);
    return res.status(200).json(userExpenses);
  }

  if (req.method === 'POST') {
    const body = parseServerlessBody(req);
    const newExpense = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      amount: Number(body.amount) || 0,
      category: body.category || 'other',
      note: body.note || '',
      date: body.date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isRecurring: Boolean(body.isRecurring),
      tags: Array.isArray(body.tags) ? body.tags : [],
    };
    db.expenses.unshift(newExpense as any);
    saveDB(db);
    return res.status(201).json(newExpense);
  }

  if (req.method === 'DELETE') {
    const expenseId = req.query.id as string;
    if (!expenseId) return res.status(400).json({ error: 'Expense ID required' });

    db.expenses = db.expenses.filter((e) => e.id !== expenseId || e.userId !== userId);
    saveDB(db);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
