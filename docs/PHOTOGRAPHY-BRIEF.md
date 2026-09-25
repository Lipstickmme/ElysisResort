# Photography brief: the eight frames still missing

`npm run photos` lists what the site is still drawing rather than showing. This
is the shot list for those, written as prompts for an image model. Each one is
self-contained: paste it whole, no preamble needed.

## Using them

1. Generate at **2400 × 1350 or larger, 16:9 horizontal**. Every card and header
   on the site crops to 16:9, so anything squarer loses its top and bottom.
2. Save into `public/assets/img/` under the exact file name given with each
   prompt. `.png`, `.jpg` and `.webp` all work.
3. `npm run optimise` writes the WebP the site serves, then `npm run build`.
4. `npm run photos` should then report nothing outstanding.

## What makes these look real rather than like stock

Every prompt below already carries this, but if you rewrite one, keep it:

- **A real camera, named.** A body, a prime lens, an aperture, an ISO. Models
  respond to `35mm f/2, ISO 400` far better than to "professional photography".
- **Available light only.** No flash, no HDR, no fill. Let highlights blow a
  little and shadows go black; that is what a real frame does.
- **Film response.** Kodak Portra 400 or Gold 200 gives warm skin, soft roll-off
  and visible grain, which is most of the difference between a photograph and a
  render.
- **Somebody mid-action, rarely looking at the lens.** Turned away, half out of
  frame, hands busy.
- **One thing out of place.** A wet footprint, a chair pushed back, a used
  glass, a towel on the floor. Tidiness is what makes stock look like stock.
- **Cycladic materials.** Lime-washed walls, cedar shutters, granite, terracotta,
  linen, olive and bougainvillea. No coconut palms: this is Paros, not the
  Caribbean.

**Negative prompt** (paste with any of them if your tool has the field):

```
glossy stock photo, HDR, oversaturated, teal and orange grade, airbrushed skin,
plastic sheen, studio flash, perfect symmetry, centred hero composition, CGI, 3D
render, illustration, oversharpened, wide-angle distortion, watermark, text,
logo, coconut palms, tropical resort, empty perfection
```

---

## 1. Sunset Sailing — `experience-sailing`

> A twelve-metre white catamaran under sail off the coast of Paros in the
> Cyclades, photographed from the deck at about seven in the evening, the sun low
> and hard on the water. Two guests sit on the netting between the hulls with
> their backs to the camera, one with a wine glass wedged against the trampoline,
> a plate of mezze and a cold box beside them; the crew works a line in the
> background, out of focus. Sun flare across the frame, salt haze on the front
> element, the horizon not quite level. Shot on a Canon EOS R6 with a 35mm lens at
> f/2.8, 1/2000s, ISO 200, available light only, Kodak Portra 400 colour, fine
> grain, slightly blown highlights on the sail. Documentary travel photograph, not
> an advertisement.

## 2. Diving and Snorkelling — `experience-diving`

> An over-under split-level photograph at the mouth of a granite bay in the
> Cyclades: above the line, bare rock headland and a hard blue morning sky; below
> it, clear water four metres deep over granite boulders with an octopus tucked
> into a crevice and a snorkeller finning past in the middle distance, half in
> shadow. Real water, with particles and shafts of light, not aquarium-clean.
> Shot on a Sony A7 IV in an underwater housing, 20mm at f/8, 1/250s, ISO 400,
> natural light only, slight distortion of the dome port at the waterline, grain
> in the shadows, unretouched colour with green in the water rather than tropical
> turquoise.

## 3. Yoga and Movement — `experience-yoga`

> Seven o'clock on a timber deck built out over rock above a flat sea, Cyclades,
> Greece. Five people on mats in a loose, uneven row, mid-practice, none of them
> looking at the camera; one is adjusting her mat, another still has a jumper on
> against the early cool. Long low light raking across the boards, the deck
> visibly weathered, a folded towel and a water bottle at the edge of the frame.
> Shot from behind the group at deck height on a Canon EOS R6 with a 50mm lens at
> f/2, 1/1000s, ISO 320, sunrise light only, Kodak Gold 200 colour, warm cast,
> real shadows. Candid morning documentary, no posed alignment, no studio calm.

## 4. The Cooking School — `experience-cooking`

> An open-air garden kitchen at a small Greek resort at midday: six guests around
> a scarred wooden work table, hands in the food, a chef in a linen apron leaning
> in to show one of them something. Tomatoes, wild greens, a block of feta, olive
> oil in a tin, a bunch of oregano, scraps and peelings pushed to one end; a glass
> of white wine already poured beside someone's board. Dappled light through a
> pergola of vine, the table half in shade. Shot on a Fujifilm X-T5 with a 23mm
> lens at f/2.8, 1/500s, ISO 400, available light, Classic Chrome colour, fine
> grain, one hand slightly motion-blurred. Working kitchen, not a styled shoot.

## 5. The Wine Cellar — `experience-wine`

> A small stone cellar dug under a Greek island house, lit by two warm bulbs and
> nothing else. Four hundred bottles on raw timber racks down both walls,
> handwritten chalk labels, a low vaulted ceiling, condensation and dust. In the
> middle a plain wooden table set for a tasting: six glasses with different fills,
> an open Assyrtiko, bread and cheese on a board, a spit bucket, one chair pushed
> back. Nobody in frame or a single figure half out of it reaching for a bottle.
> Shot on a Sony A7 IV with a 35mm lens at f/1.8, 1/60s, ISO 3200, tungsten light
> only, visible grain and warm colour cast, deep unlifted shadows. Handheld, not
> tripod-perfect.

## 6. Island Excursions — `experience-excursions`

> A narrow whitewashed lane in a Cycladic mountain village on Paros in late
> afternoon: hand-painted stone joints underfoot, bougainvillea over a low arch,
> blue-painted shutters, a cat asleep on a step, laundry on a line. Two people
> walking away from the camera into the light, small in the frame, one carrying a
> paper bag from the market. Uneven walls, a cracked step, an electricity cable
> across the frame that a stock photographer would have removed. Shot on a Leica
> Q2 at 28mm, f/4, 1/500s, ISO 200, hard afternoon sun with deep shadow down one
> side, Kodak Gold colour, grain, slight vignetting. Reportage, not a postcard.

## 7. Little Elysis — `experience-kids`

> Four children between about five and ten crouched over a granite rock pool at
> the edge of a Greek bay, mid-morning, absorbed in what is in the water. One
> holds a plastic bucket, another is wet to the shorts; a young member of staff
> squats with them pointing at something, not looking at the camera. Driftwood and
> a half-built toy boat on the rock behind them. Hats, mismatched swimwear, real
> unbrushed hair. Shot from a low angle on a Canon EOS R6 with a 35mm lens at
> f/2.8, 1/1600s, ISO 200, hard sunlight, Portra 400 colour, motion blur in one
> child's hand, grain. Candid documentary, faces mostly turned away, nobody posed.

## 8. Ampeli, the sunset bar — `dining-ampeli`

> The west terrace of a small Cycladic resort at about eight in the evening, the
> sun just down and the sky still orange over the sea. A long lime-washed bar with
> a worn timber top, bottles of mastiha and tsipouro on open shelves behind it, a
> bartender mid-pour with his back half turned. In the foreground, over the
> shoulder, two negronis and a glass of Assyrtiko on the counter with condensation
> and a bowl of olives; a guest's hand resting beside one. Low warm lamps and
> candles, the pool and the sea dark below. Shot on a Sony A7 IV with a 50mm lens
> at f/1.4, 1/125s, ISO 1600, available light only, Portra 800 colour, visible
> grain, a little motion blur in the pour. Real evening bar, not a cocktail
> advertisement.

---

## If you want more than one frame of something

A file named `<slot>-2`, `-3` or `-4` beside the hero (say
`experience-sailing-2.webp`) is picked up automatically and opens a gallery band
on that page. Nothing demands them; the page simply gets richer when they exist.
For those, ask for the same scene from a different distance: one wide
establishing frame, one close detail (hands, a glass, a knot, a wet footprint).
