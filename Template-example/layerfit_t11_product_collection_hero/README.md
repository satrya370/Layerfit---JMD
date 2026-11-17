# T11 — Product Collection Hero

HTML/CSS composition based on the hierarchy of the user-supplied Glow Theory image: brand/tagline, large red two-line headline, supporting copy/primary CTA, a three-item collection with unequal scale/rotation, and a two-part bottom banner. Not a screenshot background. No competitor logo, hands, price, rating, URL or decorative stars are copied as defaults. Demo product PNGs are original synthetic shapes, NOT the reference photography or real product assets.

## Files and rendering

`index.html`, `styles.css`, `script.js`, `creative.example.json`, `render.mjs`, bundled Inter fonts and raster assets. `styles.css` is copied verbatim from the engine module's stylesheet. Previews at 1080×1080, 1080×1350, 1080×1920.

```powershell
# npm install is only needed outside the Layerfit-JMD development checkout
$env:PUPPETEER_SKIP_DOWNLOAD='true'
npm.cmd install
$env:CHROMIUM_EXECUTABLE_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'
npm.cmd run render
```

Open `index.html` or call `await window.setCreative(data)`. Supports brand/logo/tagline, headline (`\n` for up to three lines), description, ctaPrimary/ctaBottom, productName/productImages, optional benefits/website/price/originalPrice/discount, colors `{primary,secondary,accent}`, fontFamily (`inter`), format (square/portrait/story/vertical), locale. `destinationLabel` is a text alternative to a website; no URL is invented. Optional absent fields are omitted. One/two/three images are laid out without duplicating inputs; product object-fit is always contain. PNG transparency is recommended, not automatically manufactured.

Only relative raster paths under `assets/` or embedded PNG/JPEG/WebP are allowed. No remote fetching, SVG URL or user HTML/CSS. Text uses textContent. Color values and font names are allowlisted. Standalone prices/features must come from verified user information: the browser API validates shape, not factual truth. Do not use demo claims or synthetic pictures in real ads.

## Engine integration

`templates/part01/src/product-collection-hero.ts` exports `templateModule`, id `product-collection-hero`, version `0.1.0`. Engine config references asset IDs and verified description/benefit/offer fact IDs, not data URLs or arbitrary raw price fields. `scripts/render-product-collection.ts` registers it in the real engine harness, renders 9 placements (3 images / 1 shirt / 2 distinct images × 3 formats), decodes PNG/JPG and writes diagnostics. No AI invoked. Module source ZIP requires the existing engine checkout at its current relative location; this standalone folder can run separately after npm install.

## Limits

Actual clean product/hand photos from the supplied reference were not available: no identical-photography claim. Only the composition is reconstructed. Story uses engine baseline 250 px top / 350 px bottom safe margins. Arbitrary long/new copy can fail fitting/overflow checks and needs review; no all-content guarantee. Domain facts/ownership/offer expiry, real brand approval, app registry, JMD and production deployment are not implemented by this package.
