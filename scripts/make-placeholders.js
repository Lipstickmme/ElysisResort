'use strict';

/**
 * Draws the stand-in artwork for every image slot on the site.
 *
 * The resort's own photography is not in the repository yet, so every image
 * the pages ask for is generated here as a small, hand-composed SVG: a suite
 * terrace over the Aegean, the pool at noon, the beach fire at night. They are
 * illustrations rather than grey boxes, so the site can be reviewed, shared and
 * signed off before a single photograph exists.
 *
 * Swapping in real photography never touches this file. Either drop a file
 * named in a slot's `prefer` list into public/assets/img/ (see src/site/images.js),
 * or point the JSON at the real path.
 *
 * Run: npm run placeholders
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'assets', 'placeholder');
const DATA_DIR = path.join(ROOT, 'src', 'data');

/* ------------------------------------------------------------------ *
 * Palettes
 * ------------------------------------------------------------------ */

const PALETTES = {
  day: {
    skyTop: '#bcd8e6', skyBase: '#eef4f3', sun: '#fff3d8',
    sea: '#3a7f99', seaDeep: '#1f5468', sand: '#e9dcc6',
    wall: '#fbf8f2', wallShade: '#ece4d6', roof: '#d9cdb9',
    wood: '#9c7b51', green: '#6f7f5c', greenDark: '#4e5c40',
    ink: '#4a3f31', accent: '#8a6a3c',
  },
  dusk: {
    skyTop: '#6e6a8e', skyBase: '#f2c49a', sun: '#ffd9a1',
    sea: '#3b5e7a', seaDeep: '#22384f', sand: '#d8c4a6',
    wall: '#f6ead9', wallShade: '#e3d0b9', roof: '#c9b295',
    wood: '#8d6b44', green: '#5c6a4e', greenDark: '#3f4a37',
    ink: '#3b2f26', accent: '#b07d42',
  },
  night: {
    skyTop: '#111b28', skyBase: '#2b3a4a', sun: '#f4e6c4',
    sea: '#1b3244', seaDeep: '#0d1c28', sand: '#5d5240',
    wall: '#e7dcc9', wallShade: '#bfae95', roof: '#9c8a72',
    wood: '#6b4f33', green: '#3c4a38', greenDark: '#26301f',
    ink: '#f1e7d6', accent: '#e0a75c',
  },
  interior: {
    skyTop: '#efe7db', skyBase: '#f8f3ea', sun: '#fff6e2',
    sea: '#7fa7b5', seaDeep: '#5b8494', sand: '#e6d9c2',
    wall: '#f6f1e7', wallShade: '#e7dccb', roof: '#cdbda6',
    wood: '#a07d52', green: '#6f7f5c', greenDark: '#4e5c40',
    ink: '#4a3f31', accent: '#8a6a3c',
  },
};

/* ------------------------------------------------------------------ *
 * Tiny deterministic RNG, so a given filename always draws the same scene
 * ------------------------------------------------------------------ */

function seedFrom(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const n = (v) => Math.round(v * 100) / 100;

/* ------------------------------------------------------------------ *
 * Drawing vocabulary
 *
 * Every element is drawn at its own natural size and scaled by `S`, the
 * scene's base unit (roughly a fortieth of the frame), so one set of shapes
 * composes at any canvas size from a card thumbnail to a full-bleed hero.
 * ------------------------------------------------------------------ */

function sky(c) {
  return `<rect width="${c.W}" height="${c.H}" fill="url(#sky)"/>`;
}

function sun(c, x, y, r, glow = true) {
  const p = c.p;
  return `${glow ? `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 3.4)}" fill="url(#glow)"/>` : ''}
  <circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${p.sun}" opacity="0.95"/>`;
}

function hills(c, horizon) {
  const { W, p, rand } = c;
  const a = horizon - c.S * (3.2 + rand() * 1.6);
  const b = horizon - c.S * (5.4 + rand() * 2.2);
  return `
  <path d="M0 ${n(horizon)} C ${n(W * 0.08)} ${n(b)}, ${n(W * 0.26)} ${n(a)}, ${n(W * 0.5)} ${n(horizon)} Z" fill="${p.seaDeep}" opacity="0.2"/>
  <path d="M${n(W * 0.44)} ${n(horizon)} C ${n(W * 0.62)} ${n(a)}, ${n(W * 0.84)} ${n(b)}, ${W} ${n(horizon - c.S * 1.2)} L ${W} ${n(horizon)} Z" fill="${p.seaDeep}" opacity="0.26"/>`;
}

function sea(c, horizon, to) {
  const { W, H, rand, S } = c;
  const bottom = to == null ? H : to;
  let waves = '';
  for (let i = 0; i < 9; i += 1) {
    const y = horizon + S * 2 + i * ((bottom - horizon) / 9);
    const x = rand() * W * 0.4;
    const len = W * (0.16 + rand() * 0.26);
    waves += `<path d="M${n(x)} ${n(y)} q ${n(len * 0.25)} ${n(-S * 0.7)} ${n(len * 0.5)} 0 t ${n(len * 0.5)} 0" fill="none" stroke="#ffffff" stroke-opacity="0.26" stroke-width="${n(S * 0.22)}" stroke-linecap="round"/>`;
  }
  return `
  <rect x="0" y="${n(horizon)}" width="${W}" height="${n(bottom - horizon)}" fill="url(#sea)"/>
  <rect x="0" y="${n(horizon)}" width="${W}" height="${n(S * 0.14)}" fill="#ffffff" opacity="0.4"/>
  ${waves}`;
}

/** Whitewashed Cycladic volumes. Natural width about 250 units. */
function cubes(c, x, y, s, flip = false) {
  const { p } = c;
  const t = flip
    ? `translate(${n(x)} ${n(y)}) scale(${n(-s)} ${n(s)})`
    : `translate(${n(x)} ${n(y)}) scale(${n(s)})`;
  return `
  <g transform="${t}">
    <rect x="-128" y="-118" width="136" height="120" rx="7" fill="${p.wall}"/>
    <rect x="2" y="-84" width="120" height="86" rx="7" fill="${p.wallShade}"/>
    <rect x="-128" y="-124" width="136" height="12" rx="6" fill="${p.roof}" opacity="0.55"/>
    <rect x="2" y="-90" width="120" height="10" rx="5" fill="${p.roof}" opacity="0.45"/>
    <path d="M-98 2 v-52 a25 25 0 0 1 50 0 V2 Z" fill="${p.seaDeep}" opacity="0.34"/>
    <path d="M-98 2 v-52 a25 25 0 0 1 50 0 V2" fill="none" stroke="${p.wallShade}" stroke-width="4"/>
    <rect x="-32" y="-64" width="26" height="32" rx="3" fill="${p.seaDeep}" opacity="0.3"/>
    <rect x="28" y="-58" width="28" height="34" rx="3" fill="${p.seaDeep}" opacity="0.24"/>
    <rect x="80" y="-58" width="24" height="34" rx="3" fill="${p.seaDeep}" opacity="0.2"/>
    <path d="M-60 -124 v-16 M-72 -140 h24 M-60 -140 v-10" stroke="${p.accent}" stroke-width="3.5" fill="none" opacity="0.6"/>
  </g>`;
}

/** Timber pergola. `w` is in scene pixels; `s` scales the members. */
function pergola(c, x, y, w, s) {
  const { p } = c;
  const height = 100 * s;
  const beams = [];
  const count = Math.max(5, Math.round(w / (34 * s)));
  for (let i = 0; i <= count; i += 1) {
    const bx = x + (w / count) * i;
    beams.push(`<rect x="${n(bx - 4 * s)}" y="${n(y - height)}" width="${n(8 * s)}" height="${n(12 * s)}" rx="${n(2 * s)}" fill="${p.wood}" opacity="0.92"/>`);
  }
  return `
  <g>
    <rect x="${n(x)}" y="${n(y - height - 10 * s)}" width="${n(w)}" height="${n(12 * s)}" rx="${n(4 * s)}" fill="${p.wood}"/>
    ${beams.join('')}
    <rect x="${n(x + 6 * s)}" y="${n(y - height)}" width="${n(11 * s)}" height="${n(height)}" rx="${n(3 * s)}" fill="${p.wood}"/>
    <rect x="${n(x + w - 17 * s)}" y="${n(y - height)}" width="${n(11 * s)}" height="${n(height)}" rx="${n(3 * s)}" fill="${p.wood}"/>
    <path d="M${n(x + 6 * s)} ${n(y - height + 14 * s)} h ${n(w - 12 * s)}" stroke="${p.wood}" stroke-width="${n(3 * s)}" opacity="0.5"/>
  </g>`;
}

function pool(c, x, y, w, h, s) {
  const { p, rand } = c;
  let ripples = '';
  for (let i = 0; i < 6; i += 1) {
    const ry = y + h * 0.2 + rand() * h * 0.6;
    const rx = x + w * 0.06 + rand() * w * 0.5;
    ripples += `<path d="M${n(rx)} ${n(ry)} q ${n(8 * s)} ${n(-2.6 * s)} ${n(16 * s)} 0 t ${n(16 * s)} 0" fill="none" stroke="#ffffff" stroke-opacity="0.45" stroke-width="${n(1.1 * s)}" stroke-linecap="round"/>`;
  }
  return `
  <g>
    <rect x="${n(x - 6 * s)}" y="${n(y - 6 * s)}" width="${n(w + 12 * s)}" height="${n(h + 12 * s)}" rx="${n(9 * s)}" fill="${p.wall}" opacity="0.9"/>
    <rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(5 * s)}" fill="url(#water)"/>
    ${ripples}
  </g>`;
}

function lounger(c, x, y, s, towel = true) {
  const { p } = c;
  return `
  <g transform="translate(${n(x)} ${n(y)}) scale(${n(s)})">
    <path d="M0 0 h78 v10 h-78 Z" fill="${p.wall}"/>
    <path d="M52 0 l24 -34 h13 l-21 34 Z" fill="${p.wall}"/>
    ${towel ? `<rect x="8" y="-5" width="46" height="6" rx="3" fill="${p.accent}" opacity="0.35"/>` : ''}
    <rect x="7" y="10" width="5" height="14" fill="${p.wood}"/>
    <rect x="66" y="10" width="5" height="14" fill="${p.wood}"/>
  </g>`;
}

function loungers(c, x, y, count, s) {
  let out = '';
  for (let i = 0; i < count; i += 1) out += lounger(c, x + i * 108 * s, y, s, i % 2 === 0);
  return out;
}

function umbrella(c, x, y, s) {
  const { p } = c;
  return `
  <g transform="translate(${n(x)} ${n(y)}) scale(${n(s)})">
    <rect x="-2.5" y="-92" width="5" height="92" fill="${p.wood}"/>
    <path d="M-66 -86 q 66 -44 132 0 q -66 -18 -132 0 Z" fill="${p.wall}"/>
    <path d="M-66 -86 q 66 -18 132 0" fill="none" stroke="${p.accent}" stroke-width="2.5" opacity="0.45"/>
    <path d="M0 -100 v 8" stroke="${p.wood}" stroke-width="4"/>
  </g>`;
}

function olive(c, x, y, s) {
  const { p, rand } = c;
  const tone = rand() > 0.5 ? p.green : p.greenDark;
  return `
  <g transform="translate(${n(x)} ${n(y)}) scale(${n(s)})">
    <path d="M-4 0 v-54 q -3 -18 8 -28 M-2 -34 l -16 -14 M0 -46 l 16 -12" fill="none" stroke="${p.wood}" stroke-width="8" stroke-linecap="round"/>
    <circle cx="-26" cy="-84" r="30" fill="${tone}" opacity="0.85"/>
    <circle cx="20" cy="-94" r="34" fill="${tone}" opacity="0.72"/>
    <circle cx="0" cy="-116" r="26" fill="${tone}" opacity="0.9"/>
    <circle cx="-42" cy="-108" r="19" fill="${tone}" opacity="0.7"/>
    <circle cx="38" cy="-70" r="18" fill="${tone}" opacity="0.78"/>
  </g>`;
}

function cypress(c, x, y, s) {
  const { p } = c;
  return `<path transform="translate(${n(x)} ${n(y)}) scale(${n(s)})" d="M0 0 c -20 -8 -22 -76 0 -122 c 22 46 20 114 0 122 Z" fill="${p.greenDark}" opacity="0.82"/>`;
}

/** Terracotta pot with a shrub, the standard Elysis terrace plant. */
function pot(c, x, y, s) {
  const { p } = c;
  return `
  <g transform="translate(${n(x)} ${n(y)}) scale(${n(s)})">
    <circle cx="-14" cy="-58" r="20" fill="${p.green}" opacity="0.85"/>
    <circle cx="14" cy="-64" r="22" fill="${p.greenDark}" opacity="0.75"/>
    <circle cx="0" cy="-82" r="17" fill="${p.green}" opacity="0.8"/>
    <path d="M-22 -38 h44 l-7 38 h-30 Z" fill="${p.accent}" opacity="0.75"/>
    <rect x="-25" y="-42" width="50" height="8" rx="3" fill="${p.accent}" opacity="0.85"/>
  </g>`;
}

/** Bougainvillea spilling over a wall, used to frame a corner. */
function bougainvillea(c, x, y, s, flip = false) {
  const { p, rand } = c;
  let blooms = '';
  for (let i = 0; i < 26; i += 1) {
    blooms += `<circle cx="${n(-90 + rand() * 180)}" cy="${n(-150 + rand() * 150)}" r="${n(6 + rand() * 13)}" fill="${i % 3 === 0 ? '#c76a7a' : p.greenDark}" opacity="${n(0.45 + rand() * 0.45)}"/>`;
  }
  return `<g transform="translate(${n(x)} ${n(y)}) scale(${n(flip ? -s : s)} ${n(s)})">${blooms}</g>`;
}

function lantern(c, x, y, s) {
  const { p } = c;
  return `
  <g transform="translate(${n(x)} ${n(y)}) scale(${n(s)})">
    <circle cx="0" cy="-22" r="40" fill="${p.sun}" opacity="0.22"/>
    <rect x="-13" y="-36" width="26" height="36" rx="4" fill="none" stroke="${p.ink}" stroke-width="3.4" opacity="0.75"/>
    <path d="M-13 -36 h26 M0 -46 v10" stroke="${p.ink}" stroke-width="3.4" opacity="0.75" fill="none"/>
    <rect x="-7" y="-30" width="14" height="24" rx="3" fill="${p.sun}"/>
  </g>`;
}

function bonfire(c, x, y, s) {
  const { p, rand } = c;
  let sparks = '';
  for (let i = 0; i < 22; i += 1) {
    sparks += `<circle cx="${n(-90 + rand() * 180)}" cy="${n(-140 - rand() * 190)}" r="${n(1.6 + rand() * 3)}" fill="${p.accent}" opacity="${n(0.3 + rand() * 0.55)}"/>`;
  }
  return `
  <g transform="translate(${n(x)} ${n(y)}) scale(${n(s)})">
    <ellipse cx="0" cy="8" rx="180" ry="34" fill="${p.accent}" opacity="0.18"/>
    <path d="M-76 6 l 152 -26 M-76 -20 l 152 26 M-42 8 l 84 -48" stroke="${p.wood}" stroke-width="15" stroke-linecap="round"/>
    <path d="M0 -160 c 44 50 50 84 26 110 c -9 10 -26 18 -26 18 c 0 0 -17 -8 -26 -18 c -24 -26 -18 -60 26 -110 Z" fill="${p.accent}"/>
    <path d="M0 -108 c 24 30 26 50 12 64 c -5 6 -12 9 -12 9 c 0 0 -7 -3 -12 -9 c -14 -14 -12 -34 12 -64 Z" fill="${p.sun}" opacity="0.92"/>
    ${sparks}
  </g>`;
}

function diningTable(c, x, y, s, seats = true) {
  const { p } = c;
  const chair = (cx) => `
    <g transform="translate(${cx} 0)">
      <rect x="-20" y="-26" width="40" height="8" rx="4" fill="${p.wood}" opacity="0.9"/>
      <rect x="-18" y="-74" width="36" height="50" rx="8" fill="${p.wood}" opacity="0.65"/>
      <rect x="-16" y="-18" width="5" height="24" fill="${p.wood}"/>
      <rect x="11" y="-18" width="5" height="24" fill="${p.wood}"/>
    </g>`;
  return `
  <g transform="translate(${n(x)} ${n(y)}) scale(${n(s)})">
    ${seats ? `<g transform="translate(0 -6)">${chair(-150)}${chair(150)}</g>` : ''}
    <rect x="-180" y="-20" width="360" height="20" rx="9" fill="${p.wall}"/>
    <rect x="-176" y="0" width="352" height="6" rx="3" fill="${p.wallShade}"/>
    <rect x="-150" y="6" width="12" height="58" fill="${p.wood}"/>
    <rect x="138" y="6" width="12" height="58" fill="${p.wood}"/>
    <ellipse cx="-96" cy="-26" rx="34" ry="10" fill="${p.wallShade}"/>
    <ellipse cx="96" cy="-26" rx="34" ry="10" fill="${p.wallShade}"/>
    <path d="M-10 -26 v-34 a13 13 0 0 1 20 0 v34 Z" fill="${p.accent}" opacity="0.5"/>
    <circle cx="0" cy="-70" r="8" fill="${p.sun}"/>
    <circle cx="0" cy="-70" r="20" fill="${p.sun}" opacity="0.22"/>
    <rect x="-46" y="-52" width="9" height="26" rx="4" fill="${p.seaDeep}" opacity="0.32"/>
    <rect x="38" y="-52" width="9" height="26" rx="4" fill="${p.seaDeep}" opacity="0.32"/>
  </g>`;
}

function sailboat(c, x, y, s) {
  const { p } = c;
  return `
  <g transform="translate(${n(x)} ${n(y)}) scale(${n(s)})">
    <path d="M-80 0 h160 l-24 26 h-112 Z" fill="${p.ink}" opacity="0.72"/>
    <path d="M-4 -10 v-132 l88 132 Z" fill="${p.wall}"/>
    <path d="M-14 -10 l-58 0 l58 -92 Z" fill="${p.wallShade}"/>
    <ellipse cx="0" cy="28" rx="96" ry="7" fill="#ffffff" opacity="0.25"/>
  </g>`;
}

function figure(c, x, y, s, tone) {
  const { p } = c;
  const col = tone || p.ink;
  return `
  <g transform="translate(${n(x)} ${n(y)}) scale(${n(s)})" fill="${col}" opacity="0.68">
    <circle cx="0" cy="-92" r="13"/>
    <path d="M-12 -76 h24 l9 48 h-42 Z"/>
    <rect x="-13" y="-28" width="10" height="30" rx="4"/>
    <rect x="3" y="-28" width="10" height="30" rx="4"/>
  </g>`;
}

/** A stone terrace floor with a coping edge: the ground most scenes stand on. */
function terrace(c, y) {
  const { W, H, p, S } = c;
  const joints = [];
  for (let i = 1; i < 7; i += 1) {
    joints.push(`<path d="M${n((W / 7) * i)} ${n(y + S * 1.6)} V ${H}" stroke="${p.ink}" stroke-opacity="0.07" stroke-width="${n(S * 0.2)}"/>`);
  }
  return `
  <rect x="0" y="${n(y)}" width="${W}" height="${n(H - y)}" fill="${p.wall}"/>
  <rect x="0" y="${n(y)}" width="${W}" height="${n(S * 1.6)}" fill="${p.wallShade}"/>
  ${joints.join('')}
  <path d="M0 ${n(y + (H - y) * 0.42)} H ${W}" stroke="${p.ink}" stroke-opacity="0.06" stroke-width="${n(S * 0.2)}"/>`;
}

/** A low dry-stone parapet, which is what separates every terrace from the drop. */
function parapet(c, y) {
  const { W, p, S } = c;
  return `
  <rect x="0" y="${n(y)}" width="${W}" height="${n(S * 3.4)}" rx="${n(S * 0.6)}" fill="${p.wall}"/>
  <rect x="0" y="${n(y)}" width="${W}" height="${n(S * 0.8)}" fill="${p.wallShade}"/>`;
}

/** The scene seen through a whitewashed arch, the way a suite frames its view. */
function archFrame(c) {
  const { W, H, p, S } = c;
  const inset = W * 0.055;
  const top = H * 0.03;
  const springing = H * 0.5;
  return `
  <path d="M0 0 H ${W} V ${H} H 0 Z
           M ${n(inset)} ${H} V ${n(springing)} A ${n(W * 0.5 - inset)} ${n(springing - top)} 0 0 1 ${n(W - inset)} ${n(springing)} V ${H} Z"
        fill="${p.wall}" fill-rule="evenodd"/>
  <path d="M ${n(inset)} ${H} V ${n(springing)} A ${n(W * 0.5 - inset)} ${n(springing - top)} 0 0 1 ${n(W - inset)} ${n(springing)} V ${H}"
        fill="none" stroke="${p.wallShade}" stroke-width="${n(S * 0.9)}"/>
  <rect x="0" y="${n(H - S * 2.2)}" width="${W}" height="${n(S * 2.2)}" fill="${p.wallShade}" opacity="0.8"/>`;
}

/* ------------------------------------------------------------------ *
 * Scenes
 * ------------------------------------------------------------------ */

function terraceSea(c) {
  const { W, H, S } = c;
  const horizon = H * 0.38;
  const floor = H * 0.68;
  return `
  ${sky(c)}
  ${sun(c, W * 0.72, horizon * 0.46, S * 2.6)}
  ${hills(c, horizon)}
  ${sea(c, horizon, floor)}
  ${parapet(c, floor - S * 3.4)}
  ${terrace(c, floor)}
  ${cubes(c, W * 0.2, floor + S * 1.2, S / 14.4)}
  ${pergola(c, W * 0.46, floor + S * 2, W * 0.4, S / 23.4)}
  ${loungers(c, W * 0.52, H * 0.88, 2, S / 16.76)}
  ${diningTable(c, W * 0.8, H * 0.95, S / 23.33, false)}
  ${pot(c, W * 0.41, floor + S * 3, S / 15.3)}
  ${olive(c, W * 0.95, H * 1.02, S / 10.35)}
  ${bougainvillea(c, W * 0.04, H * 0.3, S / 15.3)}
  ${lantern(c, W * 0.33, floor + S * 2.4, S / 20.7)}`;
}

function poolTerrace(c) {
  const { W, H, S } = c;
  const horizon = H * 0.34;
  const floor = H * 0.56;
  return `
  ${sky(c)}
  ${sun(c, W * 0.82, horizon * 0.42, S * 2.3)}
  ${hills(c, horizon)}
  ${sea(c, horizon, floor)}
  ${terrace(c, floor)}
  ${pool(c, W * 0.08, floor + S * 1.6, W * 0.84, H * 0.26, S / 13.5)}
  ${umbrella(c, W * 0.13, H * 0.97, S / 9.31)}
  ${umbrella(c, W * 0.87, H * 0.97, S / 9.31)}
  ${loungers(c, W * 0.3, H * 0.97, 3, S / 13.66)}
  ${cypress(c, W * 0.03, floor + S * 1, S / 16.2)}
  ${pot(c, W * 0.96, floor + S * 2, S / 15.3)}`;
}

function villaScene(c) {
  const { W, H, S } = c;
  const horizon = H * 0.32;
  const floor = H * 0.6;
  return `
  ${sky(c)}
  ${sun(c, W * 0.18, horizon * 0.46, S * 2.4)}
  ${hills(c, horizon)}
  ${sea(c, horizon, floor)}
  ${terrace(c, floor)}
  ${cubes(c, W * 0.3, floor + S * 0.6, S / 13.05)}
  ${pool(c, W * 0.4, floor + S * 3.4, W * 0.54, H * 0.22, S / 14.4)}
  ${loungers(c, W * 0.06, H * 0.93, 2, S / 14.28)}
  ${olive(c, W * 0.98, H * 0.99, S / 11.7)}
  ${cypress(c, W * 0.02, floor + S * 1.4, S / 15.3)}
  ${pot(c, W * 0.36, H * 0.99, S / 14.4)}`;
}

function rooftopScene(c) {
  const { W, H, S } = c;
  const horizon = H * 0.4;
  const floor = H * 0.62;
  return `
  ${sky(c)}
  ${sun(c, W * 0.5, horizon * 0.58, S * 3.2)}
  ${sea(c, horizon, floor - S * 3.4)}
  ${parapet(c, floor - S * 3.4)}
  ${terrace(c, floor)}
  ${pool(c, W * 0.06, floor + S * 2, W * 0.42, H * 0.2, S / 14.4)}
  ${diningTable(c, W * 0.75, H * 0.92, S / 17.33)}
  ${lantern(c, W * 0.54, floor + S * 3, S / 17.1)}
  ${pot(c, W * 0.98, floor + S * 3.4, S / 13.5)}
  ${bougainvillea(c, W * 0.99, H * 0.34, S / 13.5, true)}`;
}

function beachScene(c) {
  const { W, H, S } = c;
  const horizon = H * 0.36;
  const shore = H * 0.64;
  return `
  ${sky(c)}
  ${sun(c, W * 0.28, horizon * 0.44, S * 2.6)}
  ${hills(c, horizon)}
  ${sea(c, horizon, shore)}
  <path d="M0 ${n(shore)} q ${n(W * 0.26)} ${n(-H * 0.05)} ${n(W * 0.5)} 0 t ${n(W * 0.5)} 0 V ${H} H 0 Z" fill="${c.p.sand}"/>
  <path d="M0 ${n(shore)} q ${n(W * 0.26)} ${n(-H * 0.05)} ${n(W * 0.5)} 0 t ${n(W * 0.5)} 0" fill="none" stroke="#ffffff" stroke-opacity="0.65" stroke-width="${n(S * 0.5)}"/>
  ${umbrella(c, W * 0.18, H * 0.94, S / 8.69)}
  ${umbrella(c, W * 0.74, H * 0.88, S / 9.93)}
  ${loungers(c, W * 0.3, H * 0.95, 2, S / 13.03)}
  ${figure(c, W * 0.55, H * 0.76, S / 18.62)}
  ${olive(c, W * 0.02, H * 1.02, S / 11.7)}`;
}

function bonfireScene(c) {
  const { W, H, S, rand } = c;
  const horizon = H * 0.4;
  const shore = H * 0.62;
  let stars = '';
  for (let i = 0; i < 60; i += 1) {
    stars += `<circle cx="${n(rand() * W)}" cy="${n(rand() * horizon)}" r="${n(0.8 + rand() * 2)}" fill="#ffffff" opacity="${n(0.2 + rand() * 0.55)}"/>`;
  }
  return `
  ${sky(c)}
  ${stars}
  ${sun(c, W * 0.16, horizon * 0.34, S * 1.5, false)}
  ${sea(c, horizon, shore)}
  <path d="M0 ${n(shore)} q ${n(W * 0.3)} ${n(-H * 0.04)} ${n(W * 0.6)} 0 t ${n(W * 0.4)} 0 V ${H} H 0 Z" fill="${c.p.sand}"/>
  ${bonfire(c, W * 0.5, H * 0.88, S / 11.33)}
  ${figure(c, W * 0.24, H * 0.93, S / 14.28)}
  ${figure(c, W * 0.78, H * 0.92, S / 13.66)}
  ${figure(c, W * 0.66, H * 0.97, S / 12.41)}
  ${lantern(c, W * 0.07, H * 0.82, S / 15.3)}
  ${lantern(c, W * 0.93, H * 0.79, S / 16.2)}`;
}

function sailScene(c) {
  const { W, H, S } = c;
  const horizon = H * 0.46;
  return `
  ${sky(c)}
  ${sun(c, W * 0.6, horizon * 0.84, S * 4)}
  ${sea(c, horizon)}
  <path d="M${n(W * 0.54)} ${n(horizon)} q ${n(W * 0.07)} ${n(H * 0.26)} 0 ${n(H * 0.54)} q ${n(-W * 0.07)} ${n(-H * 0.26)} 0 ${n(-H * 0.54)} Z" fill="${c.p.sun}" opacity="0.32"/>
  ${sailboat(c, W * 0.33, H * 0.74, S / 10)}
  ${sailboat(c, W * 0.8, H * 0.58, S / 23.33)}`;
}

function diveScene(c) {
  const { W, H, S, rand } = c;
  const horizon = H * 0.18;
  let bubbles = '';
  for (let i = 0; i < 30; i += 1) {
    bubbles += `<circle cx="${n(rand() * W)}" cy="${n(horizon + rand() * (H - horizon))}" r="${n(3 + rand() * 11)}" fill="#ffffff" opacity="${n(0.1 + rand() * 0.22)}"/>`;
  }
  const fish = (x, y, s, col) => `<g transform="translate(${n(x)} ${n(y)}) scale(${n(s)})" fill="${col}" opacity="0.8"><path d="M0 0 l 54 -20 l -10 20 l 10 20 Z"/><circle cx="40" cy="-2" r="3" fill="#1b3244"/></g>`;
  return `
  ${sky(c)}
  ${sea(c, horizon)}
  <rect x="0" y="${n(horizon)}" width="${W}" height="${n(H - horizon)}" fill="${c.p.seaDeep}" opacity="0.42"/>
  ${bubbles}
  <path d="M0 ${n(H * 0.84)} q ${n(W * 0.2)} ${n(-H * 0.14)} ${n(W * 0.42)} ${n(-H * 0.02)} q ${n(W * 0.26)} ${n(H * 0.1)} ${n(W * 0.58)} ${n(-H * 0.05)} V ${H} H 0 Z" fill="${c.p.greenDark}" opacity="0.55"/>
  ${figure(c, W * 0.4, H * 0.66, S / 12.41, '#f6f1e7')}
  ${fish(W * 0.64, H * 0.42, S / 27, c.p.sun)}
  ${fish(W * 0.74, H * 0.56, S / 36, c.p.sun)}
  ${fish(W * 0.58, H * 0.6, S / 40.5, c.p.sun)}`;
}

function yogaScene(c) {
  const { W, H, S } = c;
  const horizon = H * 0.44;
  const deck = H * 0.7;
  return `
  ${sky(c)}
  ${sun(c, W * 0.5, horizon * 0.8, S * 3.4)}
  ${sea(c, horizon, deck)}
  <rect x="0" y="${n(deck)}" width="${W}" height="${n(H - deck)}" fill="${c.p.wood}" opacity="0.6"/>
  ${Array.from({ length: 10 }, (_, i) => `<rect x="0" y="${n(deck + i * ((H - deck) / 10))}" width="${W}" height="${n(S * 0.14)}" fill="${c.p.ink}" opacity="0.12"/>`).join('')}
  <rect x="${n(W * 0.34)}" y="${n(H * 0.86)}" width="${n(W * 0.32)}" height="${n(S * 1.1)}" rx="${n(S * 0.5)}" fill="${c.p.accent}" opacity="0.5"/>
  ${figure(c, W * 0.5, H * 0.86, S / 10.55)}
  ${cypress(c, W * 0.93, deck + S, S / 15.3)}
  ${pot(c, W * 0.06, H * 0.99, S / 15.3)}`;
}

function gardenScene(c) {
  const { W, H, S } = c;
  const horizon = H * 0.36;
  const ground = H * 0.56;
  return `
  ${sky(c)}
  ${sun(c, W * 0.86, horizon * 0.4, S * 2)}
  <rect x="0" y="${n(horizon)}" width="${W}" height="${n(H - horizon)}" fill="${c.p.green}" opacity="0.22"/>
  ${terrace(c, ground)}
  <path d="M${n(W * 0.26)} ${H} q ${n(W * 0.12)} ${n(-H * 0.26)} ${n(W * 0.2)} ${n(-H * 0.44)} h ${n(W * 0.13)} q ${n(-W * 0.12)} ${n(H * 0.1)} ${n(-W * 0.2)} ${n(H * 0.44)} Z" fill="${c.p.sand}" opacity="0.8"/>
  ${cubes(c, W * 0.82, ground + S * 1.2, S / 15.3, true)}
  ${olive(c, W * 0.14, H * 0.84, S / 9.9)}
  ${olive(c, W * 0.46, H * 0.7, S / 15.3)}
  ${cypress(c, W * 0.63, H * 0.68, S / 12.6)}
  ${pot(c, W * 0.72, H * 0.94, S / 13.5)}
  ${lantern(c, W * 0.3, H * 0.86, S / 17.1)}
  ${bougainvillea(c, W * 0.98, H * 0.5, S / 12.6, true)}`;
}

function villageScene(c) {
  const { W, H, S } = c;
  const horizon = H * 0.44;
  const ground = H * 0.6;
  return `
  ${sky(c)}
  ${sun(c, W * 0.12, horizon * 0.36, S * 2.2)}
  ${sea(c, horizon, ground)}
  ${terrace(c, ground)}
  ${cubes(c, W * 0.28, ground + S * 1.4, S / 13.5)}
  ${cubes(c, W * 0.76, ground + S * 3, S / 16.2, true)}
  <path d="M0 ${n(H * 0.86)} h ${W}" stroke="${c.p.wallShade}" stroke-width="${n(S * 0.9)}"/>
  ${Array.from({ length: 6 }, (_, i) => `<path d="M${n(W * (0.08 + i * 0.17))} ${n(H * 0.86)} l ${n(S * 2)} ${n(H * 0.15)}" stroke="${c.p.wallShade}" stroke-width="${n(S * 0.5)}" fill="none"/>`).join('')}
  ${figure(c, W * 0.48, H * 0.96, S / 13.66)}
  ${pot(c, W * 0.1, H * 0.97, S / 14.4)}
  ${bougainvillea(c, W * 0.03, H * 0.42, S / 13.5)}`;
}

function diningScene(c) {
  const { W, H, S } = c;
  const horizon = H * 0.36;
  const floor = H * 0.62;
  return `
  ${sky(c)}
  ${sun(c, W * 0.2, horizon * 0.7, S * 2.8)}
  ${sea(c, horizon, floor)}
  ${parapet(c, floor - S * 3.2)}
  ${terrace(c, floor)}
  ${pergola(c, W * 0.04, floor + S * 1.4, W * 0.92, S / 18.9)}
  ${diningTable(c, W * 0.5, H * 0.92, S / 12.67)}
  ${lantern(c, W * 0.14, H * 0.74, S / 15.3)}
  ${lantern(c, W * 0.86, H * 0.74, S / 15.3)}
  ${pot(c, W * 0.97, H * 0.99, S / 13.5)}
  ${olive(c, W * 0.02, H * 1.04, S / 10.8)}`;
}

function barScene(c) {
  const { W, H, S } = c;
  const horizon = H * 0.44;
  const floor = H * 0.68;
  const counter = H * 0.72;
  return `
  ${sky(c)}
  ${sun(c, W * 0.68, horizon * 0.86, S * 4.2)}
  ${sea(c, horizon, floor)}
  ${terrace(c, floor)}
  <rect x="${n(W * 0.02)}" y="${n(counter)}" width="${n(W * 0.96)}" height="${n(S * 2.6)}" rx="${n(S * 0.5)}" fill="${c.p.wood}"/>
  <rect x="${n(W * 0.02)}" y="${n(counter)}" width="${n(W * 0.96)}" height="${n(S * 0.6)}" rx="${n(S * 0.3)}" fill="${c.p.wall}" opacity="0.5"/>
  <g fill="${c.p.wall}">
    <path d="M${n(W * 0.18)} ${n(counter)} l ${n(-S * 1.5)} ${n(-S * 2.8)} h ${n(S * 3)} Z"/>
    <path d="M${n(W * 0.28)} ${n(counter)} l ${n(-S * 1.3)} ${n(-S * 2.4)} h ${n(S * 2.6)} Z"/>
    <rect x="${n(W * 0.38)}" y="${n(counter - S * 3)}" width="${n(S * 1.2)}" height="${n(S * 3)}" rx="${n(S * 0.3)}"/>
    <rect x="${n(W * 0.44)}" y="${n(counter - S * 3.4)}" width="${n(S * 1.2)}" height="${n(S * 3.4)}" rx="${n(S * 0.3)}"/>
  </g>
  ${figure(c, W * 0.74, counter, S / 11.17)}
  ${lantern(c, W * 0.08, counter - S * 0.4, S / 15.3)}
  ${pot(c, W * 0.94, H * 0.99, S / 13.5)}`;
}

function spaScene(c) {
  const { W, H, S, p } = c;
  const floor = H * 0.72;
  const arch = (x, w) => `
    <path d="M${n(x)} ${n(floor)} V ${n(H * 0.34)} a ${n(w / 2)} ${n(w / 2)} 0 0 1 ${n(w)} 0 V ${n(floor)}" fill="${p.wallShade}" opacity="0.35"/>
    <path d="M${n(x)} ${n(floor)} V ${n(H * 0.34)} a ${n(w / 2)} ${n(w / 2)} 0 0 1 ${n(w)} 0 V ${n(floor)}" fill="none" stroke="${p.wallShade}" stroke-width="${n(S * 0.7)}"/>`;
  return `
  <rect width="${W}" height="${H}" fill="${p.wall}"/>
  ${arch(W * 0.06, W * 0.22)}
  ${arch(W * 0.39, W * 0.22)}
  ${arch(W * 0.72, W * 0.22)}
  <path d="M${n(W * 0.44)} ${n(floor)} V ${n(H * 0.38)} a ${n(W * 0.06)} ${n(W * 0.06)} 0 0 1 ${n(W * 0.12)} 0 V ${n(floor)} Z" fill="url(#sea)" opacity="0.75"/>
  <rect x="0" y="${n(floor)}" width="${W}" height="${n(H - floor)}" fill="${p.wood}" opacity="0.28"/>
  <g transform="translate(${n(W * 0.5)} ${n(H * 0.9)}) scale(${n(S / 13.5)})">
    <rect x="-190" y="-18" width="380" height="18" rx="9" fill="${p.wood}" opacity="0.6"/>
    <rect x="-170" y="-64" width="120" height="46" rx="10" fill="${p.wall}"/>
    <rect x="-170" y="-86" width="120" height="26" rx="10" fill="${p.wallShade}"/>
    <ellipse cx="30" cy="-26" rx="44" ry="12" fill="${p.ink}" opacity="0.34"/>
    <ellipse cx="30" cy="-42" rx="32" ry="10" fill="${p.ink}" opacity="0.26"/>
    <ellipse cx="30" cy="-56" rx="21" ry="7" fill="${p.ink}" opacity="0.2"/>
    <g transform="translate(140 -30)">
      <rect x="-16" y="-30" width="32" height="30" rx="6" fill="${p.wall}"/>
      <circle cx="0" cy="-38" r="8" fill="${p.sun}"/>
      <circle cx="0" cy="-44" r="18" fill="${p.sun}" opacity="0.25"/>
    </g>
  </g>
  ${pot(c, W * 0.08, H * 0.96, S / 13.5)}
  ${pot(c, W * 0.92, H * 0.96, S / 14.4)}`;
}

function interiorRoom(c) {
  const { W, H, S, p } = c;
  const floor = H * 0.74;
  const wx = W * 0.56;
  const ww = W * 0.4;
  return `
  <rect width="${W}" height="${H}" fill="${p.wall}"/>
  <rect x="0" y="0" width="${W}" height="${n(H * 0.12)}" fill="${p.wallShade}" opacity="0.5"/>
  ${Array.from({ length: 7 }, (_, i) => `<path d="M0 ${n(H * 0.02 + i * H * 0.016)} H ${W}" stroke="${p.wood}" stroke-opacity="0.18" stroke-width="${n(S * 0.22)}"/>`).join('')}
  <rect x="0" y="${n(floor)}" width="${W}" height="${n(H - floor)}" fill="${p.wood}" opacity="0.3"/>
  <path d="M${n(wx)} ${n(floor)} V ${n(H * 0.38)} a ${n(ww / 2)} ${n(ww / 2)} 0 0 1 ${n(ww)} 0 V ${n(floor)} Z" fill="url(#sea)"/>
  <path d="M${n(wx)} ${n(H * 0.52)} V ${n(H * 0.38)} a ${n(ww / 2)} ${n(ww / 2)} 0 0 1 ${n(ww)} 0 V ${n(H * 0.52)} Z" fill="url(#sky)" opacity="0.92"/>
  <path d="M${n(wx)} ${n(floor)} V ${n(H * 0.38)} a ${n(ww / 2)} ${n(ww / 2)} 0 0 1 ${n(ww)} 0 V ${n(floor)}" fill="none" stroke="${p.wallShade}" stroke-width="${n(S * 0.9)}"/>
  <g transform="translate(${n(W * 0.26)} ${n(floor)}) scale(${n(S / 11.7)})">
    <rect x="-150" y="-190" width="300" height="120" rx="14" fill="${p.wallShade}"/>
    <rect x="-170" y="-86" width="340" height="86" rx="12" fill="${p.wall}"/>
    <rect x="-170" y="-96" width="340" height="22" rx="10" fill="${p.wallShade}" opacity="0.7"/>
    <rect x="-130" y="-128" width="110" height="48" rx="14" fill="${p.wall}"/>
    <rect x="16" y="-128" width="110" height="48" rx="14" fill="${p.wall}"/>
    <rect x="-88" y="-118" width="176" height="30" rx="10" fill="${p.accent}" opacity="0.3"/>
    <rect x="-230" y="-44" width="44" height="44" rx="8" fill="${p.wood}" opacity="0.7"/>
    <rect x="186" y="-44" width="44" height="44" rx="8" fill="${p.wood}" opacity="0.7"/>
    <circle cx="-208" cy="-58" r="14" fill="${p.sun}"/>
    <circle cx="208" cy="-58" r="14" fill="${p.sun}"/>
  </g>
  <rect x="${n(W * 0.04)}" y="${n(floor + (H - floor) * 0.22)}" width="${n(W * 0.52)}" height="${n((H - floor) * 0.6)}" rx="${n(S * 0.5)}" fill="${p.wallShade}" opacity="0.6"/>
  ${pot(c, W * 0.96, H * 0.99, S / 13.5)}`;
}

function bathScene(c) {
  const { W, H, S, p } = c;
  const floor = H * 0.78;
  return `
  <rect width="${W}" height="${H}" fill="${p.wall}"/>
  <rect x="0" y="${n(floor)}" width="${W}" height="${n(H - floor)}" fill="${p.wood}" opacity="0.26"/>
  <path d="M${n(W * 0.54)} ${n(floor)} V ${n(H * 0.3)} a ${n(W * 0.18)} ${n(W * 0.18)} 0 0 1 ${n(W * 0.36)} 0 V ${n(floor)} Z" fill="url(#sea)" opacity="0.8"/>
  <path d="M${n(W * 0.54)} ${n(floor)} V ${n(H * 0.3)} a ${n(W * 0.18)} ${n(W * 0.18)} 0 0 1 ${n(W * 0.36)} 0 V ${n(floor)}" fill="none" stroke="${p.wallShade}" stroke-width="${n(S * 0.9)}"/>
  <g transform="translate(${n(W * 0.36)} ${n(floor)}) scale(${n(S / 10.8)})">
    <path d="M-160 -120 q -22 120 26 120 h 190 q 48 0 26 -120 Z" fill="${p.wall}"/>
    <path d="M-152 -112 q -18 104 24 104 h 176 q 42 0 24 -104 Z" fill="url(#water)" opacity="0.85"/>
    <rect x="-160" y="-126" width="242" height="14" rx="7" fill="${p.wallShade}"/>
  </g>
  <path d="M${n(W * 0.1)} ${n(H * 0.46)} v ${n(-H * 0.2)} h ${n(W * 0.12)}" fill="none" stroke="${p.accent}" stroke-width="${n(S * 0.8)}" stroke-linecap="round"/>
  <rect x="${n(W * 0.06)}" y="${n(H * 0.56)}" width="${n(W * 0.16)}" height="${n(S * 1.6)}" rx="${n(S * 0.3)}" fill="${p.wallShade}"/>
  <rect x="${n(W * 0.08)}" y="${n(H * 0.52)}" width="${n(W * 0.12)}" height="${n(S * 1.2)}" rx="${n(S * 0.3)}" fill="${p.wall}"/>
  ${pot(c, W * 0.93, H * 0.97, S / 13.5)}`;
}

function wineScene(c) {
  const { W, H, S, p } = c;
  const shelfA = H * 0.42;
  const shelfB = H * 0.68;
  const bottle = (x, y, s) => `
    <g transform="translate(${n(x)} ${n(y)}) scale(${n(s)})">
      <rect x="-11" y="-58" width="22" height="58" rx="7" fill="${p.greenDark}" opacity="0.85"/>
      <rect x="-5" y="-76" width="10" height="20" fill="${p.greenDark}" opacity="0.85"/>
      <rect x="-11" y="-40" width="22" height="15" fill="${p.sand}" opacity="0.9"/>
    </g>`;
  let bottles = '';
  for (let i = 0; i < 11; i += 1) {
    bottles += bottle(W * 0.1 + i * W * 0.08, shelfA, S / 15.3);
    bottles += bottle(W * 0.1 + i * W * 0.08, shelfB, S / 15.3);
  }
  return `
  <rect width="${W}" height="${H}" fill="${p.wallShade}"/>
  <path d="M${n(W * 0.04)} ${H} V ${n(H * 0.26)} a ${n(W * 0.46)} ${n(W * 0.4)} 0 0 1 ${n(W * 0.92)} 0 V ${H} Z" fill="${p.wall}" opacity="0.55"/>
  <path d="M${n(W * 0.04)} ${H} V ${n(H * 0.26)} a ${n(W * 0.46)} ${n(W * 0.4)} 0 0 1 ${n(W * 0.92)} 0 V ${H}" fill="none" stroke="${p.ink}" stroke-opacity="0.25" stroke-width="${n(S * 0.7)}"/>
  <rect x="${n(W * 0.05)}" y="${n(shelfA)}" width="${n(W * 0.9)}" height="${n(S * 0.7)}" fill="${p.wood}"/>
  <rect x="${n(W * 0.05)}" y="${n(shelfB)}" width="${n(W * 0.9)}" height="${n(S * 0.7)}" fill="${p.wood}"/>
  ${bottles}
  ${diningTable(c, W * 0.5, H * 0.97, S / 15.33)}`;
}

function portraitScene(c) {
  const { W, H, p } = c;
  return `
  <rect width="${W}" height="${H}" fill="${p.wallShade}"/>
  <rect x="0" y="0" width="${W}" height="${n(H * 0.55)}" fill="${p.wall}" opacity="0.6"/>
  <circle cx="${n(W * 0.5)}" cy="${n(H * 0.36)}" r="${n(W * 0.2)}" fill="${p.wall}"/>
  <path d="M${n(W * 0.16)} ${H} q ${n(W * 0.34)} ${n(-H * 0.42)} ${n(W * 0.68)} 0 Z" fill="${p.wall}"/>
  <circle cx="${n(W * 0.5)}" cy="${n(H * 0.36)}" r="${n(W * 0.2)}" fill="none" stroke="${p.accent}" stroke-width="3" opacity="0.45"/>`;
}

function floorPlan(c) {
  const { W, H, p, S } = c;
  const m = Math.min(W, H) * 0.1;
  const iw = W - m * 2;
  const ih = H - m * 2;
  return `
  <rect width="${W}" height="${H}" fill="${p.wall}"/>
  <g stroke="${p.ink}" stroke-opacity="0.12" stroke-width="1">
    ${Array.from({ length: 17 }, (_, i) => `<path d="M${n(m + (iw / 16) * i)} ${n(m)} V ${n(m + ih)}"/>`).join('')}
    ${Array.from({ length: 13 }, (_, i) => `<path d="M${n(m)} ${n(m + (ih / 12) * i)} H ${n(m + iw)}"/>`).join('')}
  </g>
  <g fill="none" stroke="${p.ink}" stroke-width="${n(S * 0.55)}" stroke-opacity="0.85">
    <rect x="${n(m)}" y="${n(m)}" width="${n(iw)}" height="${n(ih)}" rx="4"/>
    <path d="M${n(m + iw * 0.55)} ${n(m)} V ${n(m + ih * 0.6)} H ${n(m + iw)}"/>
    <path d="M${n(m)} ${n(m + ih * 0.6)} H ${n(m + iw * 0.55)}"/>
  </g>
  <g fill="${p.ink}" opacity="0.42">
    <rect x="${n(m + iw * 0.08)}" y="${n(m + ih * 0.12)}" width="${n(iw * 0.3)}" height="${n(ih * 0.3)}" rx="6"/>
    <rect x="${n(m + iw * 0.66)}" y="${n(m + ih * 0.1)}" width="${n(iw * 0.24)}" height="${n(ih * 0.18)}" rx="6"/>
    <rect x="${n(m + iw * 0.12)}" y="${n(m + ih * 0.72)}" width="${n(iw * 0.36)}" height="${n(ih * 0.14)}" rx="6"/>
  </g>
  <g opacity="0.6" fill="none" stroke="${p.accent}" stroke-width="${n(S * 0.45)}">
    <rect x="${n(m + iw * 0.62)}" y="${n(m + ih * 0.7)}" width="${n(iw * 0.3)}" height="${n(ih * 0.18)}" rx="8"/>
    <path d="M${n(m + iw * 0.55)} ${n(m + ih * 0.34)} a ${n(iw * 0.06)} ${n(iw * 0.06)} 0 0 0 ${n(iw * 0.06)} ${n(iw * 0.06)}"/>
  </g>`;
}

function archedView(c) {
  const { W, H, S } = c;
  const horizon = H * 0.46;
  return `
  ${sky(c)}
  ${sun(c, W * 0.62, horizon * 0.58, S * 2.6)}
  ${hills(c, horizon)}
  ${sea(c, horizon, H * 0.78)}
  <rect x="0" y="${n(H * 0.78)}" width="${W}" height="${n(H * 0.22)}" fill="${c.p.wall}"/>
  ${lounger(c, W * 0.38, H * 0.88, S / 13.66)}
  ${pot(c, W * 0.68, H * 0.92, S / 16.2)}
  ${archFrame(c)}`;
}


/* ------------------------------------------------------------------ *
 * The scene each name draws, its palette and its natural aspect
 * ------------------------------------------------------------------ */

const SCENES = {
  /* residences */
  'suite-sea': { label: 'Suite terrace, Aegean view', tone: 'day', size: [1600, 1200], draw: terraceSea },
  'suite-terrace': { label: 'Suite terrace at dusk', tone: 'dusk', size: [1600, 1200], draw: terraceSea },
  'suite-garden': { label: 'Garden suite', tone: 'day', size: [1600, 1200], draw: gardenScene },
  'suite-interior': { label: 'Suite interior', tone: 'interior', size: [1600, 1200], draw: interiorRoom },
  'suite-bath': { label: 'Suite bathroom', tone: 'interior', size: [1200, 1500], draw: bathScene },
  'villa': { label: 'Villa and private pool', tone: 'day', size: [1600, 1200], draw: villaScene },
  'residence': { label: 'Residence', tone: 'dusk', size: [1600, 1200], draw: villaScene },
  'penthouse': { label: 'Rooftop residence', tone: 'dusk', size: [1600, 1200], draw: rooftopScene },
  'beach-house': { label: 'Beachfront house', tone: 'day', size: [1600, 1200], draw: beachScene },

  /* the resort */
  'pool': { label: 'The infinity pool', tone: 'day', size: [1600, 1200], draw: poolTerrace },
  'beach': { label: 'The private beach', tone: 'day', size: [1600, 1200], draw: beachScene },
  'spa': { label: 'The spa', tone: 'interior', size: [1600, 1200], draw: spaScene },
  'dining': { label: 'Dining on the terrace', tone: 'dusk', size: [1600, 1200], draw: diningScene },
  'bar': { label: 'The sunset bar', tone: 'dusk', size: [1600, 1200], draw: barScene },
  'bonfire': { label: 'Bonfire night', tone: 'night', size: [1600, 1200], draw: bonfireScene },
  'sail': { label: 'Sunset sailing', tone: 'dusk', size: [1600, 1200], draw: sailScene },
  'dive': { label: 'Diving and snorkelling', tone: 'day', size: [1600, 1200], draw: diveScene },
  'yoga': { label: 'Yoga deck at sunrise', tone: 'dusk', size: [1600, 1200], draw: yogaScene },
  'cooking': { label: 'The cooking school', tone: 'day', size: [1600, 1200], draw: diningScene },
  'wine': { label: 'The wine cellar', tone: 'interior', size: [1600, 1200], draw: wineScene },
  'kids': { label: 'Little Elysis', tone: 'day', size: [1600, 1200], draw: gardenScene },
  'excursion': { label: 'Island excursions', tone: 'day', size: [1600, 1200], draw: villageScene },
  'garden': { label: 'The gardens', tone: 'day', size: [1600, 1200], draw: gardenScene },
  'village': { label: 'Paros, the old town', tone: 'day', size: [1600, 1200], draw: villageScene },

  /* page furniture */
  'hero': { label: 'Elysis, Paros', tones: ['dusk', 'day', 'dusk'], size: [2200, 1238], draw: terraceSea },
  'header': { label: 'Elysis', tones: ['day', 'dusk'], size: [2200, 1000], draw: terraceSea },
  'arch': { label: 'Through the arch', tone: 'day', size: [1600, 1200], draw: archedView },
  'portrait': { label: 'Portrait', tone: 'interior', size: [900, 1100], draw: portraitScene },
  'plan': { label: 'Floor plan', tone: 'interior', size: [1200, 1000], draw: floorPlan },
};

/* ------------------------------------------------------------------ *
 * Compose an SVG file
 * ------------------------------------------------------------------ */

/** The rosette from the Elysis mark, drawn small for the caption plate. */
function markGlyph(x, y, s, colour) {
  return `<g transform="translate(${n(x)} ${n(y)}) scale(${n(s)})" fill="none" stroke="${colour}" stroke-width="2.4" opacity="0.8">
    <path d="M0 -22 C 7 -9, 9 -7, 22 0 C 9 7, 7 9, 0 22 C -7 9, -9 7, -22 0 C -9 -7, -7 -9, 0 -22 Z"/>
    <circle cx="0" cy="0" r="6.5"/>
  </g>`;
}

/** Longest matching scene prefix, so suite-sea-03 draws the suite-sea scene. */
function pickScene(name) {
  let best = '';
  Object.keys(SCENES).forEach((key) => {
    if ((name === key || name.startsWith(`${key}-`)) && key.length > best.length) best = key;
  });
  return best || 'header';
}

function render(name) {
  const def = SCENES[pickScene(name)];
  const [W, H] = def.size;
  const seed = seedFrom(name);
  const p = PALETTES[def.tones ? def.tones[seed % def.tones.length] : def.tone];
  const rand = rng(seed);
  const S = Math.min(W, H) / 44;
  const c = { W, H, p, rand, S, name };
  const label = String(def.label).toUpperCase();
  const type = Math.min(W, H) * 0.019;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${def.label}, placeholder artwork">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${p.skyTop}"/>
      <stop offset="100%" stop-color="${p.skyBase}"/>
    </linearGradient>
    <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${p.sea}"/>
      <stop offset="100%" stop-color="${p.seaDeep}"/>
    </linearGradient>
    <linearGradient id="water" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#8fd0d8"/>
      <stop offset="100%" stop-color="#2f8ba0"/>
    </linearGradient>
    <radialGradient id="glow">
      <stop offset="0%" stop-color="${p.sun}" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="${p.sun}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="veil" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.14"/>
      <stop offset="42%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.34"/>
    </linearGradient>
  </defs>
  ${/* A third of the frames are mirrored, so two scenes drawn from the same
       vocabulary do not sit next to each other looking like one photograph
       used twice. The caption below is added after, so it stays readable. */ ''}
  <g${seed % 3 === 0 ? ` transform="translate(${W} 0) scale(-1 1)"` : ''}>${def.draw(c)}</g>
  <rect width="${W}" height="${H}" fill="url(#veil)"/>
  <g>
    ${markGlyph(W * 0.038, H - type * 2.1, type / 26, '#ffffff')}
    <text x="${n(W * 0.038 + type * 1.5)}" y="${n(H - type * 1.5)}"
      font-family="Jost, Futura, 'Helvetica Neue', Helvetica, Arial, sans-serif"
      font-size="${n(type)}" letter-spacing="${n(type * 0.26)}"
      fill="#ffffff" fill-opacity="0.82">${label}</text>
  </g>
</svg>
`;
}

/* ------------------------------------------------------------------ *
 * Which files to draw: every placeholder the content asks for
 * ------------------------------------------------------------------ */

function wanted() {
  const names = new Set();
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
  const re = /\/assets\/placeholder\/([a-z0-9-]+)\.svg/g;
  files.forEach((file) => {
    const raw = fs.readFileSync(path.join(DATA_DIR, file), 'utf8');
    let m;
    while ((m = re.exec(raw))) names.add(m[1]);
  });
  return Array.from(names).sort();
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const names = wanted();
  if (!names.length) {
    console.log('[placeholders] nothing referenced from src/data/*.json');
    return;
  }
  const unknown = [];
  names.forEach((name) => {
    if (!Object.keys(SCENES).some((k) => name === k || name.startsWith(`${k}-`))) unknown.push(name);
    fs.writeFileSync(path.join(OUT_DIR, `${name}.svg`), render(name), 'utf8');
  });
  console.log(`[placeholders] drew ${names.length} images into public/assets/placeholder`);
  if (unknown.length) {
    console.log(`[placeholders] no scene matched, drew the default for: ${unknown.join(', ')}`);
  }

  // Anything left behind by an earlier content edit is dead weight in the deploy.
  const keep = new Set(names.map((x) => `${x}.svg`));
  fs.readdirSync(OUT_DIR)
    .filter((f) => f.endsWith('.svg') && !keep.has(f))
    .forEach((f) => {
      fs.unlinkSync(path.join(OUT_DIR, f));
      console.log(`[placeholders] removed unused ${f}`);
    });
}

main();
