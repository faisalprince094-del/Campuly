import {
  setCorsHeaders,
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
    const userNotifs = db.notifications.filter((n) => n.userId === userId);
    return res.status(200).json(userNotifs);
  }

  if (req.method === 'PATCH') {
    const action = req.query.action as string;
    const notifId = req.query.id as string;

    if (action === 'readAll') {
      db.notifications.forEach((n) => {
        if (n.userId === userId) n.read = true;
      });
      saveDB(db);
      return res.status(200).json({ success: true });
    }

    if (notifId) {
      const notif = db.notifications.find((n) => n.id === notifId && n.userId === userId);
      if (notif) {
        notif.read = true;
        saveDB(db);
        return res.status(200).json(notif);
      }
    }
    return res.status(404).json({ error: 'Notification not found' });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
