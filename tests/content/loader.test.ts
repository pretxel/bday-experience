import { describe, expect, it } from "vitest";

import { getContent, hasContent } from "@/lib/content/loader";

import { TEST_SLUG } from "../setup";

describe("getContent", () => {
  it("loads the content of an existing recipient", async () => {
    const result = await getContent(TEST_SLUG);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.content.slug).toBe(TEST_SLUG);
      expect(result.content.recipient).toBe("Ana");
      expect(result.content.title.length).toBeGreaterThan(0);
      expect(result.content.dateLabel.length).toBeGreaterThan(0);
      expect(result.content.bodyHtml).toContain("<p>");
    }
  });

  it("canonicalises the Spotify playlist URL", async () => {
    const result = await getContent(TEST_SLUG);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.content.spotifyEmbedUrl).toBe(
        "https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M",
      );
    }
  });

  it("returns not_found for a slug without a content file", async () => {
    const result = await getContent("does-not-exist");

    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("returns not_found for an invalid slug instead of reading the disk", async () => {
    const result = await getContent("../../etc/passwd");

    expect(result).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("hasContent", () => {
  it("is true for an existing recipient", async () => {
    await expect(hasContent(TEST_SLUG)).resolves.toBe(true);
  });

  it("is false for an unknown recipient", async () => {
    await expect(hasContent("does-not-exist")).resolves.toBe(false);
  });

  it("is false for an invalid slug", async () => {
    await expect(hasContent("../secrets")).resolves.toBe(false);
  });
});
