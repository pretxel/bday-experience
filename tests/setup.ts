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

process.env.ACCESS_CODE_HASH ??= hashCode(TEST_ACCESS_CODE, TEST_SALT);
process.env.ACCESS_CODE_SALT ??= TEST_SALT;
process.env.SESSION_SECRET ??= TEST_SECRET;
process.env.RECIPIENT_SLUG ??= "ana";
