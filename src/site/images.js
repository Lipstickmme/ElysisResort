'use strict';

/**
 * Resolves image slots against whatever photography has actually been supplied.
 *
 * Every slot names the files it would rather have and the artwork it falls back
 * on until one of them exists, so adding real photography is a file drop into
 * public/assets/img/ rather than a code change. See that directory's README for
 * the names each slot accepts.
 *
 * Used by the page build and by the API, so a card rendered into the HTML and
 * the same card fetched as JSON always point at the same file.
 */

const fs = require('fs');
const path = require('path');

const data = require('../data/images.json');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
// Preference order, best format first. WebP wins, so a converted copy is used
// in place of a heavy original without anyone having to delete the original.
const EXTENSIONS = ['.webp', '.avif', '.jpg', '.jpeg', '.png', '.svg'];
const DIRS = ['/assets/img/', '/assets/placeholder/'];

const found = [];

/**
 * Every candidate file, indexed by lower-cased name.
 *
 * Case-insensitive on purpose: an upload named Elysis3.PNG has to be found on
 * Linux, where the deploy runs, not only on the machine it was named on.
 */
const index = new Map();
DIRS.forEach((dir) => {
  const abs = path.join(PUBLIC_DIR, dir);
  let entries = [];
  try {
    entries = fs.readdirSync(abs);
  } catch (err) {
    return;
  }
  entries.forEach((file) => {
    const key = `${dir}${file.toLowerCase()}`;
    if (!index.has(key)) index.set(key, `${dir}${file}`);
  });
});

/** The first file that actually exists for any of these base names. */
function lookUp(names) {
  for (const name of names || []) {
    for (const dir of DIRS) {
      for (const ext of EXTENSIONS) {
        const hit = index.get(`${dir}${name}${ext}`.toLowerCase());
        if (hit) return hit;
      }
    }
  }
  return null;
}

/**
 * The best file for a slot.
 * @param {string[]} prefer base names, best first
 * @param {string} fallback what to use until one of them is there
 */
function pick(prefer, fallback) {
  const hit = lookUp(prefer);
  if (hit && hit.indexOf('/assets/placeholder/') !== 0) found.push(hit);
  return hit || fallback;
}

function resolve(spec) {
  if (typeof spec === 'string') return spec;
  return pick(spec.prefer, spec.fallback);
}

const images = {};
Object.entries(data.slots).forEach(([slot, spec]) => {
  images[slot] = resolve(spec);
});
images.heroSlides = data.heroSlides.map(resolve);

/** What the build should report: which real photographs were picked up, if any. */
images._resolved = found;
images.pick = pick;

module.exports = images;
