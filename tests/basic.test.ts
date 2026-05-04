/**
 * Basic tests for YouTube Music Addon
 */

import { describe, it, expect } from "@jest/globals";
import { search, getStream, getAlbum, getArtist, getPlaylist } from "../src/index";
import { ID_PREFIXES } from "../src/core/types";

describe("YouTube Music Addon", () => {
  describe("ID Prefixes", () => {
    it("should have correct track prefix", () => {
      expect(ID_PREFIXES.track).toBe("yt_");
    });

    it("should have correct album prefix", () => {
      expect(ID_PREFIXES.album).toBe("ytalb_");
    });

    it("should have correct artist prefix", () => {
      expect(ID_PREFIXES.artist).toBe("ytar_");
    });

    it("should have correct playlist prefix", () => {
      expect(ID_PREFIXES.playlist).toBe("ytpl_");
    });
  });

  describe("Search", () => {
    it("should return structured results", async () => {
      const results = await search("test");
      
      expect(results).toHaveProperty("tracks");
      expect(results).toHaveProperty("albums");
      expect(results).toHaveProperty("artists");
      expect(results).toHaveProperty("playlists");
      
      expect(Array.isArray(results.tracks)).toBe(true);
      expect(Array.isArray(results.albums)).toBe(true);
      expect(Array.isArray(results.artists)).toBe(true);
      expect(Array.isArray(results.playlists)).toBe(true);
    }, 30000);
  });

  describe("Stream", () => {
    it("should reject invalid track ID format", async () => {
      await expect(getStream("invalid_id")).rejects.toThrow();
    });

    it("should accept valid track ID format", async () => {
      // This will fail with network error if video doesn't exist, but should not throw format error
      try {
        await getStream(`${ID_PREFIXES.track}dQw4w9WgXcQ`);
      } catch (error) {
        // Network errors are expected in test environment
        expect((error as Error).message).not.toContain("Invalid track ID format");
      }
    }, 15000);
  });
});
