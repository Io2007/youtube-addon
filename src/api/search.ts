import { PIPED_BASE, ID_PREFIXES, SEARCH_FILTERS, getFullResolutionUrl } from "../core/types";
import type { Track, Album, Artist, Playlist, SearchResults } from "../core/types";

/**
 * Fetches search results from Piped API with a specific filter
 */
async function fetchWithFilter(
  query: string,
  filter: string
): Promise<Response> {
  const url = `${PIPED_BASE}/search?q=${encodeURIComponent(query)}&filter=${filter}`;
  return fetch(url);
}

/**
 * Maps a Piped song result to our Track type
 */
function mapTrack(item: any): Track | null {
  if (!item || !item.url) return null;
  
  // Extract videoId from Piped URL (format: /watch?v=VIDEO_ID)
  const urlParams = new URLSearchParams(item.url.split('?')[1]);
  const videoId = urlParams.get('v');
  
  if (!videoId) return null;

  return {
    id: `${ID_PREFIXES.track}${videoId}`,
    title: item.title || "Unknown",
    artist: item.uploaderName || item.uploader || "Unknown Artist",
    album: undefined, // Piped doesn't always provide album info
    duration: item.duration || 0,
    artworkURL: getFullResolutionUrl(item.thumbnail || ""),
    format: "m4a",
  };
}

/**
 * Maps a Piped album result to our Album type
 */
function mapAlbum(item: any): Album | null {
  if (!item || !item.url) return null;

  // Extract ID from URL - could be playlist or browse ID
  let id = "";
  if (item.url.includes("playlist?list=")) {
    const urlParams = new URLSearchParams(item.url.split('?')[1]);
    id = urlParams.get('list') || "";
  } else if (item.url.includes("/browse/")) {
    id = item.url.split("/browse/")[1]?.split('?')[0] || "";
  }

  if (!id) return null;

  return {
    id: `${ID_PREFIXES.album}${id}`,
    title: item.title || "Unknown Album",
    artist: item.uploaderName || item.uploader || "Unknown Artist",
    artworkURL: getFullResolutionUrl(item.thumbnail || ""),
    trackCount: 0, // Will be populated when fetching album details
    year: undefined, // Piped may not provide year directly
  };
}

/**
 * Maps a Piped artist result to our Artist type
 */
function mapArtist(item: any): Artist | null {
  if (!item || !item.url) return null;

  // Extract channelId from URL
  let channelId = "";
  if (item.url.includes("/channel/")) {
    channelId = item.url.split("/channel/")[1]?.split('?')[0] || "";
  } else if (item.url.includes("/c/")) {
    channelId = item.url.split("/c/")[1]?.split('?')[0] || "";
  }

  if (!channelId) return null;

  return {
    id: `${ID_PREFIXES.artist}${channelId}`,
    name: item.name || item.title || "Unknown Artist",
    artworkURL: getFullResolutionUrl(item.thumbnail || ""),
    genres: undefined, // Piped doesn't provide genre info
  };
}

/**
 * Maps a Piped playlist result to our Playlist type
 */
function mapPlaylist(item: any): Playlist | null {
  if (!item || !item.url) return null;

  // Extract playlistId from URL
  let playlistId = "";
  if (item.url.includes("playlist?list=")) {
    const urlParams = new URLSearchParams(item.url.split('?')[1]);
    playlistId = urlParams.get('list') || "";
  }

  if (!playlistId) return null;

  return {
    id: `${ID_PREFIXES.playlist}${playlistId}`,
    title: item.title || "Unknown Playlist",
    creator: item.uploaderName || item.uploader || "Unknown",
    artworkURL: getFullResolutionUrl(item.thumbnail || ""),
    trackCount: 0, // Will be populated when fetching playlist details
  };
}

/**
 * Main search function - performs parallel searches with different filters
 * and merges results into structured arrays
 */
export async function search(query: string): Promise<SearchResults> {
  const filters = [
    { key: "tracks", filter: SEARCH_FILTERS.songs, mapper: mapTrack },
    { key: "albums", filter: SEARCH_FILTERS.albums, mapper: mapAlbum },
    { key: "artists", filter: SEARCH_FILTERS.artists, mapper: mapArtist },
    { key: "playlists", filter: SEARCH_FILTERS.playlists, mapper: mapPlaylist },
  ] as const;

  // Execute all searches in parallel
  const promises = filters.map(({ filter }) => fetchWithFilter(query, filter));
  const responses = await Promise.allSettled(promises);

  const results: SearchResults = {
    tracks: [],
    albums: [],
    artists: [],
    playlists: [],
  };

  // Process each response
  for (let i = 0; i < filters.length; i++) {
    const filterConfig = filters[i];
    const response = responses[i];
    
    if (!filterConfig || !response) continue;
    
    const { key, mapper } = filterConfig;

    if (response.status === "fulfilled") {
      try {
        const data: any = await response.value.json();
        const items = data.items || data.results || [];
        
        // Map each item and filter out nulls
        const mappedItems = items
          .map((item: any) => mapper(item))
          .filter(Boolean);

        results[key] = mappedItems;
      } catch (error) {
        console.error(`Failed to parse ${key} response:`, error);
        // Return empty array for this category on failure
        results[key] = [];
      }
    } else {
      console.error(`Failed to fetch ${key}:`, (response as PromiseRejectedResult).reason);
      // Return empty array for this category on failure
      results[key] = [];
    }
  }

  return results;
}
