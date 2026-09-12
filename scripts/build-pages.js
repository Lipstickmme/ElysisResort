'use strict';

/**
 * Build the static site from the shared layout and the content in src/data.
 * Run with `npm run build`. Output goes to public/.
 *
 * Every residence and every experience becomes its own page under public/suites
 * and public/experiences, so a room photograph links to a real profile with its
 * own URL and its own text in the HTML rather than to something the browser has
 * to fetch and assemble.
 */

const fs = require('fs');
const path = require('path');
const { page } = require('../src/site/layout');
const pages = require('../src/site/pages');
const images = require('../src/site/images');

const publicDir = path.join(__dirname, '..', 'public');

/** Pages built last time that the content no longer has, so nothing is stale. */
function sweep(dir, keep) {
  const abs = path.join(publicDir, dir);
  if (!fs.existsSync(abs)) return;
  fs.readdirSync(abs)
    .filter((f) => f.endsWith('.html') && !keep.has(`${dir}/${f}`))
    .forEach((f) => {
      fs.unlinkSync(path.join(abs, f));
      console.log(`  removed ${dir}/${f} (no longer in the content)`);
    });
}

let count = 0;
let bytes = 0;
const written = new Set();

for (const def of pages) {
  const html = page(def);
  const out = path.join(publicDir, def.file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html, 'utf8');
  written.add(def.file);
  count += 1;
  bytes += html.length;
}

sweep('suites', written);
sweep('experiences', written);

console.log(`[build] wrote ${count} pages (${Math.round(bytes / 1024)} KB)`);

// Say out loud which real photography was picked up, so a deploy still running
// on placeholder artwork is obvious from the build log rather than the page.
const picked = Array.from(new Set(images._resolved));
if (picked.length) {
  console.log(`[build] using ${picked.length} supplied photograph(s): ${picked.join(', ')}`);
} else {
  console.log('[build] no photography in public/assets/img: using the placeholder artwork');
}
