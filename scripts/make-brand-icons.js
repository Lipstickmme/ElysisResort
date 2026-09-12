'use strict';

/**
 * Draws the Elysis app icons as PNGs.
 *
 * The brand marks themselves are SVG (public/assets/brand), which is what the
 * pages use. Home-screen and legacy favicons have to be raster, and there is no
 * image library in this project by design, so the rosette is rasterised here
 * with nothing but zlib and arithmetic.
 *
 * Run: npm run icons
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'public');

const BRONZE = [0x6b, 0x54, 0x33];
const CREAM = [0xf7, 0xf1, 0xe6];

/* --- PNG container ------------------------------------------------------ */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;    // bit depth
  ihdr[9] = 6;    // truecolour with alpha
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0; // no filter
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* --- the mark ----------------------------------------------------------- */

/**
 * True inside the eight-petal rosette of radius `r` at this point.
 * An eight petal rose is r = R |cos 4t| in polar coordinates; the quatrefoil
 * outline around it is the same curve at half frequency.
 */
function inRose(dx, dy, R) {
  const d = Math.hypot(dx, dy);
  if (d > R) return false;
  const t = Math.atan2(dy, dx);
  return d <= R * Math.abs(Math.cos(4 * t));
}

function inDiamond(dx, dy, R) {
  return Math.abs(dx) + Math.abs(dy) <= R;
}

/** One pixel of the icon, sampled without anti-aliasing; the caller supersamples. */
function sample(x, y, size) {
  const c = size / 2;
  const dx = x - c;
  const dy = y - c;
  const R = size * 0.42;
  const radius = size * 0.19; // rounded-square ground

  // Ground: rounded square in bronze.
  const qx = Math.max(Math.abs(dx) - (c - radius), 0);
  const qy = Math.max(Math.abs(dy) - (c - radius), 0);
  if (Math.hypot(qx, qy) > radius) return null;

  const ring = (lo, hi) => {
    const d = Math.abs(dx) + Math.abs(dy);
    return d >= R * lo && d <= R * hi;
  };

  // Outline quatrefoil, petals, and a centre ring, all in cream.
  if (inDiamond(dx, dy, R * 1.08) && ring(1.0, 1.08)) return CREAM;
  if (inRose(dx, dy, R * 0.92) && !inRose(dx, dy, R * 0.62)) return CREAM;
  const d = Math.hypot(dx, dy);
  if (d >= R * 0.2 && d <= R * 0.27) return CREAM;
  return BRONZE;
}

function draw(size) {
  const ss = 3;
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < ss; sy += 1) {
        for (let sx = 0; sx < ss; sx += 1) {
          const px = sample(x + (sx + 0.5) / ss, y + (sy + 0.5) / ss, size);
          if (px) { r += px[0]; g += px[1]; b += px[2]; a += 255; }
        }
      }
      const n = ss * ss;
      const i = (y * size + x) * 4;
      const hit = a / 255;
      out[i] = hit ? Math.round(r / hit) : 0;
      out[i + 1] = hit ? Math.round(g / hit) : 0;
      out[i + 2] = hit ? Math.round(b / hit) : 0;
      out[i + 3] = Math.round(a / n);
    }
  }
  return png(size, size, out);
}

[['favicon.png', 512], ['apple-touch-icon.png', 180]].forEach(([file, size]) => {
  fs.writeFileSync(path.join(OUT, file), draw(size));
  console.log(`[icons] wrote ${file} (${size}px)`);
});
