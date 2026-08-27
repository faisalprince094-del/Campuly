export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { messageId, rating, reason, comment, query, response } = body;

    const feedbackEntry = {
      id: `fb_${Date.now()}`,
      messageId,
      rating,
      reason,
      comment,
      query,
      response: typeof response === 'string' ? response.slice(0, 500) : '',
      createdAt: new Date().toISOString(),
    };

    console.log('[Campusly Feedback Logged]:', feedbackEntry);
    return res.status(200).json({ success: true, feedback: feedbackEntry });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to record feedback' });
  }
}
