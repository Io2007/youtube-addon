# YouTube Music Addon for Eclipse

A structured YouTube Music addon that uses the Piped API with type-specific search fan-out for clean, accurate results.

## Core Principles

### 1. Type-Specific Search Fan-Out
Instead of one generic search call, `/search` performs **4 parallel Piped queries**, each with a specific filter:
- `songs` → `filter=music_songs`
- `albums` → `filter=music_albums`
- `artists` → `filter=music_artists`
- `playlists` → `filter=music_playlists`

This gives you **true structured results**, not inferred ones.

### 2. Hardcoded Upstream
Single constant: `PIPED_BASE = "https://api.piped.private.coffee"`
- No overrides, no fallbacks

### 3. Manifest
- **resources**: `["search", "stream", "catalog"]`
- **types**: `["track", "album", "artist", "playlist"]`
- **contentType**: `"music"`

## ID System

Clean, future-proof ID prefixes:
- **Track**: `yt_<videoId>`
- **Album**: `ytalb_<browseId or playlistId>`
- **Artist**: `ytar_<channelId>`
- **Playlist**: `ytpl_<playlistId>`

## API Endpoints

### GET /search?q=query
Performs parallel searches across all music types and returns structured results:

```json
{
  "tracks": [...],
  "albums": [...],
  "artists": [...],
  "playlists": [...]
}
```

### GET /stream/{id}
Get stream URL for a track (track IDs only):

```json
{
  "url": "...",
  "format": "m4a",
  "quality": "128kbps"
}
```

### GET /album/{id}
Get album details with tracks:

```json
{
  "id": "ytalb_...",
  "title": "Album Name",
  "artist": "Artist Name",
  "artworkURL": "...",
  "year": 2023,
  "tracks": [...]
}
```

### GET /artist/{id}
Get artist details with top tracks and albums:

```json
{
  "id": "ytar_...",
  "name": "Artist Name",
  "artworkURL": "...",
  "topTracks": [...],
  "albums": [...]
}
```

### GET /playlist/{id}
Get playlist details with tracks:

```json
{
  "id": "ytpl_...",
  "title": "Playlist Name",
  "creator": "Creator Name",
  "artworkURL": "...",
  "tracks": [...]
}
```

## Installation

```bash
npm install
npm run build
npm start
```

## Development

```bash
npm run dev
```

Server runs on port 3000 by default (configurable via `PORT` env variable).

## Key Improvements

- **Search feels like real YouTube Music** - Uses native YouTube Music categories via filters
- **Albums open properly** - Structured album data from music_albums filter
- **Artists show structured content** - Top tracks and albums via targeted searches
- **Playlists behave naturally** - Direct playlist mapping
- **Playback is consistent and fast** - Everything funnels through video IDs to /stream

## Failure Handling

If one filter fails, others still return:
```json
{
  "tracks": [...],
  "albums": [],
  "artists": [...],
  "playlists": [...]
}
```

## Performance Considerations

Parallel fetches (4 calls per search) can be heavy on edge runtimes. Mitigation strategies:
- Uses `Promise.allSettled` for parallel execution
- Optionally limit results per type
- Consider adding short cache (30-60s) for production use
