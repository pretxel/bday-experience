#!/usr/bin/env node
/**
 * Generate the access code hash and salt for the environment.
 *
 *   node scripts/hash-code.mjs "my secret code"
 *   node scripts/hash-code.mjs            # prompts without echoing
 *
 * The plaintext code is never written to disk.
 */

import { createHash, randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const MAX_MEM = 64 * 1024 * 1024;

/** Read a line from stdin without echoing it. */
async function promptHidden(question) {
  const readline = createInterface({ input: stdin, output: stdout });

  const wasRaw = Boolean(stdout.isTTY);
  if (wasRaw) {
    stdout.write(question);
    stdin.setRawMode(true);
  }

  let value = "";

  try {
    for await (const chunk of stdin) {
      const character = chunk.toString("utf8");

      if (character === "\n" || character === "\r") {
        break;
      }

      if (character === "\u0003" || character === "\u0004") {
        process.exit(130);
      }

      if (character === "\u007f" || character === "\b") {
        value = value.slice(0, -1);
        continue;
      }

      value += character;
    }
  } finally {
    if (wasRaw) {
      stdin.setRawMode(false);
      stdout.write("\n");
    }
    readline.close();
  }

  return value;
}

function hashCode(code, saltHex) {
  const salt = Buffer.from(saltHex, "hex");
  const key = scryptSync(code.trim().normalize("NFKC"), salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: MAX_MEM,
  });

  return createHash("sha256").update(key).digest("hex");
}

async function main() {
  const fromArgument = process.argv[2];

  const code =
    fromArgument ?? (await promptHidden("Access code: "));

  const trimmed = code.trim();

  if (trimmed.length === 0) {
    console.error("The access code must not be empty.");
    process.exit(1);
  }

  if (trimmed.length > 128) {
    console.error("The access code must be 128 characters or fewer.");
    process.exit(1);
  }

  const salt = randomBytes(16).toString("hex");
  const hash = hashCode(trimmed, salt);

  console.log("\nAdd these to your .env.local (and to the Vercel project):\n");
  console.log(`ACCESS_CODE_HASH=${hash}`);
  console.log(`ACCESS_CODE_SALT=${salt}`);
  console.log("\nThe access code itself is never stored or printed again.");
}

await main();
