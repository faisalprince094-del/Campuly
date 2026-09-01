import { setCorsHeaders } from '../src/server/dbCore';

export default function handler(req: any, res: any) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  return res.status(200).json({
    status: 'ok',
    app: 'Campusly',
    runtime: 'Vercel Serverless',
    timestamp: new Date().toISOString(),
  });
}
