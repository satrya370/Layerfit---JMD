# LayerFit T05 — Split Composition

Reusable static Meta Ads creative. Inspired by split-layout / product-focused Dutch ecommerce advertisements (structure only; no competitor artwork reproduced). All text and UI elements are HTML/CSS, **not** a screenshot background.

## Structure

- `index.html` — canvas markup and content slots
- `styles.css` — square, portrait and story layouts
- `script.js` — `window.setCreative()` injection API
- `assets/demo-product.png` — demo crop from a reference image **supplied by the user**, **not** a LayerFit product image; replace for any real campaign
- `previews/` — rendered demo exports
- `render.mjs` — optional Puppeteer batch renderer

## Formats

- `?format=square`: 1080×1080
- `?format=portrait`: 1080×1350
- `?format=story`: 1080×1920

Use Chromium screenshots at DPR=1. `render.mjs` screenshots all three sizes.

## Inject content

```js
window.setCreative({
  brand: 'MY BRAND',
  headline: 'KENNISMAKEN MET\\n[[PRODUCT A.]]',
  description: 'Verified product description only.',
  benefits: ['Only verified benefit'],
  cta: 'BEKIJK PRODUCT',
  imageUrl: '/uploads/product-a.png',
  format: 'square',
  colors: { panel:'#173028', accent:'#d5f86a', photoBg:'#e9e8e0', ink:'#182820' }
});
```

Use `[[...]]` for accent-highlighted words and `\n` for a deliberate line break.
`setCreative()` uses text nodes for all text to avoid executing user-supplied HTML.

### Rendering with Puppeteer

```bash
npm install
node render.mjs
```

By default Puppeteer downloads a compatible Chrome for Testing during `npm install`. If you already have Chromium installed, set `PUPPETEER_SKIP_DOWNLOAD=1` during install and `PUPPETEER_EXECUTABLE_PATH` before rendering (e.g. Windows Chrome path). Alternatively, adapt the renderer into the existing IG Content Builder Puppeteer workflow.

## Important constraints

- The sample artwork is illustrative; not an actual LayerFit product.
- Do not invent product reviews, prices, discounts, or features. All benefits are optional; empty benefits stay hidden.
- Export includes no social media UI overlay, but safe-area validation should be performed against intended Meta placement before production use.
- This is one layout concept supporting three formats, not three distinct concepts.

## V2 square correction

- Corrected `square` artboard balance and headline spacing; uses a short, reusable Dutch demo headline.
- Square preview is generated from the exact HTML/CSS/JS project (not an external image search).
- A missing photo produces a visible upload placeholder instead of a silently empty image block.
- Re-render all placements after changing template data.

`render.mjs` uses `page.setContent()` with inline CSS/JS and an embedded demo image, avoiding file:// blocking on locked-down browsers. It also checks artboard size, headline presence, and horizontal overflow.
