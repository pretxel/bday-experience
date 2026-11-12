import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Password hashing for the shared access code.
 *
 * The code itself is never stored. What is stored is a salt (hex) and the
 * hex SHA-256 digest of the scrypt-derived key, which normalises the
 * comparison to a fixed length so that `timingSafeEqual` can be used safely.
 *
 * These functions are deliberately free of any environment access so they can
 * be unit tested in isolation.
 */

/** scrypt cost parameters. N=2^14 keeps a derivation around ~100ms. */
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

/** Length of the derived key in bytes. */
const KEY_LENGTH = 64;

/** Upper bound for scrypt's memory allocation. */
const MAX_MEM = 64 * 1024 * 1024;

const HEX = /^[0-9a-f]+$/;

/** Normalise the code so a stray space from a copy-paste never breaks access. */
function normalise(code: string): string {
  return code.trim().normalize("NFKC");
}

function isHex(value: string): boolean {
  return value.length > 0 && value.length % 2 === 0 && HEX.test(value);
}

function decodeHex(value: string): Buffer | null {
  if (!isHex(value)) {
    return null;
  }
  return Buffer.from(value, "hex");
}

/** Generate a fresh random salt, hex encoded. */
export function generateSalt(): string {
  return randomBytes(16).toString("hex");
}

/** Derive the scrypt key for a code and salt. */
function deriveKey(code: string, salt: Buffer): Buffer {
  return scryptSync(normalise(code), salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: MAX_MEM,
  });
}

/**
 * Hash a plaintext access code with the given salt.
 *
 * Returns the hex SHA-256 digest of the scrypt-derived key.
 * Throws when the salt is not valid hex.
 */
export function hashCode(code: string, saltHex: string): string {
  const salt = decodeHex(saltHex);
  if (salt === null) {
    throw new Error("The salt must be a hex string of even length.");
  }
  return createHash("sha256").update(deriveKey(code, salt)).digest("hex");
}

/**
 * Verify a submitted access code against the stored hash.
 *
 * Both sides are reduced to a fixed-length digest before being compared with
 * `timingSafeEqual`, so the comparison neither leaks timing information nor
 * throws when the stored hash is malformed.
 */
export function verifyCode(
  code: string,
  saltHex: string,
  expectedHash: string,
): boolean {
  const salt = decodeHex(saltHex);
  const expected = decodeHex(expectedHash);

  if (salt === null || expected === null || expected.length !== 32) {
    return false;
  }

  let computed: Buffer;
  try {
    computed = createHash("sha256").update(deriveKey(code, salt)).digest();
  } catch {
    return false;
  }

  return timingSafeEqual(computed, expected);
}
