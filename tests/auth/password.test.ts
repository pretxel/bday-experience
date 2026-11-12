import { describe, expect, it } from "vitest";

import {
  generateSalt,
  hashCode,
  verifyCode,
} from "@/lib/auth/password";

describe("hashCode", () => {
  it("produces a hex sha256 digest", () => {
    const hash = hashCode("secreto", generateSalt());

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same code and salt", () => {
    const salt = generateSalt();

    expect(hashCode("secreto", salt)).toBe(hashCode("secreto", salt));
  });

  it("produces a different digest for a different salt", () => {
    expect(hashCode("secreto", generateSalt())).not.toBe(
      hashCode("secreto", generateSalt()),
    );
  });

  it("throws when the salt is not hex", () => {
    expect(() => hashCode("secreto", "not-hex!")).toThrow(/hex/);
  });
});

describe("verifyCode", () => {
  const salt = generateSalt();
  const hash = hashCode("secreto", salt);

  it("accepts the correct code", () => {
    expect(verifyCode("secreto", salt, hash)).toBe(true);
  });

  it("rejects an incorrect code", () => {
    expect(verifyCode("secreto-incorrecto", salt, hash)).toBe(false);
  });

  it("rejects the correct code against a different salt", () => {
    expect(verifyCode("secreto", generateSalt(), hash)).toBe(false);
  });

  it("rejects a malformed stored hash instead of throwing", () => {
    expect(verifyCode("secreto", salt, "not-hex")).toBe(false);
    expect(verifyCode("secreto", salt, "")).toBe(false);
    expect(verifyCode("secreto", salt, "abcd")).toBe(false);
  });

  it("rejects a malformed salt instead of throwing", () => {
    expect(verifyCode("secreto", "zzzz", hash)).toBe(false);
    expect(verifyCode("secreto", "", hash)).toBe(false);
  });

  it("ignores surrounding whitespace in the submitted code", () => {
    expect(verifyCode("  secreto  ", salt, hash)).toBe(true);
  });
});
