/**
 * Vercel Edge Function entry point for Hono app
 * 
 * Deploy to Vercel:
 * 1. Install Vercel CLI: npm install -g vercel
 * 2. Login: vercel login
 * 3. Deploy: vercel deploy
 * 
 * Or connect your GitHub repo to Vercel for automatic deployments
 */

import app from "./hono-app";

// Vercel Edge Functions use the Web API
export const config = {
  runtime: "edge",
};

export default function handler(request: Request) {
  return app.fetch(request);
}
