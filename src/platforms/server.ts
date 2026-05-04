/**
 * HTTP Server for YouTube Music Addon
 * 
 * Provides REST endpoints:
 * - GET /search?q=query - Search across all music types
 * - GET /stream/{id} - Get stream URL for a track
 * - GET /album/{id} - Get album details with tracks
 * - GET /artist/{id} - Get artist details with top tracks and albums
 * - GET /playlist/{id} - Get playlist details with tracks
 */

import http from "http";
import { search, getStream, getAlbum, getArtist, getPlaylist } from "../index";

const PORT = process.env.PORT || 3000;

/**
 * Parse URL and route to appropriate handler
 */
async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const pathname = url.pathname;
  const query = url.searchParams.get("q") || "";

  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // Route: /search?q=query
    if (pathname === "/search" && req.method === "GET") {
      if (!query) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Missing query parameter 'q'" }));
        return;
      }

      const results = await search(query);
      res.writeHead(200);
      res.end(JSON.stringify(results));
      return;
    }

    // Route: /stream/{id}
    if (pathname.startsWith("/stream/") && req.method === "GET") {
      const id = pathname.split("/")[2];
      if (!id) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Missing track ID" }));
        return;
      }

      const stream = await getStream(id);
      res.writeHead(200);
      res.end(JSON.stringify(stream));
      return;
    }

    // Route: /album/{id}
    if (pathname.startsWith("/album/") && req.method === "GET") {
      const id = pathname.split("/")[2];
      if (!id) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Missing album ID" }));
        return;
      }

      const album = await getAlbum(id);
      res.writeHead(200);
      res.end(JSON.stringify(album));
      return;
    }

    // Route: /artist/{id}
    if (pathname.startsWith("/artist/") && req.method === "GET") {
      const id = pathname.split("/")[2];
      if (!id) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Missing artist ID" }));
        return;
      }

      const artist = await getArtist(id);
      res.writeHead(200);
      res.end(JSON.stringify(artist));
      return;
    }

    // Route: /playlist/{id}
    if (pathname.startsWith("/playlist/") && req.method === "GET") {
      const id = pathname.split("/")[2];
      if (!id) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Missing playlist ID" }));
        return;
      }

      const playlist = await getPlaylist(id);
      res.writeHead(200);
      res.end(JSON.stringify(playlist));
      return;
    }

    // 404 for unknown routes
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
  } catch (error) {
    console.error("Request error:", error);
    res.writeHead(500);
    res.end(JSON.stringify({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : String(error)
    }));
  }
}

// Create and start server
const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`YouTube Music Addon server running on port ${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  GET /search?q=query`);
  console.log(`  GET /stream/{id}`);
  console.log(`  GET /album/{id}`);
  console.log(`  GET /artist/{id}`);
  console.log(`  GET /playlist/{id}`);
});

export default server;
