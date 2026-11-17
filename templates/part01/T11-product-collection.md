# T11 — Product Collection Hero

## Outcome

Built from the composition of the user-attached Glow Theory screenshot, not from an HTML source and not a screenshot background. Reproduced the top-left brand/right tagline, large red centered two-line headline, supporting text and primary pill CTA, three unequal-size/tilted products and two-part bottom banner. Hands and original products were unavailable as clean assets, so previews use original synthetic PNGs. No false price, URL or competitor brand was made a default. No decorative stars or animations.

- Engine module: `src/product-collection-hero.ts`, `src/product-collection-hero.css`.
- ID/version: `product-collection-hero@0.1.0`; formats square/portrait/vertical.
- Standalone HTML/CSS/JS: `../../Template-example/layerfit_t11_product_collection_hero/`.
- Preview/report folder: `artifacts/t11-product-collection/`.
- Delivery ZIP: `../../Template-example/layerfit_t11_product_collection_hero.zip`.

## Reproduce

From `templates/part01/`:

```powershell
npm.cmd run typecheck
npm.cmd test
$env:CHROMIUM_EXECUTABLE_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npx.cmd tsx scripts/render-product-collection.ts
npx.cmd tsx scripts/export-product-collection.ts
node ../../Template-example/layerfit_t11_product_collection_hero/render.mjs
```

Standalone `window.setCreative` accepts user-friendly fields (see its README). Engine module accepts the shared validated config plus strict `t11` extension with headline lines, optional description/benefit fact IDs, optional primary CTA, website/destination label, alt per image. Current price/promo text is accepted ONLY via verified `offerFactId`, never inferred from screenshot. Asset order: main center, left, right. One/two photos have distinct layouts; no photo is duplicated; all images use contain. Product/text colors come from brand tokens. Fonts via engine font IDs, standalone package ships local OFL Inter.

## Evidence and limits

Strict kit 115 pass / 0 fail / 0 warnings. Real renderer 9/9 successful placements, PNG and JPG decoded at exact size, zero layout violations. Template tests 32/32 PASS including 3 new T11 cases. Initial Story left-image rotation extended 2 px outside the safe box; moved inward before final pass. All important slots consume engine-safe geometry; Story baseline top250/right70/bottom350/left70. This is not a universal Meta-UI guarantee.

Standalone 3/3 renders pass compact bounds/overflow checks. Same stylesheet and engine font bytes. Portrait and Story pixels match the engine output in the tested demo; square differs slightly (mean absolute channel error ~0.043/255), not a claim of reference-photo fidelity. Source screenshot was not available on disk for objective pixel comparison, and photos/hands intentionally differ. Domain truth/expiry/ownership and actual LayerFit assets/fonts, app registration, AI, JMD and design approval remain unverified. Test flags are simulation assertions, not real claim substantiation. No commit/push/deployment.
