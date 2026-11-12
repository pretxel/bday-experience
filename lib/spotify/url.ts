/**
 * Spotify playlist URL handling.
 *
 * People copy both the regular playlist URL and the embed URL out of Spotify,
 * so both are accepted. Only a strictly validated playlist id is ever placed
 * in an iframe source.
 */

/** Spotify playlist ids are base62; 10 is the shortest id Spotify issues. */
const PLAYLIST_ID = /^[A-Za-z0-9]{10,64}$/;

/** Hosts we trust to serve a playlist embed. */
const ALLOWED_HOSTS = new Set(["open.spotify.com"]);

/** True when the string looks like a Spotify playlist id. */
export function isValidPlaylistId(id: unknown): id is string {
  return typeof id === "string" && PLAYLIST_ID.test(id);
}

/**
 * Extract the playlist id from a Spotify playlist or embed URL.
 *
 * Returns `null` for anything that is not a recognised Spotify playlist URL.
 */
export function extractSpotifyPlaylistId(url: unknown): string | null {
  if (typeof url !== "string" || url.trim().length === 0) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.has(parsed.hostname)) {
    return null;
  }

  const segments = parsed.pathname.split("/").filter((segment) => segment !== "");

  let id: string | undefined;

  if (segments[0] === "embed" && segments[1] === "playlist") {
    id = segments[2];
  } else if (segments[0] === "playlist") {
    id = segments[1];
  }

  if (id === undefined || !isValidPlaylistId(id)) {
    return null;
  }

  return id;
}

/** Build the canonical embed URL for a playlist id. */
export function toSpotifyEmbedUrl(id: string): string {
  return `https://open.spotify.com/embed/playlist/${id}`;
}

/**
 * Resolve the embed URL for a piece of content.
 *
 * An explicit `playlistId` wins over `spotifyUrl`; when neither yields a
 * valid id the result is `null` and the page renders a placeholder instead.
 */
export function resolvePlaylistEmbedUrl(options: {
  spotifyUrl?: string | undefined;
  playlistId?: string | undefined;
}): string | null {
  if (isValidPlaylistId(options.playlistId)) {
    return toSpotifyEmbedUrl(options.playlistId);
  }

  const fromUrl = extractSpotifyPlaylistId(options.spotifyUrl);

  if (fromUrl !== null) {
    return toSpotifyEmbedUrl(fromUrl);
  }

  return null;
}
