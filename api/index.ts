import app from '../server';

export default function handler(req: any, res: any) {
  try {
    // Add CORS headers for serverless
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    return (app as any)(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Error] Unhandled API Exception:', err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: err?.message || 'Internal Server Error in Serverless Function',
        message: err?.message || 'Internal Server Error in Serverless Function',
      });
    }
  }
}
