'use strict';

/* The chip filters on the residences, experiences and gallery pages.
   Everything is already in the page; this only hides what does not match, so
   the pages work with no JavaScript at all. */
(function () {
  const E = window.ELYSIS; if (!E) return;

  const grids = [
    { bar: '#suite-filters', grid: '#suite-grid', item: '.s-card', attr: 'collection' },
    { bar: '#experience-filters', grid: '#experience-grid', item: '.e-card', attr: 'category' },
    { bar: '#gallery-filters', grid: '#gallery-grid', item: '.g-item', attr: 'category' },
  ];

  grids.forEach(({ bar, grid, item, attr }) => {
    const barEl = document.querySelector(bar);
    const gridEl = document.querySelector(grid);
    if (!barEl || !gridEl) return;
    const items = E.$$(item, gridEl);

    barEl.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      E.$$('.chip', barEl).forEach((c) => c.classList.toggle('is-on', c === chip));
      const want = chip.dataset.filter;
      items.forEach((el) => {
        const match = want === 'All' || el.dataset[attr] === want;
        el.classList.toggle('is-hidden', !match);
        el.hidden = !match;
      });
      // Whatever has just been shown should animate in rather than appear.
      E.observeReveals();
    });
  });
})();
