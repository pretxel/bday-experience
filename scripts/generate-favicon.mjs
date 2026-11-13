#!/usr/bin/env node
/**
 * Generate the raster icons from the same design as `app/icon.svg`.
 *
 *   node scripts/generate-favicon.mjs
 *
 * Writes `app/favicon.ico` (16/32/48 px, for the legacy `/favicon.ico`
 * request every browser makes) and `app/apple-icon.png` (180 px, for the
 * iOS home screen). Both are built by hand so the repository needs no image
 * tooling and the assets stay reproducible.
 */

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { deflateSync } from "node:zlib";

/* -------------------------------------------------------------- palette -- */

const PLUM_TOP = [0x3a, 0x1d, 0x42];
const PLUM_BOTTOM = [0x15, 0x0b, 0x19];
const GOLD_TOP = [0xf0, 0xdc, 0xae];
const GOLD_BOTTOM = [0xb4, 0x8b, 0x3f];

/* ------------------------------------------------------------------ crc -- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);

  for (let n = 0; n < 256; n += 1) {
    let c = n;

    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }

    table[n] = c >>> 0;
  }

  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

/* ------------------------------------------------------------------ png -- */

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);

  return Buffer.concat([length, body, crc]);
}

function encodePng(size, rgba) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);

  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA
  header[10] = 0; // deflate
  header[11] = 0; // adaptive filtering
  header[12] = 0; // no interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------ ico -- */

function encodeIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = [];

  for (const image of images) {
    const entry = Buffer.alloc(16);
    entry[0] = image.size >= 256 ? 0 : image.size;
    entry[1] = image.size >= 256 ? 0 : image.size;
    entry[2] = 0; // palette size
    entry[3] = 0; // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(image.png.length, 8);
    entry.writeUInt32LE(offset, 12);

    offset += image.png.length;
    entries.push(entry);
  }

  return Buffer.concat([
    header,
    ...entries,
    ...images.map((image) => image.png),
  ]);
}

/* --------------------------------------------------------------- drawing -- */

function mix(a, b, t) {
  return a + (b - a) * t;
}

/** Signed distance to the rounded-rectangle border, for the background. */
function insideRoundedSquare(x, y, size, radius) {
  const max = size - radius;
  const cx = Math.min(Math.max(x, radius), max);
  const cy = Math.min(Math.max(y, radius), max);
  const dx = x - cx;
  const dy = y - cy;

  return dx * dx + dy * dy <= radius * radius;
}

/**
 * The heart, from the implicit curve `(x² + y² − 1)³ − x²y³ = 0`.
 */
function insideHeart(x, y) {
  const a = x * x + y * y - 1;
  return a * a * a - x * x * y * y * y <= 0;
}

/**
 * Render the icon into an RGBA buffer.
 *
 * Everything is drawn 4× and downsampled, which gives clean edges at 16 px.
 */
function renderIcon(size) {
  const supersample = 4;
  const buffer = Buffer.alloc(size * size * 4);
  const radius = size * 0.22;

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let bgHits = 0;
      let heartHits = 0;

      for (let sy = 0; sy < supersample; sy += 1) {
        for (let sx = 0; sx < supersample; sx += 1) {
          const x = px + (sx + 0.5) / supersample;
          const y = py + (sy + 0.5) / supersample;

          if (!insideRoundedSquare(x, y, size, radius)) {
            continue;
          }

          bgHits += 1;

          // Normalised heart coordinates, y pointing up.
          const hx = (x - size * 0.5) / (size * 0.3);
          const hy = (size * 0.52 - y) / (size * 0.3);

          if (insideHeart(hx, hy)) {
            heartHits += 1;
          }
        }
      }

      const samples = supersample * supersample;
      const bgAlpha = bgHits / samples;

      if (bgAlpha === 0) {
        continue;
      }

      const t = py / (size - 1);
      let r = mix(PLUM_TOP[0], PLUM_BOTTOM[0], t);
      let g = mix(PLUM_TOP[1], PLUM_BOTTOM[1], t);
      let b = mix(PLUM_TOP[2], PLUM_BOTTOM[2], t);

      const heartAlpha = heartHits / samples;

      if (heartAlpha > 0) {
        const h = Math.min(1, Math.max(0, (py - size * 0.18) / (size * 0.42)));
        const hr = mix(GOLD_TOP[0], GOLD_BOTTOM[0], h);
        const hg = mix(GOLD_TOP[1], GOLD_BOTTOM[1], h);
        const hb = mix(GOLD_TOP[2], GOLD_BOTTOM[2], h);

        r = mix(r, hr, heartAlpha);
        g = mix(g, hg, heartAlpha);
        b = mix(b, hb, heartAlpha);
      }

      const index = (py * size + px) * 4;
      buffer[index] = Math.round(r);
      buffer[index + 1] = Math.round(g);
      buffer[index + 2] = Math.round(b);
      buffer[index + 3] = Math.round(bgAlpha * 255);
    }
  }

  return buffer;
}

/* ----------------------------------------------------------------- main -- */

const root = path.join(process.cwd(), "app");

const icoSizes = [16, 32, 48];
const icoImages = icoSizes.map((size) => ({
  size,
  png: encodePng(size, renderIcon(size)),
}));

await writeFile(path.join(root, "favicon.ico"), encodeIco(icoImages));

await writeFile(path.join(root, "apple-icon.png"), encodePng(180, renderIcon(180)));

console.log(
  `Wrote app/favicon.ico (${icoSizes.join(", ")} px) and app/apple-icon.png (180 px).`,
);
