import { describe, expect, it } from "vitest";

import { frontmatterSchema } from "@/lib/content/schema";

describe("frontmatterSchema", () => {
  it("accepts a complete frontmatter", () => {
    const result = frontmatterSchema.safeParse({
      title: "Una sorpresa para ti",
      recipient: "Ana",
      dateLabel: "Tu día especial",
    });

    expect(result.success).toBe(true);
  });

  it("accepts the optional fields", () => {
    const result = frontmatterSchema.safeParse({
      title: "Una sorpresa",
      recipient: "Ana",
      dateLabel: "Tu día",
      subtitle: "Con cariño",
      spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
      playlistId: "37i9dQZF1DXcBWIGoYBM5M",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a missing title", () => {
    const result = frontmatterSchema.safeParse({
      recipient: "Ana",
      dateLabel: "Tu día",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a missing recipient", () => {
    const result = frontmatterSchema.safeParse({
      title: "Una sorpresa",
      dateLabel: "Tu día",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a missing dateLabel", () => {
    const result = frontmatterSchema.safeParse({
      title: "Una sorpresa",
      recipient: "Ana",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an empty required value", () => {
    const result = frontmatterSchema.safeParse({
      title: "   ",
      recipient: "Ana",
      dateLabel: "Tu día",
    });

    expect(result.success).toBe(false);
  });

  it("strips unknown keys", () => {
    const result = frontmatterSchema.parse({
      title: "Una sorpresa",
      recipient: "Ana",
      dateLabel: "Tu día",
      somethingElse: "ignored",
    });

    expect(result).not.toHaveProperty("somethingElse");
  });
});
