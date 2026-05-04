/**
 * YouTube Music Addon for Eclipse
 *
 * Type-specific search fan-out via Piped API
 * - Hardcoded upstream: https://api.piped.private.coffee
 * - Parallel searches for tracks, albums, artists, playlists
 * - Structured results with proper ID prefixes
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

const app = new Hono();

// Hardcoded Piped upstream - no overrides, no fallbacks
const PIPED_BASE = 'https://api.piped.private.coffee';

// Middleware for logging and observability
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors());

// ID helpers with explicit prefixes
const makeTrackId = (videoId: string) => `yt_${videoId}`;
const makeAlbumId = (id: string) => `ytalb_${id}`;
const makeArtistId = (channelId: string) => `ytar_${channelId}`;
const makePlaylistId = (playlistId: string) => `ytpl_${playlistId}`;

// Extract videoId from track ID
const extractVideoId = (id: string): string | null => {
  // Trim whitespace first
  const trimmedId = id.trim();
  
  if (trimmedId.startsWith('yt_') && !trimmedId.startsWith('ytalb_') && !trimmedId.startsWith('ytar_') && !trimmedId.startsWith('ytpl_')) {
    const suffix = trimmedId.slice(3);
    // Handle case where ID is in format "watch?v=<videoId>" or similar
    if (suffix.includes('watch?v=')) {
      const match = suffix.match(/[?&]v=([a-zA-Z0-9_-]+)/);
      return match ? match[1] : null;
    }
    return suffix;
  }
  return null;
};

// Resolve prefixed ID to raw Piped ID
const resolveId = (id: string): { type: string; rawId: string } | null => {
  // Trim whitespace first
  const trimmedId = id.trim();
  
  if (trimmedId.startsWith('ytalb_')) {
    let rawId = trimmedId.slice(6).trim();
    // Handle case where ID contains "playlist?list=" or "list=" prefix
    const listMatch = rawId.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    if (listMatch) {
      rawId = listMatch[1];
    } else if (rawId.includes('playlist?')) {
      // Extract everything after "playlist?"
      const parts = rawId.split('playlist?');
      rawId = parts.length > 1 ? parts[1] : rawId;
      // Further extract list= value if present
      const listPart = rawId.match(/list=([a-zA-Z0-9_-]+)/);
      if (listPart) {
        rawId = listPart[1];
      }
    }
    // Album IDs start with OLAK5uy_, playlist IDs start with PL or LL
    return { type: 'album', rawId };
  }
  if (trimmedId.startsWith('ytar_')) {
    return { type: 'artist', rawId: trimmedId.slice(5).trim() };
  }
  if (trimmedId.startsWith('ytpl_')) {
    let rawId = trimmedId.slice(5).trim();
    // Handle case where ID contains "playlist?list=" or "list=" prefix
    const listMatch = rawId.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    if (listMatch) {
      rawId = listMatch[1];
    } else if (rawId.includes('playlist?')) {
      // Extract everything after "playlist?"
      const parts = rawId.split('playlist?');
      rawId = parts.length > 1 ? parts[1] : rawId;
      // Further extract list= value if present
      const listPart = rawId.match(/list=([a-zA-Z0-9_-]+)/);
      if (listPart) {
        rawId = listPart[1];
      }
    }
    return { type: 'playlist', rawId };
  }
  if (trimmedId.startsWith('yt_')) {
    return { type: 'track', rawId: trimmedId.slice(3).trim() };
  }
  return null;
};

// Map artwork URL from Piped response - no size limits
const getArtworkUrl = (item: any): string | undefined => {
  if (!item) return undefined;
  
  // Try multiple possible fields for artwork
  if (item.thumbnail) {
    // Remove any size restrictions from thumbnail URLs
    let url = item.thumbnail;
    // Remove common size parameters to get full resolution
    url = url.replace(/&?[ws]=\d+/g, '');
    url = url.replace(/&?size=\d+/g, '');
    url = url.replace(/&?crop=\w+/g, '');
    return url;
  }
  
  if (item.artwork) {
    let url = item.artwork;
    // Remove common size parameters to get full resolution
    url = url.replace(/&?[ws]=\d+/g, '');
    url = url.replace(/&?size=\d+/g, '');
    url = url.replace(/&?crop=\w+/g, '');
    return url;
  }
  
  if (item.relatedBaseUri) return `${item.relatedBaseUri}/maxresdefault.jpg`;
  
  // Handle src array for thumbnails
  if (item.src && Array.isArray(item.src) && item.src.length > 0) {
    let url = item.src[0];
    // Remove common size parameters to get full resolution
    url = url.replace(/&?[ws]=\d+/g, '');
    url = url.replace(/&?size=\d+/g, '');
    url = url.replace(/&?crop=\w+/g, '');
    return url;
  }
  
  return undefined;
};

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Main route
app.get('/', (c) => c.json({ message: 'YouTube Music Addon API', version: '1.0.0' }));

// Manifest endpoint for Eclipse
app.get('/manifest.json', (c) => {
  return c.json({
    id: 'youtube-music-addon',
    name: 'YouTube Music',
    version: '1.0.0',
    description: 'YouTube Music provider via Piped API with type-specific search',
    contentType: 'music',
    resources: ['search', 'stream', 'catalog'],
    types: ['track', 'album', 'artist', 'playlist'],
    endpoints: {
      search: '/search?q={query}',
      stream: '/stream/{id}',
      album: '/album/{id}',
      artist: '/artist/{id}',
      playlist: '/playlist/{id}'
    }
  });
});

// Search cache to avoid repeated lookups for the same query
const searchCache = new Map<string, { results: any; timestamp: number }>();
const SEARCH_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Search endpoint - fans out to Piped API for different content types
app.get('/search', async (c) => {
  const query = c.req.query('q');
  
  if (!query) {
    return c.json({ error: 'Missing required query parameter: q' }, 400);
  }

  // Check cache first
  const cached = searchCache.get(query);
  if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
    return c.json(cached.results);
  }

  // Type-specific filters for YouTube Music
  const searchTypes = [
    { type: 'tracks', filter: 'music_songs' },
    { type: 'albums', filter: 'music_albums' },
    { type: 'artists', filter: 'music_artists' },
    { type: 'playlists', filter: 'music_playlists' }
  ];
  
  // Fetch from Piped API with timeout
  const fetchFromPiped = async (filter: string) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout per request
      
      const url = `${PIPED_BASE}/search?q=${encodeURIComponent(query)}&filter=${filter}`;
      const response = await fetch(url, { 
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error(`Search request timed out for ${filter}`);
      } else {
        console.error(`Failed to fetch ${filter} from Piped:`, error);
      }
      return null;
    }
  };

  // Run all searches in parallel
  const searchPromises = searchTypes.map(async ({ type, filter }) => {
    const data = await fetchFromPiped(filter);
    return { type, data };
  });

  const searchResults = await Promise.all(searchPromises);
  
  // Initialize result structure
  const results: Record<string, any[]> = {
    tracks: [],
    albums: [],
    artists: [],
    playlists: []
  };
  
  // Process and map results for each type
  for (const { type, data } of searchResults) {
    if (!data || !data.items) continue;
    
    const items = data.items;
    
    if (type === 'tracks') {
      // Map music_songs to track objects
      for (const item of items) {
        results.tracks.push({
          id: makeTrackId(item.url?.split('/').pop() || item.id || ''),
          title: item.title,
          artist: item.uploaderName || item.uploader || 'Unknown Artist',
          album: item.album || undefined,
          duration: item.duration,
          artworkURL: getArtworkUrl(item),
          format: 'm4a'
        });
      }
    } else if (type === 'albums') {
      // Map music_albums to album objects
      for (const item of items) {
        const albumId = item.url?.split('/').pop() || item.id || '';
        results.albums.push({
          id: makeAlbumId(albumId),
          title: item.title,
          artist: item.uploaderName || item.uploader || 'Unknown Artist',
          artworkURL: getArtworkUrl(item),
          trackCount: item.videoCount || undefined,
          year: item.year || undefined
        });
      }
    } else if (type === 'artists') {
      // Map music_artists to artist objects
      for (const item of items) {
        const channelId = item.url?.split('/').pop() || item.id || '';
        results.artists.push({
          id: makeArtistId(channelId),
          name: item.name || item.title,
          artworkURL: getArtworkUrl(item),
          genres: undefined // Usually unavailable from Piped
        });
      }
    } else if (type === 'playlists') {
      // Map music_playlists to playlist objects
      for (const item of items) {
        const playlistId = item.url?.split('/').pop() || item.id || '';
        results.playlists.push({
          id: makePlaylistId(playlistId),
          title: item.title,
          creator: item.uploaderName || item.uploader || 'Unknown Creator',
          artworkURL: getArtworkUrl(item),
          trackCount: item.videoCount || undefined
        });
      }
    }
  }

  // Cache the results
  searchCache.set(query, { results, timestamp: Date.now() });

  return c.json(results);
});

// Stream cache to avoid repeated lookups for the same video
const streamCache = new Map<string, { url: string; format: string; quality: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Stream endpoint - returns audio stream URL for track IDs only
app.get('/stream/:id', async (c) => {
  const id = c.req.param('id');
  const videoId = extractVideoId(id);
  
  if (!videoId) {
    return c.json({ error: 'Invalid track ID. Must be a yt_<videoId> format.' }, 400);
  }

  // Check cache first
  const cached = streamCache.get(videoId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return c.json(cached);
  }

  try {
    // Use a timeout to avoid hanging on slow responses
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    const response = await fetch(`${PIPED_BASE}/streams/${videoId}`, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    // Try DASH streams first, fallback to HLS, then audioStreams
    let streamUrl: string | undefined;
    let format: string = 'm4a';
    let quality: string = 'unknown';
    
    // First, try to find DASH audio streams
    const dashStreams = data.dash || [];
    if (dashStreams.length > 0) {
      // Sort by bitrate and pick the best audio stream
      const audioDashStreams = dashStreams.filter((s: any) => s.mimeType?.includes('audio'));
      if (audioDashStreams.length > 0) {
        audioDashStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
        const bestDashStream = audioDashStreams[0];
        streamUrl = bestDashStream.url;
        format = bestDashStream.mimeType?.split('/')[1] || 'm4a';
        quality = `${Math.round(bestDashStream.bitrate / 1000)}kbps`;
      }
    }
    
    // Fallback to HLS streams if no DASH audio found
    if (!streamUrl && data.hls) {
      streamUrl = data.hls;
      format = 'm3u8';
      quality = 'HLS';
    }
    
    // Final fallback to legacy audioStreams
    if (!streamUrl) {
      const audioStreams = data.audioStreams || [];
      if (audioStreams.length === 0) {
        return c.json({ error: 'No audio streams available' }, 404);
      }
      
      // Sort by bitrate and pick the best one
      audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
      const bestStream = audioStreams[0];
      streamUrl = bestStream.url;
      format = bestStream.mimeType?.split('/')[1] || 'm4a';
      quality = `${Math.round(bestStream.bitrate / 1000)}kbps`;
    }
    
    const result = {
      url: streamUrl,
      format,
      quality
    };
    
    // Cache the result
    streamCache.set(videoId, { ...result, timestamp: Date.now() });
    
    return c.json(result);
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error(`Stream request timed out for ${videoId}`);
      return c.json({ error: 'Stream request timed out' }, 504);
    }
    console.error(`Failed to fetch stream for ${videoId}:`, error);
    return c.json({ error: 'Failed to fetch stream' }, 500);
  }
});

// Album endpoint - returns album metadata and tracks
app.get('/album/:id', async (c) => {
  const id = c.req.param('id');
  const resolved = resolveId(id);
  
  if (!resolved || resolved.type !== 'album') {
    return c.json({ error: 'Invalid album ID' }, 400);
  }
  
  const rawId = resolved.rawId;

  try {
    // Try to fetch as playlist first (Piped treats albums as playlists)
    const response = await fetch(`${PIPED_BASE}/playlist?list=${rawId}`, {
      headers: { 'Accept': 'application/json' },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    // Map album metadata
    const album = {
      id: id,
      title: data.title || 'Unknown Album',
      artist: data.uploaderName || data.uploader || 'Unknown Artist',
      artworkURL: getArtworkUrl(data),
      trackCount: data.videos?.length || 0,
      year: undefined,
      tracks: [] as any[]
    };
    
    // Map tracks
    if (data.videos && Array.isArray(data.videos)) {
      for (const video of data.videos) {
        album.tracks.push({
          id: makeTrackId(video.url?.split('/').pop() || video.id || ''),
          title: video.title,
          artist: video.uploaderName || album.artist,
          duration: video.duration,
          artworkURL: getArtworkUrl(video)
        });
      }
    }
    
    return c.json(album);
  } catch (error) {
    console.error(`Failed to fetch album ${rawId}:`, error);
    return c.json({ error: 'Failed to fetch album' }, 500);
  }
});

// Artist endpoint - returns artist info with top tracks and albums
app.get('/artist/:id', async (c) => {
  const id = c.req.param('id');
  const resolved = resolveId(id);
  
  if (!resolved || resolved.type !== 'artist') {
    return c.json({ error: 'Invalid artist ID' }, 400);
  }
  
  const channelId = resolved.rawId;

  try {
    // Fetch channel info
    const response = await fetch(`${PIPED_BASE}/channel/${channelId}`, {
      headers: { 'Accept': 'application/json' },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const artistName = data.name || data.title || 'Unknown Artist';
    
    // Re-query for top tracks using search
    const tracksPromise = fetch(`${PIPED_BASE}/search?q=${encodeURIComponent(artistName)}&filter=music_songs`, {
      headers: { 'Accept': 'application/json' },
    }).then(r => r.ok ? r.json() : { items: [] });
    
    // Re-query for albums using search
    const albumsPromise = fetch(`${PIPED_BASE}/search?q=${encodeURIComponent(artistName)}&filter=music_albums`, {
      headers: { 'Accept': 'application/json' },
    }).then(r => r.ok ? r.json() : { items: [] });
    
    const [tracksData, albumsData] = await Promise.all([tracksPromise, albumsPromise]);
    
    // Map top tracks
    const topTracks = (tracksData.items || []).slice(0, 10).map((item: any) => ({
      id: makeTrackId(item.url?.split('/').pop() || item.id || ''),
      title: item.title,
      artist: artistName,
      duration: item.duration,
      artworkURL: getArtworkUrl(item)
    }));
    
    // Map albums
    const albums = (albumsData.items || []).slice(0, 10).map((item: any) => ({
      id: makeAlbumId(item.url?.split('/').pop() || item.id || ''),
      title: item.title,
      artworkURL: getArtworkUrl(item),
      trackCount: item.videoCount || undefined,
      year: item.year || undefined
    }));
    
    return c.json({
      id: id,
      name: artistName,
      artworkURL: getArtworkUrl(data),
      topTracks,
      albums
    });
  } catch (error) {
    console.error(`Failed to fetch artist ${channelId}:`, error);
    return c.json({ error: 'Failed to fetch artist' }, 500);
  }
});

// Playlist endpoint - returns playlist metadata and tracks
app.get('/playlist/:id', async (c) => {
  const id = c.req.param('id');
  const resolved = resolveId(id);
  
  if (!resolved || resolved.type !== 'playlist') {
    return c.json({ error: 'Invalid playlist ID' }, 400);
  }
  
  const rawId = resolved.rawId;

  try {
    const response = await fetch(`${PIPED_BASE}/playlist?list=${rawId}`, {
      headers: { 'Accept': 'application/json' },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    // Map playlist metadata
    const playlist = {
      id: id,
      title: data.title || 'Unknown Playlist',
      creator: data.uploaderName || data.uploader || 'Unknown Creator',
      artworkURL: getArtworkUrl(data),
      trackCount: data.videos?.length || 0,
      tracks: [] as any[]
    };
    
    // Map tracks
    if (data.videos && Array.isArray(data.videos)) {
      for (const video of data.videos) {
        playlist.tracks.push({
          id: makeTrackId(video.url?.split('/').pop() || video.id || ''),
          title: video.title,
          artist: video.uploaderName || playlist.creator,
          duration: video.duration,
          artworkURL: getArtworkUrl(video)
        });
      }
    }
    
    return c.json(playlist);
  } catch (error) {
    console.error(`Failed to fetch playlist ${rawId}:`, error);
    return c.json({ error: 'Failed to fetch playlist' }, 500);
  }
});

export default app;
