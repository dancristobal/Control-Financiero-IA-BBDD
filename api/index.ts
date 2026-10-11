// Vercel Serverless Function entry point for Express API
process.env.VERCEL = '1';
import app from '../server';

export default app;
