# T11 — Semaglutide Question Banner (replaces Product Collection Hero)

## Outcome

Replaced the former multi-product Glow Theory concept with the user-supplied `Template-example/t12-semaglutide-banner` question-banner design. Retained the gradient, centered question with highlighted phrase, one uncropped vial, support line, brand wordmark and disclaimer; added a compact CTA. Reflowed copy blocks to avoid overlap and fit the three engine formats. Gate renders use a visibly marked synthetic DEMO vial, not the source medication photo.

- Engine module: `src/product-collection-hero.ts`, `src/product-collection-hero.css`.
- ID/version: `semaglutide-banner@0.2.1` (source file path retained for existing imports); formats square/portrait/vertical. Portrait/vertical use a centered flowing stack with consistent 22/26px gaps; latest sheet `artifacts/t11-semaglutide-banner/T11-all-formats-v021.png`.
- Standalone HTML/CSS/JS: `../../Template-example/layerfit_t11_product_collection_hero/`.
- Current preview/report folder: `artifacts/t11-semaglutide-banner/`. `artifacts/t11-product-collection/` is historical only.
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

Standalone `window.setCreative` takes brand, verified headline/subhead/disclaimer fact IDs, explicit headline lines/accent phrase, CTA, one package-local vial raster and format. Engine binds all medical copy to verified fact IDs and requires one uncropped image. CTA is caller supplied. Former product-collection fields (multiple images, prices/offers, benefits, web destinations) are removed from the replacement schema. Fixture `verified:true` flags are test assertions only, not clinical or advertising substantiation.

## Evidence and limits

Current strict kit 39 pass / 0 fail / 0 warnings; real engine 3/3 format renders successful, PNG/JPG decoded at exact dimensions, zero layout violations. Part01 suite 42/42 PASS. Standalone renderer 3/3 formats with bounds and slot-overlap checks PASS. Only square source design supplied; portrait/vertical are adaptations, not source-provided artwork. This is not medical/legal approval, clinical claim verification, universal Meta-safe certification or a performance claim. JMD/app integration and visual approval remain pending.

The provided source's semaglutide text appears only in a fixture with test-only verified flags. Replace it with approved facts before any real medication ad. Synthetic vial only; no AI, JMD test or deployment. No commit/push.
