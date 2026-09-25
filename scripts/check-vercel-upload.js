'use strict';

/**
 * Simulate what Vercel uploads and prove the build still works.
 *
 * .vercelignore uses .gitignore matching, where an unanchored pattern such as
 * "data/" matches at ANY depth. That once excluded src/data as well as the
 * root data directory, and the deploy failed on a missing JSON file that was
 * present locally. This reproduces the upload so that can't happen unnoticed.
 *
 * Run: node scripts/check-vercel-upload.js
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const root = path.join(__dirname, '..');
const ignoreFile = path.join(root, '.vercelignore');

function tracked() {
  return execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
}

/** Files .vercelignore would exclude, using git's own matcher. */
function excluded(files) {
  if (!fs.existsSync(ignoreFile)) return new Set();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vercelignore-'));
  execFileSync('git', ['init', '-q', tmp]);
  fs.copyFileSync(ignoreFile, path.join(tmp, '.gitignore'));
  const out = execFileSync('git', ['check-ignore', '--stdin'], {
    cwd: tmp,
    input: files.join('\n'),
    encoding: 'utf8',
    // check-ignore exits 1 when nothing matches
  // eslint-disable-next-line no-empty-function
  }).toString();
  fs.rmSync(tmp, { recursive: true, force: true });
  return new Set(out.split('\n').filter(Boolean));
}

const all = tracked();
let skip;
try {
  skip = excluded(all);
} catch (err) {
  skip = new Set(); // nothing matched
}
const uploaded = all.filter((f) => !skip.has(f));

// Every JSON the server or build requires must survive the upload.
const required = [];
for (const f of all) {
  if (!f.startsWith('src/')) continue;
  if (!/\.js$/.test(f)) continue;
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  const re = /require\(['"](\.[^'"]+\.json)['"]\)/g;
  let m;
  while ((m = re.exec(src))) {
    required.push(path.relative(root, path.resolve(path.dirname(path.join(root, f)), m[1])));
  }
}

const missing = [...new Set(required)].filter((f) => skip.has(f) || !all.includes(f));

console.log(`tracked: ${all.length}  uploaded: ${uploaded.length}  excluded: ${skip.size}`);
console.log(`required JSON referenced by src: ${[...new Set(required)].length}`);

if (missing.length) {
  console.error('\nFAIL: .vercelignore excludes files the build requires:');
  missing.forEach((f) => console.error('  ' + f));
  console.error('\nAnchor the pattern with a leading slash so it only matches the repo root.');
  process.exit(1);
}

// Every asset a built page asks for must survive the upload too. This is the
// guard on .vercelignore excluding the photography masters: the site serves the
// WebP copies, and a slot pointed back at a .png would 404 in production while
// looking perfect locally.
const pages = [];
(function walk(dir) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return;
  fs.readdirSync(abs).forEach((f) => {
    const rel = path.join(dir, f);
    if (fs.statSync(path.join(root, rel)).isDirectory()) return walk(rel);
    if (f.endsWith('.html')) pages.push(rel);
  });
})('public');

const uploadedSet = new Set(uploaded);
const unreachable = new Set();
pages.forEach((page) => {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  const re = /(?:src|href)="(\/assets\/[^"]+)"|url\('(\/assets\/[^']+)'\)/g;
  let m;
  while ((m = re.exec(html))) {
    const asset = path.join('public', (m[1] || m[2]).replace(/^\//, ''));
    if (!uploadedSet.has(asset)) unreachable.add(`${m[1] || m[2]}  (asked for by ${page})`);
  }
});

if (unreachable.size) {
  console.error('\nFAIL: built pages ask for assets the deploy would not have:');
  [...unreachable].slice(0, 20).forEach((a) => console.error('  ' + a));
  process.exit(1);
}

console.log(`OK: every JSON the build requires, and every asset its ${pages.length} pages ask for, survives .vercelignore`);
