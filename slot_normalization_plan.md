# Slot normalization plan — one content model, one slot vocabulary, deterministic mapping

Status: APPROVED DIRECTION, ready for Phase 1 (decisions recorded 18 Nov 2026, §1). Nothing below is implemented yet except Phase 0.

## 0. Purpose and how to use this plan

Goal: every template is filled from the same creative content (brand/logo, headline, description, CTA, photos, benefits, optional offer) through the same slot names, so the same stored config always produces the same render, and any template can take any brief. At runtime AI only writes copy and picks fact IDs; mapping content to slots is code.

Two kinds of tasks:
- **Mechanical** tasks: for the small CLI agent (e.g. Claude Haiku). Exact files, exact renames, exact checks.
- **DESIGN** tasks: change composition or add a visible element. Done by the senior design agent (currently Claude Opus in the owner's session), reviewed by the owner on contact sheets. The small agent skips them.

Rules for the small agent:
1. Do only the task you were given. Edit only the files listed for it. No other refactors, renames or "improvements".
2. Never change CSS layout values (sizes, positions, colours, grid) unless the task gives the exact new value.
3. After each task run every command in its "Check" list. A task is done only when all checks pass. Paste the command output in the log entry.
4. If a check fails and the fix is not obvious from the error within two attempts, stop and report the failing output. Never weaken a test, delete an assertion, add `skip`, or loosen a schema to make a check pass.
5. No commits, pushes or dependency installs unless the owner says so.
6. Use `npm.cmd` / `npx.cmd`. Browser tests need `CHROMIUM_EXECUTABLE_PATH='C:/Program Files/Google/Chrome/Application/chrome.exe'`.
7. Log every task: engine tasks in `C:\Users\Asus\Layerfit-JMD-engine\rendering_engine_log.md`, part01 tasks in `C:\Users\Asus\Layerfit-JMD\template_part01_log.md` (scope, status, files, commands/results, open issues).

Code locations (verified 18 Nov):
- Engine worktree `C:\Users\Asus\Layerfit-JMD-engine` (branch `engine/rendering`, baseline commit `bdae3e8`): shared contract `src/shared/`, render engine `src/server/render/`, assets `src/server/assets/`, engine templates `src/templates/part01/dark-offer-stack` and `src/templates/part02/*`, fixtures `fixtures/templates/<id>/cases.ts`, tests `tests/templates/<id>.test.ts` and `<id>.render.test.ts`.
- Main repo `C:\Users\Asus\Layerfit-JMD`: part01 templates `templates/part01/src/*.ts`, cases `templates/part01/scripts/*-cases.ts`, tests `templates/part01/tests/*.test.ts`. They import the engine through `../../../../Layerfit-JMD-engine/src/...`. The main repo's own `src/` is an older merged copy of the engine; do not edit it in this plan.

## 1. Decisions (owner, 18 Nov 2026)

- R1. No discount given → the offer position shows a **hero fact**: one verified benefit fact. Same design, no new claim.
- R2. Scope: all templates, engine and `templates/part01`.
- R3. Mechanical tasks by the small CLI agent; DESIGN tasks by the senior design agent.
- R4. Description is AI-written and must reference verified fact IDs (`bodyFactIds`).
- D1. Done: engine worktree committed as baseline `bdae3e8` (T10/T14/T16/T17 sources, fixtures, tests, docs). Not pushed.
- D2. The small agent may edit `templates/part01` for the Phase 4 tasks in this plan, logging in `template_part01_log.md`.
- D3. Template-specific text without a canonical source: fill from existing input where possible, drop the rest. No new AI-written fields (§5).
- D4. Fixed `headlineLines` (T07, T11, T12, T18) are removed; CSS wraps `copy.headline` (`text-wrap: balance`). Visual review required.
- D5. **Every template must support the same core fields**: brand (logo, or name when there is no logo), headline, CTA, photo, in all three formats, plus **at least one place for supporting copy**. Supporting copy does not have to be a long description: it can be a description paragraph, short benefit/advantage phrases, or one highlight line, whichever the template has. The AI turns the user's product description into the form each template offers (corrected by the owner, 18 Nov). Templates missing brand, CTA or a format get it added (DESIGN). T02 comparison stays, but only as an opt-in: chosen only when the user asks for a comparison design and supplies the comparison inputs.
- D6. AI picks the hero fact per concept (`heroFactId` in the AI output), validated as a member of the verified benefit facts. A stored config with a hero fact renders deterministically.
- D7. Photos: users upload several photos. Cutouts (transparent PNG, no background) go to slots designed for cutouts; photos with a background go to slots designed for scenes. Detected from the image itself at upload (alpha channel), not by AI (§2, Task 1.4).

## 2. Canonical content model

| Field (config path) | Type / limit | Source | Notes |
|---|---|---|---|
| `brand.name` | text ≤100 (template budget may be lower) | user | always present |
| `brand.logoAssetId` | asset id, optional | user upload | brand slot shows the logo when present |
| `productName` (NEW, top level) | text ≤60 | user | image alt text, product label/caption |
| `copy.eyebrow` (NEW) | text ≤48, optional | AI | short line above the headline |
| `copy.headline` | text ≤90 (template budget lower) | AI | |
| `copy.accentPhrase` | substring of headline, optional | AI | |
| `copy.body` | text ≤240 (template budget lower), optional | AI | the description |
| `copy.bodyFactIds` (NEW) | 1–5 fact ids, required when `body` is set | AI | R4 |
| `copy.cta` | text ≤32 (template budget lower) | AI (approved list) | |
| `copy.benefits[]` | ≤4 × {text ≤240, factIds 1–5} | AI picks facts | |
| `assets[]` | 1–8 photos {assetId, role, kind (NEW), allowCrop, focalPoint?} | user upload; `kind` detected | `kind: 'cutout' \| 'scene'` |
| `offerFactId` | fact id, optional | user (discount input) | text rendered verbatim |
| `heroFactId` (NEW) | fact id, optional | AI per concept (D6) | used in the offer position when there is no offer |
| `proofFactId` | fact id, optional | user | |
| `disclaimerFactId` (NEW) | fact id, optional | user | fine print, verbatim |

Removed after migration: every template-specific extension object (`t02`, `t06`, `t07`, `t09`, `t11`, `t12`, `t13`, `t15`, `t18`); fields mapped in §5. Exception: T02 keeps its comparison inputs (left/right labels and fact ids) as an opt-in block.

## 3. Canonical slot vocabulary and fill rules

| Slot | Filled from | Rule |
|---|---|---|
| `brand` | logo or `brand.name` | REQUIRED in every template. Logo present: `<img data-image-fit="contain">`; otherwise the name as text. Same element, same slot. |
| `brand-name` | `brand.name` | Optional second, text-only mention. |
| `product-name` | `productName` | Optional label/caption. |
| `eyebrow` | `copy.eyebrow` | Omitted when absent. |
| `headline` | `copy.headline` (+ `accentPhrase`) | REQUIRED in every template. |
| `description` | `copy.body` | Optional per template. A template has `description`, benefit slots, or both (D5: at least one). Omitted when the creative has no body. |
| `cta` | `copy.cta` | REQUIRED in every template, always visible, never shares its position with another slot. |
| `offer` | `offerFactId`, else `heroFactId` | Fact text verbatim. Omitted when both are absent and the template's offer use is optional. |
| `proof` | `proofFactId` | Omitted when absent. |
| `disclaimer` | `disclaimerFactId` | Omitted when absent. |
| `photo`, `photo-2`, `photo-3` | `assets[]` | REQUIRED (`photo`). May be a container (T03 holds 1–2 figures). |
| `benefits`, `benefit-1`..`benefit-3` | `copy.benefits[0..2].text` | Optional container + per-item slots. |
| `x-<name>` | nothing from content | Decorative/structural wrappers only. Must not contain config text. |

Shared rules:
- The hero fact never also appears in the same creative's benefit list.
- Text is never truncated or ellipsized. Over the template budget → schema rejects it; within budget but does not fit → fitter shrinks to the group minimum; still failing → layout error.
- Image alt text = `productName`.
- Photo choice per slot (deterministic): photos whose `kind` matches the slot's kind, in upload order; if none match, any photo in upload order (a scene photo in a cutout slot is shown with `contain`; a cutout in a scene slot sits on the brand background).

## 4. Phases

### Phase 0 — baseline. DONE (commit `bdae3e8`, engine worktree, typecheck/lint clean, 98 pass / 0 fail / 19 browser tests skipped without Chrome).

### Phase 1 — shared contract (engine worktree, mechanical)

**Status: DONE 18 Nov 2026, uncommitted in the engine worktree** (executed plan → work → independent review → revise; evidence in the engine log). Final: typecheck 0 errors, lint clean, `npm.cmd test` 128 tests: 109 pass, 0 fail, 19 skipped without Chrome (baseline was 117 tests: 98 pass); 15 mutation checks on the new rules, all caught by tests (one escaped first, see review round). Two deviations from the text below: `factText`/`brandMark`/`headlineWithAccent` were copied into `fill.ts`, not moved out of `split-composition` (Phase 3 removes the private copies); tests beyond the plan were added in `tests/engine/render-contract.test.ts`, `tests/engine/unit.test.ts` and `tests/templates/shared-fill.test.ts`.

Task 1.1 — extend the config schema. File `src/shared/render-contract.ts`.
1. `CONTRACT_VERSION = '0.3'`.
2. `templateConfigSchema`: add top-level `productName: textField(60).optional()`, `heroFactId: idSchema.optional()`, `disclaimerFactId: idSchema.optional()`; in `copy`: `eyebrow: textField(48).optional()`, `bodyFactIds: z.array(idSchema).min(1).max(5).optional()`; in each `assets[]` item: `kind: z.enum(['cutout', 'scene']).optional()`.
3. In the existing `superRefine` (destructure `body`, `bodyFactIds` from `config.copy`): `bodyFactIds` without `body` → issue `['copy','bodyFactIds']` "bodyFactIds without a description"; `heroFactId` together with `offerFactId` → issue `['heroFactId']` "use a hero fact only when there is no offer". Do **not** add "body requires bodyFactIds" yet: existing fixtures use `body` without fact ids and 11 template tests would fail (verified 18 Nov). Put a one-line comment instead: `// "body requires bodyFactIds" is enforced from slot_normalization_plan.md Task 3.12.` The rule is switched on in Task 3.12.
3b. Update `tests/engine/contract-kit.test.ts:32`, which asserts the contract version `'0.2'`, to `'0.3'` (this is the only test change in this task).
4. Export `CANONICAL_SLOTS` (the §3 list without `x-`) and `isCanonicalSlot(name)` that also accepts `/^x-[a-z][a-z0-9-]{0,61}$/`.
5. `src/server/render/render-output.ts` `referencedFactIds`: add `config.copy.bodyFactIds`, `heroFactId`, `disclaimerFactId`.
6. `ResolvedAsset` (`render-contract.ts:124`): add `kind?: 'cutout' | 'scene'`; `src/server/assets/resolve-render-assets.ts` copies it from the config asset.
Check: `npm.cmd run typecheck`; `npm.cmd run lint`; `npm.cmd test` → expected 98 pass / 0 fail / 19 skipped without Chrome (baseline `bdae3e8`).

Task 1.2 — content manifest type. File `src/shared/render-contract.ts`. Add an optional field `content?: ContentManifest` to `TemplateModule` (made required in Task 3.12):
```ts
export interface ContentManifest {
  headline: { max: number };
  eyebrow: { use: 'optional' | 'none'; max?: number };
  body: { use: 'optional' | 'none'; max?: number }; // D5: body or benefits (or both) must be allowed
  cta: { max: number };
  benefits: { min: number; max: number; chars?: number };
  photos: { min: number; max: number; kind: 'cutout' | 'scene' | 'any' };
  offer: 'required-or-hero' | 'optional-or-hero' | 'offer-only';
  proof: 'optional' | 'none';
  disclaimer: 'optional' | 'none';
  comparison?: 'opt-in';                      // T02 only
}
```
Numbers come from the template's existing `*_BUDGETS` constant (import, do not repeat literals). Also export `checkContentManifest(m): string[]` returning problems; one rule now: `body.use === 'none' && benefits.max === 0` → "template has no place for supporting copy".
Check: typecheck, lint, `npm.cmd test`.

Task 1.3 — shared template helpers. New file `src/templates/shared/fill.ts`:
- `factText(facts, id, what)` — move the 3-argument version from `src/templates/part02/split-composition/render.ts:8`.
- `offerOrHeroText(config, facts)` → `{ text, source: 'offer' | 'hero' } | undefined`.
- `brandMark(config, logo, imgClass)` → SafeHtml (pattern of `split-composition/render.ts:51-53`).
- `headlineWithAccent(text, accent, wrapClass)` (from `split-composition/render.ts:16`).
New test `tests/templates/shared-fill.test.ts`: missing fact throws; offer wins over hero; hero used when no offer; logo vs name.
Check: typecheck, lint, `npx.cmd tsx --test tests/templates/shared-fill.test.ts`.

Task 1.4 — photo kind detection. File `src/server/assets/normalize-image.ts`.
1. Add `kind: 'cutout' | 'scene'` to `NormalizedImage`.
2. Rule: `scene` when the image has no alpha channel. With alpha: read raw RGBA (`sharp(...).ensureAlpha().raw()`), count pixels with alpha < 16; `cutout` when that share is ≥ 5% of all pixels, else `scene`. Constants `CUTOUT_ALPHA_MAX = 16`, `CUTOUT_MIN_SHARE = 0.05` exported.
3. Tests in the existing normalize test file (find it with `grep -rl normalizeImage tests`): JPEG → scene; opaque PNG → scene; PNG with a transparent border (synthetic, built with sharp in the test) → cutout.
Check: typecheck, lint, the normalize test file.

### Phase 2 — contract kit enforcement (engine worktree, mechanical)

**Status: DONE 18 Nov 2026 with one verification gap, uncommitted in the engine worktree.** Plan → work → independent review → revise. Final: typecheck and lint clean, `npm.cmd test` 155 tests, 136 pass, 0 fail, 19 skipped without Chrome. A first mutation round (36) was fully caught after fixes; a second round (55) on the revised code was stopped by the system for low memory and its results were not read, and the revisions were not re-reviewed. Re-run the mutation round in small batches before relying on the revised kit. Phase 1 note on `checkContentManifest` below: it now also checks budgets against `CONFIG_LIMITS`.

Task 2.1 — `src/server/render/contract-kit.ts`, new checks (fail). **All of them apply only to modules that declare `content`** (the 7 existing templates do not yet, and would all fail the vocabulary check until Phase 3); Task 3.12 makes `content` required and removes that condition.
- Per case and format: `slots.canonical`: every `data-slot` passes `isCanonicalSlot`.
- Per case and format: `slots.core`: markup has `brand`, `headline`, `cta`, `photo`; a rendered case with `body` has `description` when the manifest allows a body; a case with benefits has `benefit-1` when the manifest allows benefits.
- Per case and format: `content.logo`: a case with a logo renders that logo's `<img>` (same src, so a photo does not count) inside `[data-slot="brand"]`. Exported helper `imageInSlot(markup, slot, src)`.
- Once per module (no case or format), `content.manifest`: `checkContentManifest` returns no problems (supporting copy has a place; every budget is within `CONFIG_LIMITS`, the shared schema limits, now exported from `render-contract.ts`; photo and benefit counts are consistent) and, for offer `required-or-hero` or `offer-only`, the slot manifest requires an `offer` slot.
- Once per module, `cases.derived`: fails with the reason when no case could be derived (no supplied case accepted by the schema, or the base case lacks a brand or first-asset bytes); passes for comparison designs, which are checked with their own cases.
Task 2.2 — new `src/server/render/manifest-cases.ts`: `manifestCases(module, base)` derives cases from the first supplied case the schema accepts: `max` (every allowed field at budget length, repeated Dutch words such as "Duurzaam "; budgets the manifest leaves open fall back to the shared limits), `min` (required fields only, short text, no logo), `no-logo`, and `no-offer` (hero fact instead of the offer; **not derived for `offer-only` templates**, so those get three cases). Cases start from a copy of the base config, so a template's own extra fields carry over; offer, hero, proof, disclaimer, callouts and the accent phrase are regenerated. The derived logo is its own small PNG, not the photo bytes. Returns nothing for comparison designs. The kit runs the derived cases for modules that declare `content`.
Check: typecheck, lint, `npm.cmd test`.

### Phase 3 — engine templates (engine worktree)

Tasks 3.2, 3.6 and 3.8 (add a description to T03, T10, T14) were removed on 18 Nov: those templates already have benefit slots for supporting copy (D5).

Common steps for every mechanical task: (a) rename slots per the table (render.ts markup, index.ts `slots`, test regexes), keep CSS class names; (b) use `src/templates/shared/fill.ts` helpers and **delete the template's private copies** of `factText`, brand mark and headline-accent helpers (Task 1.3 copied them to `fill.ts`, it did not remove them from the templates); (c) apply the offer rule; (d) add `content` manifest; (e) fixtures: a case with a logo, a case with `heroFactId` and no offer, `bodyFactIds` wherever `body` is used, assets with `kind`; (f) bump `version` to `0.2.0`.
Check per task: `npm.cmd run typecheck`; `npm.cmd run lint`; `npx.cmd tsx --test tests/templates/<id>.test.ts` (0 fail, 0 warn); with Chrome: `npx.cmd tsx --test tests/templates/<id>.render.test.ts`; report contact sheets in `artifacts/templates/<id>/`.

| Task | Template | Type | Changes | Photo kind |
|---|---|---|---|---|
| 3.1 | T03 dark-offer-stack (engine `part01` folder) | mechanical | `photos`→`photo`; `footer`→`x-footer`; offer `optional-or-hero` | cutout |
| 3.3 | T05 split-composition | mechanical | `pill`→`benefit-1`; chips inside `benefits` get `benefit-2`,`benefit-3`; `brand-sub`→`brand-name` declared `required: true` (always rendered); offer `optional-or-hero`; `bodyFactIds` | any |
| 3.4 | T08 photo-overlay | mechanical | offer `optional-or-hero`; `bodyFactIds`. Do not rename `.pov-*` classes (`tests/templates/photo-overlay.test.ts:62-76` compares with `Template-example/layerfit_t08/script.js`) | scene |
| 3.5 | T10 atmospheric-editorial | mechanical | brand via `brandMark` (class `ae-logo`, CSS addition `.lf-atmospheric-editorial .ae-logo { height: 1.2em; width: auto; display: block }`); offer `optional-or-hero` | scene |
| 3.7 | T14 outline-poster | mechanical | `topline`→`eyebrow`, lines from `copy.eyebrow` split on spaces (max 3 words, each ≤16; move the schema rule from body to eyebrow); brand via `brandMark` (class `og-logo`, CSS `.lf-outline-poster .og-logo { height: 1.4em; width: auto }`); offer `optional-or-hero`; fixture `full` gets `eyebrow: 'HEIGHT BOOSTING SHOES'` | cutout |
| 3.9 | T16 discount-offer | mechanical | offer `required-or-hero` (schema accepts `offerFactId` or `heroFactId`; render uses `offerOrHeroText`); `bodyFactIds` | cutout |
| 3.10 | T16 | DESIGN | add `brand` slot (template has none) | — |
| 3.11 | T17 minimal-discount | mechanical | brand via `brandMark` (class `md-logo`, CSS `.lf-minimal-discount .md-logo { height: 1.1em; width: auto; display: block }`); offer `required-or-hero`; `bodyFactIds` | cutout |
| 3.12 | — | mechanical | make `content` required in `TemplateModule`; kit runs `manifestCases` and `slots.core` for every module; in `templateConfigSchema.superRefine` add `copy.body` without `bodyFactIds` → issue `['copy','bodyFactIds']` "description needs verified fact ids" (replace the Task 1.1 comment) and replace the test `config schema: a description without fact ids is still accepted…` in `tests/engine/render-contract.test.ts` with one asserting that issue. Check: full `npm.cmd test` | — |

### Phase 4 — part01 templates (main repo)

Common steps a–f as in Phase 3, on `templates/part01/src/<file>.ts` (+ its `-css.ts`/`.css` only where listed), `templates/part01/scripts/<name>-cases.ts`, `templates/part01/tests/<name>.test.ts`. The extension object is removed; fields map as below.
Check per task: `cd C:\Users\Asus\Layerfit-JMD\templates\part01; npm.cmd run typecheck; npm.cmd test`, plus the template's render script in `scripts/` with Chrome; report the output folder under `templates/part01/artifacts/`.

| Task | Template (file, id) | Type | Changes | Photo kind |
|---|---|---|---|---|
| 4.1 | T04 `editorial-reframe.ts` | mechanical | first create `tests/editorial-reframe.test.ts` (contract kit; none exists). Then `reviews`→`proof`; `subheadline`→`description` (+`bodyFactIds`); `brand-logo`→`brand` via `brandMark` | scene |
| 4.2 | T04 | DESIGN | CTA always visible in its own position (now it shares the price banner with `offer`, `:74`/`:77`); brand name fallback; portrait and vertical formats (square only today) | — |
| 4.3 | T06 `question-hook.ts` | mechanical | header → `x-masthead` with inner `brand`; `product-photo`→`photo`; `photo-caption`→`product-name`; `headlineLead`+`headlineAccent`→`copy.headline`+`accentPhrase`; `eyebrow`→`copy.eyebrow`; `descriptionFactId`→`body`; `featureFactIds`→`copy.benefits` with `benefit-1..2` slots; `brandRight`, `footerNote` removed; `imageAlt`→`productName` | any |
| 4.4 | T07 `everyday-editorial.ts` | mechanical | `masthead`→`x-masthead` with inner `brand`; `kicker` removed; `eyebrow`→`copy.eyebrow`; `headlineLines`→`copy.headline` (D4: CSS `text-wrap: balance` on `h1`); `descriptionFactId`→`body`; `product-photo`→`photo`; `product-label`→`product-name` (`productName`); `photo-caption` removed (avoids the product name twice); `featureFactIds`→`benefits` + `benefit-1..3`; `imagePosition`→ from `assets[0].focalPoint` (default `50-50`); fit group `editorial-headline`→`t07-headline` (collides with T04) | scene |
| 4.5 | T09 `question-hook-t09.ts` | mechanical | `brandbar`→`x-brandbar` with inner `brand` via `brandMark` (logo **or** name, not both); `product-image`→`photo`; `features`→`benefits` + `benefit-N`; `descriptionFactId`→`body`; `imageMode`→`assets[0].allowCrop ? 'cover' : 'contain'`; `headlineScale`→ headline length ≤18 `xl`, ≤30 `lg`, else `md`; accent = `accentPhrase` if set, else last word; manifest `cta` → `required: true` | cutout |
| 4.6 | T11 `product-collection-hero.ts` | mechanical | `product-main`→`photo`; `subhead`→`description` (`body`); `disclaimerFactId`→ top-level `disclaimerFactId`; `headlineLines`→ D4; drop the rule that the headline must equal a fact | cutout |
| 4.7 | T11 | DESIGN | logo forbidden today → brand via `brandMark` | — |
| 4.8 | T12 `immersive-editorial.ts` | mechanical | `scene`→`photo`; `eyebrow`→`copy.eyebrow`; `headlineLines`→ D4; `descriptionFactId`→`body` | scene |
| 4.9 | T12 | DESIGN | add `brand` (no brand shown, logo forbidden today) | — |
| 4.10 | T13 `editorial-sale-promo.ts` | mechanical | `campaign-label`→`eyebrow` (`copy.eyebrow`), T13's own eyebrow element removed; `fineprint`→`disclaimer` (`disclaimerFactId`); `descriptionFactId`→`body`; `discountWord` fixed `korting` (nl); `demoMode`/`demoLabel` removed; `imageAlt`→`productName`; offer `offer-only` (big parsed percentage; chosen only when a discount exists) | any |
| 4.11 | T13 | DESIGN | brand via `brandMark` (logo ignored today) | — |
| 4.12 | T15 `lifestyle-benefit-editorial.ts` | mechanical | `note` removed; `eyebrow`→`copy.eyebrow`; `descriptionFactId`→`body`; `benefitFactIds`→`copy.benefits` (max 2) | scene |
| 4.13 | T18 `mediterranean-fashion-poster.ts` | mechanical | `headlineLines`→ D4; `event-date`, `event-time` removed; `badge` removed; `offer` becomes `optional-or-hero` (address text no longer special) | scene |
| 4.14 | T18 | DESIGN | logo forbidden today → brand via `brandMark`; T18 has no body and no benefits: add one highlight line (`description` slot, short budget); recheck composition after badge/event removal | — |
| 4.15 | T02 `comparison-banner.ts` | DESIGN | add CTA and brand (logo or name); its comparison points are its supporting copy; portrait and vertical formats; manifest `comparison: 'opt-in'` (left/right labels and fact ids stay as its own inputs); 3 photos stay required in comparison mode | scene |
| 4.16 | Legacy `annotated-hero.ts`, `dual-panel.ts`, `dark-offer-stack.ts`, `schema.ts` | — | not migrated, not registered, untouched | — |

### Phase 5 — central registry and resolver (engine worktree, mechanical)

Task 5.1 — `src/templates/registry.ts`: one exported array of every migrated module in a fixed priority order (this order makes template choice deterministic). Part01 modules are added by import path once their Phase 4 tasks pass. T02 is listed but only eligible in comparison mode.
Task 5.2 — `src/server/creative/resolve-config.ts` (pure, no AI, no I/O): `(content, template, conceptIndex) → { ok: true, config } | { ok: false, reason }`. Eligibility from the manifest: photo count, benefits min, `offer-only` needs an offer, `comparison: 'opt-in'` needs comparison inputs and the user's opt-in. Builds `TemplateConfig` with the §3 fill rules; photo choice by kind (§3), rotating by `conceptIndex` within the matching photos.
Task 5.3 — `planConcepts(content, registry, count)`: walks the registry in order, keeps eligible templates, returns the first 15 distinct (variants beyond 15). Tests: with and without discount → 15; one photo; only scene photos; only cutouts; no logo; same input twice → deep-equal output.
Check: typecheck, lint, `npm.cmd test`.

## 5. D3 — template-specific fields (decided: fill from input, drop the rest)

| Template.field | Result |
|---|---|
| T06 `photoCaption` | `productName` (slot `product-name`) |
| T07 `productLabel` | `productName` (slot `product-name`); T07 `photo-caption` removed |
| T13 `campaignLabel` | `copy.eyebrow`; T13's separate eyebrow removed |
| T13 `discountWord` | fixed per language (`korting` for nl) |
| T06 `brandRight`, `footerNote`; T07 `kicker`; T15 `note`; T13 `demoMode`/`demoLabel`; T18 `badge`, `event-date`, `event-time` | removed |

## 6. Done criteria

- Every registered template: contract kit 0 fail / 0 warn including `slots.canonical`, `slots.core`, `content.manifest` and the four manifest cases, in all three formats.
- No template-specific extension objects left (except T02's opt-in comparison inputs).
- `planConcepts` returns 15 distinct templates for the two synthetic briefs (apparel, bottle) with and without a discount, with only cutouts and with only scene photos, and identical output for identical input.
- Contact sheets of every migrated template reviewed by the owner; every DESIGN task approved visually.
