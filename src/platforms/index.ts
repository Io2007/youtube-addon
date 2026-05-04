/**
 * Platforms Layer - YouTube Music Addon
 * 
 * Exports platform-specific entry points
 */

// Node.js with Hono (recommended)
export { default as nodeServer } from "./node-server";

// Legacy Node.js HTTP server
export { default as legacyServer } from "./server";

// Cloudflare Worker
export { default as worker } from "./worker";

// Vercel Edge Function
export { default as vercelEdge } from "./vercel-edge";
