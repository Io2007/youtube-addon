/**
 * Cloudflare Worker entry point for Hono app
 * 
 * Deploy with Wrangler:
 * 1. Install wrangler: npm install -g wrangler
 * 2. Login: wrangler login
 * 3. Deploy: wrangler deploy
 */

import app from "../core/hono-app";

export default {
  fetch: app.fetch,
};
