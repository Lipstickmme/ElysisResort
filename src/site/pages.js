'use strict';

/**
 * Every page of the site, as data.
 *
 * The listings and the profiles are rendered here at build time rather than
 * fetched in the browser, so a residence is a real page with its own URL, its
 * own title and its own text in the HTML. The API serves the same content for
 * anything that wants it as JSON.
 */

const content = require('../content');
const images = require('./images');
const site = require('../data/site.json');
const { reserveForm, esc } = require('./layout');

const { suites, experiences, dining, gallery, resort, leadership, collections } = content;
const rate = content.rate;

/* ---------------------------------------------------------------- *
 * Pieces
 * ---------------------------------------------------------------- */

/** Interior page header with an image band behind it. */
function pageHeader({ eyebrow, title, sub, image, crumb }) {
  return `
  <header class="page-header" style="--ph-image:url('${image}')">
    <div class="page-header-media" aria-hidden="true"></div>
    <div class="wrap page-header-inner">
      ${crumb ? `<a class="crumb" href="${crumb.href}">${esc(crumb.label)}</a>` : ''}
      <span class="eyebrow">${esc(eyebrow)}</span>
      <h1 data-reveal>${esc(title)}</h1>
      ${sub ? `<p class="lede" data-reveal>${esc(sub)}</p>` : ''}
    </div>
  </header>`;
}

/** A full-height chapter of the landing page, with its own photograph. */
function chapter({ id, label, image, tone = '', inner }) {
  return `
  <section class="chapter ${tone}" id="${id}" data-chapter="${esc(label)}">
    ${image ? `<div class="chapter-media" aria-hidden="true"><img src="${image}" alt="" loading="lazy" decoding="async" /></div>
    <div class="chapter-scrim" aria-hidden="true"></div>` : ''}
    <div class="wrap chapter-inner">${inner}</div>
  </section>`;
}

function suiteCard(s, eager = false) {
  return `
      <a class="s-card" href="/suites/${esc(s.id)}" data-reveal data-collection="${esc(s.collection)}">
        <div class="s-card-media">
          <img src="${s.image}" alt="${esc(s.name)}" ${eager ? '' : 'loading="lazy"'} decoding="async" />
          <span class="s-card-tag">${esc(s.collection)}</span>
        </div>
        <div class="s-card-body">
          <h3>${esc(s.name)}</h3>
          <p>${esc(s.blurb)}</p>
          <div class="s-card-meta">
            <span>${esc(s.size)}</span>
            <span>Sleeps ${s.sleeps}</span>
            <span>${esc(s.view)}</span>
          </div>
          <div class="s-card-foot">
            <span class="rate"><em>from ${rate(s.rateFrom)}</em> per night</span>
            <span class="go">View residence</span>
          </div>
        </div>
      </a>`;
}

function experienceCard(e) {
  return `
      <a class="e-card" href="/experiences/${esc(e.id)}" data-reveal data-category="${esc(e.category)}">
        <div class="e-card-media"><img src="${e.image}" alt="${esc(e.title)}" loading="lazy" decoding="async" /></div>
        <div class="e-card-body">
          <span class="eyebrow">${esc(e.category)}</span>
          <h3>${esc(e.title)}</h3>
          <p>${esc(e.summary)}</p>
          <span class="go">More</span>
        </div>
      </a>`;
}

function galleryFigure(item, i) {
  return `
      <figure class="g-item" data-category="${esc(item.category)}" data-reveal>
        <img src="${item.image}" alt="${esc(item.title)}" loading="${i < 6 ? 'eager' : 'lazy'}" decoding="async" />
        <figcaption><span>${esc(item.title)}</span><em>${esc(item.category)}</em></figcaption>
      </figure>`;
}

function factList(rows) {
  return `<dl class="facts">${rows
    .filter((r) => r && r.v)
    .map((r) => `<div class="fact"><dt>${esc(r.k)}</dt><dd>${esc(r.v)}</dd></div>`)
    .join('')}</dl>`;
}

/* ---------------------------------------------------------------- *
 * Landing
 * ---------------------------------------------------------------- */

const host = leadership[0];

const heroSection = `
  <section class="hero" id="top" data-chapter="Elysis">
    <div class="hero-slides" id="hero-slides" aria-hidden="true">
      ${images.heroSlides.map((src, i) => `<div class="slide${i === 0 ? ' is-active' : ''}" style="background-image:url('${src}')"></div>`).join('\n      ')}
    </div>
    <div class="hero-scrim" aria-hidden="true"></div>
    <div class="hero-inner">
      <span class="hero-place" data-reveal>${esc(resort.place)}</span>
      <h1 class="hero-title" data-reveal>Elysis</h1>
      <span class="hero-tagline" data-reveal>${esc(resort.tagline)}</span>
      <a class="hero-cue" href="#house" data-reveal>
        <span class="hero-cue-ring" aria-hidden="true"><span class="arrow"></span></span>
        <span class="hero-cue-label">Discover Elysis</span>
      </a>
    </div>
    <div class="hero-dots" id="hero-dots" role="tablist" aria-label="Background images">
      ${images.heroSlides.map((src, i) => `<button class="dot${i === 0 ? ' is-active' : ''}" data-slide="${i}" aria-label="Image ${i + 1}"></button>`).join('\n      ')}
    </div>
  </section>`;

const houseSection = chapter({
  id: 'house',
  label: 'The house',
  image: images.story,
  inner: `
      <div class="split">
        <div class="split-copy" data-reveal>
          <span class="eyebrow">01 &mdash; The house</span>
          <h2>Eighteen residences above a private bay.</h2>
          ${resort.story.map((para) => `<p>${esc(para)}</p>`).join('\n          ')}
          <a class="link-arrow" href="/suites">See the residences</a>
        </div>
        <div class="split-facts" data-reveal>
          ${factList(resort.facts)}
        </div>
      </div>`,
});

const suitesSection = chapter({
  id: 'suites',
  label: 'Residences',
  image: images.suites,
  inner: `
      <div class="section-head with-action" data-reveal>
        <div>
          <span class="eyebrow">02 &mdash; Residences</span>
          <h2>Suites, villas and houses.</h2>
          <p class="lede">From a forty four metre suite off a courtyard to a four bedroom estate on the ridge, each with its own terrace and most with their own pool.</p>
        </div>
        <a href="/suites" class="btn ghost">All ${suites.length} residences</a>
      </div>
      <div class="s-grid">
        ${[suites[0], suites[5], suites[16]].map((s) => suiteCard(s)).join('\n')}
      </div>`,
});

const diningSection = chapter({
  id: 'dining',
  label: 'The table',
  image: images.dining,
  inner: `
      <div class="section-head with-action" data-reveal>
        <div>
          <span class="eyebrow">03 &mdash; The table</span>
          <h2>Four kitchens, one bay.</h2>
          <p class="lede">The boats land at Naoussa at six each morning and the kitchen buys off them. What they caught decides what is written on the menu that afternoon.</p>
        </div>
        <a href="/dining" class="btn ghost">Dining at Elysis</a>
      </div>
      <div class="d-strip">
        ${dining.slice(0, 4).map((v) => `
        <a class="d-strip-item" href="/dining#${esc(v.id)}" data-reveal>
          <div class="d-strip-media"><img src="${v.image}" alt="${esc(v.name)}" loading="lazy" decoding="async" /></div>
          <h3>${esc(v.name)}</h3>
          <span class="d-strip-kind">${esc(v.kind)}</span>
        </a>`).join('')}
      </div>`,
});

const experiencesSection = chapter({
  id: 'experiences',
  label: 'The days',
  image: images.experiences,
  inner: `
      <div class="section-head with-action" data-reveal>
        <div>
          <span class="eyebrow">04 &mdash; The days</span>
          <h2>What there is to do, and what there is not.</h2>
          <p class="lede">A private beach, a heated twenty five metre pool, a spa in the rock, a catamaran at six, and a fire on the sand every Thursday.</p>
        </div>
        <a href="/experiences" class="btn ghost">All experiences</a>
      </div>
      <div class="e-grid">
        ${[0, 3, 2, 4, 1, 7].map((i) => experienceCard(experiences[i])).join('\n')}
      </div>`,
});

const hostSection = chapter({
  id: 'host',
  label: 'Your host',
  tone: 'is-narrow',
  inner: `
      <div class="host" data-reveal>
        <div class="host-media">
          <img src="${host.image}" alt="Portrait of ${esc(host.name)}" loading="lazy" decoding="async" />
        </div>
        <div class="host-body">
          <span class="eyebrow">05 &mdash; Your host</span>
          <blockquote>&ldquo;${esc(host.quote)}&rdquo;</blockquote>
          <h3>${esc(host.name)}</h3>
          <span class="host-role">${esc(host.role)}</span>
          <p>${esc(host.bio)}</p>
        </div>
      </div>`,
});

const gallerySection = chapter({
  id: 'gallery',
  label: 'Gallery',
  image: images.gallery,
  inner: `
      <div class="section-head with-action" data-reveal>
        <div>
          <span class="eyebrow">06 &mdash; Gallery</span>
          <h2>The place itself.</h2>
        </div>
        <a href="/gallery" class="btn ghost">Open the gallery</a>
      </div>
      <div class="g-strip">
        ${gallery.slice(0, 6).map((item) => `
        <a class="g-strip-item" href="/gallery" data-reveal>
          <img src="${item.image}" alt="${esc(item.title)}" loading="lazy" decoding="async" />
          <span>${esc(item.title)}</span>
        </a>`).join('')}
      </div>`,
});

const reserveSection = chapter({
  id: 'reserve',
  label: 'Reserve',
  image: images.reserve,
  inner: `
      <div class="reserve-grid">
        <div class="reserve-copy" data-reveal>
          <span class="eyebrow">07 &mdash; Reserve</span>
          <h2>Tell us when, and who with.</h2>
          <p class="lede">Send the dates and a line about the stay you have in mind. The reservations desk replies within a day with what is free, what it costs, and what we would suggest instead if your dates are full.</p>
          <div class="reserve-detail">
            <div class="row"><span class="k">Reservations</span><span class="v"><a href="mailto:${site.email}" data-site="email">${site.email}</a></span></div>
            <div class="row" data-site-row="phone" hidden><span class="k">Telephone</span><span class="v"><a data-site="phone" href="#"></a></span></div>
            <div class="row"><span class="k">Desk hours</span><span class="v" data-site="hours">${esc(site.hours)}</span></div>
            <div class="row"><span class="k">Address</span><span class="v" data-site="address">${esc(site.address)}</span></div>
          </div>
        </div>
        ${reserveForm('home-reserve-form')}
      </div>`,
});

const indexContent = [
  '<nav class="chapter-rail" id="chapter-rail" aria-label="Page sections"></nav>',
  heroSection,
  houseSection,
  suitesSection,
  diningSection,
  experiencesSection,
  hostSection,
  gallerySection,
  reserveSection,
].join('\n');

/* ---------------------------------------------------------------- *
 * Residences: the index, and a profile page for each one
 * ---------------------------------------------------------------- */

const suitesContent = `
  ${pageHeader({
    eyebrow: `${suites.length} residences`,
    title: 'Suites, villas and residences.',
    sub: 'Every one has its own terrace, most have their own pool, and none of them overlooks another. Rates include breakfast, the beach and pool clubs, and transfers from the airport or the port.',
    image: images.suitesHeader,
  })}
  <section class="section-pad">
    <div class="wrap">
      <div class="filters" id="suite-filters" data-reveal>
        <button class="chip is-on" data-filter="All">All</button>
        ${collections.map((c) => `<button class="chip" data-filter="${esc(c)}">${esc(c)}</button>`).join('\n        ')}
      </div>
      <div class="s-grid s-grid-full" id="suite-grid">
        ${suites.map((s, i) => suiteCard(s, i < 3)).join('\n')}
      </div>
      <p class="rates-note" data-reveal>${esc(resort.rates)}</p>
    </div>
  </section>`;

/** One residence, as its own page. */
function suiteProfile(s) {
  const after = content.nextSuite(s.id);
  return `
  ${pageHeader({
    eyebrow: s.collection,
    title: s.name,
    sub: s.lede,
    image: s.image,
    crumb: { href: '/suites', label: 'All residences' },
  })}

  <section class="profile-key">
    <div class="wrap profile-key-inner">
      <div class="pk"><span class="k">Size</span><span class="v">${esc(s.size)}</span></div>
      <div class="pk"><span class="k">Sleeps</span><span class="v">${s.sleeps}</span></div>
      <div class="pk"><span class="k">Bedrooms</span><span class="v">${s.bedrooms}</span></div>
      <div class="pk"><span class="k">View</span><span class="v">${esc(s.view)}</span></div>
      <div class="pk pk-rate"><span class="k">From</span><span class="v">${rate(s.rateFrom)}<em> / night</em></span></div>
      <a class="btn" href="/reserve?suite=${esc(s.id)}">Enquire</a>
    </div>
  </section>

  <section class="section-pad">
    <div class="wrap profile-cols">
      <div class="profile-body" data-reveal>
        ${s.description.map((para) => `<p>${esc(para)}</p>`).join('\n        ')}
        <h3 class="sub-head">In the residence</h3>
        <ul class="ticks">
          ${s.amenities.map((a) => `<li>${esc(a)}</li>`).join('\n          ')}
        </ul>
      </div>
      <aside class="profile-side" data-reveal>
        ${factList([
          { k: 'Collection', v: s.collection },
          { k: 'Interior', v: `${s.size} (${s.sizeImperial})` },
          { k: 'Outside', v: s.terrace },
          { k: 'Beds', v: s.bed },
          { k: 'Bathrooms', v: String(s.bathrooms) },
          { k: 'Where', v: s.position },
          { k: 'Minimum stay', v: s.minStay },
          { k: 'Rate from', v: `${rate(s.rateFrom)} per night` },
        ])}
        <div class="profile-highlights">
          ${s.highlights.map((h) => `<div class="hl"><span>${esc(h.k)}</span><strong>${esc(h.v)}</strong></div>`).join('')}
        </div>
      </aside>
    </div>
  </section>

  <section class="section-pad alt">
    <div class="wrap">
      <div class="section-head" data-reveal><span class="eyebrow">The residence</span><h2>${esc(s.name)}, in pictures.</h2></div>
      <div class="profile-gallery">
        ${s.gallery.map((src, i) => `<figure data-reveal><img src="${src}" alt="${esc(s.name)}, view ${i + 2}" loading="lazy" decoding="async" /></figure>`).join('\n        ')}
      </div>
      <div class="profile-plan" data-reveal>
        <figure><img src="${s.plan}" alt="Floor plan of the ${esc(s.name)}" loading="lazy" decoding="async" /><figcaption>Floor plan, indicative</figcaption></figure>
        <div>
          <h3 class="sub-head">The layout</h3>
          <p>${esc(s.terrace)}, ${s.bedrooms} bedroom${s.bedrooms === 1 ? '' : 's'} and ${s.bathrooms} bathroom${s.bathrooms === 1 ? '' : 's'} across ${esc(s.size)}. ${esc(s.position)}.</p>
          <a class="link-arrow" href="/reserve?suite=${esc(s.id)}">Enquire about this residence</a>
        </div>
      </div>
    </div>
  </section>

  <nav class="next-link"><div class="wrap"><a href="/suites/${esc(after.id)}">
    <span><span class="lbl">Next residence</span><span class="nm">${esc(after.name)}</span></span>
    <span class="arw" aria-hidden="true">&rarr;</span>
  </a></div></nav>

  <section class="cta-band">
    <div class="wrap cta-inner" data-reveal>
      <h2>Stay in the ${esc(s.name)}.</h2>
      <p>Send us your dates and we will hold it while we talk.</p>
      <a href="/reserve?suite=${esc(s.id)}" class="btn">Reserve</a>
    </div>
  </section>`;
}

/* ---------------------------------------------------------------- *
 * Experiences
 * ---------------------------------------------------------------- */

const experienceCategories = Array.from(new Set(experiences.map((e) => e.category)));

const experiencesContent = `
  ${pageHeader({
    eyebrow: 'The days',
    title: 'Experiences.',
    sub: 'The bay, the boat, the fire on Thursdays, and a spa cut into the hillside. Most of it is included; the rest is arranged by the concierge before you arrive.',
    image: images.experiencesHeader,
  })}
  <section class="section-pad">
    <div class="wrap">
      <div class="filters" id="experience-filters" data-reveal>
        <button class="chip is-on" data-filter="All">All</button>
        ${experienceCategories.map((c) => `<button class="chip" data-filter="${esc(c)}">${esc(c)}</button>`).join('\n        ')}
      </div>
      <div class="e-grid e-grid-full" id="experience-grid">
        ${experiences.map((e) => experienceCard(e)).join('\n')}
      </div>
    </div>
  </section>`;

function experienceProfile(e) {
  const after = content.nextExperience(e.id);
  return `
  ${pageHeader({
    eyebrow: `${e.code} &mdash; ${e.category}`,
    title: e.title,
    sub: e.lede,
    image: e.image,
    crumb: { href: '/experiences', label: 'All experiences' },
  })}

  <section class="section-pad">
    <div class="wrap profile-cols">
      <div class="profile-body" data-reveal>
        ${e.body.map((para) => `<p>${esc(para)}</p>`).join('\n        ')}
        <h3 class="sub-head">What is included</h3>
        <ul class="ticks">
          ${e.includes.map((i) => `<li>${esc(i)}</li>`).join('\n          ')}
        </ul>
      </div>
      <aside class="profile-side" data-reveal>
        ${factList(e.details)}
        <a class="btn ghost wide" href="/reserve">Ask the concierge</a>
      </aside>
    </div>
  </section>

  <section class="section-pad alt">
    <div class="wrap">
      <div class="profile-gallery two">
        ${e.gallery.map((src, i) => `<figure data-reveal><img src="${src}" alt="${esc(e.title)}, view ${i + 2}" loading="lazy" decoding="async" /></figure>`).join('\n        ')}
      </div>
    </div>
  </section>

  <nav class="next-link"><div class="wrap"><a href="/experiences/${esc(after.id)}">
    <span><span class="lbl">Next</span><span class="nm">${esc(after.title)}</span></span>
    <span class="arw" aria-hidden="true">&rarr;</span>
  </a></div></nav>`;
}

/* ---------------------------------------------------------------- *
 * Dining
 * ---------------------------------------------------------------- */

const diningContent = `
  ${pageHeader({
    eyebrow: 'The table',
    title: 'Dining.',
    sub: 'Four kitchens and bars, a cellar of four hundred labels, and a chef who will lay a table anywhere on the property you would rather eat.',
    image: images.diningHeader,
  })}
  <section class="section-pad">
    <div class="wrap venues">
      ${dining.map((v, i) => `
      <article class="venue${i % 2 ? ' is-flipped' : ''}" id="${esc(v.id)}" data-reveal>
        <div class="venue-media">
          <img src="${v.image}" alt="${esc(v.name)}" loading="lazy" decoding="async" />
        </div>
        <div class="venue-body">
          <span class="eyebrow">${esc(v.kind)}</span>
          <h2>${esc(v.name)}</h2>
          <p class="lede">${esc(v.lede)}</p>
          ${v.body.map((para) => `<p>${esc(para)}</p>`).join('\n          ')}
          <div class="venue-cols">
            <div>
              <h4>On the menu</h4>
              <ul class="ticks">${v.signature.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
            </div>
            <div>
              <h4>The detail</h4>
              ${factList([{ k: 'Hours', v: v.hours }, { k: 'Seats', v: String(v.seats) }, { k: 'Dress', v: v.dress }, ...v.details])}
            </div>
          </div>
        </div>
      </article>`).join('\n')}
    </div>
  </section>
  <section class="cta-band">
    <div class="wrap cta-inner" data-reveal>
      <h2>Book a table, or the whole terrace.</h2>
      <p>Residents are held a table at Thalassa until seven. Everything else the concierge arranges.</p>
      <a href="/reserve" class="btn">Reserve</a>
    </div>
  </section>`;

/* ---------------------------------------------------------------- *
 * Gallery
 * ---------------------------------------------------------------- */

const galleryContent = `
  ${pageHeader({
    eyebrow: 'Gallery',
    title: 'The place itself.',
    sub: 'The bay, the residences, the table and the nights.',
    image: images.galleryHeader,
  })}
  <section class="section-pad">
    <div class="wrap">
      <div class="filters" id="gallery-filters" data-reveal>
        <button class="chip is-on" data-filter="All">All</button>
        ${content.galleryCategories.map((c) => `<button class="chip" data-filter="${esc(c)}">${esc(c)}</button>`).join('\n        ')}
      </div>
      <div class="g-grid" id="gallery-grid">
        ${gallery.map((item, i) => galleryFigure(item, i)).join('\n')}
      </div>
    </div>
  </section>
  <div class="lightbox" id="lightbox" hidden>
    <button class="lightbox-close" id="lightbox-close" aria-label="Close">&times;</button>
    <button class="lightbox-nav prev" id="lightbox-prev" aria-label="Previous">&lsaquo;</button>
    <figure class="lightbox-figure"><img id="lightbox-img" src="" alt="" /><figcaption id="lightbox-cap"></figcaption></figure>
    <button class="lightbox-nav next" id="lightbox-next" aria-label="Next">&rsaquo;</button>
  </div>`;

/* ---------------------------------------------------------------- *
 * Reserve
 * ---------------------------------------------------------------- */

const reserveContent = `
  ${pageHeader({
    eyebrow: 'Reserve',
    title: 'Reserve a residence.',
    sub: 'An enquiry rather than a booking form. Tell us the dates and who is travelling; the desk replies within a day with what is free and what it costs.',
    image: images.reserveHeader,
  })}
  <section class="section-pad">
    <div class="wrap reserve-grid">
      <div class="reserve-copy" data-reveal>
        <div class="reserve-detail">
          <div class="row"><span class="k">Reservations</span><span class="v"><a href="mailto:${site.email}" data-site="email">${site.email}</a></span></div>
          <div class="row" data-site-row="phone" hidden><span class="k">Telephone</span><span class="v"><a data-site="phone" href="#"></a></span></div>
          <div class="row"><span class="k">Desk hours</span><span class="v" data-site="hours">${esc(site.hours)}</span></div>
          <div class="row"><span class="k">Address</span><span class="v" data-site="address">${esc(site.address)}</span></div>
        </div>
        <div class="note">
          <p>${esc(resort.rates)}</p>
        </div>
        <div class="note">
          <p>Every enquiry is read at the desk, and the concierge in the corner of the screen reaches the same people.</p>
        </div>
      </div>
      ${reserveForm('reserve-form')}
    </div>
  </section>
  <section class="section-pad alt" id="arrival">
    <div class="wrap">
      <div class="section-head" data-reveal>
        <span class="eyebrow">Getting here</span>
        <h2>Paros is easier to reach than it looks.</h2>
      </div>
      <div class="arrival-grid" data-reveal>
        ${resort.arrival.map((a) => `<div class="arrival"><h4>${esc(a.k)}</h4><p>${esc(a.v)}</p></div>`).join('\n        ')}
      </div>
    </div>
  </section>`;

/* ---------------------------------------------------------------- *
 * Careers and applications
 * ---------------------------------------------------------------- */

const careersContent = `
  ${pageHeader({
    eyebrow: 'Careers',
    title: 'Work a season here.',
    sub: 'Eighteen residences means a team small enough that everyone is known by name, by the guests as well as by each other. Live-in rooms, one day off a week in season, and the last week of October on the beach.',
    image: images.careersHeader,
  })}
  <section class="section-pad">
    <div class="wrap careers-intro" data-reveal>
      <div>
        <span class="eyebrow">Working at Elysis</span>
        <h2>Hospitality without the choreography.</h2>
      </div>
      <p>Nobody here recites a script. The team is trusted to read a guest and act, which means the work is harder to train for and far better to do. We hire people who notice things, and we pay above the island rate to keep them for more than one season.</p>
    </div>
  </section>
  <section class="section-pad alt">
    <div class="wrap">
      <div class="section-head" data-reveal>
        <span class="eyebrow">Open roles</span>
        <h2>Where we are hiring.</h2>
        <p class="lede">If your role is not listed, write anyway and say what you would want to run.</p>
      </div>
      <div class="roles" id="roles"></div>
      <div class="roles-cta" data-reveal>
        <a href="/apply" class="btn ghost">Send a speculative application</a>
      </div>
    </div>
  </section>`;

const applyContent = `
  ${pageHeader({
    eyebrow: 'Careers',
    title: 'Apply.',
    sub: 'One form, read by the people you would work beside. We reply to everyone.',
    image: images.careersHeader,
    crumb: { href: '/careers', label: 'All open roles' },
  })}
  <section class="section-pad">
    <div class="wrap reserve-grid">
      <div class="reserve-copy" data-reveal>
        <h2 id="apply-role-title">Speculative application</h2>
        <p class="lede" id="apply-role-sub">Tell us where you have worked and what you would want to run here.</p>
        <div class="reserve-detail" id="apply-role-meta"></div>
        <div class="note">
          <p>Applications are read by the head of the department you would join, not by an agency. If the season is full we will say so, and say when to write again.</p>
        </div>
        <a class="link-arrow" href="/careers">All open roles</a>
      </div>

      <form id="apply-form" class="form" novalidate data-reveal>
        <div class="field-row">
          <div class="field"><label for="apply-name">Name</label><input type="text" id="apply-name" name="name" autocomplete="name" required /><div class="err" data-err="name"></div></div>
          <div class="field"><label for="apply-email">Email</label><input type="email" id="apply-email" name="email" autocomplete="email" required /><div class="err" data-err="email"></div></div>
        </div>
        <div class="field-row">
          <div class="field"><label for="apply-phone">Telephone <span class="opt">(optional)</span></label><input type="tel" id="apply-phone" name="phone" autocomplete="tel" /><div class="err" data-err="phone"></div></div>
          <div class="field"><label for="apply-experience">Seasons in hospitality</label>
            <select id="apply-experience" name="experience">
              <option value="">Select</option>
              <option>First season</option>
              <option>1 to 3</option>
              <option>4 to 8</option>
              <option>9 or more</option>
            </select><div class="err" data-err="experience"></div>
          </div>
        </div>
        <div class="field"><label for="apply-role">Role</label>
          <select id="apply-role" name="roleId"><option value="">Speculative application</option></select>
          <div class="err" data-err="roleId"></div>
        </div>
        <div class="field"><label for="apply-portfolio">Profile or reference <span class="opt">(optional)</span></label><input type="url" id="apply-portfolio" name="portfolio" placeholder="https://" /><div class="err" data-err="portfolio"></div></div>
        <div class="field"><label for="apply-message">Where have you worked?</label><textarea id="apply-message" name="message" placeholder="The houses you would want us to call, and what you did there." required></textarea><div class="err" data-err="message"></div></div>
        <div class="honeypot" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off" /></label></div>
        <div class="form-status" id="apply-status" role="status" aria-live="polite"></div>
        <button type="submit" class="btn" id="apply-submit">Send application</button>
      </form>
    </div>
  </section>`;

/* ---------------------------------------------------------------- *
 * The desk (staff only, no site furniture)
 * ---------------------------------------------------------------- */

const adminContent = `
  <main class="admin" id="admin">
    <section class="admin-gate" id="admin-boot">
      <div class="admin-card"><p class="admin-note">Checking access&hellip;</p></div>
    </section>

    <section class="admin-gate" id="admin-unconfigured" hidden>
      <div class="admin-card">
        <span class="eyebrow">Elysis / The desk</span>
        <h1>Backend not connected.</h1>
        <div id="admin-missing"></div>
        <p class="admin-note">Set it in the deployment's environment variables and reload. Nothing needs rebuilding, but the change only reaches a running deployment after a redeploy.</p>
        <p class="admin-note"><a href="/api/health">/api/health</a> lists everything the server can see.</p>
        <a class="admin-back" href="/">Back to the site</a>
      </div>
    </section>

    <section class="admin-gate" id="admin-login" hidden>
      <form class="admin-card" id="login-form" novalidate>
        <span class="eyebrow">Elysis / The desk</span>
        <h1>Staff sign in.</h1>
        <p class="admin-note" id="login-note">Reservations, applications, the concierge chat and house mail in one place.</p>
        <div class="field"><label for="login-email">Email</label><input type="email" id="login-email" name="email" autocomplete="username" required /></div>
        <div class="field"><label for="login-password">Password</label><input type="password" id="login-password" name="password" autocomplete="current-password" required /></div>
        <div class="err" id="login-error" role="alert"></div>
        <button type="submit" class="btn" id="login-btn">Sign in</button>
        <a class="admin-back" href="/">Back to the site</a>
      </form>
    </section>

    <div class="admin-shell" id="admin-shell" hidden>
      <header class="admin-bar">
        <a class="admin-brand" href="/">
          <img src="/assets/brand/elysis-wordmark.svg" alt="Elysis" width="520" height="300" />
          <span>The desk</span>
        </a>
        <div class="admin-bar-end">
          <span class="admin-who" id="admin-who"></span>
          <button type="button" class="admin-signout" id="admin-signout">Sign out</button>
        </div>
      </header>

      <nav class="admin-tabs" id="admin-tabs" role="tablist" aria-label="Sections">
        <button type="button" class="admin-tab is-active" role="tab" data-tab="enquiries" aria-selected="true">Reservations<span class="tally" data-tally="enquiries">0</span></button>
        <button type="button" class="admin-tab" role="tab" data-tab="applications" aria-selected="false">Applications<span class="tally" data-tally="applications">0</span></button>
        <button type="button" class="admin-tab" role="tab" data-tab="chat" aria-selected="false">Concierge<span class="tally" data-tally="chat">0</span></button>
        <button type="button" class="admin-tab" role="tab" data-tab="email" aria-selected="false">Email<span class="tally" data-tally="email">0</span></button>
        <button type="button" class="admin-tab" role="tab" data-tab="settings" aria-selected="false">Settings</button>
      </nav>

      <p class="admin-alert" id="admin-alert" role="alert" hidden></p>

      <div class="admin-body">
        <section class="admin-panel" data-panel="enquiries">
          <div class="admin-split">
            <ul class="admin-list" id="enquiry-list"><li class="admin-empty">Loading&hellip;</li></ul>
            <div class="admin-detail" id="enquiry-detail"><p class="admin-empty">Pick an enquiry to read it.</p></div>
          </div>
        </section>

        <section class="admin-panel" data-panel="applications" hidden>
          <div class="admin-split">
            <ul class="admin-list" id="application-list"><li class="admin-empty">Loading&hellip;</li></ul>
            <div class="admin-detail" id="application-detail"><p class="admin-empty">Pick an application to read it.</p></div>
          </div>
        </section>

        <section class="admin-panel" data-panel="chat" hidden>
          <div class="admin-split">
            <ul class="admin-list" id="chat-list"><li class="admin-empty">Loading&hellip;</li></ul>
            <div class="admin-detail" id="chat-detail"><p class="admin-empty">Pick a conversation to read and reply.</p></div>
          </div>
        </section>

        <section class="admin-panel" data-panel="email" hidden>
          <div class="admin-split">
            <ul class="admin-list" id="email-list"><li class="admin-empty">Loading&hellip;</li></ul>
            <div class="admin-detail" id="email-detail"><p class="admin-empty">Pick a thread to read it.</p></div>
          </div>
        </section>
        <section class="admin-panel" data-panel="settings" hidden>
          <div class="admin-settings" id="settings-panel"><p class="admin-empty">Loading&hellip;</p></div>
        </section>
      </div>
    </div>
  </main>`;

/* ---------------------------------------------------------------- *
 * 404
 * ---------------------------------------------------------------- */

const notFoundContent = `
  <section class="notfound">
    <div class="wrap">
      <span class="eyebrow">Error 404</span>
      <h1>Off the path.</h1>
      <p class="lede">This page has moved, or never existed. The links below will bring you back to the bay.</p>
      <div class="cta-actions"><a href="/" class="btn">Back to the house</a><a href="/suites" class="btn ghost">See the residences</a></div>
    </div>
  </section>`;

/* ---------------------------------------------------------------- *
 * The pages themselves
 * ---------------------------------------------------------------- */

const NAME = 'Elysis Luxury Resort';

const pages = [
  {
    file: 'index.html', active: '', bodyClass: 'page-home',
    title: `${NAME} | Paros, Cyclades`,
    description: `Elysis is an eighteen residence resort above a private bay on Paros: suites and villas with their own pools, four kitchens, a spa in the rock and a beach that is ours to the headland.`,
    content: indexContent,
  },
  {
    file: 'suites.html', active: 'suites', bodyClass: 'page-suites',
    title: `Suites, villas and residences | ${NAME}`,
    description: 'Eighteen residences on Paros, from a 44 square metre suite to a four bedroom estate, most with a private pool. Rates from 510 euro a night including breakfast and transfers.',
    content: suitesContent, extraScripts: ['/js/filters.js'],
  },
  {
    file: 'experiences.html', active: 'experiences', bodyClass: 'page-experiences',
    title: `Experiences | ${NAME}`,
    description: 'A private beach, a heated 25 metre pool, a spa and hammam, sunset sailing, diving, yoga at seven and a bonfire on the sand every Thursday.',
    content: experiencesContent, extraScripts: ['/js/filters.js'],
  },
  {
    file: 'dining.html', active: 'dining', bodyClass: 'page-dining',
    title: `Dining | ${NAME}`,
    description: 'Thalassa over the water, Olivo in the grove, Alati on the sand and Ampeli at sunset, with a cellar of four hundred labels and private dining anywhere on the property.',
    content: diningContent,
  },
  {
    file: 'gallery.html', active: 'gallery', bodyClass: 'page-gallery',
    title: `Gallery | ${NAME}`,
    description: 'The bay, the residences, the table and the nights at Elysis, Paros.',
    content: galleryContent, extraScripts: ['/js/filters.js', '/js/gallery.js'],
  },
  {
    file: 'reserve.html', active: 'reserve', bodyClass: 'page-reserve',
    title: `Reserve | ${NAME}`,
    description: `Enquire about a stay at Elysis. Write to ${site.email} or send your dates and the reservations desk replies within a day.`,
    content: reserveContent,
  },
  {
    file: 'careers.html', active: '', bodyClass: 'page-careers',
    title: `Careers | ${NAME}`,
    description: 'Seasonal and year-round roles at Elysis, Paros: front of house, kitchen, spa, residences and the bay.',
    content: careersContent, extraScripts: ['/js/careers.js'],
  },
  {
    file: 'apply.html', active: '', bodyClass: 'page-apply',
    title: `Apply | ${NAME}`,
    description: 'Apply to work at Elysis. One form, read by the people you would work beside.',
    content: applyContent, extraScripts: ['/js/apply.js'],
  },
  {
    file: 'admin.html', active: '', bodyClass: 'page-admin', bare: true, noindex: true,
    styles: ['/css/admin.css'],
    title: `The desk | ${NAME}`, description: 'Staff dashboard.',
    content: adminContent, extraScripts: ['/js/supabase-lite.js', '/js/admin.js'],
  },
  {
    file: '404.html', active: '', bodyClass: 'page-404', noindex: true,
    title: `Page not found | ${NAME}`, description: 'Page not found.',
    content: notFoundContent,
  },
];

/* A page for every residence and every experience, built at the same time. */
suites.forEach((s) => {
  pages.push({
    file: `suites/${s.id}.html`,
    active: 'suites',
    bodyClass: 'page-suite',
    title: `${s.name} | ${NAME}`,
    description: `${s.blurb} ${s.size}, sleeps ${s.sleeps}, from ${rate(s.rateFrom)} a night at Elysis, Paros.`,
    content: suiteProfile(s),
  });
});

experiences.forEach((e) => {
  pages.push({
    file: `experiences/${e.id}.html`,
    active: 'experiences',
    bodyClass: 'page-experience',
    title: `${e.title} | ${NAME}`,
    description: `${e.summary} At Elysis, Paros.`,
    content: experienceProfile(e),
  });
});

module.exports = pages;
