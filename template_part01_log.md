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

## 2026-11-18 — T05 Split Composition: engine module gate evidence (cross-check, no duplicate module)

**Status: template-side gate for the ENGINE-owned `split-composition@0.1.0` (worktree part02) PASSED; user visual approval and engine-owner cross-check pending.** User asked to "try T05". Cross-check of the engine work found a complete module at `src/templates/part02/split-composition/` (design credited to owner-supplied `Template-example/layerfit_t05`), including schema with contrast rules, fact-gated offer/proof, fit groups and safe-box layout, but no recorded render or contract-kit run. To avoid a third duplicated implementation (same open problem as `dark-offer-stack`), the template side did NOT add its own module; instead the engine module was run through the template-side gate.

- Planning: read `rendering_engine_log.md` (end: contract-kit entry), engine `src/shared/render-contract.ts` (v0.2, FORMAT_PROFILES, slot attributes), `fixtures/engine/harness.ts`, engine split-composition `index/schema/render/styles`, and source `Template-example/layerfit_t05/{index.html,styles.css,script.js,README.md}`. Source folder unchanged; no engine file edited; no counterpart log edited.
- Cases: `scripts/t05-split-composition-cases.ts`. Reference case = source default state (brand LAYERFIT, colors #173028/#e9e8e0/#d5f86a, headline "MAAK KENNIS MET PRODUCT A." with accent "PRODUCT A.", description, CTA, zero benefits, user-supplied demo photo, cover via allowCrop:true). Populated case = synthetic bottle asset (contain, allowCrop:false) exercising offer/proof facts, first-benefit-as-pill, chips, accent highlight. 11 schema-reject cases (two photos, callouts, comparison, accent not in headline, headline/benefit budgets, dark accent/secondary contrast, unknown font id, fourth benefit).
- Fonts: source uses system Arial; engine policy requires bundled fonts, so harness `fontRegistry` maps token `inter` to Arimo 400-700 (OFL-1.1). Engine CSS uses weight 900; browser synthesizes above 700 - the source did the same (Arial has no 900 face).
- Review/revise: contract kit initially failed `schema.strict` because two rejects were render-time failures (fact absent from snapshot), not schema failures; moved them out of `rejects` into a unit test that asserts `render()` throws for missing/partial fact maps. Type non-null fixes after that. No layout revision was needed.
- Evidence: typecheck PASS. Template suite 37/37 PASS (5 new T05 tests: kit zero-fail without browser, explicit schema rejects, budgets/one-photo, cover-vs-contain + accent + pill/offer slots, fail-closed facts). Strict kit: 77 pass / 0 fail / 0 warnings (`artifacts/t05-split-composition/contract-report.json`). Real engine renders 6/6 success (2 cases x 3 formats, language nl), 0 violations, 0 fitting steps; PNG+JPG Sharp-decoded at exact 1080x1080 / 1080x1350 / 1080x1920. Editable HTML per format + `index.html` (portrait). Contact sheet `T05-all-cases.png`; side-by-side `T05-source-vs-engine-{square,portrait,vertical}.png`; MAE and deliberate-difference notes in `comparison.json`.
- Deliberate differences (engine-owner design, recorded not judged): scaffold text dropped ("PRODUCT SPOTLIGHT - 05/15", "ONTDEK DE COLLECTIE" overline, "T / 05" corner code replaced by a star badge, footer slogan, "CREATIVE STUDIO" and page counters); floating pill text comes from the first benefit, not a static label; photo card follows the height left inside the safe box (smaller than source in vertical); all content inside engine safe tokens. MAE 23.14 (square) / 19.08 (portrait) / 38.01 (vertical) reflects these choices plus font and byte normalization - not a fidelity metric.
- Limits: engine module not registered in the application; reference case visual match is structural, not pixel; demo photo is the user-supplied crop, fixture-only; synthetic fixture texts say FIXTURE/DEMO ONLY and verified flags are test assertions; duplicate-implementation reconciliation for part01-vs-part02 remains open (dark-offer-stack precedent). No commit/push/deploy.

## 2026-11-18 — T12 Immersive Image + Editorial Copy ported from Template-example/LayerFit_T12

**Status: template-side module `immersive-editorial@0.1.0` implemented, gated and rendered; user visual approval pending.** User asked to export the LayerFit_T12 package into the engine as T12. Unlike T05, no engine-owned module exists, so the port is a full template-side implementation following the T11 pattern.

- Planning: read source index.html, styles.css, script.js, creative.example.json, README and previews (t12-square/portrait/story). Composition: full-bleed hero photo (~66/61/57% by format), centered dark eyebrow badge overlaying the photo, colored editorial panel with serif two-line headline + optional description; no CTA/footer/benefits/price/logo anywhere in the source. Source files unchanged; no engine file edited.
- Working: `src/immersive-editorial.ts` + `src/immersive-editorial.css` (`immersive-editorial@0.1.0`). Strict `t12` extension: optional eyebrow (≤48), 1–3 explicit headline lines that must agree with `copy.headline` (config strings cannot carry newlines), fact-gated `descriptionFactId` (body copy is a product claim), required `imageAlt`. Schema rejects: two assets, benefits, callouts, offer/proof/comparison IDs, brand logo, control characters, empty alt, >3 lines. Optional blocks hidden when absent. Photo is required but deliberately NOT safe-box-checked (full-bleed hero by design); `data-allow-crop` only when the asset permits cover. Compact headline class activates above the source's 74-character threshold.
- Fonts: source uses 'URW Bookman'/'Bookman Old Style' (serif) + Arial. Engine policy requires bundled fonts: heading token `fraunces` (bundled OFL-1.1 serif stand-in) and body token `inter` remapped to Arimo 400–700 via harness `fontRegistry` (spread over `FONT_REGISTRY` so engine defaults stay registered — first run failed with FONT_MISSING fraunces until registry was merged; `@fontsource/fraunces` installed in part01 devDeps).
- Review/revise: (1) kit `css.canvas` warning was caused by the literal string "1080px" inside a CSS comment, not actual sizing — reworded. (2) First render flagged SLOT_COLLISION scene↔eyebrow (badge intentionally overlays the photo) — resolved with `data-allow-overlap="scene"` on the eyebrow slot. (3) Vertical eyebrow used top:14% of the scene height (=153px, above safe-top 250) — replaced with `calc(var(--lf-safe-top) + 19px)` = 269px, preserving the source's canvas-relative position. (4) Panel bottom padding uses `var(--lf-safe-bottom)` and horizontal padding uses safe tokens instead of the source's 24–52px/60–76px clearances (deliberate Meta-UI-zone deviation).
- Evidence: typecheck PASS; template suite 42/42 PASS (5 new T12 tests: kit zero-fail without browser, explicit rejects, optional hiding/no fabricated CTA, compact activation boundary, escaping + fail-closed description fact). Strict kit 115 pass / 0 fail / 0 warnings (`contract-report.json`). Real engine: `npx.cmd tsx scripts/render-immersive-editorial.ts` with system Chrome; 9/9 placements success (reference state with user-supplied `reference-hero.jpg` composite crop; minimal state without eyebrow/description, contain fit; compact long-headline state, cover fit × 3 formats), 0 violations, PNG+JPG Sharp-decoded at exact 1080×1080 / 1080×1350 / 1080×1920. Fitting steps: 3 on reference vertical (headline 0.95/description 0.85), 0 elsewhere. Upscale warnings expected (source hero is a 600×397 reference crop; synthetic assets 300px).
- Artifacts: `templates/part01/artifacts/t12-immersive-editorial/` — contract/engine reports, 9× PNG+JPG, per-format HTML + `index.html` (portrait), contact sheet `T12-all-cases.png`, side-by-side `T12-source-vs-engine-{square,portrait,vertical}.png`, `comparison.json` (MAE 7.01 / 6.17 / 13.07; deliberate differences: Fraunces/Arimo stand-ins, safe-box panel padding, image byte normalization — MAE is not a similarity percentage).
- Limits: harness-only module, not registered in the application; reference hero is the user-supplied crop from their reference screenshot, fixture-only and never a LayerFit asset; fixture `verified:true` is a test assertion; long arbitrary copy relies on the fitter (not clipped); JMD, real brand assets and visual sign-off pending. No engine files, counterpart log or source folder edits; no commit/push/deploy.

## 2026-11-18 — T10 standalone description + CTA design revision

**Status: standalone preview complete with 3-format evidence; engine integration partial/pending.** User asked to add description and CTA while retaining the T10 source design. Scope explicitly kept to the standalone package, not the engine owner's uncommitted part02 implementation.

- Planning/counterpart check: read spec, audit, architecture, TODO, latest renderer log (T08), T10 HTML/CSS/script/example/README and existing renderer. Preserve lime-to-blue gradient, serif title left, portrait photo right, top microcopy and three bottom feature columns. No AI.
- Files: T10 index.html, styles.css, script.js, creative.example.json, README; new `templates/part01/scripts/render-t10-copy-revision.mjs`; TODO and verification. Optional description resolves exact text from a verified fact ID (140-char max), CTA is escaped plain text (32-char max) with thin underline and arrow. Shift title upward/reduce size slightly to fit support copy. Both absent restore source title geometry. Images limited to package-local or embedded raster data; no remote fetch.
- Evidence: command `node templates/part01/scripts/render-t10-copy-revision.mjs` PASS 3/3 standalone Chrome placements. PNG+JPG Sharp-decoded at exact 1080x1080 / 1080x1350 / 1080x1920. Text-range bounds, ordered headline/description/CTA/features (no overlap), optional hiding, HTML escaping, missing/unverified description fact rejection and remote-image rejection tested for each format. Initial overflow check incorrectly treated serif glyph protrusion below a tight line box as clipping; replaced with actual text-range bounds. Contact sheet visually inspected.
- Artifacts: `templates/part01/artifacts/t10-copy-revision/T10-{square,portrait,story}.png/.jpg/.html`, `T10-all-formats.png`, `report.json`. Original source previews retained. User reference crop used only for local design preview, not an approved campaign asset; demo description repeats source service labels, verified flag is a test assertion only.
- Limits/handoff: standalone only, no real-engine contract gate or app registration; part02 module and counterpart log untouched. Original inset positions retained, not engine-safe-area certified. Long arbitrary copy needs review. JMD, real brand and user visual approval pending. No commit/push/deploy.

### T10 follow-up — remove dotted decoration (18 November 2026)

- User requested removal of the dotted line. Removed the `.dots` element from standalone index.html and its CSS rules (including revision spacing overrides); description, CTA, gradient and photo retained. Engine files unchanged.
- Re-ran `node templates/part01/scripts/render-t10-copy-revision.mjs`: PASS 3/3 formats, PNG/JPG decode and binding/bounds checks. Updated HTML, images and contact sheet in `templates/part01/artifacts/t10-copy-revision/`. Standalone evidence only; engine/safe-area/user approval still pending. No commit/push.

## 2026-11-18 — T12 reference-only + description and CTA

**Status: reference-only revision `immersive-editorial@0.2.0` passes local engine gate; visual approval pending.** User explicitly selected reference and rejected minimal/compact variants.

- Updated module/CSS, cases, render runner and tests in templates/part01. Removed minimal/compact case generation and compact styling/logic. Kept reference mountain/phone hero, badge, serif headline and peach panel; description remains exact verified fact text. Added required CTA from copy.cta (reference: LEARN MORE), dark rectangular treatment echoing the eyebrow. Reduced copy spacing/type sizes as needed to fit within existing safe tokens without changing scene proportions.
- Evidence: `npm.cmd run typecheck` PASS; `npm.cmd test` PASS 42/42. `npx.cmd tsx scripts/render-immersive-editorial.ts` with system Chrome: strict kit 39 pass / 0 fail / 0 warnings; real renderOutput 3/3 reference placements succeed with zero violations and zero fitting steps. Six PNG/JPG Sharp-decoded at 1080x1080 / 1080x1350 / 1080x1920. Expected image upscale warnings 1.80/2.07/2.76x (600x397 source). Tests cover reference-only selection, CTA escaping, optional field hiding, and missing/unverified description fact failure.
- New active artifacts: `templates/part01/artifacts/t12-reference-cta/` (T12-reference-{square,portrait,vertical}.png/.jpg, per-format HTML + index.html, T12-reference-all-formats.png, contract/engine/comparison reports and source comparisons). Contact sheet visually inspected. Prior t12-immersive-editorial outputs retained as historical evidence only, not current variants.
- Limits: fixture reference photo/copy only, verified flag is a test assertion. Harness-only; application registration/JMD/real brand and user approval pending. Original standalone source remains comparison baseline; current revised editable HTML is in the new artifact folder. No engine-owner file or counterpart log edits; no AI, commit/push/deploy.

## 2026-11-18 — T11 replaced with Semaglutide Question Banner

**Status: replacement module and standalone package pass local gates; human medical/visual review and JMD remain blocked.** User selected the source in `Template-example/t12-semaglutide-banner`, requested a CTA and minor spacing/overlap cleanup, and confirmed replacing T11 at package + engine level.

- Replaced `src/product-collection-hero.ts/.css` implementation (kept paths for compatibility) with `semaglutide-banner@0.2.0`; contract now requires exactly one uncropped image, caller CTA, and IDs for verified headline, subhead and disclaimer. Old multiple-product/offer/benefit/website fields removed. All medical copy fails closed if missing/unverified; output escaped. CSS follows source gradient/question/vial/wordmark/disclaimer design; CTA added as compact cream action; square/portrait/vertical adapted. T11 case fixtures generate a visibly marked synthetic DEMO vial rather than use reference drug image.
- Replaced standalone folder contents at `Template-example/layerfit_t11_product_collection_hero/` and export script; regenerated bundled local fonts, synthetic vial, previews and ZIP. Source folder `Template-example/t12-semaglutide-banner/` left unchanged. Old T11 artifacts retained as historical.
- Review/revise: first real render caught brand/disclaimer overlap and safe-box issues; corrected positions. Standalone collision check caught subhead-brand overlap caused by browser default margins plus font metrics; added template margin reset/reduced subhead font and shifted wordmark. Final square headline moved below safe-top. Final engine and standalone reruns pass.
- Evidence: typecheck PASS, entire part01 test suite 42/42 PASS; strict kit 39/0/0; real engine 3/3 formats success, zero violations, PNG/JPG exact 1080x1080/1350/1920 and Sharp decoded; standalone renderer 3/3 PASS with canvas bounds, overflow and pairwise slot overlap checks. Visual inspected at full-size square and contact sheet.
- Artifacts: `templates/part01/artifacts/t11-semaglutide-banner/` (engine reports, 3 PNG+JPG, per-format HTML, synthetic vial, contact sheet); standalone previews under `Template-example/layerfit_t11_product_collection_hero/previews/`; ZIP refreshed.
- Limits: semaglutide headline/subhead/disclaimer examples and SAMPLE BRAND are fixture/demo content; `verified:true` is test assertion only. This does not establish medical or legal substantiation. Synthetic vial is not medication/product art. Portrait/vertical are adaptations to a square-only source. No AI, JMD, app integration, production or visual approval. No commit/push.

### T11 follow-up — balanced tall-format typography (18 November 2026)

- Replaced independent percentage positioning in portrait/vertical with one centered flow stack inside the safe box (22px/26px gaps). Balanced support text into a constrained column, restored normal letter spacing, increased line-height, reduced oversized wordmark, and brought disclaimer/CTA back into the same group. Square unchanged. Module version `semaglutide-banner@0.2.1`. Standalone markup now uses the same layout wrapper; CSS/export/previews/ZIP updated.
- Typecheck PASS; suite 42/42 PASS; strict kit 39/0/0; real engine 3/3 PASS, zero violations, exact PNG/JPG dimensions. Standalone 3/3 PASS for bounds/overflow/collisions and 20-30px tall-format gap check. New contact sheet visually inspected: `artifacts/t11-semaglutide-banner/T11-all-formats-v021.png`. Old contact-sheet file was locked for writing on first attempt; new versioned path used, final runner passes. Fixture-only medical text/synthetic vial; no medical approval, app/JMD verification, AI, counterpart edits, commit/push or deployment.

## 2026-11-18 — T15 folder exported to lifestyle-benefit engine module

**Status: template-side module gated and rendered in all three formats; visual/source approval pending.** User requested exporting `C:\Users\Asus\Layerfit-JMD\Template-example\t15` to the engine. Note the supplied README names the design T21; module ID is descriptive (`lifestyle-benefit-editorial@0.1.0`) to avoid an ambiguous numeric ID.

- Read source HTML/CSS/JS/example JSON/README and previews. Preserved header brand+eyebrow, large two-line headline, lifestyle image, lime vertical side note, support copy, two unboxed benefits and ruled CTA. Source desktop copy/benefit arrangement retained for square/portrait; vertical reflowed to avoid source's image/text overlay and fit engine safe zone. No CTA or copy invented beyond supplied demo.
- Added `src/lifestyle-benefit-editorial.ts/.css`, `scripts/lifestyle-benefit-cases.ts`, `scripts/render-lifestyle-benefit-editorial.ts`, `tests/lifestyle-benefit-editorial.test.ts`. Schema: exactly one photo; crop only when asset config allows, else contain; description/benefits are fact-ID grounded and fail closed; optional logo resolver; copy escaped. User-provided `demo-bag.jpg` appears to be a crop from reference, so tests use generated synthetic demo bag instead and source folder is unchanged.
- First render: strict kit 39/0/0; square/portrait failed expected safe-area checks due photo/note/copy 8px outside engine insets; portrait also had vertical-note overflow. Updated photo/copy alignment to safe tokens and decreased note lettering, then reran. Vertical passed without change.
- Evidence: `npm.cmd run typecheck` PASS, `npm.cmd test` PASS 45/45; strict contract kit 39 pass/0 fail/0 warnings; real render 3/3 formats pass, 0 violations; six PNG/JPG decoded exact 1080×1080 / 1080×1350 / 1080×1920. Contact sheet inspected.
- Artifacts `templates/part01/artifacts/t15-lifestyle-benefit-editorial/`: reports, synthetic fixture asset, square/portrait/vertical PNG/JPG, per-format HTML + portrait index, `T15-all-formats.png`.
- Limits/handoff: module is harness-only and not app registered. Source folder `t15` README calls its composition T21. Fixture verified flags are test assertions only; supplied photo crop is not used as production default. Real brand/facts/JMD/user approval pending. No AI, engine-side change, counterpart log edit, commit/push or deployment.

## 2026-11-18 — T13 Editorial Sale Redesign exported to engine

**Status: template-side module passes contract, unit and real-render gates; promotion/legal review and app/JMD approval pending.** User supplied `Template-example/LayerFit_T13_Editorial_Sale_Redesign`; README and preview assets say T22, so implementation uses descriptive id `editorial-sale-promo@0.1.0` rather than infer another numeric registry ID.

- Added `src/editorial-sale-promo.ts/.css`, `scripts/editorial-sale-promo-cases.ts`, `scripts/render-editorial-sale-promo.ts`, `tests/editorial-sale-promo.test.ts`. Preserved editorial promo hierarchy and CTA; adapted portrait and vertical placement. Exactly one resolver-backed photo; cover fit only with allowCrop. Description and fine print fact-bound. Discount value is never accepted as a free config number: required verified `offerFactId`, parser requires a percent token and 0 < percent ≤100; demo copy displays a visible DEMO warning only when demoMode=true. `verifiedPromotion` boolean from source is not used as evidence.
- Fixture uses generated synthetic package art only; original `demo-product.jpg` appears a reference crop, not used in engine tests. `verified:true` fixture is only a code-path assertion.
- Evidence: typecheck PASS, full suite 48/48 PASS, strict kit 39/0/0, real engine 3/3 renderOutput success/0 violations, PNG+JPG decoded exact dimensions. Earlier render exposed offer overflow from font-relative line height and square photo 16px outside safe right; tied number/percent typography to the fit-group font size and aligned image to safe token. Final rerun clean. Contact sheet inspected.
- Artifacts: `templates/part01/artifacts/t13-editorial-sale-promo/` (reports, 3 PNG/JPG, HTML, contact sheet, synthetic fixture).
- Limits/handoff: local harness only; source folder unmodified. Source/README naming conflict (folder T13, preview/README T22) remains noted. No claim approval, actual campaign facts/assets, JMD/app registration, AI, engine-owner changes, commit/push or deployment.

## 2026-11-18 — T18 Mediterranean Fashion Poster exported to engine

**Status: template-side `mediterranean-fashion-poster@0.1.0` passes local gates; visual/brand/promo signoff and JMD remain pending.** Source folder is `Template-example/t18`; its README and preview names design T19, so module ID is descriptive rather than numeric.

- Added `src/mediterranean-fashion-poster.ts/.css`, `scripts/mediterranean-fashion-cases.ts`, `scripts/render-mediterranean-fashion-poster.ts`, `tests/mediterranean-fashion-poster.test.ts`. Preserved paper grain/palette, 3-color headline pyramid, script accent with leaf sprig, meander edge strip, framed arch photo + offset shadow, starburst badge, price/address, event row and ink CTA footer. Portrait/vertical adapted to safe area. Engine OFL font IDs substitute for source Archivo/Pacifico/Cormorant (no source TTF copied into engine).
- Promo truth: fact IDs required for headline, badge/scarcity, price/address and accent line; optional event fields are also fact IDs. Exact line/badge strings must equal fact text. Assets are resolver-backed, one image; cover only when crop allowed, contain otherwise. Local fixture creates synthetic DEMO linen/denim garments; user photos are not used.
- Evidence: `npm.cmd run typecheck` PASS; full suite 51/51 PASS; strict kit 77/0/0; real renderOutput 6/6 (two fixture cases × 3 formats), zero violations; twelve PNG/JPG Sharp-decoded at exact 1080×1080 / 1080×1350 / 1080×1920. Contact sheet inspected.
- Review/revise: initial kit passed but browser caught badge extending outside its photo slot (placed as sibling with explicit overlap), full-bleed CTA slot triggering horizontal safe violation (slot moved to CTA label, background retained), event text overflowing narrow center-brand columns (typography tightened and fixture wordmarks shortened). Final render and all tests pass.
- Artifacts: `templates/part01/artifacts/t18-mediterranean-fashion-poster/` (contract/engine reports, two synthetic assets, 6 PNG+JPG, per-format HTML, `T18-all-cases.png`).
- Limits/handoff: source previews are screenshot-derived demos; no pixel-match assertion. Folder T18/README T19 conflict documented. Fixture `verified:true` is not substantiation. App/JMD/actual brand and visual review pending. No AI, source edits, engine-owner files/log, commit/push or deployment.

## 2026-11-18 — T19 After Dark Editorial exported using normalized canonical slots

**Status: `after-dark-editorial@0.1.0` passes template and real-render gates; user visual approval pending.** User specifically referenced `slot_normalization_plan.md`; read its approved Phase 4 decisions and canonical model/slot vocabulary. Source README calls design T19 and source contains event-specific variables, which are not copied into a template extension.

- Canonical config only, no `t19` object. Mapping: brand/brandMark→`brand`; source series→`copy.eyebrow`; headline→`copy.headline` + optional `accentPhrase`; exact event details→`copy.body` + required `bodyFactIds`; source photo label→`productName` (also image alt); CTA→`copy.cta`; sticker→optional `offerFactId` else `heroFactId`. Edition, issue and free badge are dropped; no separate date/time/venue/address properties. One scene asset, allowCrop decides cover/contain. Added normalized `content` manifest.
- Design keeps dark editorial headline/serif emphasis, photo-stage with optional starburst and details panel; source CTA is absent but normalized contract requires a CTA, so caller-provided CTA occupies its own footer bar. Starburst only appears from fact IDs, not free badge text.
- Fixture: generated synthetic restaurant/table image via SVG-to-PNG; user-provided `food-demo.jpg` reference crop not copied/reused. Demo event/details/hero benefit with verified:true are assertions only.
- Evidence: `npm.cmd run typecheck` PASS; full suite 54/54 PASS; strict kit 39/0/0; renderOutput 3/3 formats success, zero violations; 6 PNG/JPG Sharp-decoded at target dimensions. Contact sheet visually inspected.
- Files: `src/after-dark-editorial.ts/.css`, `scripts/after-dark-editorial-cases.ts`, `scripts/render-after-dark-editorial.ts`, `tests/after-dark-editorial.test.ts`; logs/TODO/verification. Artifacts under `templates/part01/artifacts/t19-after-dark-editorial/`.
- Limits/handoff: exact body text must equal the verified fact text (or its joined facts); no free-form date/location. Source's static subheadline and standalone badge fields are not carried across. Module harness-only, no app/JMD/real brand/event approval. No AI, source or engine-owner edits, commit/push/deploy.

## 2026-11-18 — T13 + T18 portrait/story balance revision

**Status: v0.2.0 layout revision validated locally; user visual approval pending.** User reported unbalanced placement, excessive margins and unprofessional-looking tall-format spacing. Reviewed previous full-size renders and source structure; counterpart renderer log still ends with T08. Only template-side T13/T18 changed.

- T13: added layout/offer/message wrappers. Portrait/story use a single safe-area grid with equal promo/product columns (32px gutter), a centered lower message/CTA block (20px rhythm), and aligned terms. Percentage typography line-height corrected to avoid glyph overflow. Product fixture changed to contain/no-crop so it remains fully visible rather than cropped into the bottom of a wide frame. Square composition otherwise retained.
- T18: replaced tall-format space-between with a centered poster stack, 30/32px rhythm, larger arch photo, calmer headline line-height, one centered brand row and two equal event-info columns (22px text instead of tiny narrow side labels). Existing source palette/decorative identity and safe-box CTA retained. Fact-gating unchanged. Both module versions now 0.2.0.
- Files: src/editorial-sale-promo.ts/.css, src/mediterranean-fashion-poster.ts/.css, T13 fixture/test, both render runners and new scripts/verify-t13-t18-layout.mjs. Source standalone folders and engine-owner code untouched.
- Evidence: typecheck PASS; full suite 51/51 PASS; T13 strict kit 39/0/0, T18 77/0/0. Actual engine renderOutput 3/3 T13 + 6/6 T18 placements PASS, zero violations; 18 PNG/JPG decoded at exact dimensions. Full-size T13 portrait and both contact sheets visually inspected. Browser geometry regression 6/6 tall placements PASS: T13 equal widths/gutters/margins + message center/spacing; T18 center axis/gaps/column symmetry + CTA clearance.
- Artifacts: existing per-format render folders updated; latest sheets `artifacts/t13-editorial-sale-promo/T13-balanced-v020.png`, `artifacts/t18-mediterranean-fashion-poster/T18-balanced-v020.png`; geometry report in `artifacts/t13-t18-layout-review/geometry-report.json`. Old contact sheets are historical. First T13 contact sheet write hit Windows file-lock behavior; new versioned filename used. Initial browser checker TS callback hit tsx __name serialization; plain ESM checker resolves it and rerun passes.
- Limits: test-only prices/claims/fact assertions and synthetic product art; no advertising performance, universal Meta-safe or production approval claim. Source folder T13/T18 labels differ from README IDs as already recorded. JMD/app registry/actual campaign and visual signoff pending. No AI, counterpart files/log, commit/push or deploy.

### T18 quick revision — remove top border decoration

- Removed the top meander element and its CSS rule only; bottom story ornament and other layout unchanged. Module v0.2.1. Focused T18 tests 3/3 PASS including top-border absence; strict kit 77/0/0, real engine 6/6 PASS with zero violations. Latest sheet `artifacts/t18-mediterranean-fashion-poster/T18-no-top-border-v021.png`; new filename avoids the Windows lock on the previous preview. No source/engine-owner changes, AI, commit/push/deploy.

## 2026-11-18 — T19 corrective extraction: restore actual source design

**Status: source-fidelity revision v0.2.0 rendered and compared; NOT engine safe-inset acceptance.** User rejected the previous interpretation, synthetic preview and invented border. Explicit instruction is to extract the reference faithfully. Removed the earlier redesigned stylesheet, invented meander and separate CTA bar. `after-dark-reference-css.ts` now parses the supplied t19/styles.css with PostCSS: scopes selectors, maps story to vertical and IDs to class names, replaces engine canvas/font plumbing, retains original geometry. Headline remains one canonical string with accentPhrase; a wrapping lead preserves the source three-line appearance without headlineLines config. Small serif-spacing adjustments compensate bundled font metrics.

- Canonical mapping: brand masthead + text-only brand-name in footer; series -> eyebrow; original italic subheadline -> description/bodyFactIds; source ONE NIGHT ONLY -> offer-or-hero opening line; SAVE THE DATE -> canonical CTA circle (no extra bar); date/time/address -> three verified short benefits; photo caption/alt -> productName. Footer wordmark uses first slash-separated part of brand.name. Fixed issue number is static source ornament. No t19 extension. Logo/name core supported. Header/photo/footer positions now follow source, not a centered reinterpretation.
- Original food-demo.jpg used only for user-requested local source-photo fixture comparison, never as a production default. Synthetic scene remains a separate case. Arimo replaces source Arial metrics; DM Serif Display substitutes Georgia under bundled-font policy; not exact pixel identity. Reference claims remain test-only verified assertions. Body/benefit renderer validates verified fact ID membership per normalization R4, not semantic truth of paraphrases; upstream grounding/human review remains required.
- Shared kit changed during work to run manifest-derived max/min/no-logo/no-offer cases. T19 supports them, including same-raster logo/photo falling back to contain (respect non-croppable logo). No engine files edited. Synthetic base remains test-only; reference and synthetic cases both retain successful outputs.
- Evidence: typecheck PASS; focused T19 tests 4/4 and full part01 suite 55/55 PASS. Contract kit 247 pass / 0 fail / 18 warnings, all deliberate css.tokens safe-inset warnings (source CSS does not read frozen engine safe insets). This is explicitly NON-STRICT fidelity evidence, not a zero-warning safe-area claim. Actual renderOutput 6/6 success, PNG/JPG decoded exact sizes, no remaining non-safe-inset layout violations. Source positions are not data-safe checked; square/story reference text lies outside frozen insets by design. No hidden suppression of safe-area approval.
- Artifacts: `artifacts/t19-source-fidelity/` (T19-{square,portrait,vertical}.png/.jpg/.html, synthetic alternatives, reports, reference contact sheet T19-reference-v020.png, source-vs-engine-{format}-v020.png comparisons, comparison.json). Visual inspected source/engine portrait and story side by side. Old `t19-after-dark-editorial` is superseded.
- Limits: canonical normalization retained, but source-specific geometry intentionally differs from safe profile. Font serif shape is visibly not identical. User visual, app/JMD and real event/brand approvals remain pending. Source package untouched; no AI, commit/push/deploy or counterpart log edit.

## 2026-11-18 — T20 Symmetric v2 extracted, canonical fields and neutral palette

**Status: source-extracted module rendered/compared, user review pending.** User provided `Template-example/LayerFit_T20_Symmetric_v2`, then explicitly requested no pink: a neutral palette suitable across products. Read source HTML/CSS/JS/JSON/README/previews, approved slot_normalization_plan.md and latest counterpart log. No edits to source or engine-owned worktree.

- Added `src/circular-product-benefits.ts` and `circular-product-benefits-css.ts`, `scripts/circular-product-benefits-cases.ts`, `render-circular-product-benefits.ts`, `verify-t20-fidelity.mjs`, tests and T20 runbook. Module `circular-product-benefits@0.1.0`. Source CSS extracted via PostCSS; original orbit/product/five-label coordinates retained. Palette switched to off-white #f6f5f1 / warm gray #e8e6df / charcoal #252b27, with neutral ring/subtext/shadows. No invented border/UI. Small separate CTA text added below labels as required by canonical model; source lacks CTA.
- Canonical mapping: brand/logo->brand; topline->copy.headline; optional copy.eyebrow; one top hero/offer fact + four copy.benefits for five radial positions. First three benefits have canonical individual slots; all four belong to benefits container (no noncanonical benefit-4). One string per benefit, presented as two balanced word groups without changing word order/content. No t20 extension, title/subtitle or headlineLines fields. ProductName supplies alt. Exactly one contain-fit asset; scene fallback also contain, no crop. Hero duplication in benefits rejected; fact IDs checked verified and escaped output. Content manifest declares supporting benefit phrases rather than body paragraphs.
- Reference cutout from user package used only as local comparison fixture; separate synthetic DEMO cutout generated. Reference wax benefit claims/brand are not substantiated campaign facts: fixture verified:true flags only test control flow.
- Evidence: typecheck PASS; full suite 58/58 PASS. Contract kit 267/0/18: warnings only css.tokens because original source insets are preserved. This is not strict safe-area acceptance. Real renderOutput 6/6 reference+synthetic placements, zero layout violations, PNG/JPG decoded exact dimensions; no fitting needed. Source cutout upscales 1.11/1.20/1.22x (425x374 source).
- `node scripts/verify-t20-fidelity.mjs` PASS 3/3: header, image, orbit, label coordinates match source geometry within 2px under identical bundled Arimo and neutral palette; center axes/left-right widths/margins/baselines, no overflow and CTA clearance checked. Initial source/engine font-family mismatch detected actual glyph width differences (Windows Arial vs Arimo); baseline deliberately uses same bundled font to isolate geometry, not relaxed tolerances. Raw source previews unmodified. Neutral source vs engine portrait/story visually inspected.
- Artifacts: `templates/part01/artifacts/t20-circular-product-benefits/` (reports, reference+synthetic fixtures, 6x PNG/JPG, per-format HTML, T20-neutral-final-v010.png, source-neutral comparisons, fidelity-geometry-report.json). Runbook `templates/part01/T20-circular-product-benefits.md`.
- Limits: local harness only. Source positions deliberately not engine-safe certified, particularly story header/lower labels; user visual and actual brand/claim/font approvals/JMD/app registration pending. Reference photos are not production defaults. No AI, commit/push, deployment, source or counterpart edits.
