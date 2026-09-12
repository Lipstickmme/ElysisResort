'use strict';

/**
 * Express application factory / configuration.
 * Assembles middleware, API routes, static hosting and error handling.
 */

const fs = require('fs');
const path = require('path');
const express = require('express');

const rateLimiter = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const apiRoutes = require('./routes');

const app = express();

// Trust proxy so client IPs are accurate behind a reverse proxy / load balancer.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Body parsing (built-in, no extra deps).
// `verify` stashes the exact bytes so webhook signatures can be checked.
app.use(express.json({ limit: '1mb', verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));

// Lightweight security headers (dependency-free).
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Simple request logging.
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[elysis] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// API namespace (rate limited).
// Signed provider webhooks: verified by signature, not rate limited.
app.use('/api/inbound', require('./routes/inbound'));

app.use('/api', rateLimiter, apiRoutes);

// Static frontend.
const publicDir = path.join(__dirname, '..', 'public');
app.use(
  express.static(publicDir, {
    extensions: ['html'],
    // The page routes below decide what /suites means, not a directory listing
    // redirect: public/suites/ is a folder of profiles and public/suites.html
    // is the index of them.
    redirect: false,
    setHeaders(res, filePath) {
      // Long cache for static media (hero artwork, marks); versioned per deploy.
      if (/\.(webp|png|jpg|jpeg|svg|mp4|woff2?)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      }
    },
  })
);

// Clean-URL page routes. Each maps to a pre-built static HTML page.
const sendPage = (file) => (req, res) => res.sendFile(path.join(publicDir, file));

/**
 * A residence, an experience or any other profile built as its own file.
 *
 * Every profile is a real page on disk (built by scripts/build-pages.js), so the
 * id is only ever used to find a file that the build already wrote. Anything
 * that is not a plain slug, or has no page, falls through to the 404.
 */
const sendProfile = (dir, fallback) => (req, res, next) => {
  const id = String(req.params.id || '');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) return next();
  const file = path.join(publicDir, dir, `${id}.html`);
  if (!fs.existsSync(file)) {
    if (fallback) return res.status(404).sendFile(path.join(publicDir, fallback));
    return next();
  }
  return res.sendFile(file);
};

app.get('/', sendPage('index.html'));
app.get('/suites', sendPage('suites.html'));
app.get('/suites/:id', sendProfile('suites', '404.html'));
app.get('/experiences', sendPage('experiences.html'));
app.get('/experiences/:id', sendProfile('experiences', '404.html'));
app.get('/dining', sendPage('dining.html'));
app.get('/gallery', sendPage('gallery.html'));
app.get('/reserve', sendPage('reserve.html'));
// The page this used to be called. Guests who bookmarked it still arrive.
app.get('/contact', (req, res) => res.redirect(301, '/reserve'));
app.get('/careers', sendPage('careers.html'));
app.get('/apply', sendPage('apply.html'));
// Staff dashboard. Access is decided by Supabase auth on the page itself.
app.get('/admin', sendPage('admin.html'));

// Unknown non-API, non-asset GET routes get the styled 404 page.
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  // Anything that looks like a file (has an extension) was not found by
  // express.static above, so let it 404 rather than returning HTML.
  if (path.extname(req.path)) return next();
  res.status(404).sendFile(path.join(publicDir, '404.html'));
});

// 404 + centralized error handling.
app.use(notFound);
app.use(errorHandler);

module.exports = app;
