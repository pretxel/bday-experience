import { readdirSync } from "node:fs";
import path from "node:path";

import { hashCode } from "@/lib/auth/password";

/**
 * Test environment.
 *
 * The credentials below are throwaway values used only by the unit tests.
 * `ACCESS_CODE_HASH` is the hash of the code "test-code", so the test suite
 * can exercise the real verification path.
 */

export const TEST_ACCESS_CODE = "test-code";
export const TEST_SALT = "00112233445566778899aabbccddeeff";
export const TEST_SECRET = "test-session-secret-that-is-long-enough-to-be-safe-0123456789";

/**
 * The slug under test.
 *
 * The recipient slug is random and changes whenever the content file is
 * renamed, so the tests read it from `content/` instead of hard-coding it.
 */
export const TEST_SLUG = readdirSync(path.join(process.cwd(), "content"))
  .filter((file) => file.endsWith(".md"))
  .map((file) => file.replace(/\.md$/, ""))
  .sort()[0] as string;

process.env.ACCESS_CODE_HASH ??= hashCode(TEST_ACCESS_CODE, TEST_SALT);
process.env.ACCESS_CODE_SALT ??= TEST_SALT;
process.env.SESSION_SECRET ??= TEST_SECRET;
process.env.RECIPIENT_SLUG ??= TEST_SLUG;
