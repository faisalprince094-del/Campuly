import app from '../server';
import { registerStudent, loginStudent, loginAdmin, parseServerlessBody, setCorsHeaders } from '../src/server/dbCore';

export default async function handler(req: any, res: any) {
  try {
    // Set CORS headers for serverless
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // Determine normalized path from Vercel headers or URL
    const url = req.url || '';
    const matchedPath =
      (req.headers['x-matched-path'] as string) ||
      (req.headers['x-forwarded-uri'] as string) ||
      (req.headers['x-vercel-matched-path'] as string) ||
      (req.headers['x-now-route-matches'] as string) ||
      url;

    console.log(`[Vercel Serverless Invocation] Method: ${req.method} | URL: ${url} | Matched: ${matchedPath}`);

    // Fast-path direct dispatch for Auth endpoints to guarantee 0ms overhead and prevent stream hangs
    if (req.method === 'POST' && (matchedPath.includes('/auth/signup') || matchedPath.includes('/auth/register') || url.includes('/auth/signup') || url.includes('/auth/register'))) {
      const result = registerStudent(req);
      return res.status(result.status).json(result.data);
    }

    if (req.method === 'POST' && (matchedPath.includes('/auth/login') || url.includes('/auth/login'))) {
      const result = loginStudent(req);
      return res.status(result.status).json(result.data);
    }

    if (req.method === 'POST' && (matchedPath.includes('/admin/login') || matchedPath.includes('/auth/admin-login') || url.includes('/admin/login') || url.includes('/auth/admin-login'))) {
      const result = loginAdmin(req);
      return res.status(result.status).json(result.data);
    }

    if (req.method === 'GET' && (matchedPath.includes('/health') || url.includes('/health'))) {
      return res.status(200).json({ status: 'ok', runtime: 'vercel-serverless', timestamp: new Date().toISOString() });
    }

    // Rewrite req.url to matched API path for Express router
    let targetUrl = matchedPath;
    if (!targetUrl.startsWith('/api')) {
      targetUrl = `/api${targetUrl.startsWith('/') ? '' : '/'}${targetUrl}`;
    }
    req.url = targetUrl;

    // Mark body as parsed if already object
    if (req.body && typeof req.body === 'object') {
      req._body = true;
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
