# T11 — Semaglutide Question Banner (replaces Product Collection Hero)

T11's former product-collection design has been replaced with the user-supplied Eden-style question banner from `Template-example/t12-semaglutide-banner`, with a compact CTA added. Composition: forest-to-sage gradient, large centered two-line question, one uncropped vial, short support line, brand wordmark, safety disclaimer and CTA. Crowded lower copy was re-spaced for square, portrait and vertical outputs.

## Files and local preview

`index.html`, `styles.css` (same template CSS as the engine module), `script.js`, `creative.example.json`, `render.mjs`, local Inter fonts and `assets/vial-demo.png`. The vial is synthetic and visibly marked DEMO; it is not the supplied drug-vial photo.

```powershell
$env:CHROMIUM_EXECUTABLE_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'
node render.mjs
```

Exports square 1080×1080, portrait 1080×1350 and story/vertical 1080×1920 to `previews/`. No remote fonts/assets are fetched. Only raster files under `assets/` are accepted; text is created with `textContent`/text nodes.

## Input/factual safety

Supply `brand`, `headlineFactId`, `headlineLines`, `accentPhrase`, `subheadFactId`, `disclaimerFactId`, `facts`, `ctaBottom`, `imageUrl`, `imageAlt`, `format` and optional `locale`. All three medical-copy fields must resolve to matching facts with `verified:true`; this browser assertion is not substantiation. The provided example facts reproduce reference/demo content only and must not be treated as approved medication advertising. CTA is required and caller-supplied (max 32 chars). No prices, dosing instructions or efficacy claims are generated.

## Engine module

The replacement engine module remains at `templates/part01/src/product-collection-hero.ts` to retain the existing T11 source path, but exports template ID `semaglutide-banner@0.2.0`. Config uses asset IDs and fact IDs (not arbitrary image URLs); medical headline, subhead and disclaimer fail closed unless verified facts are present. Gate script: `templates/part01/scripts/render-product-collection.ts`; tests: `templates/part01/tests/product-collection.test.ts`.

This source reference is square-only; portrait and vertical are layout adaptations, not source-provided designs. No claim is made about medical/legal approval, brand ownership, JMD integration or ad performance. Human review and clinician/legal approval are required before any real use.
