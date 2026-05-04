// PIPED_BASE constant - hardcoded upstream
export const PIPED_BASE = "https://api.piped.private.coffee";

// ID prefixes for type-safe identification
export const ID_PREFIXES = {
  track: "yt_",
  album: "ytalb_",
  artist: "ytar_",
  playlist: "ytpl_",
} as const;

// Resource types supported by this manifest
export const RESOURCES = ["search", "stream", "catalog"] as const;

// Media types supported
export const TYPES = ["track", "album", "artist", "playlist"] as const;

// Content type identifier
export const CONTENT_TYPE = "music";

// Filter mappings for Piped API search
export const SEARCH_FILTERS = {
  songs: "music_songs",
  albums: "music_albums",
  artists: "music_artists",
  playlists: "music_playlists",
} as const;

// Type definitions
export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  artworkURL: string;
  format: "m4a" | "mp3" | "webm";
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  artworkURL: string;
  trackCount: number;
  year?: number;
}

export interface Artist {
  id: string;
  name: string;
  artworkURL: string;
  genres?: string[];
}

export interface Playlist {
  id: string;
  title: string;
  creator: string;
  artworkURL: string;
  trackCount: number;
}

export interface SearchResults {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
}

export interface StreamResponse {
  url: string;
  format: string;
  quality: string;
}

export interface AlbumDetails {
  id: string;
  title: string;
  artist: string;
  artworkURL: string;
  year?: number;
  tracks: Track[];
}

export interface ArtistDetails {
  id: string;
  name: string;
  artworkURL: string;
  genres?: string[];
  topTracks: Track[];
  albums: Album[];
}

export interface PlaylistDetails {
  id: string;
  title: string;
  creator: string;
  artworkURL: string;
  tracks: Track[];
}
