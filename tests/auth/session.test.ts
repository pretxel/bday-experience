import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  createSessionToken,
  verifySessionToken,
} from "@/lib/auth/session";

const SECRET = "a-secret-that-is-long-enough-for-the-tests-0123456789";

describe("createSessionToken", () => {
  it("produces a two-part token", () => {
    const token = createSessionToken("ana", SECRET);

    expect(token.split(".")).toHaveLength(2);
  });

  it("produces a different token every time", () => {
    const now = 1_700_000_000;

    expect(createSessionToken("ana", SECRET, { now })).not.toBe(
      createSessionToken("ana", SECRET, { now }),
    );
  });
});

describe("verifySessionToken", () => {
  it("accepts a freshly created token", () => {
    const now = 1_700_000_000;
    const token = createSessionToken("ana", SECRET, { now });

    const result = verifySessionToken(token, SECRET, { now: now + 10 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.slug).toBe("ana");
      expect(result.payload.iat).toBe(now);
      expect(result.payload.exp).toBe(now + 60 * 60 * 24 * 7);
    }
  });

  it("rejects a tampered payload", () => {
    const token = createSessionToken("ana", SECRET);
    const [payload, signature] = token.split(".") as [string, string];
    const tamperedPayload = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(payload, "base64url").toString()), slug: "other" }),
      "utf8",
    ).toString("base64url");

    const result = verifySessionToken(`${tamperedPayload}.${signature}`, SECRET);

    expect(result).toEqual({ ok: false, reason: "bad_signature" });
    expect(payload).not.toBe(tamperedPayload);
  });

  it("rejects a token signed with a different secret", () => {
    const token = createSessionToken("ana", SECRET);

    const result = verifySessionToken(token, "a-different-secret-that-is-also-long-enough-0123456789");

    expect(result).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("rejects an expired token", () => {
    const now = 1_700_000_000;
    const token = createSessionToken("ana", SECRET, { now, maxAge: 60 });

    const result = verifySessionToken(token, SECRET, { now: now + 120 });

    expect(result).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects a malformed token", () => {
    expect(verifySessionToken("", SECRET)).toEqual({
      ok: false,
      reason: "malformed",
    });
    expect(verifySessionToken("no-separator", SECRET)).toEqual({
      ok: false,
      reason: "malformed",
    });
    expect(verifySessionToken(".signature", SECRET)).toEqual({
      ok: false,
      reason: "malformed",
    });
    expect(verifySessionToken("payload.", SECRET)).toEqual({
      ok: false,
      reason: "malformed",
    });
  });

  it("rejects a correctly signed token whose payload is not JSON", () => {
    const encodedPayload = Buffer.from("not-json", "utf8").toString("base64url");
    const signature = createHmac("sha256", SECRET)
      .update(encodedPayload)
      .digest("base64url");

    const result = verifySessionToken(`${encodedPayload}.${signature}`, SECRET);

    expect(result).toEqual({ ok: false, reason: "malformed" });
  });

  it("rejects a token whose signature has the wrong length", () => {
    const token = createSessionToken("ana", SECRET);
    const [payload] = token.split(".") as [string];

    const result = verifySessionToken(`${payload}.c2hvcnQ`, SECRET);

    expect(result).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("keeps the session bound to its slug", () => {
    const token = createSessionToken("ana", SECRET);

    const result = verifySessionToken(token, SECRET);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.slug).toBe("ana");
    }
  });
});
