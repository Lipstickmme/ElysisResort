'use strict';

/* =========================================================================
   Elysis shared frontend.

   The pages are built as static HTML, so nothing here is needed to read the
   site: this adds the movement (nav, hero, reveals, the chapter rail), keeps
   the resort's contact details current, and wires the reservation form.
   Helpers are exposed on window.ELYSIS for the per-page scripts.
   ========================================================================= */

(function () {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  async function fetchJSON(url) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  /* Reveal on scroll (idempotent; safe to re-run after injecting content).
     Siblings inside one section arrive in sequence rather than all at once,
     which is the difference between a page that animates and one that lurches. */
  /* Anything the observer has not reached yet, so a fast scroll cannot leave a
     card invisible: the observer coalesces entries, and an element that enters
     and leaves the viewport between two deliveries is never reported. The
     scroll frame sweeps this list as a safety net. */
  let pendingReveals = [];

  function sweepReveals() {
    if (!pendingReveals.length) return;
    const limit = window.innerHeight * 0.94;
    pendingReveals = pendingReveals.filter((el) => {
      if (el.classList.contains('in')) return false;
      if (el.getBoundingClientRect().top > limit) return true;
      el.classList.add('in');
      return false;
    });
  }

  function observeReveals() {
    const els = $$('[data-reveal]:not(.in)');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'));
      return;
    }
    pendingReveals = els;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const section = el.closest('.chapter, section, header') || document.body;
        const peers = $$('[data-reveal]', section);
        const step = Math.min(peers.indexOf(el), 5);
        el.style.setProperty('--reveal-delay', (step * 80) + 'ms');
        el.classList.add('in');
        io.unobserve(el);
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -6% 0px' });
    els.forEach((el) => io.observe(el));
  }

  /* The resort's details ---------------------------------------------------
     Pages are built with the values in src/data/site.json, so the static HTML
     is already right. This only replaces them when the desk has changed them,
     which is what lets a new telephone number reach every page without a
     deploy. */
  const site = { email: '', phone: '', address: '', hours: '' };

  const telHref = (value) => 'tel:' + String(value).replace(/[^+\d]/g, '');

  function applySite(values) {
    Object.assign(site, values);
    $$('[data-site]').forEach((el) => {
      const key = el.getAttribute('data-site');
      const value = values[key];
      if (!value) return;
      el.textContent = value;
      if (el.tagName === 'A') {
        if (key === 'email') el.href = 'mailto:' + value;
        if (key === 'phone') el.href = telHref(value);
      }
    });
    // The telephone is optional: its row appears once there is one to show.
    $$('[data-site-row]').forEach((row) => {
      const key = row.getAttribute('data-site-row');
      const value = values[key];
      row.hidden = !value;
      if (!value) return;
      const target = row.querySelector('[data-site="' + key + '"]') || row;
      target.textContent = value;
      const link = row.tagName === 'A' ? row : row.querySelector('a');
      if (link && key === 'phone') link.href = telHref(value);
    });
  }

  async function hydrateSite() {
    // Seed from the page itself, so a message that quotes the address is right
    // even before the request comes back.
    $$('[data-site]').forEach((el) => {
      const key = el.getAttribute('data-site');
      if (!site[key]) site[key] = el.textContent.trim();
    });
    try {
      applySite(await fetchJSON('/api/site'));
    } catch (e) {
      /* the built-in values stand */
    }
  }

  window.ELYSIS = { $, $$, esc, fetchJSON, reduceMotion, observeReveals, site };

  /* Nav, scroll progress, underlay drift, chapter rail --------------------- */
  const nav = $('#nav');
  const progress = $('#progress');
  const underlay = $('.underlay-img');
  const chapters = $$('.hero[data-chapter], .chapter[data-chapter]');
  let railLinks = [];
  let ticking = false;

  const UNDERLAY_TRAVEL = 60;
  const MEDIA_TRAVEL = 70;
  const media = $$('.chapter-media');

  function frame() {
    ticking = false;
    sweepReveals();
    const doc = document.documentElement;
    const scrolled = doc.scrollTop || window.scrollY || 0;
    const pct = scrolled / (doc.scrollHeight - doc.clientHeight || 1);

    if (nav) nav.classList.toggle('scrolled', scrolled > 24);
    if (progress) progress.style.width = (pct * 100) + '%';
    if (underlay && !reduceMotion) {
      underlay.style.setProperty('--underlay-shift', (-UNDERLAY_TRAVEL * pct).toFixed(1) + 'px');
    }

    /* Section artwork drifts against its section, so the picture and the words
       are never travelling at the same speed. */
    if (!reduceMotion) {
      for (let i = 0; i < media.length; i += 1) {
        const layer = media[i];
        const box = layer.parentElement.getBoundingClientRect();
        if (box.bottom < -200 || box.top > window.innerHeight + 200) continue;
        const through = (window.innerHeight - box.top) / (window.innerHeight + box.height);
        layer.style.setProperty('--media-shift', ((through - 0.5) * MEDIA_TRAVEL).toFixed(1) + 'px');
      }
    }

    if (railLinks.length) {
      const middle = scrolled + window.innerHeight / 2;
      let active = 0;
      chapters.forEach((section, i) => {
        if (middle >= section.offsetTop) active = i;
      });
      railLinks.forEach((a, i) => a.classList.toggle('is-active', i === active));
    }
  }

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(frame);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  /* The rail is built from the sections themselves, so adding a chapter in
     src/site/pages.js adds its marker here with nothing else to update. */
  function buildRail() {
    const rail = $('#chapter-rail');
    if (!rail || !chapters.length) return;
    rail.innerHTML = chapters.map((section) => `
      <a href="#${esc(section.id)}" title="${esc(section.dataset.chapter)}">
        <span class="label">${esc(section.dataset.chapter)}</span>
        <span class="tick"></span>
      </a>`).join('');
    railLinks = $$('a', rail);
  }

  const toggle = $('#navtoggle');
  const links = $('#navlinks');
  if (toggle && links) {
    const setSheet = (open) => {
      links.classList.toggle('open', open);
      nav.classList.toggle('open-sheet', open);
      // The page behind a full-screen sheet must not scroll under it.
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    toggle.addEventListener('click', () => setSheet(!links.classList.contains('open')));
    $$('#navlinks a').forEach((a) => a.addEventListener('click', () => setSheet(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && links.classList.contains('open')) setSheet(false);
    });
  }

  /* Hero ------------------------------------------------------------------ */
  function setupSlides() {
    const wrap = $('#hero-slides');
    if (!wrap) return;
    const slides = $$('.slide', wrap);
    const dots = $$('#hero-dots .dot');
    if (slides.length <= 1) return;
    const DURATION = 7000;
    let idx = 0;
    let timer = null;
    const go = (n) => {
      idx = (n + slides.length) % slides.length;
      slides.forEach((s, i) => s.classList.toggle('is-active', i === idx));
      dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
    };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const start = () => { stop(); if (!reduceMotion) timer = setInterval(() => go(idx + 1), DURATION); };
    dots.forEach((d) => d.addEventListener('click', () => { go(Number(d.dataset.slide)); start(); }));
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    start();
  }

  /* Reservation enquiry ---------------------------------------------------
     Every form on the site posts to the same endpoint, so every enquiry lands
     in the same place and appears under Reservations at /admin. */

  const today = () => new Date().toISOString().slice(0, 10);

  function setupForms() {
    $$('[data-reserve-form]').forEach(setupForm);
  }

  function setupForm(form) {
    if (!form || form.dataset.wired) return;
    form.dataset.wired = '1';
    const statusEl = $('[data-form-status]', form);
    const btn = $('[data-submit]', form);
    // `form.elements.namedItem` rather than `form.name`, which is the form's
    // own name attribute and would shadow the field of the same name.
    const field = (n) => form.elements.namedItem(n);
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Nobody arrives yesterday, and a departure is never before an arrival.
    const arrival = field('arrival');
    const departure = field('departure');
    if (arrival) arrival.min = today();
    if (departure) departure.min = today();
    if (arrival && departure) {
      arrival.addEventListener('change', () => {
        departure.min = arrival.value || today();
        if (departure.value && departure.value <= arrival.value) departure.value = '';
      });
    }

    // A residence page links here with the residence already chosen.
    const chosen = new URLSearchParams(location.search).get('suite');
    const select = $('[data-suite-select]', form);
    if (chosen && select && Array.from(select.options).some((o) => o.value === chosen)) {
      select.value = chosen;
    }

    const setErr = (name, msg) => {
      const errEl = form.querySelector(`[data-err="${name}"]`);
      const wrap = errEl ? errEl.closest('.field') : null;
      if (errEl) errEl.textContent = msg || '';
      if (wrap) wrap.classList.toggle('invalid', !!msg);
    };

    const validate = () => {
      let ok = true;
      const name = field('name').value.trim();
      const email = field('email').value.trim();
      const message = field('message').value.trim();
      if (name.length < 2) { setErr('name', 'Please tell us your name.'); ok = false; } else setErr('name', '');
      if (!EMAIL_RE.test(email)) { setErr('email', 'Enter a valid email address.'); ok = false; } else setErr('email', '');
      if (message.length < 10) { setErr('message', 'A line or two about the stay, please.'); ok = false; } else setErr('message', '');
      if (arrival && departure && arrival.value && departure.value && departure.value <= arrival.value) {
        setErr('departure', 'Departure needs to be after arrival.'); ok = false;
      } else setErr('departure', '');
      return ok;
    };

    ['name', 'email', 'message'].forEach((n) => {
      const el = field(n);
      if (!el) return;
      el.addEventListener('blur', validate);
      el.addEventListener('input', () => {
        const errEl = form.querySelector(`[data-err="${n}"]`);
        if (errEl && errEl.textContent) validate();
      });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      statusEl.className = 'form-status';
      if (!validate()) {
        statusEl.className = 'form-status bad';
        statusEl.textContent = 'Please correct the highlighted fields.';
        return;
      }
      const value = (n) => (field(n) ? field(n).value : '');
      const payload = {
        name: value('name').trim(),
        email: value('email').trim(),
        phone: value('phone').trim(),
        arrival: value('arrival'),
        departure: value('departure'),
        adults: value('adults'),
        children: value('children'),
        suite: value('suite'),
        message: value('message').trim(),
        website: value('website'),
      };
      btn.disabled = true;
      const original = btn.textContent;
      btn.textContent = 'Sending';
      try {
        const res = await fetch('/api/reservations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          form.reset();
          statusEl.className = 'form-status ok';
          statusEl.textContent = data.message || 'Thank you. Your enquiry is with the reservations desk.';
        } else if (res.status === 422 && data.fields) {
          Object.entries(data.fields).forEach(([k, v]) => setErr(k, v));
          statusEl.className = 'form-status bad';
          statusEl.textContent = 'Please correct the highlighted fields.';
        } else if (res.status === 429) {
          statusEl.className = 'form-status bad';
          statusEl.textContent = 'Too many attempts. Please wait a moment and try again.';
        } else {
          statusEl.className = 'form-status bad';
          statusEl.textContent = data.message || `Something went wrong. Please write to ${site.email}.`;
        }
      } catch (err) {
        statusEl.className = 'form-status bad';
        statusEl.textContent = `Network error. Please write to ${site.email}.`;
      } finally {
        btn.disabled = false;
        btn.textContent = original;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    hydrateSite();
    buildRail();
    setupSlides();
    setupForms();
    observeReveals();
    frame();
  });
})();
