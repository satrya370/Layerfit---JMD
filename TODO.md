# Implementation milestones and evidence

Legend: checked means evidence exists, not merely a UI component.

## M0 — Audit/planning
- [x] Clone reference separately and identify commit; read original PDF.
- [x] Source audit renderer, templates, validation, resolver, workflow and dependencies (`docs/audit.md`).
- [x] Record local simulation permission and JMD blocker.
- [x] Specification, architecture/data/API design and milestones.
- [x] Runtime-check reusable renderer adaptation (`docs/verification.md`).
- [ ] Verify Dutch ad references; current direct access failed (`docs/research.md`).

## M1 — Foundation
- [ ] Application setup, lint/typecheck; SQLite campaign/asset/config persistence.
- [ ] Validated uploads; one dynamic template; adapt Puppeteer pipeline.
- [x] Partial M1 evidence: typed renderer, raster byte normalization, one dynamic concept, three formats, lint/typecheck/unit checks. HTTP upload and persistence still missing.
- [x] Partial Part 01 template evidence: T01 annotated hero, local Tailwind build, strict template config, two synthetic fixtures × three formats, PNG/JPEG smoke artifacts (`templates/part01/README.md`). Engine/editor integration still pending.
- [x] Part 01 T02 template-level gate: Dual Panel two-photo and single-photo fallback × three formats; comparison-without-evidence rejected; local smoke artifacts under `templates/part01/artifacts/template-part01/`. See `template_part01_log.md`; engine integration pending.
- [x] T02 reference-port evidence: supplied `comparison-banner/t02.html` + actual CSS extracted into `comparison-banner.ts` (`dual-panel` v0.3.0); real engine square PNG/JPG, 0 violations/0 fitting steps; contract 13 pass/0 fail/1 safe-token warning, template suite 20/20. Visual approval, strict safe-area gate and permanent registry remain pending. See `templates/part01/artifacts/t02-engine-port/T02-source-vs-engine.png`; previous T02 interpretation preserved, not visual acceptance.
- [x] T07 v3 revision: port updated to `Template-example/layerfit_t07_lifestyle_benefit_v3` (headline/description panel, lifestyle photo + caption, fact-backed benefit row, footer CTA). `everyday-editorial@0.2.0`; all three formats through engine, 0 violations/0 fit steps; contract 36/0/3 safe-token warnings; full template suite 29/29. Visual/safe-area approval and permanent app registration remain pending. See `templates/part01/artifacts/t07-engine-port/T07-source-vs-engine-*.png`.
- [x] T09 Question Hook extracted to `question-hook-t09` engine module; removed the large decorative ghost question-mark (the headline question mark remains). Two reference-only fixtures × three formats rendered PNG/JPG, 0 violations/0 fitting steps; focused tests 3/3; contract 65 pass/0 fail/12 safe-token warnings. Source assets/claims are not campaign-approved; app registration and safe-area review pending. See `templates/part01/artifacts/t09-engine-port/`.
- [x] T11 replaced by Semaglutide Question Banner (`semaglutide-banner@0.2.0`): strict kit 39/0/0, suite 42/42, engine 3/3 formats + standalone 3/3; zero layout/slot-overlap issues, PNG/JPG decoded exact. Medical text is fact-ID gated; local render uses synthetic DEMO vial. Former `t11-product-collection` artifacts retained as history. User visual/medical, app/JMD approval pending. `templates/part01/T11-product-collection.md`, `artifacts/t11-semaglutide-banner/`, `Template-example/layerfit_t11_product_collection_hero/`.
- [x] T05 Split Composition: engine-owned module (`src/templates/part02/split-composition`) validated from the template side without duplicating it — strict kit 77/0/0, suite 37/37, 6/6 real-engine placements (2 cases × 3 formats) with 0 violations/0 fitting steps, side-by-side vs `Template-example/layerfit_t05` previews. Scaffold-text/font differences are engine-owner design decisions, recorded not judged; visual approval and part01/part02 reconciliation pending. `templates/part01/artifacts/t05-split-composition/`.
- [x] T12 Immersive Image + Editorial Copy ported from user-supplied `Template-example/LayerFit_T12` into template-side module `immersive-editorial@0.1.0` — strict kit 115/0/0, suite 42/42, 9/9 real-engine placements (3 cases × 3 formats, 0 violations), side-by-side vs source previews (MAE 7.01/6.17/13.07 with deliberate-difference notes). User-supplied reference-hero crop is fixture-only; visual approval pending. `templates/part01/artifacts/t12-immersive-editorial/`.
- [x] T15 folder `Template-example/t15` ported as `lifestyle-benefit-editorial@0.1.0` (source README calls composition T21): strict kit 39/0/0, suite 45/45, 3/3 real-engine formats success/0 violations; synthetic bag fixture only; all PNG/JPG dimensions decoded. Portrait/vertical adapted to safe zones. Visual/app/JMD approval pending. `templates/part01/artifacts/t15-lifestyle-benefit-editorial/`.
- [x] T13 folder `Template-example/LayerFit_T13_Editorial_Sale_Redesign` ported as `editorial-sale-promo@0.1.0` (source README/preview label T22): verified offer fact is required and percentage is parsed from that fact; visible demo label in demo mode. Strict kit 39/0/0; full suite 48/48; engine 3/3 formats, 0 violations, exact PNG/JPG decode. Synthetic product fixture only. Visual/app/JMD review pending. `templates/part01/artifacts/t13-editorial-sale-promo/`.
- [x] T18 folder `Template-example/t18` ported as `mediterranean-fashion-poster@0.1.0` (source README/assets say T19): two synthetic fashion fixtures × 3 formats; strict kit 77/0/0, full suite 51/51, 6/6 engine renders/0 violations, exact PNG/JPG decode. Price, badge scarcity, campaign headline and event info fact-ID gated; source fonts/assets are not copied as defaults. Visual/app/JMD approval pending. `templates/part01/artifacts/t18-mediterranean-fashion-poster/`.
- [x] T19 `Template-example/t19` exported as `after-dark-editorial@0.1.0` with normalized canonical config/slots and no `t19` extension: strict kit 39/0/0, suite 54/54, engine 3/3 formats, zero violations, exact PNG/JPG dimensions. Synthetic food-scene fixture; event details use fact-bound body. Visual/app/JMD approval pending. `templates/part01/artifacts/t19-after-dark-editorial/`.
- [x] Partial Part 01 T03 template evidence: Dark Offer Stack, optional fact-backed offer/proof, two-asset and one-asset scenarios × three formats (`templates/part01/README.md`, `template_part01_log.md`). Active/expiry validation remains a domain-service blocker; not application E2E.
- [x] Part 01 T04 ported verbatim from user-supplied `Template-example/` HTML/CSS into a contract `TemplateModule` (square; fact-gated reviews/offer; source geometry preserved). Contract kit 40 pass / 0 fail / 3 deliberate warns; real-engine render: reference-example case success with zero violations and 0 fitting steps, side-by-side at `templates/part01/artifacts/t04-engine-port/T04-source-vs-engine.png` (`template_part01_log.md`). Visual approval pending; portrait/vertical not designed; safe-inset deviation + Arimo font mapping are open contract items.
- [ ] Gate: two products persist/reopen and decode all three resolutions with no overflow.

## M2 — AI
- [ ] Configurable provider + strict output + claim grounding + retry/usage ledger.
- [ ] Gate: valid batch and invalid/truncated/429 cases; exact cost math; no invented product facts; real-provider test distinctly recorded.

## M3 — Generation
- [x] T20 normalized source extraction (`circular-product-benefits@0.1.0`): neutral off-white/charcoal palette per user, original radial geometry, canonical hero+four benefits and small CTA. Tests 58/58, real engine 6/6, geometry/source-neutral symmetry 3/3 PASS; kit 267/0/18 source-safe-inset warnings (not safe-area acceptance). Preview `artifacts/t20-circular-product-benefits/T20-neutral-final-v010.png`; app/JMD/claim/visual approval pending.
- [x] T19 corrected to actual source extraction v0.2.0 after user rejected redesign: original left-aligned typography/photo/badge/footer restored, invented border removed. Canonical slots retained. Typecheck/suite 55/55, engine source+synthetic 6/6 PASS; kit 247/0/18 deliberate source-safe-token warnings (NOT safe-inset acceptance). Current `artifacts/t19-source-fidelity/T19-reference-v020.png`; source-photo fixture-only, bundled-font differences and user/app/JMD approval pending.
- [x] T13 + T18 tall-format layout revision v0.2.0: balanced T13 offer/product grid + centered message, compact centered T18 poster + equal event columns. Typecheck/tests 51/51 PASS; kits T13 39/0/0 and T18 77/0/0; real engine 9/9 PASS; dedicated browser geometry checks 6/6 PASS. Latest sheets `T13-balanced-v020.png` / `T18-balanced-v020.png`; user visual/app/JMD approval pending.
- [x] T11 tall-format typography revision v0.2.1: centered safe-box stack, 22/26px rhythm, balanced subhead/disclaimer and smaller wordmark. Typecheck/tests 42/42, strict kit 39/0/0, engine 3/3 and standalone 3/3 PASS. Preview `artifacts/t11-semaglutide-banner/T11-all-formats-v021.png`; visual/app/JMD approval pending.
- [x] T12 revised to reference-only + verified description + CTA (`immersive-editorial@0.2.0`); minimal/compact no longer generated. Strict kit 39/0/0, tests 42/42, engine 3/3 formats with 0 violations/0 fit steps. Current outputs: `templates/part01/artifacts/t12-reference-cta/`. Prior multi-case outputs are historical; visual/app/JMD approval pending.
- [x] T10 standalone design revision: optional fact-backed description + underlined CTA, original gradient/asymmetric photo/serif/features retained; 3/3 Chrome previews PNG/JPG decoded, bounds and binding negative checks pass (`templates/part01/artifacts/t10-copy-revision/`). Engine module unchanged; engine integration, safe-area gate and visual approval remain pending.
- [ ] Fifteen distinct compositions, single-photo fallbacks, fonts/safe areas.
- [ ] Durable progress, partial success, retry/restart handling.
- [ ] Gate: 45 valid images each for two simulation briefs; inspect contact sheets and output bounds.

## M4 — Dashboard
- [ ] Campaign form/list/gallery, placements/favorites, editor/photo replacement.
- [ ] Separate copy regeneration vs no-AI re-render.
- [ ] Gate: browser-driven persisted create→edit→regenerate flow and accurate progress/errors.

## M5 — Export/QA
- [ ] Individual PNG/JPG and bulk ZIP/current revision manifest.
- [ ] Gate: unpack/decode every export; 45 entries plus manifest; failure isolation; lint/typecheck/tests/build pass.

## M6 — Delivery
- [ ] Installation instructions verified from clean setup.
- [ ] Technical report: actual durations/costs/manual effort/limitations/100+ scaling.
- [ ] Weekly update, demonstration script and new-product live test.
- [ ] JMD access/config confirmation and explicit deployment permission.
- [ ] Real LayerFit assets/brand guidelines, approved AI provider credentials/rates.
- [ ] Gate: approved JMD run with real product, 45 outputs and live briefing; no production-ready claim beforehand.
