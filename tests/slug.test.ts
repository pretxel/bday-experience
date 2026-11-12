import { describe, expect, it } from "vitest";

import { isValidSlug, resolveContentPath } from "@/lib/slug";

describe("isValidSlug", () => {
  it("accepts a lowercase slug", () => {
    expect(isValidSlug("ana")).toBe(true);
    expect(isValidSlug("ana-maria")).toBe(true);
    expect(isValidSlug("ana2")).toBe(true);
  });

  it("rejects traversal attempts", () => {
    expect(isValidSlug("../../etc/passwd")).toBe(false);
    expect(isValidSlug("..%2F..%2Fsecret")).toBe(false);
    expect(isValidSlug("ana/../b")).toBe(false);
    expect(isValidSlug("..")).toBe(false);
  });

  it("rejects uppercase letters", () => {
    expect(isValidSlug("Ana")).toBe(false);
  });

  it("rejects spaces and other invalid characters", () => {
    expect(isValidSlug("ana maria")).toBe(false);
    expect(isValidSlug("ana.md")).toBe(false);
    expect(isValidSlug("ana_maria")).toBe(false);
    expect(isValidSlug("ana$maria")).toBe(false);
  });

  it("rejects an over-long slug", () => {
    expect(isValidSlug("a".repeat(65))).toBe(false);
    expect(isValidSlug("a".repeat(64))).toBe(true);
  });

  it("rejects non-strings", () => {
    expect(isValidSlug(undefined)).toBe(false);
    expect(isValidSlug(null)).toBe(false);
    expect(isValidSlug(42)).toBe(false);
  });
});

describe("resolveContentPath", () => {
  it("resolves a valid slug inside the content directory", () => {
    const resolved = resolveContentPath("ana");

    expect(resolved).not.toBeNull();
    expect(resolved?.endsWith("/content/ana.md")).toBe(true);
  });

  it("refuses to resolve an invalid slug", () => {
    expect(resolveContentPath("../../etc/passwd")).toBeNull();
    expect(resolveContentPath("Ana")).toBeNull();
  });
});
