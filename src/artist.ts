import { PIPED_BASE, ID_PREFIXES, getFullResolutionUrl } from "./types";
import type { ArtistDetails, Track, Album } from "./types";
import { search } from "./search";

/**
 * Extracts the channelId from an artist ID
 */
export function extractChannelId(artistId: string): string | null {
  if (!artistId.startsWith(ID_PREFIXES.artist)) {
    return null;
  }
  return artistId.slice(ID_PREFIXES.artist.length);
}

/**
 * Helper to map a video item to a Track
 */
function mapTrackFromVideo(item: any): Track | null {
  if (!item.url) return null;
  const urlParams = new URLSearchParams(item.url.split('?')[1]);
  const videoId = urlParams.get('v');
  if (!videoId) return null;

  return {
    id: `${ID_PREFIXES.track}${videoId}`,
    title: item.title || "Unknown",
    artist: item.uploaderName || item.uploader || "Unknown Artist",
    album: undefined,
    duration: item.duration || 0,
    artworkURL: getFullResolutionUrl(item.thumbnail || ""),
    format: "m4a",
  };
}

/**
 * Helper to map a playlist/album item to an Album
 */
function mapAlbumFromItem(item: any): Album | null {
  if (!item.url) return null;

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
    trackCount: 0,
    year: undefined,
  };
}

/**
 * Fetches artist details including top tracks and albums
 * Uses search queries to get structured YouTube Music content
 */
export async function getArtist(artistId: string): Promise<ArtistDetails> {
  const channelId = extractChannelId(artistId);
  
  if (!channelId) {
    throw new Error(`Invalid artist ID format. Expected prefix "${ID_PREFIXES.artist}"`);
  }

  // Fetch channel info from Piped
  let channelData: any = {};
  try {
    const response = await fetch(`${PIPED_BASE}/channel/${channelId}`);
    if (response.ok) {
      channelData = await response.json();
    }
  } catch (error) {
    console.error(`Failed to fetch channel ${channelId}:`, error);
    // Continue with default data
  }

  const artistName = channelData.name || channelData.uploader || "Unknown Artist";

  // Use search to get top tracks for this artist
  // This ensures we get proper YouTube Music results instead of raw uploads
  let topTracks: Track[] = [];
  let albums: Album[] = [];

  try {
    // Search for songs by this artist
    const tracksResponse = await fetch(
      `${PIPED_BASE}/search?q=${encodeURIComponent(artistName)}&filter=music_songs`
    );
    if (tracksResponse.ok) {
      const tracksData: any = await tracksResponse.json();
      const items = tracksData.items || tracksData.results || [];
      topTracks = items
        .map((item: any) => {
          // Filter to only include tracks by this artist
          const itemArtist = item.uploaderName || item.uploader || "";
          if (itemArtist.toLowerCase().includes(artistName.toLowerCase())) {
            return mapTrackFromVideo(item);
          }
          return null;
        })
        .filter(Boolean)
        .slice(0, 10); // Limit to top 10 tracks
    }
  } catch (error) {
    console.error(`Failed to fetch top tracks:`, error);
  }

  try {
    // Search for albums by this artist
    const albumsResponse = await fetch(
      `${PIPED_BASE}/search?q=${encodeURIComponent(artistName)}&filter=music_albums`
    );
    if (albumsResponse.ok) {
      const albumsData: any = await albumsResponse.json();
      const items = albumsData.items || albumsData.results || [];
      albums = items
        .map((item: any) => mapAlbumFromItem(item))
        .filter(Boolean)
        .slice(0, 10); // Limit to top 10 albums
    }
  } catch (error) {
    console.error(`Failed to fetch albums:`, error);
  }

  return {
    id: artistId,
    name: artistName,
    artworkURL: getFullResolutionUrl(channelData.avatarUrl || channelData.thumbnail || ""),
    genres: undefined, // Piped doesn't provide genre info
    topTracks,
    albums,
  };
}
