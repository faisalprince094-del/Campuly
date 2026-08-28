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
    const userTasks = db.tasks.filter((t) => t.userId === userId);
    return res.status(200).json(userTasks);
  }

  if (req.method === 'POST') {
    const body = parseServerlessBody(req);
    const newTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      title: body.title || 'Untitled Task',
      description: body.description || '',
      subjectId: body.subjectId || null,
      dueDate: body.dueDate || new Date().toISOString().split('T')[0],
      dueTime: body.dueTime || '23:59',
      priority: body.priority || 'medium',
      type: body.type || 'assignment',
      completed: Boolean(body.completed),
      estimatedMinutes: Number(body.estimatedMinutes) || 45,
      actualMinutes: Number(body.actualMinutes) || 0,
      tags: Array.isArray(body.tags) ? body.tags : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.tasks.unshift(newTask as any);
    saveDB(db);
    return res.status(201).json(newTask);
  }

  if (req.method === 'PATCH') {
    const taskId = req.query.id as string;
    const body = parseServerlessBody(req);
    const action = req.query.action as string;

    const taskIndex = db.tasks.findIndex((t) => t.id === taskId && t.userId === userId);
    if (taskIndex !== -1) {
      if (action === 'toggle') {
        db.tasks[taskIndex].completed = !db.tasks[taskIndex].completed;
      } else {
        db.tasks[taskIndex] = {
          ...db.tasks[taskIndex],
          ...body,
          updatedAt: new Date().toISOString(),
        };
      }
      saveDB(db);
      return res.status(200).json(db.tasks[taskIndex]);
    }
    return res.status(404).json({ error: 'Task not found' });
  }

  if (req.method === 'DELETE') {
    const taskId = req.query.id as string;
    if (!taskId) return res.status(400).json({ error: 'Task ID required' });

    db.tasks = db.tasks.filter((t) => t.id !== taskId || t.userId !== userId);
    saveDB(db);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
