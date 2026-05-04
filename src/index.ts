/**
 * YouTube Music Addon for Eclipse
 * 
 * Simple Hono-based API with logging/observability
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

export const app = new Hono();

// Middleware for logging and observability
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors());

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Main route
app.get('/', (c) => c.json({ message: 'YouTube Music Addon API', version: '1.0.0' }));
