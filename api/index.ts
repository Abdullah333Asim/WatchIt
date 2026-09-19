/**
 * Vercel Serverless Entrypoint
 *
 * Vercel's @vercel/node builder picks up any file in the /api directory and
 * wraps it as a serverless function. We import the pre-configured Express app
 * from server.ts and export it as the default export — Vercel handles the
 * Node.js IncomingMessage / ServerResponse adapter automatically.
 */
import { createApp } from '../server';

const app = createApp();

export default app;

