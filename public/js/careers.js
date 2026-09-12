'use strict';

(function () {
  const E = window.ELYSIS; if (!E) return;
  const wrap = document.getElementById('roles');
  if (!wrap) return;
  const esc = E.esc;

  const FALLBACK = [
    { id: 'guest-relations', title: 'Guest Relations Manager', team: 'Front of house', location: 'Paros, live-in available', type: 'Seasonal, April to October', summary: 'Own the arrival and the whole stay for a house of eighteen residences.' },
    { id: 'sous-chef', title: 'Sous Chef, Thalassa', team: 'Kitchen', location: 'Paros, live-in available', type: 'Seasonal, April to October', summary: 'Run the charcoal and wood oven section on a menu rewritten every afternoon.' },
  ];

  const role = (r) => `
    <div class="role" data-reveal>
      <div>
        <span class="eyebrow">${esc(r.team)}</span>
        <h3>${esc(r.title)}</h3>
        <p>${esc(r.summary)}</p>
      </div>
      <div class="role-meta">${esc(r.location)}<br>${esc(r.type)}</div>
      <a class="btn ghost" href="/apply?role=${encodeURIComponent(r.id)}">Apply</a>
    </div>`;

  (async () => {
    let roles = FALLBACK;
    try { const d = await E.fetchJSON('/api/careers'); roles = d.roles || FALLBACK; } catch (e) { /* the two above stand */ }
    wrap.innerHTML = roles.map(role).join('');
    E.observeReveals();
  })();
})();
