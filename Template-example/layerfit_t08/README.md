# LayerFit T08 — Photo Overlay

One photo, one big headline, one button. A Meta ad (Facebook/Instagram) template in three formats: square 1080×1080, portrait 1080×1350, story 1080×1920.

- Photo that may be cropped (`allowCrop: true`): fills the canvas under a dark scrim, text at the bottom.
- Photo that must stay whole (default): sits on a flat color field, text on a solid panel in the primary color.
- Three text levels: headline (`[[key words]]` get a flat accent marker), one support line (description and/or up to three benefits), one CTA. Optional `offer` tag.
- No cards, shadows or decorative gradients (the scrim is the only gradient).

## Use

```bash
npm install                      # PUPPETEER_SKIP_DOWNLOAD=1 if you use an installed Chrome
set PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
node render.mjs                  # creative.example.json -> previews/
node render.mjs my-data.json     # your data -> previews/custom/
```

In a browser: open `index.html` and call `window.setCreative(data)`.

```js
window.setCreative({
  brand, logoUrl, headline, description, cta, imageUrl, imageAlt,
  features: [],                  // max 3, shown only if present
  colors: { primary, secondary, accent },
  format: 'square' | 'portrait' | 'story',
  // extras: fonts { heading, body }, offer, allowCrop
});
```

Text goes in with `textContent` only. Missing data means the element is not rendered; nothing is invented. `offer` must be verified product data. `window.creativeWarnings` lists length and contrast problems (budgets: headline 56, description 90, feature 28, brand 24 characters).

`render.mjs` blocks all network requests, waits for fonts and images, checks that text stays inside the safe area and does not overflow, shrinks the headline in bounded steps if needed, and checks PNG size and that the image is not blank. Exit code 0 only if every output passes.

## Engine

The same design is the engine module `photo-overlay@0.1.0` (`src/templates/part02/photo-overlay/` in the engine repository). `styles.css` here is a token header plus the engine CSS verbatim; a test in the engine repository fails if they drift.

## Honest notes

- Research was vendor blogs, directional only; no Dutch ad reference was verified (Meta Ad Library unreachable). No performance claim is made: A/B test it.
- `assets/demo-photo.png` is a cropped copy of a photo from `layerfit_t05/assets` (provenance unknown). Preview only; replace it before any use. The example copy is fictional demo text, not product facts.
- Safe areas are a conservative baseline (top 250 px and bottom 350 px in story), not a guarantee for every placement.
- Fonts (Inter, Fraunces, Montserrat, Poppins) are bundled OFL fonts, not brand fonts. Chromium only.
