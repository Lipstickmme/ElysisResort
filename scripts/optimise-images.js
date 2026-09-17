'use strict';

/**
 * Re-encode supplied photography as WebP, sized for the web.
 *
 * The photographs arrive as PNGs of one to two megabytes each, which is fine
 * as an original and far too heavy for a page that shows six of them. There is
 * no image library in this project by design, so the encoding is done by the
 * browser that is already here for the tests: a canvas, a resize, and
 * toDataURL('image/webp').
 *
 * The originals are left alone. src/site/images.js prefers .webp over .png for
 * the same base name, so the next build picks the lighter copy up by itself.
 *
 * Run: npm run optimise
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const IMG_DIR = path.join(__dirname, '..', 'public', 'assets', 'img');
const MAX_WIDTH = 2400;
const QUALITY = 0.82;

async function main() {
  const originals = fs
    .readdirSync(IMG_DIR)
    .filter((f) => /\.(png|jpe?g)$/i.test(f))
    .sort();

  if (!originals.length) {
    console.log('[optimise] no photographs in public/assets/img');
    return;
  }

  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage();
  let saved = 0;
  let before = 0;
  let after = 0;

  for (const file of originals) {
    const base = file.replace(/\.[^.]+$/, '');
    const out = path.join(IMG_DIR, `${base}.webp`);
    const source = path.join(IMG_DIR, file);
    const sourceBytes = fs.statSync(source).size;

    // Skip anything already converted and still newer than its original.
    if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(source).mtimeMs) {
      before += sourceBytes;
      after += fs.statSync(out).size;
      continue;
    }

    const dataUrl = `data:image/${path.extname(file).slice(1)};base64,${fs.readFileSync(source).toString('base64')}`;
    const encoded = await page.evaluate(
      async ({ src, maxWidth, quality }) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        const scale = Math.min(1, maxWidth / img.naturalWidth);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return {
          data: canvas.toDataURL('image/webp', quality).split(',')[1],
          width: canvas.width,
          height: canvas.height,
        };
      },
      { src: dataUrl, maxWidth: MAX_WIDTH, quality: QUALITY }
    );

    const bytes = Buffer.from(encoded.data, 'base64');
    fs.writeFileSync(out, bytes);
    before += sourceBytes;
    after += bytes.length;
    saved += 1;
    console.log(
      `  ${base}.webp  ${encoded.width}x${encoded.height}  ` +
        `${(sourceBytes / 1024 / 1024).toFixed(2)} MB -> ${(bytes.length / 1024).toFixed(0)} KB`
    );
  }

  await browser.close();
  console.log(
    `[optimise] ${saved} written, ${originals.length} photographs total: ` +
      `${(before / 1024 / 1024).toFixed(1)} MB -> ${(after / 1024 / 1024).toFixed(1)} MB served`
  );
}

main();
