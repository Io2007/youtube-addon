import { PIPED_BASE, ID_PREFIXES } from "../core/types";
import type { StreamResponse } from "../core/types";

/**
 * Extracts videoId from a track ID
 */
export function extractVideoId(trackId: string): string | null {
  if (!trackId.startsWith(ID_PREFIXES.track)) {
    return null;
  }
  return trackId.slice(ID_PREFIXES.track.length);
}

/**
 * Fetches stream information for a track
 * Only accepts track IDs (yt_<videoId>)
 */
export async function getStream(trackId: string): Promise<StreamResponse> {
  const videoId = extractVideoId(trackId);
  
  if (!videoId) {
    throw new Error(`Invalid track ID format. Expected prefix "${ID_PREFIXES.track}"`);
  }

  // Fetch stream information from Piped
  const response = await fetch(`${PIPED_BASE}/streams/${videoId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch streams for video ${videoId}: ${response.statusText}`);
  }

  const data: any = await response.json();
  
  // Find the best audio-only stream
  // Prefer m4a format, then webm, then mp3
  const audioStreams = data.audioStreams || [];
  
  if (audioStreams.length === 0) {
    throw new Error(`No audio streams available for video ${videoId}`);
  }

  // Sort by quality/bitrate - prefer higher quality
  const sortedStreams = [...audioStreams].sort((a, b) => {
    // Try to parse bitrate from format or quality string
    const getBitrate = (stream: any) => {
      if (stream.bitrate) return stream.bitrate;
      const match = stream.quality?.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    };
    return getBitrate(b) - getBitrate(a);
  });

  // Prefer m4a format if available
  const preferredStream = sortedStreams.find(s => s.mimeType?.includes("audio/mp4")) 
    || sortedStreams.find(s => s.mimeType?.includes("audio/webm"))
    || sortedStreams[0];

  return {
    url: preferredStream.url || "",
    format: preferredStream.mimeType?.split('/')[1] || "unknown",
    quality: preferredStream.quality || "unknown",
  };
}
