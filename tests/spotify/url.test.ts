import { describe, expect, it } from "vitest";

import {
  extractSpotifyPlaylistId,
  resolvePlaylistEmbedUrl,
  toSpotifyEmbedUrl,
} from "@/lib/spotify/url";

const ID = "37i9dQZF1DXcBWIGoYBM5M";

describe("extractSpotifyPlaylistId", () => {
  it("extracts the id from a regular playlist URL", () => {
    expect(
      extractSpotifyPlaylistId(`https://open.spotify.com/playlist/${ID}`),
    ).toBe(ID);
  });

  it("extracts the id from an embed playlist URL", () => {
    expect(
      extractSpotifyPlaylistId(`https://open.spotify.com/embed/playlist/${ID}`),
    ).toBe(ID);
  });

  it("ignores a trailing path segment", () => {
    expect(
      extractSpotifyPlaylistId(
        `https://open.spotify.com/embed/playlist/${ID}?utm_source=generator`,
      ),
    ).toBe(ID);
  });

  it("rejects a non-Spotify host", () => {
    expect(
      extractSpotifyPlaylistId(`https://evil.example.com/playlist/${ID}`),
    ).toBeNull();
  });

  it("rejects a non-https scheme", () => {
    expect(
      extractSpotifyPlaylistId(`http://open.spotify.com/playlist/${ID}`),
    ).toBeNull();
  });

  it("rejects a URL without a playlist id", () => {
    expect(extractSpotifyPlaylistId("https://open.spotify.com/playlist/")).toBeNull();
    expect(extractSpotifyPlaylistId("https://open.spotify.com/album/123")).toBeNull();
  });

  it("rejects a malformed id", () => {
    expect(
      extractSpotifyPlaylistId("https://open.spotify.com/playlist/short"),
    ).toBeNull();
    expect(
      extractSpotifyPlaylistId(
        "https://open.spotify.com/playlist/has spaces and symbols!!",
      ),
    ).toBeNull();
  });

  it("rejects a non-string", () => {
    expect(extractSpotifyPlaylistId(undefined)).toBeNull();
    expect(extractSpotifyPlaylistId(123)).toBeNull();
  });
});

describe("resolvePlaylistEmbedUrl", () => {
  it("prefers an explicit playlist id", () => {
    expect(resolvePlaylistEmbedUrl({ playlistId: ID })).toBe(toSpotifyEmbedUrl(ID));
  });

  it("falls back to the URL", () => {
    expect(
      resolvePlaylistEmbedUrl({
        spotifyUrl: `https://open.spotify.com/playlist/${ID}`,
      }),
    ).toBe(toSpotifyEmbedUrl(ID));
  });

  it("returns null when there is no usable playlist", () => {
    expect(resolvePlaylistEmbedUrl({})).toBeNull();
    expect(
      resolvePlaylistEmbedUrl({ spotifyUrl: "https://example.com/playlist/1" }),
    ).toBeNull();
  });
});
