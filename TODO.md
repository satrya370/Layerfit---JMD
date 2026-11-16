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
