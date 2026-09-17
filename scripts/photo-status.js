'use strict';

/**
 * What has been photographed, and what is still drawn.
 *
 * The site never breaks for want of a photograph: any slot without one shows
 * the stand-in artwork from scripts/make-placeholders.js. This says which
 * slots those are, and the file name each one is waiting for, so the shot list
 * comes out of the code rather than out of a stale table in a README.
 *
 * Run: npm run photos
 */

const content = require('../src/content');
const images = require('../src/site/images');

const { isPhoto } = content;
const missing = [];
const tally = [];

function group(label, entries) {
  const have = entries.filter((e) => isPhoto(e.src)).length;
  tally.push([label, have, entries.length]);
  entries.filter((e) => !isPhoto(e.src)).forEach((e) => missing.push(e));
}

group('Page furniture', [
  ['Hero slide 1', 'elysis-hero-1', images.heroSlides[0]],
  ['Hero slide 2', 'elysis-hero-2', images.heroSlides[1]],
  ['Hero slide 3', 'elysis-hero-3', images.heroSlides[2]],
  ['Landing, the house', 'elysis-story', images.story],
  ['Landing, residences', 'elysis-suites', images.suites],
  ['Landing, the days', 'elysis-experiences', images.experiences],
  ['Landing, the table', 'elysis-dining', images.dining],
  ['Landing, gallery', 'elysis-gallery', images.gallery],
  ['Landing, reserve', 'elysis-reserve', images.reserve],
  ['Header, /suites', 'elysis-suites-header', images.suitesHeader],
  ['Header, /experiences', 'elysis-experiences-header', images.experiencesHeader],
  ['Header, /dining', 'elysis-dining-header', images.diningHeader],
  ['Header, /gallery', 'elysis-gallery-header', images.galleryHeader],
  ['Header, /reserve', 'elysis-reserve-header', images.reserveHeader],
  ['Header, /careers', 'elysis-careers-header', images.careersHeader],
].map(([what, name, src]) => ({ what, name, src })));

group('Residences', content.suites.map((s) => ({ what: s.name, name: (s.prefer || [])[0], src: s.image })));
group('Experiences', content.experiences.map((e) => ({ what: e.title, name: (e.prefer || [])[0], src: e.image })));
group('Dining', content.dining.map((d) => ({ what: d.name, name: (d.prefer || [])[0], src: d.image })));
group('Gallery grid', content.gallery.map((g) => ({ what: g.title, name: (g.prefer || [])[0], src: g.image })));
group('Host portrait', content.leadership.map((l) => ({ what: l.name, name: (l.prefer || [])[0], src: l.image })));

const pad = (s, n) => String(s).padEnd(n);
console.log(`\n${pad('WHAT', 22)}${pad('PHOTOGRAPHED', 14)}`);
tally.forEach(([label, have, all]) => console.log(`${pad(label, 22)}${pad(`${have} / ${all}`, 14)}`));

const supplied = new Set(images._resolved).size;
console.log(`\n${supplied} photographs supplied. ${missing.length} slot(s) still on drawn artwork:\n`);
missing.forEach((m) => console.log(`  ${pad(m.what, 32)} drop in  ${m.name}.webp`));

console.log(`
Floor plans are drawn on purpose and are not in this list.
Extra frames are optional: <name>-2.webp, -3, -4 beside a hero are picked up
automatically and open a gallery band on that page.
Run npm run optimise after adding photographs to write the WebP copies the
site actually serves.
`);
