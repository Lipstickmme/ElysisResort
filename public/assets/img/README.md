# Photography

This folder holds the resort's own photographs. Anything without one falls back
to the drawn artwork in `../placeholder/`, so the site is never broken for want
of a picture; a drawing is simply a slot that has not been shot yet.

`npm run photos` prints what is photographed, what is not, and the exact file
name each empty slot is waiting for. That list comes out of the content, so it
is never stale.

## Adding a photograph

1. Drop the file in here named after the slot (see `npm run photos`). Any of
   `.webp .avif .jpg .jpeg .png` works; matching ignores case.
2. `npm run optimise` writes a WebP copy beside it, resized to 2400px wide.
   The site prefers the WebP, so this is what visitors actually download: the
   twenty supplied photographs weigh 24 MB as PNG and 1.9 MB as WebP.
3. `npm run build`. The build log names every photograph it found.

## The names

| Slot | File |
| ---- | ---- |
| Home hero, three slides | `elysis-hero-1`, `elysis-hero-2`, `elysis-hero-3` |
| Landing sections | `elysis-story`, `elysis-suites`, `elysis-experiences`, `elysis-dining`, `elysis-gallery`, `elysis-reserve` |
| Page headers | `elysis-suites-header`, `elysis-experiences-header`, `elysis-dining-header`, `elysis-gallery-header`, `elysis-reserve-header`, `elysis-careers-header` |
| A residence | `suite-<id>`, `villa-<id>`, `residence-<id>`, `signature-<id>` |
| An experience | `experience-<id>` |
| A restaurant or bar | `dining-<id>` |
| A gallery frame | `gallery-<id>` |
| The host | `gm` |

The ids are the ones in `src/data/suites.json`, `experiences.json`,
`dining.json` and `gallery.json`, and each entry's `prefer` array is the
authority. A landing section or page header with no file of its own reuses one
of the supplied photographs, set in `src/data/images.json`.

## Extra frames are optional

`suite-kyma-2.webp`, `-3` and `-4` beside `suite-kyma.webp` are picked up
automatically and open a gallery band on that residence's page. Nothing demands
them: a residence with one photograph shows one photograph rather than three
stand-ins.

## Originals

The PNGs here are the supplied originals and are kept as the master copies. The
site serves the WebP beside them. Deleting a PNG is safe once its WebP exists.
