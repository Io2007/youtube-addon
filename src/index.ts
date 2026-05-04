/**
 * YouTube Music Addon for Eclipse
 * 
 * This module provides a structured interface to Piped API
 * with type-specific search fan-out and clean ID management.
 */

export { search } from "./search";
export { getStream } from "./stream";
export { getAlbum } from "./album";
export { getArtist } from "./artist";
export { getPlaylist } from "./playlist";

export {
  PIPED_BASE,
  ID_PREFIXES,
  RESOURCES,
  TYPES,
  CONTENT_TYPE,
  SEARCH_FILTERS,
} from "./types";

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
} from "./types";
