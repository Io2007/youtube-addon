/**
 * Hono App for YouTube Music Addon
 * 
 * Compatible with:
 * - Node.js (via @hono/node-server)
 * - Cloudflare Workers
 * - Vercel Edge Functions
 * 
 * Endpoints:
 * - GET /search?q=query - Search across all music types
 * - GET /stream/:id - Get stream URL for a track
 * - GET /album/:id - Get album details with tracks
 * - GET /artist/:id - Get artist details with top tracks and albums
 * - GET /playlist/:id - Get playlist details with tracks
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { search, getStream, getAlbum, getArtist, getPlaylist } from "./index";

// Create Hono app
const app = new Hono();

// Apply CORS middleware
app.use("/*", cors());

// Health check endpoint
app.get("/", (c) => {
  return c.json({
    name: "YouTube Music Addon",
    version: "1.0.0",
    endpoints: [
      "GET /search?q=query",
      "GET /stream/:id",
      "GET /album/:id",
      "GET /artist/:id",
      "GET /playlist/:id"
    ]
  });
});

// GET /search?q=query
app.get("/search", async (c) => {
  const query = c.req.query("q");
  
  if (!query) {
    return c.json({ error: "Missing query parameter 'q'" }, 400);
  }

  try {
    const results = await search(query);
    return c.json(results);
  } catch (error) {
    console.error("Search error:", error);
    return c.json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// GET /stream/:id
app.get("/stream/:id", async (c) => {
  const id = c.req.param("id");
  
  if (!id) {
    return c.json({ error: "Missing track ID" }, 400);
  }

  try {
    const stream = await getStream(id);
    return c.json(stream);
  } catch (error) {
    console.error("Stream error:", error);
    return c.json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// GET /album/:id
app.get("/album/:id", async (c) => {
  const id = c.req.param("id");
  
  if (!id) {
    return c.json({ error: "Missing album ID" }, 400);
  }

  try {
    const album = await getAlbum(id);
    return c.json(album);
  } catch (error) {
    console.error("Album error:", error);
    return c.json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// GET /artist/:id
app.get("/artist/:id", async (c) => {
  const id = c.req.param("id");
  
  if (!id) {
    return c.json({ error: "Missing artist ID" }, 400);
  }

  try {
    const artist = await getArtist(id);
    return c.json(artist);
  } catch (error) {
    console.error("Artist error:", error);
    return c.json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// GET /playlist/:id
app.get("/playlist/:id", async (c) => {
  const id = c.req.param("id");
  
  if (!id) {
    return c.json({ error: "Missing playlist ID" }, 400);
  }

  try {
    const playlist = await getPlaylist(id);
    return c.json(playlist);
  } catch (error) {
    console.error("Playlist error:", error);
    return c.json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Export for various platforms
export default app;
export { app };
