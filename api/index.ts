// @ts-ignore
import app from '../server.js';

export default function handler(req: any, res: any) {
  try {
    const rawUrl = req.url || '';
    let targetPath = '';

    // 1. Recover path from Vercel query parameter rewrite (__path=/api/...)
    if (rawUrl.includes('__path=')) {
      try {
        const urlObj = new URL(rawUrl, 'http://localhost');
        const p = urlObj.searchParams.get('__path');
        if (p) {
          urlObj.searchParams.delete('__path');
          const remaining = urlObj.searchParams.toString();
          targetPath = p + (remaining ? '?' + remaining : '');
        }
      } catch {}
    }

    // 2. Recover path from custom headers or proxy headers
    if (!targetPath && req.headers) {
      targetPath = (
        req.headers['x-target-path'] ||
        req.headers['x-original-path'] ||
        req.headers['x-vercel-original-url'] ||
        req.headers['x-forwarded-uri'] ||
        req.headers['x-matched-path'] ||
        ''
      ) as string;
    }

    // 3. Normalize req.url to point to the actual target route
    if (targetPath && targetPath.startsWith('/api')) {
      req.url = targetPath;
    }

    return app(req, res);
  } catch (err: any) {
    console.error('Unhandled error in Vercel API handler:', err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: err?.message || 'Internal Server Error in Serverless Function',
      });
    }
  }
}
