# T20 — Circular Product Benefits, neutral palette

Module `circular-product-benefits@0.1.0` extracts the geometry from `Template-example/LayerFit_T20_Symmetric_v2/styles.css` using PostCSS. No redesign, border or CTA bar is added. User-requested changes: pink replaced by neutral off-white/charcoal/warm gray, rose shadows neutralized, and a small required CTA label added beneath the radial labels. The reference package is left untouched.

## Canonical mapping (slot_normalization_plan.md)

| Source input | Canonical input | Output |
|---|---|---|
| brand | `brand.name` / `brand.logoAssetId` | `brand` |
| topline | `copy.headline` | `headline` |
| optional short opener | `copy.eyebrow` | `eyebrow` |
| first/top benefit | `offerFactId`, else `heroFactId` | `offer`, verbatim fact text |
| other four benefits | `copy.benefits[].text/factIds` | `benefits`; first three also `benefit-1..3` |
| product cutout | `assets[]`, detected `kind`, `allowCrop:false` | `photo` with contain |
| imageAlt | `productName` | image alt |
| CTA required by canonical model | `copy.cta` | `cta` |

No `t20` extension, headlineLines, free-form title/subtitle variables or `benefit-4` slot. Each canonical benefit string is split into two balanced word groups for source typography; joining the two parts with a space reproduces the same original text. A hero fact cannot also be referenced by the benefit list. Text is escaped and referenced facts must exist and be verified. Body paragraphs are unsupported because this composition offers benefit supporting copy instead.

Palette: `brand.primary=#f6f5f1` (background start), `brand.secondary=#e8e6df` (background end), `brand.accent=#252b27` (main text). Orbit/subtext/shadows are quiet neutral tones. Palette remains configurable through validated brand fields; the reference cutout retains its actual orange/yellow pixels.

## Reproduce

From `templates/part01` with system Chrome:

```powershell
npm.cmd run typecheck
npm.cmd test
$env:CHROMIUM_EXECUTABLE_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'
npx.cmd tsx scripts/render-circular-product-benefits.ts
node scripts/verify-t20-fidelity.mjs
```

Outputs: `artifacts/t20-circular-product-benefits/`. Current contact sheet `T20-neutral-final-v010.png`. Source-neutral-vs-engine comparisons and geometry report produced by the second script.

## Evidence / limitations

- Typecheck PASS, entire part01 suite 58/58 PASS. Contract kit 267 pass / 0 fail / 18 warnings (all original source CSS does not read engine safe tokens). Includes manifest-derived cases; NOT a strict safe-area acceptance.
- Real engine 6/6 reference+synthetic placements success, zero layout violations, twelve PNG/JPG decoded exact dimensions. Reference photo is fixture-only, with expected 1.11/1.20/1.22x upscale warnings. No AI invoked.
- Geometry regression 3/3: source vs engine header/photo/orbit/labels coordinates agree within 2px under the same bundled Arimo font and neutral palette. Center axes, mirrored label bounds/baselines, CTA clearance and no text overflow checked. Original pink previews are unchanged; neutral baseline only changes palette/font plumbing, not source positions. Comparisons are not a claim of exact original-font pixels or ad performance.
- Reference source has five sample wax benefits, not independently substantiated claims. Fixture verified flags test code paths only. Source product crop remains local comparison material, never a module/production default. Synthetic cutout also tested. Application registration, real brand/claim authorization, JMD and user visual approval pending. No commit/push/deployment.
