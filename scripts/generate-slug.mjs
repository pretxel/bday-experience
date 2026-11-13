#!/usr/bin/env node
/**
 * Generate the recipient slug.
 *
 *   node scripts/generate-slug.mjs                 # print a slug
 *   node scripts/generate-slug.mjs --rename ana    # also rename content/ana.md
 *
 * The slug is the key of the URL — `/<slug>`, `/<slug>/carta` — so it is
 * random and unguessable. It is *not* a substitute for the access code: the
 * code is still what gates the experience.
 *
 * The alphabet leaves out characters that are easy to confuse when a URL is
 * read out loud or copied by hand (0/o, 1/l/i).
 */

import { randomInt } from "node:crypto";
import { rename } from "node:fs/promises";
import path from "node:path";

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const LENGTH = 8;

function generateSlug(length = LENGTH) {
  let slug = "";

  for (let index = 0; index < length; index += 1) {
    slug += ALPHABET[randomInt(ALPHABET.length)];
  }

  return slug;
}

const args = process.argv.slice(2);
const renameIndex = args.indexOf("--rename");
const currentSlug = renameIndex === -1 ? undefined : args[renameIndex + 1];

const slug = generateSlug();

if (currentSlug) {
  const contentDir = path.join(process.cwd(), "content");
  const from = path.join(contentDir, `${currentSlug}.md`);
  const to = path.join(contentDir, `${slug}.md`);

  await rename(from, to);

  console.log(`Renamed content/${currentSlug}.md -> content/${slug}.md\n`);
}

console.log(`Slug: ${slug}\n`);
console.log("Next steps:");
console.log(`  1. Set RECIPIENT_SLUG=${slug} in .env.local and in the Vercel project.`);
console.log("  2. Deploy. The root path will redirect to /" + slug + ".");
