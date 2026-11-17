# T07 — Everyday Editorial v3 engine port

Current source: `../../Template-example/layerfit_t07_lifestyle_benefit_v3/` (supersedes the prior `layerfit_t07_redesign` source). CSS is extracted with PostCSS and adapted to the engine-owned canvas/tokens, scoped selectors and format name (`story` → `vertical`). Source files remain unchanged.

Module: `src/everyday-editorial.ts` (`everyday-editorial@0.2.0`), all three formats. It follows v3's grid composition: masthead, overline, split headline/description opening, large lifestyle photo with caption, fact-backed benefits and footer CTA. Headline line breaks are validated text fields; descriptions/features resolve from verified fact IDs; assets and optional logo resolve by asset ID. Image position is a strict enum, never interpolated into arbitrary CSS. Crop follows asset `allowCrop`; without crop permission the image uses contain.

Run in `templates/part01/`:

```powershell
npm.cmd run typecheck
npm.cmd test
$env:CHROMIUM_EXECUTABLE_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npx.cmd tsx scripts/integrate-everyday-editorial.ts
```

Artifacts: `artifacts/t07-engine-port/` contains v3 source-vs-engine comparisons for all three sizes, engine PNG/JPG, contract and per-format diagnostics. Fixture uses the supplied image/copy only for local visual comparison; `verified:true` is not product substantiation and the source image is not an approved campaign asset. Engine uses bundled Arimo instead of system Arial, so exact pixel identity is not claimed. Contract warns once per format because source composition does not consume engine safe-inset tokens; strict-safe-area approval is pending. Latest validation: typecheck PASS, suite 29/29 PASS, engine 3/3 formats success/0 violations/0 fitting steps, contract 36 pass/0 fail/3 warnings. No app registry, JMD, real brand, AI, commit or deployment claimed.
