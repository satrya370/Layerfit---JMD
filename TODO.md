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
- [x] T11 Product Collection Hero: screenshot composition converted into HTML/CSS engine module + standalone package, 1/2/3 distinct products × 3 formats (9 real-engine placements), PNG/JPG decoded, 0 layout violations; strict kit 115/0/0; template suite 32/32. Synthetic images, no hands/original photo match; visual/app/JMD approval pending. `templates/part01/T11-product-collection.md`, `Template-example/layerfit_t11_product_collection_hero/`.
- [x] Partial Part 01 T03 template evidence: Dark Offer Stack, optional fact-backed offer/proof, two-asset and one-asset scenarios × three formats (`templates/part01/README.md`, `template_part01_log.md`). Active/expiry validation remains a domain-service blocker; not application E2E.
- [x] Part 01 T04 ported verbatim from user-supplied `Template-example/` HTML/CSS into a contract `TemplateModule` (square; fact-gated reviews/offer; source geometry preserved). Contract kit 40 pass / 0 fail / 3 deliberate warns; real-engine render: reference-example case success with zero violations and 0 fitting steps, side-by-side at `templates/part01/artifacts/t04-engine-port/T04-source-vs-engine.png` (`template_part01_log.md`). Visual approval pending; portrait/vertical not designed; safe-inset deviation + Arimo font mapping are open contract items.
- [ ] Gate: two products persist/reopen and decode all three resolutions with no overflow.

## M2 — AI
- [ ] Configurable provider + strict output + claim grounding + retry/usage ledger.
- [ ] Gate: valid batch and invalid/truncated/429 cases; exact cost math; no invented product facts; real-provider test distinctly recorded.

## M3 — Generation
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
