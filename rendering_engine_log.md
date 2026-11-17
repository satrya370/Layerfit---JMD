# Rendering Engine — Execution Log

Purpose: evidence and handoff log for rendering-engine work. Follows `rendering_engine_plan.md` and the protocol in `AGENTS.md` (Parallel template/renderer work). This log records evidence, not intent. Entries are appended chronologically. The template owner's log is `template_part01_log.md`; this file is not edited by the template owner and the engine owner does not edit theirs.

## 2026-11-17 — Setup and contract coordination (before CP00)

**Status:** CP00 not started, CP01 not started, CP02 not started. Draft code exists but is untested and does not count as CP evidence.

**Workspace:** engine work in git worktree `C:\Users\Asus\Layerfit-JMD-engine`, branch `engine/rendering`, based on `2a48830`. Nothing committed or pushed. The main tree is used only for this log and the shared contract draft.

**Done:**
- Read `AGENTS.md`, `CLAUDE.md`, `rendering_engine_plan.md`, `template_part01_plan.md`, `spec.md`, `docs/architecture.md`, `docs/audit.md`, `docs/verification.md`, `TODO.md`, the original PDF, the reference renderer and the LayerFit prototype source.
- Reference repository `C:\Users\Asus\LayerFit\references\IG-Content-Builder`: HEAD `9ce00976664d1ac036bc38b75a8cf21621eac719`, `git status --porcelain` empty. Not modified.
- Worktree setup: copied prototype `package.json`, lockfile, `tsconfig.json`, `eslint.config.js`, `.gitignore`. `npm.cmd ci` passed (148 packages, 0 vulnerabilities). Added `@fontsource/inter@5.2.8` and `@fontsource/fraunces@5.2.9` (OFL-1.1). The template owner agreed to these as interim fonts. They are not LayerFit brand fonts.
- Environment observed: Node 22.18.0, system Chrome 157.0.8103.79, `node:sqlite` available (experimental warning).
- Draft files written in the worktree **before** the planning brief was approved. All are untested (no typecheck, lint or test run yet):
  - `src/shared/render-contract.ts`, `src/shared/html.ts`, `src/shared/fonts.ts`
  - `src/server/render/{errors,registry,fonts,browser-manager,readiness,validate-layout,document,encode-output}.ts`
  - `src/server/assets/{normalize-image,resolve-render-assets}.ts`
  - `src/server/storage/output-store.ts`
- Cross-checked `template_part01_log.md` (entry 2026-11-17) and read-only inspected `templates/part01/`. No template files were changed.
- Agreed with the template owner (via the user): file ownership, engine owns the document shell and canvas root, config uses `assetId` / `fontHeadingId` / `fontBodyId` / `primary`-`secondary`-`accent` / `offerFactId`, `data-required="false"` means optional, four-layer testing with integration by commit hash, separate logs.
- Wrote shared draft `docs/contracts/render-template-contract.md` (v0.1, not yet agreed).

**Discrepancies found (for the contract, not yet resolved):**
- T01 config embeds image bytes, uses `serif|sans` system fonts, `background`/`text` colors and a free-text `verifiedOffer.label`. The template owner agreed to align these once the contract is agreed.
- T01 returns a full HTML document with its own root and CSS variables. Agreed: it will become a body fragment plus CSS.
- Safe insets differ (T01 square 62/72/60/72 and portrait 74/70/72/70 vs engine draft 60/70 and 70/70). Open in contract §2.
- Callout anchor uses stage coordinates; the template plan says contained-image coordinates. Open in contract §4.
- The engine draft validator uses `hasAttribute('data-required')`, so it would treat `data-required="false"` as required. **Engine fix pending** before CP01 tests.
- The T01 connector SVG slot overlaps the image and benefits without `data-allow-overlap`; T01 has no `data-fit-group`. The template owner will add both.

**Not done / not claimed:** no engine CP gate passed; no render was run with engine code; no integration with any template; no app, API, database, AI or JMD work.

**Next:** wait for the template owner's cross-check of the contract draft. After agreement, run CP00 → CP02 in the worktree per the approved brief, then log evidence here.

## 2026-11-17 — Execution of CP00–CP02 (workflow: planning → working → reviewing → revising)

**Workspace:** worktree `C:\Users\Asus\Layerfit-JMD-engine`, branch `engine/rendering`, base `2a48830`. Uncommitted. Engine docs are in that worktree at `docs/engine/` (`README.md`, `baseline.md`, `reuse-inventory.md`). This log stays in the main tree.

**Planning.** Brief approved on 17 Nov. Before coding, I checked the template owner's current state: T01 implemented under `templates/part01/`, log updated, no commits. Engine code was limited to `src/server/**`, `tests/engine/**`, `fixtures/engine/**`, `docs/engine/**`, plus the shared contract module in `src/shared/` (proposed shared area, changes only by agreement). Root `package.json` and lockfile were changed in the worktree only, to add the two OFL font packages and the `fixtures/` scripts. Template files were not read for writing, not modified.

**Working.** Fixed typecheck errors in the draft, aligned the contract module with the draft contract (`rootClass`, `slots`, `language` in snapshot, no `fonts` in template input), implemented `renderOutput`, `renderBatch`, the fixture template and synthetic briefs, and the integration/unit tests.

**Reviewing.** Ran typecheck, lint, unit and integration tests, the smoke, and a visual check of the contact sheet. Found and fixed these real issues:

1. The validator treated `data-required="false"` as required. Fixed: only `"true"` activates it.
2. Fitting stopped entirely when one violation had no fit group, so headline fitting never ran. Fixed: only violations with a fit group are scaled; others still fail.
3. Text-overflow check had no tolerance for glyph content areas; a tight line box caused false positives. Fixed with slack = max(2 px, 0.25 × font size). Real clipping is still caught separately.
4. Font check ran on slot wrappers that inherit a default font. Fixed: runs on the element that owns the text.
5. Blocked external image was reported as `ASSET_INVALID` because CSP stops it before any request, so interception never saw it. Fixed: non-`data:` image that fails to decode is `NETWORK_BLOCKED`.
6. Re-rendering a referenced revision failed with `STORAGE_CONFLICT`, because re-renders are not byte-identical (measured: 5 channel values differ by 1 level out of 3.5 M, across 3 runs). This would break recovery after a failed DB commit. Decision: referenced file is kept as the source of truth; result reports its real hash and a warning. `STORAGE_CONFLICT` is no longer raised by `publish`.
7. My own smoke used the corrupt asset under the same asset ID as the valid one, so all bottle placements failed. Fixed in the script; the assertion caught it.
8. My own test expected a fitting case that actually fits, so it was testing the wrong thing. Fixed: a long headline for the fail case, and a separate test for the success case.

**Revising.** Re-ran everything after each fix. Final numbers below.

### CP00 — Baseline and reuse inventory

**Status: complete** (gate: reused vs new shown; prototype baseline reproducible; reference unchanged; setup reported).

- Reference `9ce0097…`: `git status --porcelain` empty before and after.
- Prototype smoke re-run: 6 placements, 6 PNG + 6 JPG decoded, 3 expected failures, 3846 ms reported.
- Documented in `docs/engine/baseline.md` and `docs/engine/reuse-inventory.md` (attribution per source file).

### CP01 — Typed service and registry adapter

**Status: partial.** Implemented and tested: strict request/snapshot schemas, registry allowlist (id@version, rootClass and required-slot checks), `renderOutput` returning structured results and never throwing for valid envelopes, `renderBatch` with envelope validation before browser work and per-task isolation.

Not done: the prototype `productHero` was not ported to the registry; the CLI wrapper `scripts/render-layerfit.ts` was not written (the smoke uses the same service); the four Part 01 templates are not integrated.

Tests: unit 15 + integration (CP01 path covered inside the render tests).

### CP02 — Assets, fonts, CSS and isolation

**Status: partial.**

- Done and tested in a browser: fixture renders with external requests blocked (CSP + interception; external images reported as `NETWORK_BLOCKED`); bundled WOFF2 fonts (Inter, Fraunces) loaded and checked per family/weight; corrupt asset fails alone with `ASSET_INVALID`; asset from another campaign and missing asset give the same `ASSET_FORBIDDEN`.
- Done, unit-tested: real byte decode (SVG, text, empty rejected), EXIF rotate, metadata stripped (re-encode), PNG for alpha and JPEG otherwise, cache by source hash, CSS rules (`@import`, external `url()`, markup breakouts, script-like constructs rejected).
- Not done: Tailwind compilation (template-side; the engine accepts compiled CSS and does not run Tailwind); CSS cache by build hash (hash is recorded, no cache); resolution warning for upscaling (not implemented); a test that EXIF orientation actually changes output (code path exists, untested).

### Verification evidence (17 Nov, local Windows, system Chrome 157.0.8103.79)

```text
npm.cmd run typecheck     PASS
npm.cmd run lint          PASS
npm.cmd test (Chrome set) PASS 23/23   (~15 s)
npm.cmd test (no Chrome)  PASS 15, skipped 8, exit 0 (skips are reported, not counted as pass)
npm.cmd run smoke         PASS  6 placements, 12 encoded files decoded at exact dimensions,
                          3 negative cases with expected codes (NETWORK_BLOCKED, ASSET_INVALID, SAFE_AREA_VIOLATION)
```

Artifacts (ignored by Git): `artifacts/engine-smoke/report.json`, `artifacts/engine-smoke/contact-sheet.png`, `artifacts/engine-smoke/store/`. The contact sheet was inspected: the product is contained, headline and benefits are inside the safe area, no clipping. This is a check on a fixture, not a design approval.

### Known issues and open items (not hidden)

- One integration test took 52 s once in a full run; ~1.5 s on two isolated reruns. Cause not identified. Per-stage timings are in the smoke report.
- Connect mode (`CHROMIUM_WS_ENDPOINT`) implemented but untested (no remote browser here).
- `failed` result for invalid input reports `format: 'square'` when the input had no format.
- Contract test kit (contract §11, step 2) is **not written yet**. The forbidden-markup rules are enforced by the render path only, not by a template-side kit.
- Two contract open items remain unanswered by the template owner: square/portrait safe values (engine uses 60/70/60/70 and 70/70/70/70, T01 uses 62/72/60/72 and 74/70/72/70) and callout anchor coordinate space (engine has no anchor-geometry check).
- Shared TS module is at `src/shared/` in the worktree; the contract doc suggested `src/shared/` and `fixtures/shared/`. Fixtures are in `fixtures/engine/` for now.
- Zod: 4.6.7 installed here, 4.6.6 in `templates/part01`.

### Cross-check notes for the template owner (sent via user, not edited into their log)

1. Engine renders `<main data-canvas class="{rootClass}">` and expects the body to come from the shared `html` builder. Any plain string body is rejected with `TEMPLATE_FAILED`.
2. `data-required` / `data-safe` count only as `"true"`. T01 already uses `"true"` on the slots that must be checked; `data-required="false"` on `brand-footer` is inactive.
3. T01 connector SVG overlaps `product-image-frame` and `benefits` without `data-allow-overlap`. The engine will report `SLOT_COLLISION` until the template declares the overlap.
4. T01 has no `data-fit-group`. The engine can only fit groups that exist; without them a long Dutch headline fails with `LAYOUT_OVERFLOW` at the minimum.
5. Anchor coordinates: the engine does not check anchor geometry. The template owner decides the coordinate space; the engine will only check that the connector stays inside its safe area if it carries `data-safe`.
6. The template does not need Tailwind for the engine tests; CSS is passed as a string and validated.
7. Nothing from `templates/part01` has been run through the engine yet. To try T01 in the engine, the template side needs to export a `TemplateModule` (id, version, formats, rootClass, slots, configSchema, render) that returns `{ body, css }`. The engine side will then register it in a test harness.

### Handoff

Engine changes are uncommitted in `C:\Users\Asus\Layerfit-JMD-engine` (branch `engine/rendering`). Nothing pushed. Next, in order: (a) GPT confirms or changes the open contract items; (b) engine writes the contract conformance test kit and runs it against T01 (read-only, no edits to `templates/part01`); (c) integrate T01 by commit hash when GPT provides one; (d) finish CP01 by porting the prototype product-hero to the registry or deleting it, and by writing the CLI wrapper; (e) CP03 browser tests in connect mode.

Not claimed: CP01 complete; CP02 complete; any integration with the template; any application E2E; any JMD verification; production-readiness.

## 2026-11-17 — Confirmation of template decisions and review pass 2 (bug fixes)

### Reply to the template owner's three decisions (relayed by the user)

1. **Safe area: confirmed.** One source in the engine (`FORMAT_PROFILES`, frozen; tokens `--lf-safe-*`), values top/right/bottom/left: square 60/70/60/70, portrait 70/70/70/70, vertical 250/70/350/70. These equal what the engine already used. T01 must switch from its prototype values to the tokens.
2. **Callout anchor: confirmed.** Coordinates are normalized to the product-stage box that holds the connector SVG. The editor maps clicks inside the visible `contain` area to stage coordinates. The engine does not judge whether an anchor hits the right product feature; it checks bounds, safe area, collisions and declared overlaps only.
3. **Contract test kit: confirmed as a prerequisite for T01 integration.** The engine owner provides the kit; the template owner runs it on a locked commit and reports violations without editing engine files. **The kit is not written yet.**

Contract updated to **v0.2** in `docs/contracts/render-template-contract.md` (safe insets and anchor marked agreed; two engine behaviours added to §10; open items renumbered). The template owner should cross-check v0.2 and record it in their log before it is called binding.

### Review pass 2 — method

I re-read the engine code looking for defects instead of re-running the happy path. For each suspected defect I first wrote a test that fails, confirmed it failed for the expected reason, then fixed the code. The six regression tests all failed before the fixes and pass after.

### Bugs found and fixed

| # | Defect | Proof | Fix |
|---|---|---|---|
| 1 | **Raw exception text leaked into public error messages** (`encode failed: ENOENT … 'C:/Users/…'`; also storage and template errors). The comment above the function claimed the opposite, and my earlier test of the same name only checked the code. | Failing test showed the path in `message`. | `RenderError.message` is now fixed text. Raw text goes to `RenderError.internal` and to the new optional `RenderEngine.onFailure` hook. |
| 2 | **Batch rejected whole when several tasks had no usable `taskId`**: they all counted as the same empty id and tripped "Duplicate taskId". The plan says invalid items fail individually. | Failing test: `{tasks:[{nope:1},{nope:2}]}` threw. | Only repeated valid ids reject the envelope. Others fail per item with `REQUEST_INVALID`. |
| 3 | **Failed result claimed `format: 'square'`** for a request with no or invalid format. | Failing test. | `format` is `Format \| null`; set only when the request's format is valid. |
| 4 | **Format profiles were mutable** objects handed to template code. | Failing test (`Object.isFrozen`). | Deep-frozen. |
| 5 | **Registry accepted duplicate or malformed slot names** in a template manifest. | Failing test. | Registration rejects both. |
| 6 | **CSS validation could be bypassed with escapes** (`@\69mport`, `\75rl(`). CSP and interception would still stop the load, so impact was limited to losing the first line of defence. | Failing test. | Checks run on raw and escape-decoded text. Tailwind-style escaped selectors (`.md\:flex`) still pass. |
| 7 | **Remote mode leaked browser contexts** when a page cleanup failed: the manager only disconnects from a shared browser and never closed the leftover context. Found by reading `#release`. | Found by reading `#release`. The test was written after the fix, so I verified it by **mutation**: with orphan cleanup disabled it fails (`no page left behind (baseline 1, now 2)`); with the fix restored it passes. | Failed-cleanup contexts are tracked and closed on release. The shared browser itself is never closed. |
| 8 | The crash and cleanup tests only asserted "next render succeeds", which also holds if nothing is recycled. | Read the tests. | Both now assert the recycle warning and `activePages === 0`. |
| 9 | Smoke script launched a second browser only to read its version; test glob was unquoted (`**` expands differently in POSIX shells); a type guard in the smoke was a no-op. | Read the code. | Version read from diagnostics; glob quoted; guard removed. |
| 10 | **The new remote-mode test did not close its stand-in shared browser when an assertion failed**, so a failing run left Chrome alive and the runner could not exit (the mutation check hung past 300 s). | Observed during the mutation check. | Browser is now closed in a `finally`. After the hang I stopped only the processes in my own test's process tree (checked by parent/child links); a Codex runtime process and the user's own Chrome were not touched. |

One more problem was in my own tests, not the engine: the first version of the regression tests did not load, because Bash collapsed `\\` inside a heredoc and produced invalid regexes. I rewrote those lines with `String.raw` and patterns without backslashes. Lesson recorded: write test files with the edit tool, not shell heredocs.

### Evidence (17 Nov, local Windows, system Chrome 157.0.8103.79)

```text
npm.cmd run typecheck      PASS
npm.cmd run lint           PASS
npm.cmd test (Chrome set)  PASS 30/30, three consecutive full runs: 20 s, 20 s, 27 s; no test over 10 s
npm.cmd test (no Chrome)   PASS 21, skipped 9, exit 0
npm.cmd run smoke          PASS 6 placements, 12 files decoded at exact dimensions, 3 negative cases with expected codes
```

Test split: 21 unit + 9 browser integration (was 15 + 8, total 23).

### Corrections to my earlier entry

- "Connect mode implemented but untested": now tested, but **only against a second Chrome launched locally**. It shows the shared browser is not closed and leaked pages are closed. It does not show behaviour over a network, with authentication, or with other clients on the same browser.
- "`failed` result reports `format: 'square'`": fixed (bug 3).
- Test counts "23 / 15 + 8 skipped": now 30 / 21 + 9 skipped.
- The 52 s slow test did not recur in five full-suite runs since (all under 30 s). **Cause still unknown.**

### Still open (not fixed in this pass)

- Contract test kit (not written). Needed before T01 can be integrated.
- CP01 gaps: prototype `productHero` not ported or removed; CLI wrapper `scripts/render-layerfit.ts` not written.
- `data:` URLs are allowed by request interception. The safeguard is that template bodies are trusted code using `ResolvedAsset.src` only; the kit is meant to enforce that.
- The per-task deadline covers the browser stage only, not asset, font, template, encode or storage stages. No watchdog for a hung native stage that ignores promise timeouts.
- Restart-budget exhaustion path is not tested.
- No test that EXIF orientation changes the output, no upscaling warning, no CSS cache by build hash.
- Shared TS module and fixtures are still on the engine branch only (`src/shared/`, `fixtures/engine/`); the template side has not imported them.

### Handoff

Engine changes remain uncommitted in `C:\Users\Asus\Layerfit-JMD-engine` (branch `engine/rendering`); nothing pushed. Docs for the engine are in that worktree under `docs/engine/` and were updated. Next, in order: (a) template owner cross-checks contract v0.2 and records it; (b) engine writes the contract test kit; (c) the template owner provides a locked T01 commit hash and exports a `TemplateModule`; (d) engine runs the kit and then integrates T01 read-only; (e) finish CP01 (productHero port decision, CLI wrapper).

## 2026-11-17 — Contract test kit delivered (prerequisite for T01 integration)

**Status: kit complete and tested on the engine fixture; not yet run on any real template.**

### Read before starting

Latest template log entry (CP04 T03): T01–T03 exist as body fragments under `templates/part01/`, none is a `TemplateModule` yet, and the entry still calls the contract v0.1 "not agreed", so v0.2 has not been cross-checked from that side. I did not review the T02/T03 code in this pass and made no change under `templates/part01/`.

### What was delivered (engine worktree, uncommitted)

- `src/server/render/contract-kit.ts`: `checkTemplateContract(module, cases, { strict })` and `formatViolationReport(report, { commit, reproduce })`. No browser.
- `scripts/check-template-contract.ts` and npm script `check:template`: CLI that loads a module file and a cases file, prints the violation report (template id/version/commit, case, format, check id, slot, detail, reproduce line), optionally writes JSON, exits 0 pass / 1 contract failure / 2 usage or load error.
- `fixtures/engine/contract-cases.ts`, `fixtures/engine/templates/fixture-module.ts`, `fixture-module-hostile.ts`: an example cases file and two module entry points (one conforming, one deliberately not).
- `docs/engine/contract-kit.md`: how to use it, the full check table, what it does not check. Full path for the template owner: `C:\Users\Asus\Layerfit-JMD-engine\docs\engine\contract-kit.md`.
- `CONTRACT_VERSION = '0.2'` exported from `src/shared/render-contract.ts`. Fixture CSS is now scoped under its root class so it passes its own scoping check.

Checks (details in the doc): module registration, schema accepts the case, schema rejects 10 generic hostile variants plus any extra `rejects` (unknown keys, CSS injection, unknown font, path traversal, image bytes in config, oversized text, control characters, missing CTA, markup in `templateId`), asset resolution, `render()` output shape, determinism, CSS rules, forbidden markup, asset-only `img src` and no external URLs, slot names and manifest, `data-*` values, image fit/crop permission. Warnings: unscoped CSS, literal canvas size, no `--lf-safe-*` token, undeclared slots, missing `data-required`, fit groups the CSS never reads.

### Evidence (17 Nov, local Windows, system Chrome 157.0.8103.79)

```text
npm.cmd run typecheck      PASS
npm.cmd run lint           PASS
npm.cmd test (Chrome set)  PASS 51/51 (21 unit + 9 browser integration + 17 kit + 4 kit CLI), 29 s
npm.cmd test (no Chrome)   PASS 42, skipped 9, exit 0
npm.cmd run smoke          PASS 6 placements, 12 files decoded, 3 expected negative codes
```

Because all 17 kit tests passed on the first run, I checked that they can fail: I disabled two checks (forbidden tags, asset-src rule) and three tests failed; code restored, no mutation marker remains. My first mutation attempt was syntactically invalid and proved nothing; I redid it. The kit tests use one deliberately broken variant per rule, a lax schema (`z.any()`), a schema that rejects everything, a render that throws, and the hostile fixture.

### Findings and limits (not hidden)

- **Will fail on first use:** `body` must be `SafeHtml` from the shared `html` builder, checked with `instanceof` against the engine's copy. A module with its own copy of the builder, or one that returns a plain string, fails `render.output`. Until there is one root package, the module must import the builder from the exact file the engine uses.
- **T01 cannot be fed to the kit as it stands.** As read earlier, it has no `TemplateModule`, its config carries `image.bytes` instead of asset IDs, it uses `serif|sans` fonts and `background`/`text` colors, and `renderAnnotatedHeroHtml` returns a full HTML document. It needs the adapter first. I do not know which kit checks it would then fail or pass (its schema is already strict, so `schema.strict` may well pass). T02/T03 not assessed.
- The kit is a conformance linter. Markup is read with a small tag tokenizer, not a full HTML parser. Layout is not checked (a fixture with a safe-area defect passes the kit on purpose; the renderer reports it).
- Warnings do not fail the kit unless `--strict` is passed.
- The kit has never run on a real template module.

### Handoff to the template owner (via user)

1. Cross-check contract v0.2 and record it in your log.
2. Export a `TemplateModule` per template (`templateModule`) and a `contractCases` file with synthetic assets and facts, then run `npm.cmd run check:template -- --module <path> --cases <path> --commit <hash>` from `C:\Users\Asus\Layerfit-JMD-engine`. Send me the report, not edits to engine files.
3. Provide the locked commit hash for the integration run. I will register the modules in the engine harness and render them read-only.

Not claimed: any real template passes the kit; any integration with templates; CP01/CP02 complete; production-readiness.

## 2026-11-17 — Owner-supplied templates T03 and T05 connected to the engine

**Direction change.** The user stopped the engine hardening work and asked me to connect two HTML/CSS templates they built (`Template-example/promo-banner` as T03, then `Template-example/layerfit_t05` as T05). Details: `docs/engine/templates.md` in the engine worktree. Nothing committed or pushed. The user's original files and `templates/part01/` were not modified.

### Left as it was when I was stopped

- `tests/engine/hardening.test.ts` (4 tests: EXIF orientation and metadata, no enlargement, launch failure without path leak, whole-task deadline) was written just before the stop; I ran it once and all 4 pass.
- Engine changes made in that stretch, all tested: whole-task deadline (`TASK_DEADLINE`, checked between stages, cooperative: it cannot interrupt a native call), `createRenderEngine` factory shared by CLI and harness.
- **Restart budget flaw found by reasoning, then proven by a failing test:** after the budget was exhausted the browser manager could never recover, because the counter reset only after a successful render. Now the manager fails fast for a cooldown (`restartCooldownMs`, default 30 s) and then renews the budget. Exhaustion is `retryable: true`.
- One test I had started writing before the stop (small photo → "image upscaled" warning) had been partly written into the file and called a function that did not exist, which broke typecheck. Fixed.
- **Still not done from the earlier engine plan:** the render CLI wrapper `scripts/render-layerfit.ts`, and the decision about the prototype `productHero`.

### What was built

| | T03 | T05 |
|---|---|---|
| Engine id | `dark-offer-stack@0.1.0` | `split-composition@0.1.0` |
| Module | `src/templates/part01/dark-offer-stack/` | `src/templates/part02/split-composition/` |
| Cases | 5 synthetic | 5 synthetic |
| Placements | 15: 14 rendered, 1 expected layout failure | 15: 12 rendered, 3 expected layout failures |

Both pass the contract kit with no failures and no warnings, render PNG + JPG at exact dimensions in all three formats, and every rendered contact sheet was inspected.

**Decisions I took (the user can redirect):**
1. The T03 design hard-codes claims the project forbids as defaults (Trustpilot logo and 5 stars, "5% EXTRA KORTING" / `EXTRA5`, next-day delivery, free returns, Klarna, "Alleen vandaag geldig"). I kept the look and layout, and made each of those an optional block whose text comes only from a verified fact (or is dropped). T05's scaffold text ("05/15", "T / 05", "01 / 01", the slogan) is not rendered.
2. Photos stay whole (`contain`) unless the asset's `allowCrop` is true; the owner's designs used `cover` everywhere.
3. Content stays inside the safe box; the panels still bleed to the canvas edge as background.
4. T05 lives under `part02` because it is not one of the four Part 01 templates.
5. The owner's own photos were not used: project rules allow synthetic assets only for local tests and their provenance is not stated.

### Defects found (details in `templates.md`)

- **Engine validator (fixed):** `scrollHeight > clientHeight + 1` flagged tight display leading, failing every placement of both designs. The vertical check now allows 0.2 em. Regression test added; the "real overflow still fails" test stays.
- `overflow-wrap: anywhere` in my first CSS broke words ("DAGELIJK / S GEBRUIK") and hid the overflow from every check; found only by looking at the render. Removed; too-wide words now shrink or fail.
- Photo blocks did not shrink with long copy (T03), letters collided at the designs' letter-spacing with Inter 900 (T05), and a long-copy T05 vertical gave a tiny photo over a flattened arch (T05). All fixed, all found visually, none reported by an automatic check.
- A shared limit surfaced: fit groups attach to the violating slot and its ancestors, so a violation in a sibling area cannot trigger fitting. T05 works around it by making its right panel a member of the `headline` group. This is a template workaround, not an engine change.

### Evidence (17 Nov, local Windows, system Chrome 157.0.8103.79)

```text
npm.cmd run typecheck      PASS
npm.cmd run lint           PASS
npm.cmd test (Chrome set)  PASS 81/81 (56 s and 76 s in two full runs)
npm.cmd test (no Chrome)   PASS 67, skipped 14, exit 0
npm.cmd run smoke          PASS 6 placements, 12 files decoded, 3 expected negative codes
```

Mutation checks this round: re-introducing "05/15" makes the T05 scaffold test fail. Earlier in the session: disabled kit checks and the orphan-context fix were each confirmed to fail their tests.

### Shared-area changes that need the template owner's cross-check

1. **Fonts:** `montserrat` and `poppins` added, Inter 800/900 added (`src/shared/fonts.ts`, `FONT_IDS`, contract §9). The earlier agreement named only Inter and Fraunces.
2. **Validator tolerance:** vertical content-area hang of up to 0.2 em is no longer an overflow.
3. **New shared files:** `src/shared/contrast.ts` (WCAG ratio used by template schemas), `fixtures/templates/synthetic-assets.ts`, `fixtures/templates/render-matrix.ts`.
4. **Two implementations of the same plan id.** `templates/part01/src/dark-offer-stack.ts` (the template owner's fragment) and `src/templates/part01/dark-offer-stack/` (this one, from the user's design) are independent and not reconciled. They do not collide today because the template owner's is not a `TemplateModule`. Which one stays is the user's decision.

### Limits (not hidden)

- Visual match with the owner's previews is by eye on synthetic images, no pixel comparison. Fonts are interim, not LayerFit brand fonts. No JMD, no real assets, no application E2E; neither template is registered in an application, only in the engine harness.
- The contract kit has now run on two real template modules, but not on the template owner's T01–T03.
- Offer and proof text are shown exactly as given; truth and expiry remain the domain service's job.

Not claimed: either template is approved as final brand design; CP01/CP02 complete; production-readiness.

## 2026-11-17 — T08 redesigned as Photo Overlay (the bento version was rejected)

**Request.** The user said the first T08 (bento tiles) was "benar benar ai slop" and asked for research on real Meta ad design, a total rebuild, testing on one image only, and faster work.

**What changed.** The bento design, its fixtures and tests, its drift test and its exports were deleted. New engine module `src/templates/part02/photo-overlay/` (id `photo-overlay@0.1.0`): the photo leads (cover under a dark scrim, or whole on a flat field with a solid text panel), a dominant Inter 900 headline with a flat accent marker, one support line, one square CTA, a white brand plate. No cards, shadows or decorative gradients. Standalone package `Template-example/layerfit_t08/` was migrated to it (`script.js` rewritten, CSS = token header + engine CSS verbatim).

**Research.** Vendor blogs only, directional, not verified; Meta Ad Library for the Netherlands unreachable, so no Dutch ad reference is verified.

**Evidence (17 Nov, system Chrome 157).**

```text
npm.cmd run typecheck      PASS
npm.cmd run lint           PASS
npm.cmd test (Chrome set)  PASS 89/89
npm.cmd test (no Chrome)   PASS 74, skipped 15, exit 0
standalone node render.mjs 3 of 3 outputs passed (one image, three formats)
```

Contract kit: no failures or warnings (4 cases x 3 formats, 13 reject variants). I looked at all three PNGs: headline dominant, text legible on the scrim, nothing inside the Meta UI zones.

**Limits.** The preview photo is the user's own (`layerfit_t05/assets/demo-product.png`, cropped to 466 x 499, provenance unknown): a flagged deviation from the synthetic-assets rule for design preview only; it is soft when upscaled. Story crop cuts the right-hand product. Interim OFL fonts. Tested on one image by request, so long copy and other aspect ratios of photos are covered only by the engine's synthetic cases. Chromium-only CSS is not used beyond `text-wrap: balance`.

Not claimed: approved brand design; any Dutch ad verified; better performance than other formats; production-readiness.
