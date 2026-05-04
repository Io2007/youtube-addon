/**
 * YouTube Music Addon for Eclipse
 * 
 * This module provides a structured interface to Piped API
 * with type-specific search fan-out and clean ID management.
 */

// Export API functions
export { search } from "../api/search";
export { getStream } from "../api/stream";
export { getAlbum } from "../api/album";
export { getArtist } from "../api/artist";
export { getPlaylist } from "../api/playlist";

// Export core types and constants
export {
  PIPED_BASE,
  ID_PREFIXES,
  RESOURCES,
  TYPES,
  CONTENT_TYPE,
  SEARCH_FILTERS,
  getFullResolutionUrl,
} from "../core/types";

// Export type definitions
export type {
  Track,
  Album,
  Artist,
  Playlist,
  SearchResults,
  StreamResponse,
  AlbumDetails,
  ArtistDetails,
  PlaylistDetails,
} from "../core/types";
