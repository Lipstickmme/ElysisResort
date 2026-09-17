'use strict';

/**
 * The resort's content, with every image slot already resolved.
 *
 * One module so the page build and the API can never disagree: a residence card
 * baked into suites.html and the same residence fetched from /api/suites show
 * the same photograph.
 *
 * Each entry may carry a `prefer` list of base file names. The hero image looks
 * for those names, and the gallery frames look for the same names numbered from
 * two, so dropping suite-aegean-loft.webp, suite-aegean-loft-2.webp and
 * suite-aegean-loft-3.webp into public/assets/img/ re-photographs a residence
 * without touching any code.
 */

const images = require('./site/images');

const suitesRaw = require('./data/suites.json');
const experiencesRaw = require('./data/experiences.json');
const diningRaw = require('./data/dining.json');
const galleryRaw = require('./data/gallery.json');
const resort = require('./data/resort.json');
const leadershipRaw = require('./data/leadership.json');
const careers = require('./data/careers.json');
const team = require('./data/team.json');

/** Resolve `image`, `gallery[]` and `plan` on one content entry. */
function withMedia(entry) {
  const prefer = entry.prefer || [];
  const out = {
    ...entry,
    image: images.pick(prefer, entry.image),
  };
  // Extra frames are whatever has actually been supplied: suite-kyma-2.webp,
  // -3 and -4 beside suite-kyma.webp. Nothing is demanded, so a residence with
  // one photograph shows one photograph rather than three stand-ins.
  out.gallery = [2, 3, 4]
    .map((n) => images.pick(prefer.map((name) => `${name}-${n}`), null))
    .filter(Boolean);
  if (entry.plan) out.plan = images.pick(prefer.map((name) => `${name}-plan`), entry.plan);
  return out;
}

const suites = suitesRaw.map(withMedia);
const experiences = experiencesRaw.map(withMedia);
const dining = diningRaw.map(withMedia);
const gallery = galleryRaw.items.map(withMedia);
const leadership = leadershipRaw.map(withMedia);

/**
 * True for a supplied photograph, false for the drawn stand-in artwork.
 *
 * Photography lives in /assets/img and artwork in /assets/placeholder, so the
 * pages can tell the difference and leave out a band that would otherwise show
 * one photograph above three drawings.
 */
const isPhoto = (src) => typeof src === 'string' && src.indexOf('/assets/img/') === 0;

/** The order collections appear in, everywhere. */
const COLLECTIONS = ['Suites', 'Pool Suites', 'Villas', 'Residences', 'Signature'];

const collections = COLLECTIONS.filter((name) => suites.some((s) => s.collection === name));

const byId = (list) => (id) => list.find((entry) => entry.id === id) || null;

/** The residence after this one, for the "next residence" link. */
function nextSuite(id) {
  const i = suites.findIndex((s) => s.id === id);
  if (i < 0) return suites[0];
  return suites[(i + 1) % suites.length];
}

function nextExperience(id) {
  const i = experiences.findIndex((e) => e.id === id);
  if (i < 0) return experiences[0];
  return experiences[(i + 1) % experiences.length];
}

/** Rates are held as numbers so they can be compared and sorted; shown as euro. */
function rate(value) {
  return `€${Number(value).toLocaleString('en-GB')}`;
}

module.exports = {
  isPhoto,
  suites,
  experiences,
  dining,
  gallery,
  galleryCategories: Array.from(new Set(gallery.map((g) => g.category))),
  resort,
  leadership,
  careers,
  team,
  collections,
  images,
  rate,
  suiteById: byId(suites),
  experienceById: byId(experiences),
  diningById: byId(dining),
  nextSuite,
  nextExperience,
};
