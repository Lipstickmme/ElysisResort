'use strict';

const assert = require('assert');
const http = require('http');
const { chromium } = require('playwright-core');
const mock = require('./mock-supabase');

const ROOT = require('path').join(__dirname, '..');

/** Poll a condition; the browser and the server settle at their own pace. */
async function until(check, what, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`timed out waiting for ${what}`);
}

(async () => {
  const sb = await mock.start({});
  const thread = {
    id: '44444444-3333-4222-8111-000000000000',
    created_at: new Date().toISOString(),
    last_message_at: new Date().toISOString(),
    subject: 'Private dining for twelve on the 14th',
    participant_email: 'guest@example.com',
    participant_name: 'Klara Weiss',
    status: 'new',
  };
  sb.db.email_threads.rows.push(thread);
  sb.db.email_messages.rows.push({
    id: 'e1', created_at: new Date().toISOString(), thread_id: thread.id, direction: 'inbound',
    from_email: 'guest@example.com', to_email: 'reservations@elysisresort.com',
    subject: thread.subject, body_text: 'Could you confirm the cellar table is free on the 14th, for twelve of us?',
    has_attachments: false,
  });
  const sbUrl = `http://127.0.0.1:${sb.address().port}`;
  sb.createUser('desk@elysisresort.com', 'desk-password', { admin: true });
  sb.createUser('nobody@elysisresort.com', 'outsider-password');

  process.env.SUPABASE_URL = sbUrl;
  process.env.SUPABASE_ANON_KEY = mock.ANON_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = mock.SERVICE_KEY;
  process.env.CHAT_NOTIFY = 'off';

  const app = require(ROOT + '/src/app');
  const site = await new Promise((r) => {
    const s = http.createServer(app).listen(0, '127.0.0.1', () => r(s));
  });
  const base = `http://127.0.0.1:${site.address().port}`;

  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });

  const log = [];
  const newPage = async (context) => {
    const page = await context.newPage();
    page.on('console', (m) => log.push(`[${m.type()}] ${m.text()}`));
    page.on('pageerror', (e) => log.push(`[pageerror] ${e.message}`));
    page.on('requestfailed', (r) => log.push(`[netfail] ${r.url()} ${r.failure() && r.failure().errorText}`));
    page.on('response', (r) => { if (r.status() >= 400) log.push(`[http${r.status()}] ${r.url()}`); });
    return page;
  };

  try {
    /* ---------------- visitor: chat writes its own rows ---------------- */
    const visitorCtx = await browser.newContext();
    const visitor = await newPage(visitorCtx);
    await visitor.goto(`${base}/reserve`, { waitUntil: 'networkidle' });

    await visitor.click('#chat-toggle');
    await visitor.fill('#chat-input', 'Is the Kyma Pool Suite free the second week of July?');
    await visitor.press('#chat-input', 'Enter');

    await visitor.waitForFunction(
      () => document.querySelectorAll('#chat-log .chat-msg.agent:not(.typing)').length >= 1,
      null,
      { timeout: 10000 }
    );

    await until(() => sb.db.chat_sessions.rows.length === 1, 'the browser to open a session');
    const session = sb.db.chat_sessions.rows[0];
    assert.ok(session.visitor_id, 'session carries the anonymous auth uid');
    const visitorRows = sb.db.chat_messages.rows.filter((r) => r.sender === 'visitor');
    assert.strictEqual(visitorRows.length, 1, 'visitor row written by the browser');
    assert.strictEqual(visitorRows[0].body, 'Is the Kyma Pool Suite free the second week of July?');
    // The holding reply is written by the server after the browser's own row,
    // so wait for it rather than assuming the two land together.
    await until(
      () => sb.db.chat_messages.rows.filter((r) => r.sender === 'agent').length === 1,
      'the server to write the holding reply'
    );
    console.log('  ok  visitor wrote their own row under an anonymous login');

    const drawn = await visitor.$$eval('#chat-log .chat-msg', (nodes) => nodes.map((n) => n.textContent));
    assert.ok(drawn.some((t) => t.includes('Kyma Pool Suite')), 'own message shown');
    assert.ok(drawn.length >= 2, 'reply shown: ' + JSON.stringify(drawn));
    console.log('  ok  the widget shows both sides');

    /* ---------------- staff: sign in and answer ---------------- */
    const staffCtx = await browser.newContext();
    const staff = await newPage(staffCtx);
    await staff.goto(`${base}/admin`, { waitUntil: 'networkidle' });
    await staff.waitForSelector('#admin-login:not([hidden])');

    // A wrong password is reported, not swallowed.
    await staff.fill('#login-email', 'desk@elysisresort.com');
    await staff.fill('#login-password', 'wrong');
    await staff.click('#login-btn');
    await staff.waitForFunction(() => document.getElementById('login-error').textContent.length > 0);
    console.log('  ok  bad credentials are reported:', await staff.textContent('#login-error'));

    // An account that is not on the admins list gets told why.
    await staff.fill('#login-email', 'nobody@elysisresort.com');
    await staff.fill('#login-password', 'outsider-password');
    await staff.click('#login-btn');
    await staff.waitForFunction(() =>
      /not on the admin list/.test(document.getElementById('login-note').textContent)
    );
    assert.ok(await staff.isVisible('#admin-login'), 'non-admin stays on the gate');
    console.log('  ok  a non-admin account is refused with an explanation');

    // The real account gets in.
    await staff.fill('#login-email', 'desk@elysisresort.com');
    await staff.fill('#login-password', 'desk-password');
    await staff.click('#login-btn');
    await staff.waitForSelector('#admin-shell:not([hidden])', { timeout: 10000 });
    assert.strictEqual(await staff.textContent('#admin-who'), 'desk@elysisresort.com');
    console.log('  ok  admin signed in');

    await staff.click('.admin-tab[data-tab="chat"]');
    await staff.waitForSelector('#chat-list .admin-row');
    await staff.click('#chat-list .admin-row');
    await staff.waitForSelector('#chat-detail .admin-thread .admin-bubble');
    const thread = await staff.$$eval('#chat-detail .admin-bubble p', (n) => n.map((x) => x.textContent));
    assert.ok(thread.some((t) => t.includes('Kyma Pool Suite')), 'staff sees the visitor message: ' + JSON.stringify(thread));
    console.log('  ok  staff can read the conversation');

    await staff.fill('#chat-detail .admin-reply textarea', 'Marina here. It is free from the 11th; shall I hold it for you?');
    await staff.click('#chat-detail .admin-reply button');
    await staff.waitForFunction(
      () => document.querySelectorAll('#chat-detail .admin-bubble.agent').length >= 2
    );
    const stored = sb.db.chat_messages.rows.filter((r) => r.sender === 'agent');
    assert.ok(stored.some((r) => r.body.includes('hold it for you')), 'reply written as an agent row');
    assert.strictEqual(sb.db.chat_sessions.rows[0].handled_by_agent, true, 'handover flag set');
    assert.strictEqual(sb.db.chat_sessions.rows[0].status, 'in_progress');
    console.log('  ok  staff reply is stored and marks the thread handed over');

    /* ---------------- the reply reaches the visitor ---------------- */
    await visitor.waitForFunction(
      () => Array.from(document.querySelectorAll('#chat-log .chat-msg')).some((n) => n.textContent.includes('hold it for you')),
      null,
      { timeout: 15000 }
    );
    console.log('  ok  the visitor sees the reply without reloading');

    // And the canned responder now stays out of it.
    const before = sb.db.chat_messages.rows.length;
    const drawnBefore = await visitor.$$eval('#chat-log .chat-msg', (n) => n.length);
    await visitor.fill('#chat-input', 'Yes please, hold it.');
    await visitor.press('#chat-input', 'Enter');
    await visitor.waitForFunction(
      (n) => document.querySelectorAll('#chat-log .chat-msg').length > n,
      drawnBefore,
      { timeout: 10000 }
    );
    await new Promise((r) => setTimeout(r, 2000));
    assert.strictEqual(sb.db.chat_messages.rows.length, before + 1, 'no bot reply after handover');
    console.log('  ok  no automatic reply once a human is on the thread');

    /* ---------------- enquiries tab ---------------- */
    await visitor.goto(`${base}/reserve?suite=kyma-pool-suite`, { waitUntil: 'networkidle' });
    await visitor.fill('#reserve-form-name', 'Ada Kolen');
    await visitor.fill('#reserve-form-email', 'ada@example.com');
    await visitor.fill('#reserve-form-arrival', '2026-07-11');
    await visitor.fill('#reserve-form-departure', '2026-07-18');
    await visitor.fill('#reserve-form-message', 'Our anniversary, and we would like the boat one evening.');
    assert.strictEqual(
      await visitor.inputValue('#reserve-form-suite'),
      'kyma-pool-suite',
      'a residence link carries the residence into the form'
    );
    await visitor.click('#reserve-form [data-submit]');
    await until(() => sb.db.enquiries.rows.length === 1, 'the enquiry to reach the database');
    assert.strictEqual(sb.db.enquiries.rows[0].service, 'Kyma Pool Suite', 'the residence is filed with it');
    assert.match(sb.db.enquiries.rows[0].message, /2026-07-11 to 2026-07-18/, 'so are the dates');

    // The same form on the landing page has to reach the same inbox.
    await visitor.goto(`${base}/`, { waitUntil: 'networkidle' });
    await visitor.fill('#home-reserve-form-name', 'Joris de Roo');
    await visitor.fill('#home-reserve-form-email', 'j.deroo@example.nl');
    await visitor.fill('#home-reserve-form-message', 'Four of us in September, two rooms, one with a pool.');
    await visitor.click('#home-reserve-form [data-submit]');
    await until(() => sb.db.enquiries.rows.length === 2, 'the landing-page enquiry to reach the database');
    assert.ok(
      sb.db.enquiries.rows.some((r) => r.email === 'j.deroo@example.nl'),
      'landing page enquiry stored'
    );
    console.log('  ok  both reservation forms write to the same inbox');

    await staff.click('.admin-tab[data-tab="enquiries"]');
    await staff.waitForFunction(
      () => document.querySelectorAll('#enquiry-list .admin-row').length === 2,
      null,
      { timeout: 15000 }
    );
    const desk = await staff.$$eval('#enquiry-list .admin-row-title', (n) => n.map((x) => x.textContent));
    assert.ok(desk.includes('Ada Kolen') && desk.includes('Joris de Roo'), JSON.stringify(desk));
    console.log('  ok  both enquiries show up on the desk:', desk.join(', '));

    await staff.click('#enquiry-list .admin-row');
    await staff.waitForSelector('#enquiry-detail .admin-message');
    await staff.selectOption('#enquiry-detail .admin-status select', 'closed');
    await staff.waitForFunction(() => document.querySelector('[data-tally="enquiries"]').textContent === '1');
    assert.strictEqual(sb.db.enquiries.rows.filter((r) => r.status === 'closed').length, 1);
    console.log('  ok  triage writes back');

    /* ---------------- apply: careers -> form -> desk ---------------- */
    await visitor.goto(`${base}/careers`, { waitUntil: 'networkidle' });
    await visitor.waitForSelector('#roles .role .btn');
    const applyHref = await visitor.getAttribute('#roles .role .btn', 'href');
    assert.match(applyHref, /^\/apply\?role=/, `apply link goes to the form, got ${applyHref}`);
    await Promise.all([
      visitor.waitForURL(/\/apply\?role=/, { timeout: 15000 }),
      visitor.click('#roles .role .btn'),
    ]);
    await visitor.waitForSelector('#apply-form');
    // The role list arrives from /api/careers, so wait for it rather than
    // reading the select before it is populated.
    await visitor.waitForFunction(() => {
      const sel = document.getElementById('apply-role');
      return sel && sel.options.length > 1 && sel.value !== '';
    }, null, { timeout: 15000 }).catch(async (err) => {
      const state = await visitor.evaluate(() => {
        const sel = document.getElementById('apply-role');
        return { url: location.href, options: sel ? sel.options.length : -1, value: sel ? sel.value : null };
      });
      throw new Error(`${err.message} | apply select state: ${JSON.stringify(state)}`);
    });
    const prefilled = await visitor.inputValue('#apply-role');
    assert.ok(prefilled, 'the role carries over from the careers page');
    assert.match(await visitor.textContent('#apply-role-title'), /\w/);
    console.log('  ok  the apply link opens the form with the role selected');

    await visitor.fill('#apply-name', 'Sanne Vermeer');
    await visitor.fill('#apply-email', 'sanne@example.nl');
    await visitor.fill('#apply-message', 'Six seasons on the line, the last two running fish over charcoal.');
    await visitor.click('#apply-submit');
    await until(() => sb.db.applications.rows.length === 1, 'the application to reach the database');
    assert.strictEqual(sb.db.applications.rows[0].email, 'sanne@example.nl');
    console.log('  ok  the application is stored with the role it names');

    await staff.click('.admin-tab[data-tab="applications"]');
    await staff.waitForSelector('#application-list .admin-row', { timeout: 15000 });
    await staff.click('#application-list .admin-row');
    await staff.waitForSelector('#application-detail .admin-message');
    assert.match(await staff.textContent('#application-detail .admin-message'), /running fish over charcoal/);
    console.log('  ok  the application shows up on the desk');

    /* ---------------- a poll must not type over you ---------------- */
    await staff.click('.admin-tab[data-tab="chat"]');
    await staff.waitForSelector('#chat-list .admin-row');
    await staff.click('#chat-list .admin-row');
    await staff.waitForSelector('#chat-detail .admin-reply textarea');
    await staff.click('#chat-detail .admin-reply textarea');
    await staff.type('#chat-detail .admin-reply textarea', 'Half a sentence that must survive');
    // The dashboard refreshes every 5s. Wait past one tick with focus held.
    await new Promise((r) => setTimeout(r, 7000));
    assert.strictEqual(
      await staff.inputValue('#chat-detail .admin-reply textarea'),
      'Half a sentence that must survive',
      'a chat reply must not be wiped by the refresh'
    );
    console.log('  ok  a half-typed chat reply survives the refresh');

    /* ---------------- contact details are editable from the desk ---------------- */
    await staff.click('.admin-tab[data-tab="settings"]');
    await staff.waitForSelector('#setting-email');

    // Clearing a field must leave it cleared, through a refresh tick.
    await staff.fill('#setting-address', '');
    await staff.click('#setting-address');
    await new Promise((r) => setTimeout(r, 7000));
    assert.strictEqual(
      await staff.inputValue('#setting-address'),
      '',
      'a cleared field must not refill itself'
    );
    console.log('  ok  a cleared settings field stays cleared');

    await staff.fill('#setting-address', 'Kolymbithres Bay, Naoussa, 844 01 Paros, Greece');
    await staff.fill('#setting-email', 'desk@elysisresort.com');
    await staff.fill('#setting-phone', '+30 2284 000 000');
    await staff.click('.admin-settings-form .btn');
    await until(
      () => sb.db.site_settings.rows[0].email === 'desk@elysisresort.com',
      'the desk to save the new contact details'
    );
    console.log('  ok  the desk saves new contact details');

    const reader2 = await newPage(visitorCtx);
    await reader2.goto(`${base}/reserve`, { waitUntil: 'networkidle' });
    await reader2.waitForFunction(
      () => document.querySelector('[data-site="email"]').textContent.trim() === 'desk@elysisresort.com',
      null,
      { timeout: 10000 }
    );
    const href = await reader2.getAttribute('a[data-site="email"]', 'href');
    assert.strictEqual(href, 'mailto:desk@elysisresort.com', 'the mailto follows the address');
    const phone = await reader2.textContent('[data-site="phone"]');
    assert.strictEqual(phone.trim(), '+30 2284 000 000');
    console.log('  ok  the change reaches the public pages with no rebuild');
    await reader2.close();

    /* ---------------- every reveal actually reveals ---------------- */
    const reader = await newPage(visitorCtx);
    for (const path of ['/', '/suites', '/experiences', '/dining', '/gallery', '/reserve', '/careers', '/suites/aegean-loft']) {
      await reader.goto(base + path, { waitUntil: 'networkidle' });
    await reader.evaluate(async () => {
      // Walk the page so every section enters the viewport at least once.
      // instant, not smooth: the page sets scroll-behavior: smooth, and a
      // smooth scroll cancels the one before it, so a walk in steps never
      // actually reaches the bottom.
      for (let y = 0; y < document.body.scrollHeight; y += Math.round(window.innerHeight * 0.6)) {
        window.scrollTo({ top: y, behavior: 'instant' });
        await new Promise((r) => setTimeout(r, 160));
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
    // The reveal is a transition, and the last section to be staged is still
    // mid-fade when the walk ends. Wait for the page to settle rather than
    // guessing at a sleep, which is flaky on a loaded machine.
    await until(
      () => reader.evaluate(() =>
        !Array.from(document.querySelectorAll('[data-reveal]'))
          .some((el) => getComputedStyle(el).opacity !== '1')),
      `every reveal on ${path} to finish fading in`,
      15000
    );
      const hidden = await reader.evaluate(() =>
        Array.from(document.querySelectorAll('[data-reveal]'))
          .filter((el) => getComputedStyle(el).opacity !== '1' || el.getBoundingClientRect().height === 0)
          .map((el) => `${el.tagName}.${el.className} "${(el.textContent || '').trim().slice(0, 30)}"`)
      );
      assert.deepStrictEqual(hidden, [], `every reveal on ${path} must end up visible`);
      console.log(`  ok  every reveal on ${path} ends up visible`);
    }
    await reader.close();

    /* ---------------- email tab ---------------- */
    await staff.click('.admin-tab[data-tab="email"]');
    await staff.waitForSelector('#email-list .admin-row', { timeout: 10000 });
    await staff.click('#email-list .admin-row');
    await staff.waitForSelector('#email-detail .admin-thread .admin-bubble');
    assert.match(await staff.textContent('#email-detail .admin-bubble p'), /cellar table is free on the 14th/);
    console.log('  ok  house mail reads as a thread');

    /* ---------------- no unexpected console errors ---------------- */
    const expected = [/fonts\.googleapis\.com/, /grant_type=password/, /favicon/];
    const bad = log
      .filter((line) => /^\[(error|pageerror|netfail|http)/.test(line))
      .filter((line) => !expected.some((re) => re.test(line)))
      // Chromium reports a bare "Failed to load resource" alongside the
      // detailed [http*]/[netfail] entry for the same request.
      .filter((line) => !/^\[error\] Failed to load resource/.test(line));
    assert.strictEqual(bad.length, 0, 'console clean, got:\n' + bad.join('\n'));
    const detailed = log.filter((l) => /^\[(netfail|http)/.test(l));
    console.log('  ok  no unexpected page errors (allowed:', detailed.length, 'known)');

    console.log('\nbrowser suite passed');
  } catch (err) {
    console.error('\nFAILED:', err.message);
    console.error('console log:\n' + log.join('\n'));
    process.exitCode = 1;
  } finally {
    await browser.close();
    site.close();
    sb.close();
  }
  process.exit(process.exitCode || 0);
})();
