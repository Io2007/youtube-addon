import { PIPED_BASE, ID_PREFIXES } from "./types";
import type { AlbumDetails, Track } from "./types";

/**
 * Extracts the underlying Piped ID from an album ID
 */
export function extractAlbumId(albumId: string): string | null {
  if (!albumId.startsWith(ID_PREFIXES.album)) {
    return null;
  }
  return albumId.slice(ID_PREFIXES.album.length);
}

/**
 * Helper to map a video item to a Track
 */
function mapTrackFromVideo(item: any, videoId: string): Track {
  return {
    id: `${ID_PREFIXES.track}${videoId}`,
    title: item.title || "Unknown",
    artist: item.uploaderName || item.uploader || "Unknown Artist",
    album: undefined,
    duration: item.duration || 0,
    artworkURL: item.thumbnail || "",
    format: "m4a",
  };
}

/**
 * Fetches album details including all tracks
 * Works with both playlist IDs and browse IDs
 */
export async function getAlbum(albumId: string): Promise<AlbumDetails> {
  const pipedId = extractAlbumId(albumId);
  
  if (!pipedId) {
    throw new Error(`Invalid album ID format. Expected prefix "${ID_PREFIXES.album}"`);
  }

  // Try fetching as playlist first (most common for albums in Piped)
  let response: Response;
  try {
    response = await fetch(`${PIPED_BASE}/playlist?list=${pipedId}`);
  } catch (error) {
    throw new Error(`Failed to fetch album ${pipedId}: ${error}`);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch album: ${response.statusText}`);
  }

  const data: any = await response.json();

  // Map album metadata
  const album: AlbumDetails = {
    id: albumId,
    title: data.title || "Unknown Album",
    artist: data.uploaderName || data.uploader || "Unknown Artist",
    artworkURL: data.thumbnail || "",
    year: undefined,
    tracks: [],
  };

  // Map tracks from the playlist videos
  const videos = data.relatedStreams || data.videos || [];
  album.tracks = videos
    .map((item: any) => {
      // Extract videoId from URL
      if (!item.url) return null;
      const urlParams = new URLSearchParams(item.url.split('?')[1]);
      const videoId = urlParams.get('v');
      if (!videoId) return null;
      return mapTrackFromVideo(item, videoId);
    })
    .filter(Boolean);

  return album;
}
