import app from '../server';

export default function handler(req: any, res: any) {
  try {
    // If Vercel rewrote incoming request path to /api, recover original requested path
    const originalUrl = (
      req.headers['x-vercel-original-url'] ||
      req.headers['x-forwarded-uri'] ||
      req.headers['x-matched-path'] ||
      req.url
    ) as string;

    if (originalUrl && originalUrl.startsWith('/api') && req.url === '/api') {
      req.url = originalUrl;
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
