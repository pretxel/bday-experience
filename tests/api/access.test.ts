import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/access/route";

import { TEST_ACCESS_CODE, TEST_SLUG } from "../setup";

function accessRequest(body: unknown, ip = "203.0.113.10"): Request {
  return new Request("http://localhost/api/access", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/access", () => {
  it("grants a session for the correct code", async () => {
    const response = await POST(
      accessRequest({ code: TEST_ACCESS_CODE, slug: TEST_SLUG }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.headers.get("set-cookie")).toContain("bday_session=");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects an incorrect code with a generic error", async () => {
    const response = await POST(
      accessRequest({ code: "not-the-code", slug: TEST_SLUG }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "invalid_credentials",
    });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("returns a byte-identical response for an unknown slug and a wrong code", async () => {
    const wrongCode = await POST(
      accessRequest({ code: "not-the-code", slug: TEST_SLUG }),
    );
    const unknownSlug = await POST(
      accessRequest({ code: TEST_ACCESS_CODE, slug: "unknown-recipient" }),
    );

    expect(unknownSlug.status).toBe(wrongCode.status);
    expect(await unknownSlug.text()).toBe(await wrongCode.text());
    expect(unknownSlug.headers.get("set-cookie")).toBeNull();
  });

  it("rejects a malformed body", async () => {
    const response = await POST(accessRequest({ slug: TEST_SLUG }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "invalid_request",
    });
  });

  it("rejects an oversized code before hashing it", async () => {
    const response = await POST(
      accessRequest({ code: "a".repeat(200), slug: TEST_SLUG }),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects a body that is not JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      }),
    );

    expect(response.status).toBe(400);
  });
});
