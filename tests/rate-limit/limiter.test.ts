import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildRateLimitIdentifier,
  checkAccessRateLimit,
  extractClientIp,
} from "@/lib/rate-limit/limiter";

describe("extractClientIp", () => {
  it("reads the first entry of the forwarded chain", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.5, 70.41.3.18" });

    expect(extractClientIp(headers)).toBe("203.0.113.5");
  });

  it("prefers the Vercel header", () => {
    const headers = new Headers({
      "x-vercel-forwarded-for": "203.0.113.9",
      "x-forwarded-for": "198.51.100.4",
    });

    expect(extractClientIp(headers)).toBe("203.0.113.9");
  });

  it("falls back to a constant when there is no header", () => {
    expect(extractClientIp(new Headers())).toBe("unknown");
  });
});

describe("buildRateLimitIdentifier", () => {
  it("never contains the raw address", () => {
    const identifier = buildRateLimitIdentifier("203.0.113.5", "ana");

    expect(identifier).not.toContain("203.0.113.5");
    expect(identifier).toContain("ana");
  });

  it("is stable for the same address and slug", () => {
    expect(buildRateLimitIdentifier("203.0.113.5", "ana")).toBe(
      buildRateLimitIdentifier("203.0.113.5", "ana"),
    );
  });

  it("differs per slug", () => {
    expect(buildRateLimitIdentifier("203.0.113.5", "ana")).not.toBe(
      buildRateLimitIdentifier("203.0.113.5", "other"),
    );
  });
});

describe("checkAccessRateLimit", () => {
  it("allows the attempt when no shared store is configured", async () => {
    const result = await checkAccessRateLimit("bday:access:test:ana");

    expect(result.allowed).toBe(true);
    expect(result.configured).toBe(false);
  });
});

describe("limiter implementation", () => {
  it("keeps no counter in module scope", async () => {
    const source = await readFile(
      fileURLToPath(
        new URL("../../lib/rate-limit/limiter.ts", import.meta.url),
      ),
      "utf8",
    );

    // An in-memory counter would reset on every cold start and would be
    // counted separately by every serverless instance.
    expect(source).not.toMatch(/new Map\(/);
    expect(source).not.toMatch(/new Set\(/);
    expect(source).not.toMatch(/let\s+counter/);
    expect(source).not.toMatch(/const\s+counters\b/);
  });
});
