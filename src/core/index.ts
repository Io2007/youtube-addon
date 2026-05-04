/**
 * Core Layer - YouTube Music Addon
 * 
 * Exports core types, constants, and the Hono app
 */

export {
  PIPED_BASE,
  ID_PREFIXES,
  RESOURCES,
  TYPES,
  CONTENT_TYPE,
  SEARCH_FILTERS,
  getFullResolutionUrl,
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

export { app } from "./hono-app";
export default app;
