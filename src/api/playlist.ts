import { PIPED_BASE, ID_PREFIXES, getFullResolutionUrl } from "../core/types";
import type { PlaylistDetails, Track } from "../core/types";

/**
 * Extracts the playlistId from a playlist ID
 */
export function extractPlaylistId(playlistId: string): string | null {
  if (!playlistId.startsWith(ID_PREFIXES.playlist)) {
    return null;
  }
  return playlistId.slice(ID_PREFIXES.playlist.length);
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
 * Fetches playlist details including all tracks
 */
export async function getPlaylist(playlistId: string): Promise<PlaylistDetails> {
  const pipedId = extractPlaylistId(playlistId);
  
  if (!pipedId) {
    throw new Error(`Invalid playlist ID format. Expected prefix "${ID_PREFIXES.playlist}"`);
  }

  // Fetch playlist from Piped
  let response: Response;
  try {
    response = await fetch(`${PIPED_BASE}/playlist?list=${pipedId}`);
  } catch (error) {
    throw new Error(`Failed to fetch playlist ${pipedId}: ${error}`);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch playlist: ${response.statusText}`);
  }

  const data: any = await response.json();

  // Map playlist metadata
  const playlist: PlaylistDetails = {
    id: playlistId,
    title: data.title || "Unknown Playlist",
    creator: data.uploaderName || data.uploader || "Unknown",
    artworkURL: getFullResolutionUrl(data.thumbnail || ""),
    tracks: [],
  };

  // Map tracks from the playlist videos
  const videos = data.relatedStreams || data.videos || [];
  playlist.tracks = videos
    .map((item: any) => mapTrackFromVideo(item))
    .filter(Boolean);

  return playlist;
}
