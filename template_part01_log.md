# Template Part 01 — Execution Log

Purpose: shared handoff/cross-check log for template CP work. Follow `template_part01_plan.md`; this log records evidence, not intent. Append entries chronologically—do not erase another agent's notes.

> Current visual status (user review, 17 November 2026): prior T01–T03 visuals were rejected for not matching the references. Earlier technical pass/visual-review entries below are historical, NOT design acceptance. No template is visually approved. See the final reconstruction-study entry for current T01 evidence and limitations.

## Collaboration protocol

- Template owner maintains this file: `template_part01_log.md`.
- Rendering-engine owner maintains `rendering_engine_log.md` in the repository root. If that file does not exist, create it before or during the first engine CP.
- Before beginning a CP, each owner reads their own plan and the other owner's latest log entry. Check current worktree/Git status and do not overwrite files owned by the other stream.
- After each CP, record status, scope, files, commands/tests and actual outcomes, artifact paths, unresolved issues, and next handoff. Mark a CP complete only if that plan's gate is evidenced; otherwise use `partial`, `blocked`, or `not started`.
- Before calling a CP integrated/complete, both owners cross-check the other log and agree the shared contract, file ownership and relevant integration test. A renderer fixture is not evidence that a final template or app E2E passed.
- Do not edit the other owner's log. If a discrepancy is found, append a dated cross-check note to your own log and notify the other owner.
- Keep log edits local until push/commit is explicitly requested. Never include secrets, user assets, or raw credentials.

## 2026-11-17 — Initial execution of CP00–CP02

**Workflow:** planning → working → reviewing → revising.

**Plan consulted:** `template_part01_plan.md`; original references in `Template-example/`. Reference renderer source/prototype and project instructions were reviewed. IG Content Builder reference repository was not modified. No production renderer source was changed in this repository by the template work.

### CP00 — Reference mapping and design contract

**Status: partial (documentation evidence).**

- Mapped four screenshots (T01 Annotated Product Hero, T02 Dual Panel, T03 Dark Offer Stack, T04 Editorial Reframe) in `template_part01_plan.md`.
- Documented T01 wireframes for square, portrait and vertical formats plus input/asset/copy contract in `templates/part01/README.md`.
- Specified that reference prices, discounts, reviews, service promises and competitor claims are not defaults and require approved evidence.
- Detailed wireframes and conditional schemas for T02–T04 remain undone. CP00's full checkpoint gate is therefore not marked complete.

### CP01 — Foundation and local Tailwind build

**Status: partial (T01 isolated prototype).**

- Created isolated package `templates/part01/` with local Tailwind v3 build, TypeScript, strict Zod input schema, design tokens and explicit format profiles.
- Created `renderAnnotatedHeroHtml(config, format, compiledCss)` adapter; input text is escaped, colors/font/language/IDs are allowlisted, and product image is embedded from supplied raster bytes. Caller still owns asset byte decoding, campaign ownership and factual verification.
- Built a template-only smoke harness; it blocks non-data browser requests and waits for fonts/images. This is not the production engine or browser manager.
- Root application registry, shared components for all four templates, bundled brand fonts, asset ownership resolver, and production renderer integration remain pending.

### CP02 — T01 Annotated Product Hero

**Status: partial (implementation and renderer smoke test for one template).**

- Implemented cream/editorial hero, contained product frame, fact-ID-backed benefit pills, optional CTA/offer, optional stage-normalized SVG connector and no-anchor fallback without connector.
- Implemented format-specific CSS for 1080×1080, 1080×1350 and 1080×1920, including vertical safe insets. Dimensions are explicit, not scaled from one composition.
- Used two synthetic-only fixtures (shirt and bottle). Rendered 6 placements (2 fixtures × 3 formats), encoded to 6 PNG + 6 JPG, decoded and dimension checked. Visually inspected the six PNG outputs; no real LayerFit asset was used.
- Manually supplied connector stage anchor was visually inspected for geometry, but its position is not editor-driven and is not verified against an actual product feature after image containment.
- Long/max-length Dutch text, full 3-benefit case, upload byte validation, offer ownership/expiry, bundled fonts, and browser app integration remain pending.

### Verification evidence

Executed from `templates/part01/` on local Windows, using installed system Chrome at `C:\Program Files\Google\Chrome\Application\chrome.exe`:

```text
npm.cmd ci                         PASS (112 packages; 0 reported vulnerabilities)
npm.cmd run build:css              PASS (Tailwind compiled locally; caniuse-lite freshness warning)
npm.cmd run typecheck              PASS
npm.cmd test                       PASS (6 tests)
npm.cmd audit                      PASS (0 vulnerabilities)
npm.cmd run smoke                  PASS (6 placements; 12 encoded files; 2842ms reported)
```

The 2842ms observation is for this local six-placement prototype run only; it is not a benchmark or 45-output SLA. Outputs are in ignored `templates/part01/artifacts/template-part01/`. Template source/config/tests are under `templates/part01/src/`, `tests/`, and `scripts/`.

### Cross-check and handoff

- Claude renderer log was not checked during this execution; no `rendering_engine_log.md` was present/read at the time. The template remains isolated pending a mutually agreed engine/template contract.
- No commit/push was made by this work.
- Next template CP work: finish remaining CP00 T02–T04 wireframes/schema; close T01 open cases and coordinate an integration contract with the engine owner. Do not claim Part 01 (4 templates) or final 15×3 acceptance complete.

## 2026-11-17 — CP03 T02 Dual Panel

**Workflow:** planning → working → reviewing → revising.

**Status: complete for the CP03 template-level gate using local synthetic fixtures.** This is not production-engine integration, app E2E, claim verification or brand approval.

### Planning / reference analysis

- Re-read `Template-example/Screenshot 2026-11-17 114036.png` and CP03 in `template_part01_plan.md` before implementation.
- Reference hierarchy: full-height left/right photo panels, central divider, headline upper-left, panel labels and fact bullets near lower safe area, brand mark upper-right. Adapted the split composition without competitor logo, X/check verdicts, or unsupported negative comparison claims.
- Implemented default `dual-benefit` mode for two contexts/benefits of the user's own product. `verified-comparison` requires `comparisonEvidenceId`; absent evidence is rejected. One-image input renders one real image plus an informational second panel—never a duplicated photo.
- Square/portrait use side-by-side panels; vertical stacks the panels in a protected content area. Product images use `contain`; lifestyle/detail use `cover` only with explicit `allowCrop`.

### Files changed

- `templates/part01/src/dual-panel.ts`: strict config schema, fact/asset references, engine-resolved raster input checks and escaped body-fragment rendering.
- `templates/part01/src/styles/tailwind.css`: T02 format-specific compositions, panels, labels, facts, CTA, vertical safe layout.
- `templates/part01/tests/dual-panel.test.ts`: schema, evidence requirement, one-image fallback, no duplicate/remote asset, escaping and slot tests.
- `templates/part01/scripts/smoke-dual-panel.ts`: trusted test shell plus real Chromium fixture render; not production engine lifecycle.
- `templates/part01/package.json`: `smoke:dual-panel` script.
- Documentation: `template_part01_plan.md`, `templates/part01/README.md`, `TODO.md`, `docs/verification.md`.

### Reviewing and revising

- First smoke exposed headline line-box overflow by 3px; added internal text padding and reran rather than relaxing the check.
- Vertical visual inspection showed the heading was dark over an underlying dark browser background; vertical canvas now paints the configured secondary background.
- Reviewed all six final PNG outputs: 2 synthetic configurations × 3 formats. Checked title/fact/CTA bounds and the product-fallback arrangement.
- We do not claim positive comparison visual/semantic verification; only that the schema rejects comparison without evidence.

### Test evidence

From `templates/part01/`:

```text
npm.cmd run build:css       PASS (local Tailwind build; caniuse-lite freshness warning)
npm.cmd run typecheck       PASS
npm.cmd test                PASS (12 tests total: 6 dual-panel + 6 existing T01)
npm.cmd run smoke:dual-panel PASS (6 placements, 12 decoded image files; final rerun 2835ms reported)
npm.cmd run smoke           PASS (T01 regression: 6 placements, 12 decoded image files; 2916ms reported after T02 module/scoped CSS update)
```

Artifacts: ignored files `templates/part01/artifacts/template-part01/dual-panel-*`. Durations are local smoke observations, not benchmark/SLA.

### Cross-check and handoff

- Read shared draft `docs/contracts/render-template-contract.md` v0.1. It is still explicitly **not agreed**. T02's body-fragment, `assetId`, `fontHeadingId/fontBodyId`, primary/secondary/accent tokens, semantic slots, crop attributes and overlap declarations are aligned with the draft where practical. T01 remains on its earlier prototype interface and needs a separately planned migration after agreement.
- At CP03 start no `rendering_engine_log.md` existed in either tree. It was subsequently created in the main tree (not the engine worktree) and read before closing CP03. Latest entry says engine CP00–CP02 are not started; draft engine files exist but are untested; no engine render/integration has been run. The shared contract remains v0.1 draft, not binding.
- T02 now follows the draft's direction for the parts it owns: `assetId` + separate resolver-supplied raster, `fontHeadingId`/`fontBodyId`, brand tokens primary/secondary/accent, body-fragment output, scoped styles, `data-fit-group`, `data-allow-overlap`, and explicit crop permission. This is not a claim of contract conformance until the shared contract is approved and tests run against its SafeHtml/TemplateModule interface.
- Engine/template contract integration remains pending. No commit or push was made.
- Next: cross-check CP03 outcome with Claude; agree/finalize shared contract before T01 migration or conformance tests; proceed to CP04 only with its own reference analysis and log checks.

## 2026-11-17 — Contract open-item decisions (template-owner proposal)

Cross-checked Claude's latest `rendering_engine_log.md` (main tree, latest entry “Execution of CP00–CP02”) and `docs/contracts/render-template-contract.md` v0.1. This records the GPT/template-side decisions; **pending Claude's explicit confirmation in the engine log** before describing these as a mutual agreement or editing the shared contract.

1. **Safe-area source:** accept one engine-owned format profile for all templates. Proposed values: square top/right/bottom/left `60/70/60/70`; portrait `70/70/70/70`; vertical `250/70/350/70` (already the spec baseline). T01's current standalone CSS values are prototype-era and will be migrated to consume the engine tokens after the contract is accepted; do not copy those old values into new templates.
2. **T01 anchor space:** define anchor as normalized coordinates of T01's `product-stage` box, where its connector SVG is positioned. The preview/editor must accept clicks only inside the actual displayed image-content rect after `object-fit: contain`, then convert that click into stage-normalized coordinates. The renderer does not infer object features or validate semantic pointing. Claude's current engine does not inspect anchor geometry, so this contract is a template/editor concern.
3. **Contract conformance kit:** agree it is a prerequisite before T01 engine integration. Engine owner supplies the shared kit/interface; template owner will run it against the locked template commit and report violations without modifying engine files. Existing T02 unit/smoke tests are not a substitute for this kit.
4. **Logging:** continue separate append-only logs. Engine log now exists in main tree; latest entry reports CP00 complete, CP01/CP02 partial, and no template integration yet. Template log remains this file. Cross-check both before any shared completion claim.

### Confirmation cross-check (same day)

- Re-read Claude's updated engine log and contract v0.2 after the proposal above. Claude explicitly confirmed the safe profiles and product-stage anchor coordinates; the contract marks both agreed. I accept/record v0.2 from the template side for those two items.
- Confirmed safe profiles are engine-owned CSS tokens; templates must not duplicate values: square `top/right/bottom/left=60/70/60/70`, portrait `70/70/70/70`, vertical `250/70/350/70`.
- Confirmed T01 anchor coordinates are normalized to the `product-stage` box; the editor maps click coordinates from the visible `contain` image rect to stage coordinates. Renderer checks layout/bounds but does not judge semantic pointing.
- Contract kit remains a prerequisite before T01 engine integration; kit is still not written. No T01 engine integration is claimed.
- Engine log review pass 2 now reports CP00 complete, CP01/CP02 partial, tests passing and no template integration. Engine work remains uncommitted in its separate worktree.

## 2026-11-17 — CP04 T03 Dark Offer Stack

**Workflow:** planning → working → reviewing → revising.

**Status: partial.** The template-level render/fallback gate passed on synthetic fixtures; production/domain verification, expiry semantics and engine integration remain incomplete.

### Planning / reference analysis

- Re-opened `Template-example/Screenshot 2026-11-17 114058.png` and CP04 in `template_part01_plan.md`.
- Composition: charcoal poster, headline first, optional offer/proof blocks, fact rows, product/gallery apertures, and CTA at engine-provided safe footer.
- Explicitly did not copy Trustpilot branding/stars, Klarna, discount percentages/codes, free returns, delivery promises, urgency or reference product photos.
- Config uses `offerFactId` and `proofFactId` only; renderer obtains the exact corresponding fact text from its resolved verified-fact snapshot. Missing IDs fail closed. This template cannot assess semantic truth/expiry; the domain service must filter invalid/expired facts before the snapshot.
- Two images create two apertures; one image renders once in a larger product frame. Product uses contain; lifestyle/detail may crop only with `allowCrop=true`.
- Test-only positive offer/proof fixture strings explicitly say `TEST FIXTURE ONLY`; output must not be used as a real ad.

### Files changed

- `templates/part01/src/dark-offer-stack.ts`: strict ID-only config, optional fact blocks, local resolver input validation, escaped body-fragment template.
- `templates/part01/src/styles/tailwind.css`: scoped dark poster composition, flexible optional sections, role-aware apertures, format-specific safe layout and fit groups.
- `templates/part01/tests/dark-offer-stack.test.ts`: no-promo defaults, exact fact-resolved offer/proof copy, missing-fact rejection, single/two-photo behavior, crop rules, URL and escaping checks.
- `templates/part01/scripts/smoke-dark-offer-stack.ts`: two synthetic fixtures with test-only offer/proof snapshot; trusted test shell, not production renderer.
- `templates/part01/package.json`: `smoke:dark-offer` script.
- Documentation: `template_part01_plan.md`, `templates/part01/README.md`, `TODO.md`, `docs/verification.md`.

### Reviewing and revising

- Initial CSS grid reserved tracks when offer/proof were absent, leaving the photo/CTA layout visually compressed. Replaced with a flexible content stack so the gallery uses remaining height and footer stays at the configured safe inset.
- Added a smoke assertion for footer position and line/content overflow. Reviewed six PNG outputs across two synthetic fixtures × three formats; PNG/JPG dimensions decode correctly.
- First browser pass caught header line-box clipping by 5px; increased header content space and reran without relaxing diagnostics.
- This validates layout/fallback only. Test-fixture offer/proof text is intentionally not factual brand copy.

### Test evidence (17 Nov, local Windows, system Chrome)

```text
npm.cmd run build:css        PASS (local Tailwind; caniuse-lite freshness warning)
npm.cmd run typecheck        PASS
npm.cmd test                 PASS 17/17 (5 T03 + 6 T02 + 6 T01)
npm.cmd audit                PASS (0 vulnerabilities)
npm.cmd run smoke:dark-offer PASS 6 placements / 12 PNG+JPG images; final run 2480ms reported
npm.cmd run smoke:dual-panel PASS 6 placements / 12 images; 2938ms reported
npm.cmd run smoke            PASS 6 placements / 12 images; 2825ms reported
```

Durations are local smoke observations, not throughput claims. Artifacts are ignored under `templates/part01/artifacts/template-part01/dark-offer-*`.

### Cross-check and handoff

- Re-read Claude's latest engine log in the main tree and shared contract v0.2. Safe areas and T01 anchor space are now explicitly agreed; the contract test kit remains unwritten and is still a prerequisite for T01 integration.
- Engine changes remain uncommitted in `C:\Users\Asus\Layerfit-JMD-engine`; no shared engine/template render has occurred. T03 body fragment/config follow the proposed ownership shape but have not been run through `TemplateModule`/`SafeHtml` conformance.
- **CP04 remains partial:** the domain model here has no expiry/eligibility metadata or active-offer verifier. Production must not put expired/unapproved facts into the engine snapshot. Positive test-only slot rendering is not evidence of a valid real promotion or review.
- No commit, push, or deployment. Next: CP05 T04 Editorial Reframe; before starting it, read both updated logs and its reference screenshot/contract.

## 2026-11-17 — CP04 T03 Dark Offer Stack

**Workflow:** planning → working → reviewing → revising.

**Status: partial (template implementation and synthetic render gate passed; domain validity/integration pending).**

### Planning / reference analysis

- Re-read `Template-example/Screenshot 2026-11-17 114058.png` and CP04 before implementation.
- Reference composition: charcoal full canvas, large offer/headline stack, factual benefit rows, two photo apertures and lower CTA/footer.
- Explicitly excluded default Trustpilot mark/stars, Klarna, 5% discount, code EXTRA5, next-day delivery, free returns, one-day urgency and reference imagery/logos.
- Decided offer/proof are ID-only config fields. Their displayed text is resolved from the supplied fact snapshot. Missing IDs omit the optional block; referenced IDs missing from that snapshot fail closed. The template cannot decide expiry, campaign ownership or semantic truth; the domain service must do that.
- One/two owned asset IDs are supported. Product role uses contain in a rounded rectangular aperture; lifestyle/detail can cover/circle only with explicit crop permission. A single photo is not duplicated.

### Files changed

- `templates/part01/src/dark-offer-stack.ts`: strict T03 schema, fact/asset resolving boundary, bounded raster data URI check, escaped body-fragment renderer.
- `templates/part01/src/styles/tailwind.css`: T03-scoped dark-stack composition, optional offer/proof styles, image apertures and format profiles.
- `templates/part01/tests/dark-offer-stack.test.ts`: no-promo defaults, canonical fact text, fail-closed facts, one/two-photo fallback, role/crop, URL and escaping checks.
- `templates/part01/scripts/smoke-dark-offer-stack.ts`: synthetic-only browser fixture harness.
- `templates/part01/package.json`: `smoke:dark-offer` script.
- Documentation: `template_part01_plan.md`, `templates/part01/README.md`, `TODO.md`, `docs/verification.md`.

### Reviewing and revising

- First render showed photo apertures too small with unused lower canvas due grid tracks reserved for absent promo/proof. Replaced track assumptions with a flexible content flow; footer position is explicitly checked against configured safe-bottom.
- Final inspection of six PNG renders (synthetic shirt, synthetic bottle × three formats) showed optional blocks, contained product photos, circle detail/lifestyle, text, and CTA. All six were visually inspected. Test-only offer/proof labels visibly say `TEST FIXTURE ONLY`; none are real promotion/review evidence.
- No external reference asset, competitor logo, stars, payment badge, promo value, or live product fact is used.

### Test evidence

From `templates/part01/` on local Windows with system Chrome:

```text
npm.cmd run build:css        PASS (local Tailwind; caniuse-lite freshness warning)
npm.cmd run typecheck        PASS
npm.cmd test                 PASS (17/17: 5 T03 + 6 T02 + 6 T01)
npm.cmd audit                PASS (0 vulnerabilities)
npm.cmd run smoke:dark-offer PASS (6 placements, 12 decoded images, 2480ms reported)
npm.cmd run smoke:dual-panel PASS (6 placements, 12 decoded images, 2938ms reported)
npm.cmd run smoke            PASS (6 placements, 12 decoded images, 2825ms reported)
```

Timings are local smoke observations, not batch SLA. Artifacts are ignored under `templates/part01/artifacts/template-part01/dark-offer-*`.

### Cross-check and handoff

- Read latest engine log in the main tree before closing this CP. It reports engine CP00 complete; CP01/CP02 partial; contract conformance kit not yet written; no T01/T02/T03 integration. Draft contract remains v0.1 and not agreed.
- T03 follows the proposed template boundary for ID-only assets/facts, engine tokens, scoped CSS, body fragment, fit groups and crop declarations where practical. It is not yet registered as `TemplateModule` or passed through engine `SafeHtml` contract tests.
- CP04 is partial until domain layer supplies facts only after ownership/truth/expiry checks, and engine integration test has run. No commit/push/deployment.
- Next CP is CP05 T04 Editorial Reframe; first re-read its screenshot, both latest logs and the contract status before starting.

## 2026-11-17 — User rejected T01–T03 visuals; T01 reference reconstruction study

**Status: exact-match requirement NOT met; user visual approval pending.** Previous template-level geometric/render passes do not establish reference fidelity and must not be used as design approval. User requested rebuilding T01 to match the supplied screenshot instead of continuing the earlier interpretations. No further CP progression is claimed.

- Planning: reopened the 779×951 source reference; measured headline, photographic scene, three pill callouts/arrows, price pill and site footer positions. Read latest engine log (engine integration still separate).
- Working: created `templates/part01/scripts/rebuild-t01-reference.ts`, an isolated reference-study renderer. Middle photographic scene is cropped from the user-supplied screenshot; baked-in text/label areas are masked, then headline, benefit labels, arrows, offer and footer are rebuilt in HTML/CSS. The full reference is NOT used as an output/background shortcut. This uses reference-derived photography, not synthetic or approved LayerFit assets, solely for the explicitly requested local reference-matching study; never use/publish as campaign output.
- Font: added local `@fontsource/dm-serif-display@5.2.8` to the template subpackage for this study (not a brand-font selection). Original font is unidentified; local DM Serif Display is only an approximation.
- Reviewing/revising: generated left-reference/right-render comparison, adjusted heading size/position, price typography, and annotation masks. Typecheck passed; actual Chromium HTML render produced PNG/JPG and comparison at original dimensions. Diff report has `exactPixelMatch: false`; no similarity-percentage claim is justified because much of the photo is reused.
- Outputs: `templates/part01/artifacts/t01-reference-rebuild/T01-reference-rebuild.png`, `T01-reference-rebuild.html`, `T01-reference-vs-rebuild.png`, `comparison-report.json`. Extracted photograph is also present for provenance.
- Blockers for exact match: original clean photograph/background (masked pixels cannot be recovered exactly), original font and original text rasterization. The study is not a reusable production-template migration or integration. Previous source/output files preserved; engine files untouched; no commit/push/deployment.

## 2026-11-17 — CP05 T04 Editorial Reframe: ported user-supplied HTML/CSS to contract module + engine render

**Status: template-side complete at template-level gate with a first real engine render pass; visual approval still pending.** User supplied `Template-example/index.html` + `styles.css` (1080×1080) and instructed to copy and refine it into the engine. The composition was ported, not redesigned.

- Planning: read the supplied index.html, styles.css, README, preview.png and `assets/product-scene.jpg` / `assets/brand-logo.png` (cropped from the user-supplied reference; reference-derived, not approved LayerFit assets). Read engine log + contract v0.2: `TemplateModule`, `SafeHtml`, `templateConfigSchema`, contract-kit, harness, `renderOutput` — engine worktree `C:\Users\Asus\Layerfit-JMD-engine` (branch `engine/rendering`, uncommitted).
- Working (template side, engine files untouched):
  - `templates/part01/src/editorial-reframe.ts` — T04 `TemplateModule` (id `editorial-reframe`, square-only, rootClass `lf-editorial-reframe`). Headline accent split, subheadline, photo frame, offer via `offerFactId`, reviews/stars only when the verified proof fact itself contains the star glyphs; missing facts fail closed (no invented ratings/prices). `setCreative()` replaced by validated config.
  - `templates/part01/src/editorial-reframe-css.ts` — CSS ported from supplied styles.css; fixed pixel geometry kept; colors expressed via `--lf-brand-*`, fonts via `--lf-font-*`, safe insets via `--lf-safe-*`; fit vars for headline/subheadline.
  - Imports reference Claude's worktree module paths directly (`../../../../Layerfit-JMD-engine/src/shared/...`) until worktree merge, preserving `SafeHtml` identity. No engine file copied or modified.
  - `scripts/editorial-contract-cases.ts` — synthetic cases only: no ratings, review counts, sale prices or competitor assets; facts come from the engine's synthetic briefs.
  - `scripts/integrate-t04-engine.ts` — (1) renders the supplied source HTML at 1080×1080 as a reference-only baseline, (2) runs the real contract kit, (3) renders both synthetic cases through the real `renderOutput` path and decodes each artifact.
- Reviewing/revising:
  - Contract kit: 29 pass / 0 fail / 0 warn (`artifacts/t04-engine-port/contract-report.json`).
  - Engine render: both cases `status: success`, zero layout violations, PNG+JPG, 1080×1080 verified via sharp (`engine-report.json`).
  - `npm.cmd run typecheck` pass.
  - Side-by-side `T04-source-vs-engine.png` (source | engine shirt | engine bottle): composition matches. Known differences: Inter stands in for the source's Arial (brand font decision already logged); review block correctly absent in the no-fact test cases; fixture photos render contain-fit per synthetic asset data.
- Outputs: `templates/part01/artifacts/t04-engine-port/` — `T04-supplied-source.png/.html`, `T04-engine-shirt.png/.jpg`, `T04-engine-bottle.png/.jpg`, `T04-source-vs-engine.png`, `contract-report.json`, `engine-report.json`.
- Open issues / handoff:
  - T04 is square-only by design of the supplied reference; portrait/vertical variants are not designed and are NOT claimed.
  - Engine-side changes are uncommitted in Claude's worktree; joint integration still awaits the contract test-kit handoff and a locked T01 commit per the engine log. I did not edit `rendering_engine_log.md`; Claude should record this render pass on his side.
  - Supplied reference-derived photo/logo are used only inside synthetic local renders; they are not verified brand assets.
  - Visual acceptance is the user's call, same standard as T01.

## 2026-11-17 — CP05 revision after user rejection: verbatim geometry + fact-backed reference case

**Status: template-side revision complete; user visual approval pending.** User rejected the first T04 engine port ("masih beda jauh", stars missing) and asked why the supplied HTML/CSS was not simply extracted into the engine. Root causes found and fixed:

1. **Missing review/price blocks were test-data, not template.** The first two cases had no verified facts, so the blocks correctly failed closed. Added a third case `reference-example` whose rating/review count/price/photo/logo come from the user-supplied `Template-example/` files and values, used only for this local fidelity study, labeled NOT verified LayerFit claims (`scripts/editorial-contract-cases.ts`).
2. **Geometry had been snapped to engine safe insets.** CSS now ported verbatim: reviews top 47, headline top 138 / left-right 45, subheadline top 349 / left-right 50, photo-frame 158/442 766x494, bottom-strip bottom 28. Those slots therefore omit `data-safe`; the engine's prototype safe box (60/70/60/70) intentionally does not apply to T04's source geometry. Open contract item for both owners. Kit reports this deliberately as 3 `css.tokens` warns (`--lf-safe-*` unused); integration asserts fail=0 and warns only of that known id.
3. **Photo fit corrected** to the source's `object-fit: cover` (`data-image-fit="cover"` + `data-allow-crop`; config `allowCrop: true`, role `lifestyle`).
4. **Font**: engine rejects non-bundled computed fonts (`FONT_MISSING` on Arial). Fixture harness now maps the `inter` font token to **Arimo** (OFL-1.1, @fontsource/arimo@5.2.8, Arial-metric-compatible) so line wrap matches the source; production font choice stays an engine decision, no engine file modified.
5. **Layout diagnostics fixes, visual position unchanged**: headline `padding-bottom: 0.25em` absorbs glyph-ink scroll overflow caused by the source's `line-height: 0.96`; `text-wrap: balance` reproduces the source's manual `<br/>` after "zijn" (config strings cannot contain newlines); `-webkit-text-stroke: 3px` calibrated against pixel statistics (headline-region greyscale mean: source 184.82, engine 185.47 — 0.25% remaining ink difference, letterform micro-differences Arimo vs the reference's Helvetica/Arial rendering remain).
6. Markup now emits the source structure verbatim: five green stars derived from the fact's rating (round, clamp 1–5, never hardcoded), `reviews-copy` with bold rating + bold count parsed from the "RATING SEP COUNT" fact format, offer split at colon into label + red `.price` strong, logo via `config.brand.logoAssetId`.

- Evidence: `npm.cmd run typecheck` pass; contract kit 40 pass / 0 fail / 3 warn (warns = the deliberate `css.tokens` deviation above); real `renderOutput` pipeline: all three cases `success`, zero layout violations, `fittingSteps: 0` for the reference case (86px rendered unscaled, matching the source). Upscale warnings only: photo 1.14x, logo 1.13x (source-derived crops are low resolution). Probe script `scripts/probe-t04-fits.ts` prints full diagnostics.
- Outputs refreshed in `templates/part01/artifacts/t04-engine-port/`: `T04-supplied-source.png`, `T04-engine-reference-example.png/.jpg` (plus shirt/bottle cases), `T04-source-vs-engine.png` (source left | engine right), `contract-report.json`, `engine-report.json`.
- Open issues: T04 still square-only (source reference has no other formats); safe-inset deviation above needs both owners' agreement; Arimo mapping is a study fixture, not the production font; visual approval still the user's.

## 2026-11-17 — CP03 revision: extract supplied comparison-banner T02 into engine module

**Status: square reference port rendered through the real engine; CP03/full integration remains partial, user visual approval pending.** User specifically requested extracting `Template-example/comparison-banner/`, not continuing the earlier T02 interpretation.

- Planning: read project requirements/audit/architecture/TODO, Part 01 plan, latest main-tree engine log (kit-delivered entry), supplied `t02.html`, `t02.css`, `preview.jpg`. Preserve original composition, typography, full-height photos, white divider, three-line slogan, badge, con/pro lists, and circular robot detail. Source files and previous T02 implementation left untouched.
- Working: `src/comparison-banner-css.ts` extracts the actual supplied stylesheet with PostCSS, keeps its declarations, scopes selectors, maps font variables to engine font tokens, removes only preview body/margins/shadow and narrow-screen stacking. Engine-owned square root is 1080 rather than preview max-width 960. `src/comparison-banner.ts` exports shared-contract `TemplateModule` (`dual-panel`, v0.3.0), with exact source DOM composition and engine-resolved images. A strict `t02` config extension carries slogan lines, label, badge text and six fact IDs; requires comparison evidence and three explicitly crop-approved detail/lifestyle images. All interpolated text is escaped; any missing fact/evidence throws. The old `dual-panel.ts` is preserved; do not register both implementations under the same ID.
- Data/provenance: `scripts/comparison-banner-cases.ts` supplies source example assets/copy solely for the explicitly requested local reference reproduction. `verified:true` flags in this isolated fixture are renderer test assertions, NOT substantiation of competitor/LayerFit claims; never feed these fixtures into production campaigns. No reference copy/photo is hardcoded into reusable module defaults. Domain ownership/relevance/truth validation remains external.
- Fonts: local OFL Montserrat 400/700/800 + Poppins 400/500/600/700, no substitutions or Google requests. Font registry injected into harness because engine default Montserrat does not include source's regular weight. Installed pinned @fontsource packages 5.3.0 and PostCSS 8.5.33; initial unavailable font version corrected; final npm install audit reports 0 vulnerabilities.
- Reviewing/revising: initial typecheck caught malformed extra negative-case wrappers; corrected to `{name, config}` and re-ran. Final typecheck PASS; entire template test suite PASS 20/20 (3 new T02 tests: escaping/source details, all missing fact/evidence paths, crop/schema rejection). Contract kit 13 pass / 0 fail / 1 warning: source CSS intentionally does not use safe-inset tokens. Strict contract gate therefore NOT passed. Semantic overlap declarations cover intentional photo/text layering, not arbitrary overlap suppression.
- Actual Chromium/engine: `npx.cmd tsx scripts/integrate-t02-engine.ts` with system Chrome; real `renderOutput` success, zero violations, zero fitting steps, PNG+JPG Sharp-decoded at 1080×1080. Engine reports expected source photo upscale warnings 1.35× and 1.60×. Script saves engine diagnostics even on failure. Source baseline renders the actual supplied DOM/CSS using the same embedded fonts, at 1080 square without page chrome. Both baseline and engine block external requests.
- Visual review: inspected `T02-source-vs-engine.png` (source left, engine right); all source elements present with matching composition. Pixel comparison is NOT exact: mean absolute channel error 0.46927 on 0–255 scale; engine normalizes images. This number is not a visual-similarity percentage or user approval.
- Artifacts: `templates/part01/artifacts/t02-engine-port/T02-engine-reference.png`, `.jpg`, `T02-supplied-source.html`, `.png`, `T02-source-vs-engine.png`, `contract-report.json`, `engine-report.json`, `comparison-report.json`.
- Handoff/limits: source stylesheet is still required at its original relative path (extraction occurs on module import); package consolidation needs a build/copy step. Shared imports reference the exact uncommitted engine worktree to preserve SafeHtml identity. No engine/source-reference files or counterpart log edited; no commit/push/deployment. Permanent application registry, synthetic two-product matrix, single-photo fallback, portrait/vertical, safe-area agreement and user visual acceptance NOT claimed. Current square comparison module deliberately rejects insufficient assets/evidence rather than inventing content.

## 2026-11-17 — T07 Everyday Editorial extracted into engine module

**Status: real-engine render passes for the supplied three formats; visual approval/safe-area acceptance pending.** User requested Template-example/layerfit_t07_redesign/ after T06. Kept the photo-first design rather than reworking its composition.

- Planning: read project instructions, TODO, latest engine handoff log, and T07 index.html, styles.css, script.js, example JSON, README and previews. Source files untouched. Design: simple masthead, large lifestyle photo, one-line headline, verified-description line and CTA; formats square/portrait/story. Story maps to engine ertical.
- Working: src/everyday-editorial-css.ts extracts supplied CSS with PostCSS, scopes selectors, replaces page shell with engine canvas/tokens, maps story to vertical, retains source geometry and adds bounded focal-position selectors. src/everyday-editorial.ts exports everyday-editorial@0.1.0 TemplateModule for all three formats. 	07 strict config includes category, descriptionFactId, alt text and a finite image-position enum. User text interpolated via html escape helper; description only from verified fact map; asset/logo only from resolver IDs; crop only if llowCrop else contain.
- Reference fixture scripts/everyday-editorial-cases.ts uses the provided example copy and lifestyle-demo.jpg for this requested local visual study only; fact's verified flag is a test assertion, NOT claim substantiation or campaign authorization. The source photo is not approved for real campaign use. Engine font uses local OFL Arimo because the engine rejects unbundled system Arial; source baseline uses its original system Arial. No external network requests.
- Review/revise: corrected format adaptation so only root canvas height declarations are removed (descendant portrait/story photo heights remain source dimensions); T07 CTA assertion typo fixed. Typecheck PASS. Full test suite PASS 26/26 (3 T07 tests: safe text/source structure, required fact/asset, strict enum/schema + all formats).
- Contract kit v0.2: 36 pass / 0 fail / 3 warnings. The three warnings are intentional lack of --lf-safe-* reads (one each square/portrait/vertical because reproducing source edge geometry); strict safe-area contract NOT passed.
- Real enderOutput on Chrome 157: square, portrait and vertical all success, zero layout violations, zero fitting steps, PNG and JPG each Sharp-decoded at exact 1080x1080 / 1080x1350 / 1080x1920. Image upscale warning: source photo upscaled 1.49x (square/portrait) / 1.49x approx vertical. See engine-report.json for exact per-format diagnostics.
- Side-by-side source-left / engine-right inspected in T07-source-vs-engine-{square,portrait,vertical}.png. Pixel MAE reports are available per format and are not similarity percentages; fonts/image normalization prevent exact pixel match. Typography differs visibly because system Arial is not permitted in the engine; visual review is still user's decision.
- Outputs: 	emplates/part01/artifacts/t07-engine-port/; runbook 	emplates/part01/T07-everyday-editorial.md. New source files: src/everyday-editorial.ts, src/everyday-editorial-css.ts, scripts/everyday-editorial-cases.ts, scripts/integrate-everyday-editorial.ts, 	ests/everyday-editorial.test.ts.
- Open/handoff: engine module is harness-only, not registered in an application; source CSS path and adjacent engine worktree imports remain development dependencies. No engine files/counterpart log edited, no AI, no commit/push/deploy. Safe-area choice needs joint owner agreement; real verified campaign data and approved brand photo/font are unavailable; user visual sign-off pending.

## 2026-11-17 — T07 Everyday Editorial extracted into engine module

**Status: real-engine render passes for all three supplied formats; visual approval/safe-area acceptance pending.** User requested Template-example/layerfit_t07_redesign/. Preserved the photo-first source composition.

- Planning: read project instructions, TODO, latest engine handoff log, and T07 index.html, styles.css, script.js, example JSON, README and previews. Source files untouched. Layout is masthead, large lifestyle photo, headline, description and CTA; formats square/portrait/story, with story mapped to engine ertical.
- Working: src/everyday-editorial-css.ts extracts source CSS with PostCSS, scopes selectors, replaces page shell with engine-owned canvas/tokens, maps story to vertical, retains source geometry and adds fixed focal-position enum selectors. src/everyday-editorial.ts exports everyday-editorial@0.1.0 TemplateModule for all formats. Strict config includes category, descriptionFactId, alt text and finite image-position enum. HTML text escaped; description from verified fact map; photo/logo from engine resolver IDs; cover only when asset llowCrop allows, otherwise contain.
- Reference fixture scripts/everyday-editorial-cases.ts uses supplied example copy/photo for this local visual comparison only. erified:true is a test assertion, NOT claim substantiation or campaign authorization. The example photo is not approved production media. Engine uses bundled OFL Arimo; source baseline uses system Arial, so exact text raster/letterforms are not expected to match. No remote font/image requests.
- Review/revise: fixed format CSS adaptation after initial engine diagnostics exposed photo-height rule removal in portrait/story; fixed one CTA assertion typo. Final typecheck PASS; full package tests PASS 26/26 (3 T07 tests for escaping/source structure, required fact and asset, schema/focal-position and all-format rendering).
- Contract kit v0.2: 36 pass / 0 fail / 3 warnings. All three are the intentional absence of --lf-safe-* reads, one warning per format because this port preserves source geometry. Strict safe-area gate NOT passed.
- Actual Chromium enderOutput on Chrome 157: square, portrait and vertical all success, zero layout violations, zero fitting steps; PNG/JPG decoded at 1080×1080, 1080×1350 and 1080×1920. Source photo upscale warnings: 1.49× square, 2.06× portrait, 2.34× vertical (engine-report.json).
- Visual check: T07-source-vs-engine-{square,portrait,vertical}.png has actual source left and engine right. Composition/photo crop/positions align; typography is visibly different due to system Arial vs bundled Arimo. Pixel MAE reports are not similarity percentages and do not establish approval.
- Files: src/everyday-editorial.ts, src/everyday-editorial-css.ts, scripts/everyday-editorial-cases.ts, scripts/integrate-everyday-editorial.ts, 	ests/everyday-editorial.test.ts; runbook T07-everyday-editorial.md; artifacts rtifacts/t07-engine-port/.
- Limits/handoff: module is harness-only, not registered in an application. Source CSS path and adjacent engine worktree imports remain development dependencies. Safe-area choice needs cross-owner agreement; verified campaign facts, approved brand photo/font, JMD and visual approval remain pending. No engine files/counterpart log edited; no AI, commit, push or deployment.

## 2026-11-17 — T09 Question Hook extracted; oversized ghost question mark removed

**Status: engine-harness render succeeds for both reference examples × three formats; visual approval and safe-area acceptance pending.** User requested extracting Template-example/layerfit-t09-question-hook/ and removing the large question-mark animation. Inspection found the giant outlined d__ghostq is static CSS decoration, not actually animated; removed that decorative element and all associated rules while retaining the question mark at the end of headline copy.

- Planning: read project AGENTS/spec/audit/architecture/TODO and latest engine handoff; read source index/styles/script, both example JSON files, README, assets and previews. Source folder unchanged.
- Working: src/question-hook-t09.ts + question-hook-t09-css.ts define question-hook-t09@0.1.0, all three formats. CSS extraction scopes declarations, maps story→vertical, uses engine tokens and keeps remaining composition (glows, logo bar, split-color hook, ring/image, answer, optional features and CTA). Config is strict; feature and description copy use fact IDs; asset/logo are resolver IDs; image cover requires explicit crop. Removed only giant ghost question mark. Logos are PNG in fixture (rasterized from supplied SVG before resolver); no SVG reaches engine.
- Reference cases: source examples SONIQ headphone (contain + logo) and TONI HOMI robot-vacuum (cover, crop allowed), local fidelity test only. Their erified:true flags are fixture assertions, not fact substantiation; do not publish as campaign creatives. Both examples are unapproved assets/copy for real campaigns.
- Fonts: bundled local Space Grotesk/Inter (@fontsource OFL), same font files as source baseline; no remote fonts. Added @fontsource/space-grotesk@5.3.0 and @fontsource/inter@5.3.0, package audit 0 vulnerabilities.
- Review/revise: first engine render revealed selector replacement accidentally renamed .ad__inner child classes, fixed by restricting .ad replacement to a class boundary; also declared deliberate 17px photo/description overlap and set square logo object-fit contain to satisfy resolver. Updated script and reran.
- Evidence: 
pm.cmd run typecheck PASS; focused T09 tests 3/3 pass (large decoration removed/headline question retained; HTML escaping and required facts; crop/schema/format checks). Contract kit v0.2: 65 pass / 0 fail / 12 warns (source CSS doesn't use --lf-safe-*, 2 cases × 3 formats; strict safe-area gate is not passed).
- Real engine via system Chrome 157: 6/6 placements success (2 examples × square/portrait/vertical), zero layout violations, zero fitting steps; PNG/JPG Sharp-decode at 1080×1080, 1080×1350, 1080×1920. Full diagnostics in engine-report.json; actual source baseline also rendered with ghost-Q DOM node removed and local embedded fonts/assets.
- Visual check: inspected square, portrait, vertical source-left/engine-right sheets; large ghost question mark absent from both modified source baseline and engine output; headline question mark, ring, glow, features, CTA remain. Engine/source geometry closely aligned. Not a pixel-identity or brand-approval claim.
- Files: src/question-hook-t09.ts, src/question-hook-t09-css.ts, scripts/question-hook-t09-cases.ts, scripts/integrate-question-hook-t09.ts, 	ests/question-hook-t09.test.ts, T09-question-hook.md; artifacts in 	emplates/part01/artifacts/t09-engine-port/.
- Limits/handoff: harness-only module, not registered in application; CSS and module share adjacent source/engine worktree paths until packaging. Intentional source geometry does not consume safe tokens, hence warnings. Fixture-only assets/copy, domain proof/ownership, real brand styling, JMD and user visual approval remain pending. No engine/counterpart files edited; no AI, commit/push/deploy.

## 2026-11-17 — T07 revised from new user source layerfit_t07_lifestyle_benefit_v3

**Status: v3 source is now the current T07 port; all three formats pass the engine harness. Visual/safe-area approval remains pending.** User asked after T09 to revise T07 from the newly supplied folder. This supersedes the earlier layerfit_t07_redesign implementation.

- Planning: read v3 index.html, styles.css, script.js, example JSON, README, asset and three previews. New composition: header, overline + two-line headline/description panel, larger lifestyle photograph with caption, benefits row and footer label/CTA. Original files remain unchanged.
- Working: PostCSS source extraction now reads Template-example/layerfit_t07_lifestyle_benefit_v3/styles.css; maps engine canvas/tokens/scoped selectors and story→ertical; preserves each format's grid and source positioning. src/everyday-editorial.ts bumped to v0.2.0. Strict config includes kicker, eyebrow, up to 3 headline lines, photo caption, product label, verified description/feature fact IDs, alt and fixed image-position enum. Module emits source v3 structure; copy escaped; facts resolved; photo from asset ID and cover requires crop permission.
- Fixture uses source example demo-lifestyle.jpg and demo content only for local comparison; erified:true is only a test assertion and not substantiation or approval for ad publication. Source file path is now the v3 directory.
- Review/revise: package typecheck PASS; full test suite PASS 29/29 (including T02/T06/T07 v3/T09 existing tests). First integration attempt failed because script referred to old lifestyle-demo.jpg; corrected to the actual demo-lifestyle.jpg and re-ran successfully.
- Contract kit v0.2: 36 pass / 0 fail / 3 warnings (--lf-safe-* not used, one each format); not a strict safe-area acceptance.
- Actual engine render: square, portrait, vertical all success, zero violations/zero fitting steps, PNG and JPG decoded at 1080×1080/1080×1350/1080×1920. Source upscale warnings: 1.60×, 1.72×, 2.30× respectively. See rtifacts/t07-engine-port/engine-report.json.
- Side-by-side T07-source-vs-engine-{square,portrait,vertical}.png visually checked. Composition/photo focal/copy placement align; source system Arial vs engine Arimo causes small visible typographic differences; not exact pixel match. Pixel MAE exists in comparison-{format}.json, not a similarity percentage.
- Updated files: src/everyday-editorial.ts, src/everyday-editorial-css.ts, scripts/everyday-editorial-cases.ts, scripts/integrate-everyday-editorial.ts, 	ests/everyday-editorial.test.ts, T07-everyday-editorial.md. Artifacts overwritten under rtifacts/t07-engine-port/ with v3 comparison and engine renders.
- Limits: harness-only, no app registration; safe inset differs from engine profile; source CSS and adjacent engine worktree imports remain packaging dependencies. Source image is not approved campaign asset; no JMD/real brand/AI; visual sign-off pending. No engine files or counterpart log edited; no commit/push/deploy.

## 2026-11-17 — T11 Product Collection Hero from attached reference

**Status: local engine module and standalone package implemented/tested; user visual approval pending.** Latest user instruction prioritized converting attached image composition into HTML/CSS for the existing engine. Not a 100% photograph replication.

- Planning: read latest engine log (T08 entry), current template log/project requirements and existing adapters. Main visual reference is the attached Glow Theory screenshot (736×920). Clean product and hand photographs unavailable. Kept hierarchy: brand/tagline, centered red two-line title, description and pill CTA, three products with unequal scale/tilt/depth, double-part lower CTA banner. No screenshot-as-background shortcut, no reference claim/price/domain/logo copied as defaults.
- Working: new `src/product-collection-hero.ts` / `.css` (`product-collection-hero@0.1.0`). Shared config plus strict `t11` extension. One to three resolver-backed unique assets; first is central hero, next left/right, always contain. Logo optional. Headline lines must agree with headline. Description/benefits/offer only from verified fact IDs. Website validates display domain and appears only if supplied. Text escaped. Optional blocks omitted; stage expands when support copy/primary CTA absent. Safe-area tokens applied to principal slots; Story top250/bottom350 baseline. Existing engine files/log untouched.
- Assets: generated three original synthetic PNG products via SVG-to-raster only in fixtures; demo labels explicitly say DEMO ASSET. Shirt fixture tests another category. No hand, no original Glow Theory asset, no actual campaign facts, no AI image generation.
- Review/revise: first engine render correctly rejected rotated left product at x68 in Story (safe-left70); shifted left/right positions inward and reran. Kit's naive selector comma splitting warned on `:has(a,b,c)`; replaced with equivalent chained selectors rather than disabling strict kit. Final strict kit 115 pass / 0 fail / 0 warnings. Typecheck PASS; all template tests 32/32 PASS (3 new cases: 1/2/3 unique photos + contain, omitted optional blocks/no fabricated price/URL, escaping/schema/fact and photo failure paths).
- Real engine: `npx.cmd tsx scripts/render-product-collection.ts`, system Chrome. 9/9 placements successful (3-photo demo / 1 shirt / 2 distinct photos × 3 formats), PNG+JPG Sharp-decoded at exact 1080×1080 / 1080×1350 / 1080×1920, zero violations. Actual HTML saved per format and portrait as `index.html` in artifacts. Successful outputs retained on failed attempt. Inspected main square/portrait/vertical and one/two-product examples; contact sheet includes all placements.
- Standalone requested source package: `Template-example/layerfit_t11_product_collection_hero/` with HTML, exact same stylesheet, textContent-based safe data binding, example JSON, Puppeteer renderer, synthetic assets and bundled Inter/OFL licence. Arbitrary remote URLs/SVG URLs rejected; only package-local/embedded raster assets. Fields support original requested JSON interface; price/discount values require verified caller input and are never inferred. `node render.mjs` 3/3 success (bounds/overflow checked). Tested font/style match: portrait and Story exact pixels equal to engine demo; square MAE0.04263/255. This compares standalone vs engine, NOT fidelity to original reference photo.
- Deliverables: `artifacts/t11-product-collection/T11-collection-{square,portrait,vertical}.png/.jpg`, one/two-product cases, 3 editable HTML documents, contract/engine reports; standalone previews and source ZIP. Runbook `T11-product-collection.md`.
- Limits/handoff: module registered in harness, not application. Source code shares engine type/html imports at the adjacent worktree path until packages merge. Domain proof/ownership/expiry, real products/hands/brand assets, AI, JMD and user visual approval unverified. Synthetic previews aren't real product photography. Long arbitrary copy may fail layout fitting, intentionally not clipped. No commit/push/deployment.
