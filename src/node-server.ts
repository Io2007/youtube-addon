/**
 * Node.js entry point for Hono app
 * 
 * Run with: npm start
 */

import { serve } from "@hono/node-server";
import app from "./hono-app";

const PORT = parseInt(process.env.PORT || "3000", 10);

console.log("Starting YouTube Music Addon server with Hono...");
console.log(`Server running on http://localhost:${PORT}`);
console.log("Endpoints:");
console.log("  GET /search?q=query");
console.log("  GET /stream/:id");
console.log("  GET /album/:id");
console.log("  GET /artist/:id");
console.log("  GET /playlist/:id");

serve({
  fetch: app.fetch,
  port: PORT,
}, (info) => {
  console.log(`Listening on http://localhost:${info.port}`);
});
