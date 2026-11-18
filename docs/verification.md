# Verification report — foundation prototype

Date: 16 November 2026. Local prototype authorized for synthetic assets only.

## Completed and tested
- Reference clone clean: `git status --porcelain` returned no changes after work.
- `npm.cmd run typecheck`: pass.
- `npm.cmd run lint`: pass.
- `npm.cmd test`: 3 tests pass (escaping, input/path/CSS validation, image decode and SVG rejection).
- `npm.cmd run test:render` with system Chrome: pass. Two synthetic product inputs (shirt and bottle), one Product Hero concept, three dimensions each. Six PNG and six JPG files decoded and dimension-checked. Text/image layout bounds checked before screenshots. Three corrupt-asset outputs failed without losing successful images.
- Contact sheet visually inspected: images contained, headline/body/CTA visible, distinct square versus tall composition. This is technical validation, not final LayerFit design approval.
- Final measured smoke duration 5237ms includes browser launch, six renders/JPEG conversion, three intentional failures and contact-sheet/report work. Not an AI batch benchmark or a claim about 45-image speed.
- Final dependency installation reports zero vulnerabilities; production audit also zero. Puppeteer upgraded from reference 25.1.0 to 25.17.0 and Sharp to 0.35.5 due to observed advisories. TypeScript ESLint nested minimatch override ^11.0.1; lint passed with override. Reference dependencies untouched.

## Artifacts
`artifacts/foundation-smoke/report.json`, `render-log.json`, `contact-sheet.png`, and individual `synthetic-shirt-*` / `synthetic-bottle-*` PNG/JPG. Ignored by Git, available in this workspace. Reproducible via `scripts/render-smoke.ts`.

## Environment failures and resolution
Initial rendering timed out. Pinned updated Chrome download left an incomplete cache; older cached Chrome failed Network.enable. Explicit system Chrome executable (`C:\Program Files\Google\Chrome\Application\chrome.exe`, installed directory 157.0.8103.52) succeeded. Renderer now has launch/protocol/readiness timeouts and configurable executable path. Tight headline line-height triggered overflow validation and was corrected before the successful run. No user browser profile/cookies used; no infrastructure changes or deployment.

## Partial / not implemented
- Foundation renderer is partial M1. No Next.js UI/API server, database, actual HTTP upload, campaign management, job queue, favorites/editor or ZIP yet.
- One concept only; 15-concept/45-image requirement not fulfilled.
- System Arial/Georgia fonts are a prototype fallback, not bundled brand fonts. Logo handling and approved LayerFit styling still pending.
- AI strategy, semantic claim grounding and usage/cost ledger not implemented. No provider call made; token usage/cost **not measured**, not reported as zero-cost AI.
- No full browser E2E tests, live-product test or real LayerFit outputs.
- Browser launch/page creation failures can still abort a batch; durable job recovery and persist-on-fatal-error remain required for production reliability.
- Geometry checks cover required regions; comprehensive overlapping-element/glyph checks and long-copy fitting still pending.
- Clean-install verification and Linux/JMD rendering still pending.

## Blockers
JMD access/configuration and deployment permission; approved provider credentials/model/rates; real brand guidelines/assets; verifiable Dutch ad examples (Meta access attempt failed). Local implementation can continue with simulation fixtures, but these blockers prevent official acceptance.

## Next implementation gate
Finish M1 with persisted campaigns/assets and one-template web create/render/reopen flow, then M2 validated real AI strategy/cost tracking. Keep completed code separate from verified acceptance claims in TODO.md.

## Template Part 01 execution — CP00–CP02 partial evidence (17 November 2026)

Implementation resides in `templates/part01/` and is intentionally isolated from production renderer work:
- CP00: four reference screenshots mapped in `template_part01_plan.md`; T01 wireframes/contract documented in `templates/part01/README.md`. Wireframes/contracts for T02–T04 remain pending.
- CP01 partial: local Tailwind v3 build, strict Zod schema, CSS format profiles, local CSS bundle and smoke harness. No CDN; root app/registry/asset-ownership resolver/font bundle and production engine integration remain pending.
- CP02 partial: dynamic Annotated Product Hero T01. Two synthetic fixtures (shirt, bottle) × three explicit formats = 6 placements; PNG/JPG encoded and Sharp-decoded = 12 files. All six PNG renders were visually inspected. Shirt connector geometry appears coherent for its supplied synthetic stage anchor; anchor-to-object accuracy is not proven or editor-driven.
- `npm.cmd ci`, `npm.cmd run build:css`, `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd audit`, and `npm.cmd run smoke`: passed. Six unit tests passed; npm audit reports zero vulnerabilities in this subproject lockfile. Build prints a caniuse-lite freshness warning (not a build failure).
- Smoke run reported 2.842 seconds for six placement renders/encodes on this local Windows machine with system Chrome; this is not a benchmark/SLA for production or 45 images.
- Artifacts are local and ignored under `templates/part01/artifacts/template-part01/`.

Still not verified: maximum/long Dutch copy, font bundling/brand font readiness, actual upload byte decode/asset ownership, fact truth/offer expiry, anchor mapping to image content after contain, all three benefits, one-photo fallback as a dedicated assertion, integration with Claude's renderer, application E2E, four-template/15-template batch, JMD server, real AI, or approved brand design. Template smoke is not acceptance of the application.

## T02 Dual Panel — CP03 template-level gate (17 November 2026)

- Added `templates/part01/src/dual-panel.ts`: persisted config references asset IDs; engine-resolved raster assets are supplied separately. Default `dual-benefit` mode does not imply competitor comparison. `verified-comparison` requires an evidence ID; panel factual copy requires fact IDs. Domain-level ownership/truth validation is still external.
- Built T02 as an HTML body fragment scoped to `.lf-dual-panel`, in line with the draft proposal that the engine owns document shell/canvas. Two photo panels render side-by-side in square/portrait and stacked in vertical. One-photo fallback shows a contained product on the left and informational panel on the right. Lifestyle/detail can crop only when crop is explicitly allowed.
- Verification: Tailwind CSS build, TypeScript typecheck, 12 unit tests, and `npm.cmd run smoke:dual-panel` passed. Two synthetic fixtures × three formats = 6 placements, 6 PNG + 6 JPG decoded at exact dimensions. Comparison without evidence rejected. Six PNGs visually inspected; vertical title contrast and initial line-box clipping were revised before the final smoke run.
- Final T02 smoke duration: 2835ms local Windows/system Chrome for six placements/encodes; not a throughput/SLA benchmark. Artifacts under ignored `templates/part01/artifacts/template-part01/dual-panel-*`.
- T01 regression smoke passed after T02 module/scoped CSS update (two fixtures × three formats; 6 PNG + 6 JPG, 2916ms observed). This is template smoke only, not engine/app E2E.
- Renderer contract at `docs/contracts/render-template-contract.md` is still marked draft v0.1. No `rendering_engine_log.md` was found in the main tree or engine worktree when CP03 began. Therefore no integrated/contract-conformance claim is made; record this handoff for Claude.
- Remaining: positive evidence-backed comparison render, long/max Dutch copy, asset/fact campaign ownership, bundled-font verification, production engine integration, full app, JMD and real brand validation.

## T03 Dark Offer Stack — CP04 partial evidence (17 November 2026)

- Added `templates/part01/src/dark-offer-stack.ts`. The stored creative schema has `offerFactId`/`proofFactId`, not free labels. Render-time fact text is looked up from the supplied verified-fact map; missing IDs fail closed. Benefit copy carries fact IDs. Config only references asset IDs; resolver-issued raster bytes arrive separately.
- Added optional proof and offer blocks. No offer/proof means no placeholder, discount, price, urgency, Trustpilot stars, Klarna mark or competitor content is emitted. Product photos render contained in rounded rectangles; lifestyle/detail crop is allowed only with explicit permission. One photo appears once.
- Added local compiled CSS with square/portrait/vertical dark poster profiles, fit groups and semantic slots. Renderer shell, format tokens, asset ownership, truth/expiry validation and storage remain engine/domain responsibilities.
- Verification: `npm.cmd run build:css`, `npm.cmd run typecheck`, `npm.cmd test` (17/17), `npm.cmd audit` (0 vulnerabilities), and `npm.cmd run smoke:dark-offer` all passed. Two synthetic fixtures × three formats = 6 placements and 12 decoded images. All six PNGs were visually inspected. Footer safe-bottom assertion and exact dimensions passed. Smoke duration 2480ms local Windows/system Chrome; not a throughput promise.
- Artifacts: ignored `templates/part01/artifacts/template-part01/dark-offer-*`. The offer/proof-positive fixture visibly states `TEST FIXTURE ONLY`; do not distribute/publish it as a real ad.
- CP04 remains **partial**: the standalone template cannot determine expiry, campaign ownership, or whether evidence supports a factual claim. Production/domain validation of active offer and proof is not implemented. No positive real offer, review, or JMD test has been run. Engine integration and final design approval remain pending.

## T04 Editorial Reframe " CP05 port of user-supplied HTML/CSS + first real-engine render (17 November 2026)

- User supplied Template-example/index.html + styles.css (1080x1080) with reference-derived ssets/product-scene.jpg / ssets/brand-logo.png, and instructed to copy it into the engine rather than redesign. T04 was ported, not reinterpreted: 	emplates/part01/src/editorial-reframe.ts + editorial-reframe-css.ts reproduce the supplied composition (top review block, centered headline with red accent span, italic subheadline, photo frame, black bottom price/CTA strip + logo/brand name).
- Contract conformance: engine contract kit (v0.2) reports 29 pass / 0 fail / 0 warn over two synthetic cases (rtifacts/t04-engine-port/contract-report.json). Reviews/stars are emitted only from a verified proof fact that itself carries the star glyphs; offer text only via offerFactId; missing facts fail closed. No invented rating, price or competitor content in test data.
- First real-engine render pass: both synthetic cases through the actual enderOutput pipeline returned status: success with zero layout violations; PNG+JPG artifacts decoded at exactly 1080x1080 (engine-report.json). 
pm.cmd run typecheck passed. No engine file was modified; module imports the shared contract types from Claude's uncommitted worktree to keep SafeHtml identity.
- Side-by-side evidence: rtifacts/t04-engine-port/T04-source-vs-engine.png (supplied source | engine render shirt | engine render bottle). Composition matches. Known accepted differences: Inter stands in for the source's Arial pending brand fonts; review block correctly absent in no-fact test cases; fixture photos render contain-fit per synthetic asset data.
- Limits: square only (the supplied reference has no portrait/vertical design); reference-derived photo/logo appear only in synthetic local renders; engine-side work remains uncommitted in Layerfit-JMD-engine; visual approval is the user's call under the same standard as T01.

## T04 revision after user rejection - verbatim port + reference-example case (17 November 2026)

- User rejected the first engine port (stars missing, geometry off) and asked for the supplied HTML/CSS to be used directly. Root causes: (1) missing review/price blocks were fail-closed test cases without facts, not a template flaw; (2) geometry had been snapped to engine safe insets, shifting the composition; (3) photo used contain instead of the source's cover.
- Fixes: verbatim source geometry (reviews top 47, headline 138/45, subheadline 349/50, photo-frame 158/442 766x494, bottom-strip bottom 28); photo cover with allowCrop; third case eference-example built from the user-supplied reference files and example values (explicitly NOT verified LayerFit claims, local study only); five stars derived from the fact's rating; offer split into label + red price at the colon; logo via rand.logoAssetId.
- Engine constraints resolved without touching engine files: Arial is rejected (FONT_MISSING), so the fixture harness maps the inter token to Arimo (OFL, Arial-metric-compatible); headline padding-bottom: 0.25em absorbs line-height-0.96 glyph-ink overflow; 	ext-wrap: balance reproduces the source's manual line break; -webkit-text-stroke: 3px calibrated by pixel statistics (headline greyscale mean: source 184.82 vs engine 185.47, 0.25% remaining ink difference).
- Evidence: contract kit 40 pass / 0 fail / 3 deliberate css.tokens warns (safe-inset deviation is intentional and logged as an open contract item); real enderOutput: 3/3 cases success, zero layout violations; reference case ittingSteps: 0 (86px unscaled, same as source); typecheck pass; upscale warnings only (photo 1.14x, logo 1.13x, source crops are low-res). Side-by-side: 	emplates/part01/artifacts/t04-engine-port/T04-source-vs-engine.png.
- Limits: square only; subheadline italic is synthesized (no italic face in the OFL stand-in); minor letterform differences remain (Arimo vs the reference's Helvetica/Arial rendering); safe-inset deviation and Arimo mapping need both owners' sign-off; visual approval is the user's call.

## T02 supplied comparison-banner port (17 November 2026)

- `templates/part01/src/comparison-banner.ts` exports a square `TemplateModule` (`dual-panel` v0.3.0); `comparison-banner-css.ts` extracts the actual supplied stylesheet with scoped selectors and page-preview chrome removed. The supplied three-photo composition, slogan, badge, cross/check lists and circle image are retained. Source files and old T02 implementation are unchanged.
- Same local Montserrat/Poppins fonts for source baseline and engine, no external network font requests. Baseline is the actual source DOM at 1080×1080 without page padding; engine photos are normalized by its normal asset resolver.
- Final typecheck PASS; template suite 20/20 PASS (3 new T02 tests cover escaping, missing facts/evidence, strict schema and crop permission). Contract kit 13 pass / 0 fail / 1 warning for unused safe tokens; strict contract gate not passed. Real engine `renderOutput` returns success, zero violations, zero fitting steps; both PNG and JPG Sharp-decoded at exact 1080×1080. Photo upscale warnings 1.35× and 1.60× remain.
- Inspected `templates/part01/artifacts/t02-engine-port/T02-source-vs-engine.png`: left source, right engine; matching composition with all elements present. Pixel MAE 0.46927 on 0–255 scale, NOT exact identity or a visual-similarity percentage. Reports saved alongside images. No AI involved.
- Fixture is explicitly a user-requested reference-only reproduction using supplied copy/assets, not actual verified campaign claims; fixture verification flags must not be mistaken for substantiation. Reusable module resolves fact IDs and fails closed; domain truth/ownership remains external. Square only, source-edge geometry not safe-area approval, no permanent app registration or two-product/other-format acceptance. Source CSS and adjacent engine worktree remain import-time dependencies. User visual approval pending; no engine files changed, no commit/push/deploy.

## T07 Everyday Editorial port to renderer engine (17 November 2026)

- Ported supplied Template-example/layerfit_t07_redesign/ HTML/CSS as 	emplates/part01/src/everyday-editorial.ts / everyday-editorial-css.ts; extracted source CSS with PostCSS, scoped selectors, preserved composition and mapped story to engine ertical. Original source unchanged.
- Fact-grounded description, resolver-backed photo and optional logo; bounded position enum; crop only when asset permission allows. T07 source-example fixture is reference-only: its erified marker is a test assertion, not campaign substantiation; photo is not approved production asset.
- 
pm.cmd run typecheck PASS; complete template suite 26/26 PASS. Contract kit: 36 pass / 0 fail / 3 warn (unused safe-inset tokens, one per format). Strict safe-area gate remains open.
- Actual engine enderOutput: square, portrait and vertical all succeeded; zero layout violations/fitting steps; PNG+JPG decoded at exact 1080×1080, 1080×1350 and 1080×1920. Source-left/engine-right evidence and MAE reports in 	emplates/part01/artifacts/t07-engine-port/.
- Arial source vs bundled Arimo engine produces visible typography differences; MAE is not a similarity percentage or exact-match claim. Other limits: source image upscale warning, no app registry/JMD/real-brand verification, no AI; visual approval pending. No engine files changed, no commit/deploy.

## T09 Question Hook port and ghost-question removal (17 November 2026)

- Extracted user-supplied Template-example/layerfit-t09-question-hook/ to 	emplates/part01/src/question-hook-t09.ts / CSS module. The oversized outlined ghost question mark was static, not animated; removed the element and its CSS, kept the actual headline question mark. Formats: square, portrait, vertical/story.
- T09 uses strict config/fact IDs for description/features; resolver-backed image/logo; crop permission; bundled local Space Grotesk/Inter. SVG logo is rasterized only for local test fixture; no SVG sent through engine.
- 
pm.cmd run typecheck PASS; focused T09 tests 3/3 PASS. Contract kit: 65 pass / 0 fail / 12 warnings (--lf-safe-* unused for 2 examples × 3 formats); safe-area strict gate open.
- Real enderOutput: 2 examples × 3 formats all success, zero layout violations/fitting steps, PNG+JPG decoded at exact 1080×1080 / 1080×1350 / 1080×1920. Sheets: 	emplates/part01/artifacts/t09-engine-port/T09-source-vs-engine-{square,portrait,vertical}.png; source baseline also has ghost-Q removed.
- Example SONIQ/TONI HOMI copy/assets only for requested local visual reproduction, not verified claims/approved campaign materials. Harness-only, no app registry, JMD or production brand approval. No AI, engine-file changes, commit or deployment.

## T07 source revision to Lifestyle Benefit v3 (17 November 2026)

- Replaced the prior T07 source path with Template-example/layerfit_t07_lifestyle_benefit_v3/ per user direction; module now everyday-editorial@0.2.0. Composition follows v3: grid opening with overline/headline/description, large lifestyle photo + caption, benefit facts, footer CTA. Three format-specific row layouts are retained; story maps to engine vertical.
- Strict validated headline line array, description/benefit fact IDs, resolver photo, crop permission and finite image-position enum. Reference copy/photo used only in local fixture; verified flags are not substantiation and photo isn't approved campaign media.
- 
pm.cmd run typecheck PASS, entire test suite 29/29 PASS. Contract kit: 36 pass / 0 fail / 3 safe-token warnings (one per format); strict safe-area review still pending.
- Real enderOutput: square/portrait/vertical all success, zero violations/fitting steps; PNG+JPG dimensions decoded at 1080×1080 / 1080×1350 / 1080×1920. Upscale warning 1.60×/1.72×/2.30× for source photo. Source-left/engine-right contact comparisons: 	emplates/part01/artifacts/t07-engine-port/T07-source-vs-engine-{square,portrait,vertical}.png.
- Source Arial vs bundled engine Arimo remains a visible typography difference; no exact-pixel or visual approval claim. Harness-only, no app/JMD/production brand integration, no AI, no engine-file changes, no commit/deploy.

## T11 Product Collection Hero (17 November 2026)

- Converted the hierarchy of the attached reference into real HTML/CSS plus engine `TemplateModule` (`product-collection-hero@0.1.0`), not a screenshot background. Three independent synthetic PNGs replace unavailable original product/hand photography. Brand/tagline, centered red two-line headline, primary CTA, layered collection and two-part bottom banner retained; no false price, domain or competitor branding defaults.
- Strict contract kit: 115 pass / 0 fail / 0 warnings. Typecheck PASS; template unit suite 32/32 PASS, including unique one/two/three-photo layouts, optional missing fields and fact/schema/escaping failures. Story rotation first failed safe-left by 2px; corrected before final run. Source filters/shadows never replace product pixels; images contain-fit.
- Actual engine 9/9 placements successful, 18 PNG/JPG decoded at 1080×1080 / 1080×1350 / 1080×1920. Safe tokens and checked principal slots use 250/70/350/70 for Story. Outputs and contract/engine diagnostics: `templates/part01/artifacts/t11-product-collection/`; contact sheet `T11-all-cases.png`.
- Standalone package renders 3/3 formats with basic overflow/bounds checks and the exact engine stylesheet/fonts. Portrait and Story match engine pixels in this demo; square MAE ~0.043/255. This is standalone-vs-engine consistency, not original photo matching. Package: `Template-example/layerfit_t11_product_collection_hero/` plus ZIP; scripts `render.mjs`, data binding `window.setCreative`, local fonts and OFL license. TextContent, validated local/embedded raster URL and palette/font allowlists; real fact substantiation remains domain responsibility.
- Limits: no original photos/hands, real campaign data/brand validation, long-copy full matrix, application registry, AI, JMD or deployment acceptance. Visual approval pending. No engine files modified; no commit/push/deploy.

## T05 Split Composition — engine module gate from the template side (18 November 2026)

- Cross-check found a complete engine-owned module (`src/templates/part02/split-composition`, design credited to owner-supplied `Template-example/layerfit_t05`) with no recorded render or kit run. No duplicate template-side module was added (same open reconciliation question as dark-offer-stack); the engine module was run through the template-side gate instead.
- Strict contract kit: 77 pass / 0 fail / 0 warnings. Typecheck PASS; template suite 37/37 PASS (5 new T05 tests). Two initial reject cases were render-time fact failures, not schema failures; moved to a unit test asserting `render()` throws for missing/partial fact maps (fail closed).
- Real engine: 6/6 placements success (reference state with user-supplied demo photo + cover crop; populated synthetic state with offer/proof facts, first-benefit pill, chips, contain photo) × 3 formats, language nl, 0 violations, 0 fitting steps; PNG+JPG decoded at 1080×1080 / 1080×1350 / 1080×1920. Font token `inter` mapped to bundled Arimo 400–700 (source uses system Arial; weight 900 synthesized on both sides).
- Artifacts: `templates/part01/artifacts/t05-split-composition/` — contract/engine reports, 6× PNG+JPG, per-format HTML + `index.html`, `T05-all-cases.png`, side-by-side `T05-source-vs-engine-*.png`, `comparison.json` (MAE 23.14/19.08/38.01 with deliberate-difference notes).
- Deliberate differences recorded, not judged: engine drops scaffold text (eyebrow, overline, "T / 05" code → star badge, footer slogan, studio line, counters) and derives the floating pill from the first benefit; photo card size follows the safe-box remainder (smaller than source in vertical). Structural composition (split panels, arch, tilted card, CTA pill) matches the source previews.
- Limits: module not registered in the application; not pixel-fidelity claim; demo photo fixture-only; fixture verified flags are test assertions; no engine files, counterpart log, or source folder edits; no commit/push/deploy.

## T12 Immersive Image + Editorial Copy (18 November 2026)

- Ported user-supplied `Template-example/LayerFit_T12` (full-bleed hero photo + centered eyebrow badge + colored editorial panel with serif headline/description; no CTA/logo/benefits) into template-side module `immersive-editorial@0.1.0` (engine had no T12; T11 pattern). Explicit 1–3 headline lines must agree with `copy.headline`; description only from a verified fact ID; optional blocks hidden when absent; photo full-bleed (required, deliberately not safe-checked), cover only with `allowCrop`.
- Fonts: source URW Bookman/Arial → bundled Fraunces (heading token) + Arimo via body token `inter` (registry merged over `FONT_REGISTRY`; `@fontsource/fraunces` added to part01 devDeps).
- Fixes during gating: CSS comment containing "1080px" triggered the kit's literal-dimension check (reworded); eyebrow/scene intentional overlap resolved with `data-allow-overlap="scene"`; vertical eyebrow repositioned from scene-relative 14% (153px, violating) to `calc(var(--lf-safe-top) + 19px)`; panel padding switched to safe tokens (deliberate deviation from source 24–52px bottom clearance).
- Strict contract kit: 115 pass / 0 fail / 0 warnings. Typecheck PASS; suite 42/42 PASS (5 new T12 tests). Real engine: 9/9 placements (3 cases × 3 formats) success, 0 violations; PNG+JPG decoded at exact 1080×1080 / 1080×1350 / 1080×1920; fitting only on reference vertical (headline 0.95 / description 0.85). Expected upscale warnings (600×397 reference crop).
- Artifacts: `templates/part01/artifacts/t12-immersive-editorial/` — reports, 9× PNG+JPG, per-format HTML + `index.html`, `T12-all-cases.png`, `T12-source-vs-engine-*.png`, `comparison.json` (MAE 7.01/6.17/13.07 with deliberate-difference notes; not a similarity metric).
- Limits: harness-only; user-supplied reference-hero crop is fixture-only; fixture verified flags are test assertions; JMD/real brand/visual approval pending. No engine files, counterpart log or source edits; no commit/push/deploy.
