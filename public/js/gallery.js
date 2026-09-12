'use strict';

/* The gallery lightbox. Keyboard as well as click, because a gallery that
   cannot be arrowed through is a gallery nobody looks past the third frame of. */
(function () {
  const E = window.ELYSIS; if (!E) return;
  const box = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  const cap = document.getElementById('lightbox-cap');
  if (!box || !img) return;

  const figures = E.$$('#gallery-grid .g-item');
  let i = 0;

  const visible = () => figures.filter((f) => !f.hidden);

  function show(index) {
    const list = visible();
    if (!list.length) return;
    i = (index + list.length) % list.length;
    const fig = list[i];
    const source = fig.querySelector('img');
    img.src = source.src;
    img.alt = source.alt;
    cap.textContent = source.alt;
    box.hidden = false;
    document.body.classList.add('nav-open');
  }

  function close() {
    box.hidden = true;
    document.body.classList.remove('nav-open');
  }

  figures.forEach((fig) => {
    fig.addEventListener('click', () => show(visible().indexOf(fig)));
  });

  document.getElementById('lightbox-close').addEventListener('click', close);
  document.getElementById('lightbox-prev').addEventListener('click', () => show(i - 1));
  document.getElementById('lightbox-next').addEventListener('click', () => show(i + 1));
  box.addEventListener('click', (e) => { if (e.target === box) close(); });

  document.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') show(i + 1);
    if (e.key === 'ArrowLeft') show(i - 1);
  });
})();
