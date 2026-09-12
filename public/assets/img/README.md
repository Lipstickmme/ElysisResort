# Photography drop

Every image on the site is drawn from a placeholder in `../placeholder/` until a
real photograph exists. To swap one in, drop a file here named after the slot
that wants it. Nothing else needs changing: the next `npm run build` picks it up.

Matching is case-insensitive and any of `.webp .avif .jpg .jpeg .png .svg`
works, with `.webp` preferred when several are present.

| What                       | Names it looks for, best first                       |
| -------------------------- | ---------------------------------------------------- |
| Home hero (three slides)   | `elysis-hero-1`, `elysis-hero-2`, `elysis-hero-3`     |
| Landing sections           | `elysis-story`, `elysis-suites`, `elysis-experiences`, `elysis-dining`, `elysis-gallery`, `elysis-reserve` |
| Page headers               | `elysis-suites-header`, `elysis-experiences-header`, `elysis-dining-header`, `elysis-gallery-header`, `elysis-reserve-header`, `elysis-careers-header` |
| Any of the above, fallback | `elysis1` ... `elysis8`                               |
| A residence                | `suite-<id>` / `villa-<id>` / `residence-<id>`, e.g. `suite-aegean-loft.webp` |
| An experience              | `experience-<id>`, e.g. `experience-bonfire.webp`     |
| A restaurant or bar        | `dining-<id>`, e.g. `dining-thalassa.webp`            |
| A gallery frame            | `gallery-<id>`, e.g. `gallery-bonfire.webp`           |

The exact list each slot accepts is in `src/data/images.json` (page furniture)
and in the `prefer` array on each entry of `src/data/suites.json`,
`experiences.json`, `dining.json` and `gallery.json`.

The build log says which real photographs it found, so a deploy still running on
placeholders is obvious from the log rather than from the page.
