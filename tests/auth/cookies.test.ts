import { afterEach, describe, expect, it, vi } from "vitest";

import { buildSessionCookie, clearSessionCookie } from "@/lib/auth/cookies";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("buildSessionCookie", () => {
  it("sets the expected security attributes", () => {
    const cookie = buildSessionCookie("a-token");

    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
    expect(cookie).toMatch(/Max-Age=\d+/);
    expect(cookie).toContain("Expires=");
  });

  it("marks the cookie Secure in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(buildSessionCookie("a-token")).toContain("Secure");
  });

  it("does not mark the cookie Secure outside production", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(buildSessionCookie("a-token")).not.toContain("Secure");
  });

  it("uses the expected cookie name", () => {
    expect(buildSessionCookie("a-token").startsWith("bday_session=")).toBe(true);
  });
});

describe("clearSessionCookie", () => {
  it("expires the cookie immediately and keeps the same attributes", () => {
    const cookie = clearSessionCookie();

    expect(cookie).toContain("bday_session=");
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("Expires=Thu, 01 Jan 1970");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
  });
});
