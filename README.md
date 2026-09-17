# Elysis Luxury Resort

The website for an eighteen residence resort on Paros, and the desk behind it:
reservation enquiries, a concierge chat, job applications and a shared mailbox,
all in one dashboard at `/admin`.

Every page is built as static HTML, so a residence is a real page with its own
URL, its own title and its own text. The same content is served as JSON from
`/api/*` for anything else that wants it.

## Stack

- **Node + Express** for the API and local page serving. One dependency.
- **Static HTML**, built from `src/data/*.json` by `npm run build`.
- **Supabase** (Postgres + auth + realtime) for everything a visitor sends.
- **Resend** for outbound notifications and for the inbound mailbox.
- **Vercel** for hosting: the pages go to the CDN, `/api/*` to one function.

No framework, no bundler, no CSS library. `npm install && npm start` is the
whole setup.

## Pages

| URL                     | What it is                                                        |
| ----------------------- | ----------------------------------------------------------------- |
| `/`                     | The landing page: the house, the residences, the table, the days   |
| `/suites`               | All eighteen residences, filterable by collection                  |
| `/suites/<id>`          | One residence in full: pictures, plan, amenities, rate, enquiry    |
| `/experiences`          | The beach, the pool, the spa, the fire, the boat, the rest         |
| `/experiences/<id>`     | One experience in full                                             |
| `/dining`               | The four kitchens and bars, and private dining                     |
| `/gallery`              | The picture grid, filterable, with a lightbox                      |
| `/reserve`              | The reservation enquiry form, and how to get here                  |
| `/careers`, `/apply`    | Open roles and the application form                                |
| `/admin`                | The desk. Staff only, behind Supabase auth                         |
| `/contact`              | Redirects to `/reserve`, for old links                             |

`/suites/<id>` and `/experiences/<id>` are files on disk, one per entry in
`src/data/suites.json` and `src/data/experiences.json`, written by the build.
Adding a residence to that JSON adds its card, its page and its API route.

## The landing page

Seven chapters, each with its own photograph and its own marker on the rail at
the right:

1. **The house** — what the place is, and the four facts that matter.
2. **Residences** — three of the eighteen, and a link to the rest.
3. **The table** — the four kitchens.
4. **The days** — six experiences.
5. **Your host** — the general manager, and a word from them.
6. **Gallery** — six frames, and a link to the grid.
7. **Reserve** — the same form as `/reserve`, reaching the same desk.

## Reservations

The form on `/reserve` and the one on the landing page both POST to
`/api/reservations`. An enquiry carries a name, an email, an optional telephone,
arrival and departure dates, the party, and the residence asked for. A residence
page links to `/reserve?suite=<id>`, and the form arrives with it selected.

It is an enquiry, not a booking: nothing is charged and no inventory is held.
The desk replies with availability and a rate.

Enquiries are written to `enquiries` in Supabase and raised by email through
Resend. Both are best effort and independent, so a mail outage cannot lose a
booking and a database outage still reaches the desk.

The stay has its own columns (`arrival`, `departure`, `nights`, `adults`,
`children`, `suite_id`, `phone`) from `supabase/migrations/0003_reservations.sql`.
A database that has not run it yet still takes bookings: the write falls back to
the columns every version of the schema has, and the dates are repeated in the
message body so nothing is lost either way.

## Concierge chat

The widget in the corner is the same live chat the desk answers under
**Concierge** at `/admin`.

- The browser signs in to Supabase anonymously and writes its own rows, so a
  guest can only ever read their own thread (row level security, not a token
  scheme of ours).
- Replies stream back over Supabase realtime, with no polling.
- Until someone at the desk picks the thread up, a small rule-based responder
  answers: rates, availability, dining, the spa, the boat, getting here. It
  steps aside the moment a human replies (`handled_by_agent`).
- If the browser cannot reach Supabase at all, the widget posts to
  `/api/chat/message` instead and the server writes both sides. The chat works
  either way; `test/fallback.test.js` holds it to that.

## The desk

`/admin` is a bare page, staff only, gated by Supabase auth and the `admins`
table. Five tabs:

- **Reservations** — every enquiry, with the residence, the stay and the party.
- **Applications** — job applications, and the role each names.
- **Concierge** — the live chat, read and answered.
- **Email** — the shared mailbox: inbound mail archived, replies threaded.
- **Settings** — the resort's address, email, telephone and desk hours. A change
  here reaches every page on its next load, with no rebuild and no deploy.

## Project structure

```
server.js                  HTTP entry point, graceful shutdown
src/
  app.js                   Express app: middleware, API, pages, 404
  api-app.js               API-only app, for the Vercel function
  content.js               All content, with every image slot resolved
  controllers/             suites, experiences, dining, gallery, resort,
                           reservations, applications, chat, emails, inbound,
                           site, system
  data/                    The resort, as JSON
    suites.json            18 residences, with prose, facts and amenities
    experiences.json       11 experiences
    dining.json            5 kitchens and bars
    gallery.json           The picture grid
    resort.json            The story, the facts, how to arrive
    site.json              Address, email, telephone, desk hours
    images.json            Page-level image slots
    careers.json           Open roles
    leadership.json        The host
  middleware/              Rate limiting, error handling
  routes/                  One router per feature, mounted under /api
  site/
    layout.js              Head, nav, footer, concierge, reservation form
    pages.js               Every page, as data
    images.js              Resolves image slots against supplied photography
  utils/                   Supabase client, storage, chat store, notify,
                           config, admin auth, webhook signatures
public/                    Built pages and everything the browser loads
  suites/, experiences/    One built page per entry
  assets/brand/            The Elysis mark and wordmark
  assets/img/              Where real photography goes (see its README)
  assets/placeholder/      Stand-in artwork, drawn by a script
  css/, js/
scripts/
  build-pages.js           Builds every page. `npm run build`
  make-placeholders.js     Draws the stand-in artwork. `npm run placeholders`
  make-brand-icons.js      Draws the favicons. `npm run icons`
  check-vercel-upload.js   Proves the deploy would still build
supabase/migrations/       0001 schema, 0002 mailbox, 0003 reservations
test/                      API, browser and fallback suites
```

## API

Content, all public:

| Method | Route                     | What                                        |
| ------ | ------------------------- | ------------------------------------------- |
| GET    | `/api/suites`             | The residences (`?collection=Villas`)       |
| GET    | `/api/suites/:id`         | One residence, plus the next one            |
| GET    | `/api/experiences`        | Experiences (`?category=Water`)             |
| GET    | `/api/experiences/:id`    | One experience                              |
| GET    | `/api/dining`             | The kitchens and bars                       |
| GET    | `/api/dining/:id`         | One venue                                   |
| GET    | `/api/gallery`            | The picture grid and its categories         |
| GET    | `/api/resort`             | The story, the facts, how to arrive         |
| GET    | `/api/site`               | Address, email, telephone, hours            |
| GET    | `/api/careers`            | Open roles                                  |

What visitors send:

| Method | Route                  | What                                           |
| ------ | ---------------------- | ---------------------------------------------- |
| POST   | `/api/reservations`    | A reservation enquiry (`/api/contact` also)    |
| POST   | `/api/applications`    | A job application                              |
| POST   | `/api/chat/message`    | A chat message, server-side path               |
| POST   | `/api/chat/notify`     | Ask the server for the holding reply           |
| GET    | `/api/chat/:sessionId` | A thread's history                             |
| POST   | `/api/emails/reply`    | Reply to a mail thread (admin session)         |
| POST   | `/api/inbound/resend`  | Resend inbound webhook, signature checked      |

Diagnostics:

| Method | Route                  | What                                           |
| ------ | ---------------------- | ---------------------------------------------- |
| GET    | `/api/health`          | What the server can see, and what it cannot    |
| GET    | `/api/health?probe=1`  | The same, plus a live schema check             |
| GET    | `/api/public-config`   | What the browser needs, never a secret         |

## Getting started

```bash
npm install
npm start          # builds the pages, then serves on http://localhost:3000
npm run dev        # the same, with a watcher
npm run build      # just rebuild the pages
npm test           # the API suite, against a strict Supabase stand-in
npm run test:browser   # the full browser suite (needs playwright-core)
```

Without a `.env` the site runs entirely on its own: pages are built from the
JSON, enquiries are written to `data/submissions.json`, and the chat falls back
to the server-side path. Copy `.env.example` to `.env` to connect Supabase and
Resend.

## Images

Twenty photographs are in `public/assets/img/`, covering the whole landing page,
every page header, the gallery, twelve of the eighteen residences, two of the
five kitchens and two experiences. Every other slot falls back to drawn artwork
from `scripts/make-placeholders.js`, so nothing is ever broken or blank.

- `npm run photos` prints what is photographed and the exact file name each
  empty slot is waiting for. The list is generated from the content.
- `npm run optimise` writes the WebP copies the site actually serves (the
  supplied photographs: 24 MB as PNG, 1.9 MB as WebP).
- Adding one is a file drop: name it after the slot and rebuild. See
  `public/assets/img/README.md`.

Floor plans are drawn on purpose. Extra gallery frames are optional: a file
named `<slot>-2`, `-3` or `-4` beside a hero opens a gallery band on that page
by itself.

## Configuration

Everything is read from the environment; see `.env.example` for the full list
and what each one does.

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — the
  database, auth and realtime. Several alternative names are accepted, because
  different Supabase integrations inject different ones.
- `RESEND_API_KEY`, `FORM_TO`, `FORM_FROM`, `MAILBOX_ADDRESS`,
  `RESEND_WEBHOOK_SECRET`, `FORWARD_TO` — outbound notifications and the
  inbound mailbox.
- `HOUSE_NAME` — the name beside the address on mail sent from the desk.
- `CHAT_NOTIFY`, `NOTIFY_WEBHOOK_URL`, `RATE_LIMIT_*`, `DATA_DIR`, `PORT`.

`/api/health` reports which of these the running deployment can actually see,
and names the environment variables that would satisfy anything missing.

## Deploying

See `docs/DEPLOYMENT.md` for the full walk-through: fork, deploy, add Supabase,
run the migrations, grant yourself the desk, and point a mailbox at the site.
