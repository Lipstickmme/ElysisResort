'use strict';

/**
 * Shared page layout. Pages provide their own content; this module wraps it
 * with the head, nav, footer and concierge widget so every page stays
 * consistent. Rendered at build time (scripts/build-pages.js) into static HTML,
 * so there is no client-side layout flash and every page is a real page.
 */

const images = require('./images');
const site = require('../data/site.json');
const resort = require('../data/resort.json');
const suites = require('../data/suites.json');

const YEAR = new Date().getFullYear();

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

/**
 * The image behind every page, fixed to the viewport so the site reads as one
 * continuous surface rather than a stack of separate screens.
 */
function underlay() {
  return `
  <div class="underlay" aria-hidden="true">
    <div class="underlay-img" style="background-image:url('${images.underlay}')"></div>
    <div class="underlay-scrim"></div>
  </div>`;
}

/** The rosette and the name, as used in the nav and the footer. */
function brand(variant = 'light') {
  const mark = variant === 'light' ? 'elysis-mark-light.svg' : 'elysis-mark.svg';
  return `
    <a class="brand brand-${variant}" href="/" aria-label="Elysis Luxury Resort, home">
      <img class="brand-mark" src="/assets/brand/${mark}" alt="" width="100" height="100" />
      <span class="brand-text">
        <span class="brand-word">Elysis</span>
        <span class="brand-sub">Paros</span>
      </span>
    </a>`;
}

/**
 * The reservation form.
 *
 * Shared so the landing page and /reserve behave identically: both POST to
 * /api/reservations, which writes the enquiry and raises it with the desk, and
 * both appear under Reservations at /admin.
 */
function reserveForm(id = 'reserve-form') {
  const options = suites
    .map((s) => `<option value="${esc(s.id)}">${esc(s.name)} &mdash; from &euro;${s.rateFrom.toLocaleString('en-GB')}</option>`)
    .join('\n              ');
  return `
      <form id="${id}" class="form" data-reserve-form novalidate data-reveal>
        <div class="field-row">
          <div class="field"><label for="${id}-name">Name</label><input type="text" id="${id}-name" name="name" autocomplete="name" required /><div class="err" data-err="name"></div></div>
          <div class="field"><label for="${id}-email">Email</label><input type="email" id="${id}-email" name="email" autocomplete="email" required /><div class="err" data-err="email"></div></div>
        </div>
        <div class="field-row">
          <div class="field"><label for="${id}-arrival">Arrival</label><input type="date" id="${id}-arrival" name="arrival" /><div class="err" data-err="arrival"></div></div>
          <div class="field"><label for="${id}-departure">Departure</label><input type="date" id="${id}-departure" name="departure" /><div class="err" data-err="departure"></div></div>
        </div>
        <div class="field-row">
          <div class="field"><label for="${id}-adults">Adults</label>
            <select id="${id}-adults" name="adults">
              ${[1, 2, 3, 4, 5, 6, 7, 8].map((v) => `<option value="${v}"${v === 2 ? ' selected' : ''}>${v}</option>`).join('')}
            </select>
          </div>
          <div class="field"><label for="${id}-children">Children</label>
            <select id="${id}-children" name="children">
              ${[0, 1, 2, 3, 4, 5, 6].map((v) => `<option value="${v}">${v}</option>`).join('')}
            </select>
          </div>
          <div class="field"><label for="${id}-phone">Telephone <span class="opt">(optional)</span></label><input type="tel" id="${id}-phone" name="phone" autocomplete="tel" /></div>
        </div>
        <div class="field"><label for="${id}-suite">Residence</label>
          <select id="${id}-suite" name="suite" data-suite-select>
            <option value="">No preference, please advise</option>
            ${options}
          </select>
        </div>
        <div class="field"><label for="${id}-message">Your stay</label><textarea id="${id}-message" name="message" placeholder="Who is travelling, what the occasion is, anything we should arrange before you arrive." required></textarea><div class="err" data-err="message"></div></div>
        <div class="honeypot" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off" /></label></div>
        <div class="form-status" data-form-status role="status" aria-live="polite"></div>
        <button type="submit" class="btn" data-submit>Send enquiry</button>
        <p class="form-note">An enquiry, not a booking. Nothing is charged, and the desk replies with availability and a rate within a day.</p>
      </form>`;
}

function head({ title, description, noindex = false, styles = [], canonical = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <meta name="description" content="${description}" />${noindex ? '\n  <meta name="robots" content="noindex, nofollow" />' : ''}
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Elysis Luxury Resort" />${canonical ? `\n  <link rel="canonical" href="${canonical}" />` : ''}
  <meta name="theme-color" content="#f7f3ec" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="icon" href="/favicon.png" type="image/png" sizes="512x512" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Jost:wght@300;400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/css/styles.css" />
  ${styles.map((href) => `<link rel="stylesheet" href="${href}" />`).join('\n  ')}
</head>`;
}

function nav(active = '') {
  const link = (href, label, key) =>
    `<a href="${href}"${key === active ? ' class="is-active"' : ''}>${label}</a>`;
  return `
  <header class="nav" id="nav">
    ${brand('dark')}
    <nav class="nav-links" id="navlinks" aria-label="Main">
      ${link('/suites', 'Suites', 'suites')}
      ${link('/dining', 'Dining', 'dining')}
      ${link('/experiences', 'Experiences', 'experiences')}
      ${link('/gallery', 'Gallery', 'gallery')}
      <a class="nav-links-cta" href="/reserve">Reserve</a>
    </nav>
    <a href="/reserve" class="btn ghost nav-cta">Reserve</a>
    <button class="nav-toggle" id="navtoggle" aria-label="Open menu" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
  </header>`;
}

function footer() {
  return `
  <footer class="footer">
    <div class="wrap footer-top">
      <div class="footer-brand">
        ${brand('light')}
        <p class="footer-lede">${esc(resort.lede)}</p>
      </div>
      <div class="col">
        <h5>Stay</h5>
        <a href="/suites">Residences</a>
        <a href="/dining">Dining</a>
        <a href="/experiences">Experiences</a>
        <a href="/gallery">Gallery</a>
      </div>
      <div class="col">
        <h5>The house</h5>
        <a href="/reserve">Reserve</a>
        <a href="/reserve#arrival">Getting here</a>
        <a href="/careers">Careers</a>
        <a href="/apply">Work with us</a>
      </div>
      <div class="col">
        <h5>Reservations</h5>
        <a href="mailto:${site.email}" data-site="email">${site.email}</a>
        <span class="footer-line" data-site-row="phone" hidden><a data-site="phone" href="#"></a></span>
        <span class="footer-line" data-site="hours">${esc(site.hours)}</span>
        <span class="footer-line" data-site="address">${esc(site.address)}</span>
      </div>
    </div>
    <div class="wrap footer-bottom">
      <span>&copy; ${YEAR} Elysis Luxury Resort, Paros</span>
      <span class="footer-place">${esc(resort.place)}</span>
    </div>
  </footer>`;
}

/** The concierge. Same widget, same backend, the name a resort would use. */
function chatWidget() {
  return `
  <div class="chat" id="chat" aria-live="polite">
    <button class="chat-toggle" id="chat-toggle" aria-label="Open the concierge chat" aria-expanded="false">
      <svg class="i-open" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/></svg>
      <svg class="i-close" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 6l12 12M18 6L6 18"/></svg>
      <span class="chat-toggle-label">Concierge</span>
    </button>
    <div class="chat-panel" id="chat-panel" hidden>
      <div class="chat-head">
        <div class="chat-head-id">
          <span class="dot"></span>
          <div>
            <strong>Elysis Concierge</strong>
            <small>Usually answers within a few minutes</small>
          </div>
        </div>
        <button class="chat-min" id="chat-min" aria-label="Minimise chat">&minus;</button>
      </div>
      <div class="chat-log" id="chat-log"></div>
      <form class="chat-form" id="chat-form">
        <input type="text" id="chat-input" name="text" placeholder="Ask us anything" autocomplete="off" maxlength="2000" />
        <button type="submit" aria-label="Send message">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        </button>
      </form>
    </div>
  </div>`;
}

/**
 * Script tags. An entry may be a path, or `{ src, type }` when it needs to
 * load as a module (the dashboard imports the Supabase client).
 */
function scripts(list) {
  const tags = list
    .map((s) => (typeof s === 'string' ? { src: s } : s))
    .map(({ src, type }) => `<script${type ? ` type="${type}"` : ''} src="${src}"></script>`)
    .join('\n  ');
  return `  ${tags}\n</body>\n</html>`;
}

/**
 * Compose a full page.
 *
 * `bare` pages get the same shell styling but none of the site furniture: no
 * nav, no footer and no concierge. The dashboard is one, since a member of
 * staff answering the chat should not also be offered it.
 */
function page(opts) {
  const { active = '', content = '', extraScripts = [], bare = false } = opts;
  // A page that opens with a full-bleed image carries the nav over it, so the
  // nav starts in its white-on-photograph state and inks up once it scrolls.
  const overImage = /class="hero"|class="page-header"/.test(content);
  const bodyClass = [opts.bodyClass || '', overImage ? 'has-hero' : ''].filter(Boolean).join(' ');
  if (bare) {
    return [head(opts), `<body class="${bodyClass}">`, content, scripts(extraScripts)].join('\n');
  }
  return [
    head(opts),
    `<body class="${bodyClass}">`,
    '  <a class="skip" href="#main">Skip to content</a>',
    '  <div class="scroll-progress" id="progress"></div>',
    underlay(),
    nav(active),
    `<main id="main">`,
    content,
    '</main>',
    footer(),
    chatWidget(),
    scripts(['/js/main.js', '/js/supabase-lite.js', '/js/chat.js', ...extraScripts]),
  ].join('\n');
}

module.exports = { page, reserveForm, esc };
