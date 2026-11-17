# Render ↔ Template Contract

**Status: DRAFT v0.2 — 17 November 2026.** Becomes binding only after both owners cross-check it and record agreement in `rendering_engine_log.md` and `template_part01_log.md`. Until then, neither side changes its interface on the basis of this document alone.

Changes since v0.1 (all recorded in `rendering_engine_log.md`):
- §2 safe insets and §4 callout anchor are now **agreed** by both owners (template proposal confirmed by the engine owner).
- §10 gains two engine behaviours from review pass 2: `RenderResult.format` can be `null`, and error messages are safe by construction.
- §11 step 2 (contract test kit) is a **prerequisite** for integrating T01. The engine owner provides the kit; the template owner runs it on a locked commit and reports violations without editing engine files.

Owners: rendering engine (Claude) and Part 01 templates (GPT). Parent documents: `spec.md`, `docs/architecture.md`, `rendering_engine_plan.md`, `template_part01_plan.md`. Items marked **OPEN** need a decision.

## 1. File ownership

| Area | Owner | Rule |
|---|---|---|
| `templates/part01/**` | Template | Engine reads only; violations are reported, never patched by the engine owner |
| `src/server/**`, `tests/engine/**`, `fixtures/engine/**`, `docs/engine/**` | Engine | Template owner reads only |
| `template_part01_log.md`, `TODO.md`, `docs/verification.md` | Template (during this work) | Engine evidence goes to `rendering_engine_log.md` / `docs/engine/` and is merged once at the end |
| `rendering_engine_log.md` | Engine | — |
| This contract, shared TS contract module, shared fixtures | Both | Changed only by proposal + cross-check; bump `CONTRACT_VERSION` |
| Root `package.json` / lockfile | Both | **OPEN**: who creates it at merge. Until then `templates/part01` stays an isolated subpackage |

Engine work happens in worktree `C:\Users\Asus\Layerfit-JMD-engine` (branch `engine/rendering`). Template work stays in the main tree until it moves to its own branch.

## 2. Identifiers and formats

- Template IDs: `annotated-hero`, `dual-panel`, `dark-offer-stack`, `editorial-reframe`. Template versions are semver. Bump the version whenever output can change for the same config.
- Formats: `square`, `portrait`, `vertical`. Encodings: `png`, `jpg`. One placement = one creative revision × one format; PNG and JPG of it are two files, not two concepts.

Single source of format profiles. CSS must read these values from tokens and must not hard-code its own copy.

| Format | Canvas | Safe inset (top / right / bottom / left) |
|---|---|---|
| square | 1080×1080 | 60 / 70 / 60 / 70 — **agreed** |
| portrait | 1080×1350 | 70 / 70 / 70 / 70 — **agreed** |
| vertical | 1080×1920 | 250 / 70 / 350 / 70 (spec baseline) — **agreed** |

Order is top / right / bottom / left. The engine is the single source (`FORMAT_PROFILES`, frozen) and exposes the values as `--lf-safe-*` tokens; templates read the tokens and keep no copy of their own. T01's prototype values (62/72/60/72 and 74/70/72/70) are to be replaced by the tokens.

Safe insets are a conservative baseline, not a guarantee against every Meta UI variant.

## 3. What each side owns at render time

**Engine owns:** the full HTML document (doctype, `<head>`, CSP, `@font-face`), the canvas root element, format/safe/brand/font tokens, asset resolution and normalization, campaign ownership checks, network isolation, readiness, layout validation and fitting, screenshot, encoding, storage and revisions.

**Template owns:** composition, the body fragment inside the canvas root, compiled CSS, per-template copy budgets (narrowing the base schema), visual fallbacks, and slot annotations.

The engine renders:

```html
<main data-canvas class="{rootClass}" data-format="{format}" data-template="{id}" data-template-version="{version}">
  {template body fragment}
</main>
```

## 4. Creative config (stored, serializable)

Based on `template_part01_plan.md` §4. Templates may narrow the schema (stricter budgets, literal `templateId`, fewer benefits) but may not add bytes, URLs, paths, HTML or CSS fields.

```ts
interface TemplateConfig {
  schemaVersion: 1;
  templateId: string;                 // must equal the snapshot templateId
  brand: {
    name: string;                     // ≤100
    logoAssetId?: string;
    primary: string; secondary: string; accent: string;  // #rrggbb
    fontHeadingId: FontId; fontBodyId: FontId;           // from shared font registry
  };
  copy: {
    headline: string;                 // ≤90 base; template budget may be lower
    accentPhrase?: string;            // must be an exact substring of headline
    body?: string;                    // ≤240
    cta: string;                      // ≤32
    benefits: Array<{ text: string; factIds: string[] }>;   // ≥1 factId each
  };
  assets: Array<{ assetId: string; role: 'product' | 'lifestyle' | 'detail';
                  focalPoint?: { x: number; y: number }; allowCrop: boolean }>;  // 1–8
  callouts?: Array<{ benefitIndex: number; anchor: { x: number; y: number } }>;
  offerFactId?: string;               // offer text comes from the verified fact, never a free label
  proofFactId?: string;
  comparisonEvidenceId?: string;
}
```

- IDs: lowercase `[a-z0-9-]`, ≤64 characters (UUIDs fit). Colors: `#rrggbb` only. No control characters in text.
- Callout `anchor` is normalized to the **product-stage box**, the box that holds the connector SVG (**agreed**; this replaces the earlier "contained image box" wording). The editor accepts a click only inside the image area that is actually visible after `object-fit: contain`, and converts it to stage coordinates. The renderer does not judge whether an anchor points at the right product feature; it only checks bounds, safe area, collisions and declared overlaps.
- Every fact referenced by `benefits`, `offerFactId`, `proofFactId` or `comparisonEvidenceId` must be present in the snapshot's verified facts, or the render fails with `FACT_MISSING`. The renderer checks presence; truth is checked by the domain service before enqueue.

Outside the config, in the immutable render snapshot: `campaignId`, `creativeId`, `revision`, `templateId`, `templateVersion`, `language` (`nl` default, `en`, `id`) and the resolved verified facts `{ id, text }`.

## 5. Template module interface

```ts
interface TemplateModule {
  id: string;
  version: string;
  formats: readonly Format[];
  rootClass: string;                  // static, [a-z][a-z0-9-]*, e.g. "lf-annotated-hero"
  slots: Array<{ name: string; required: boolean; formats?: Format[] }>;  // manifest for contract tests
  configSchema: ZodType<TemplateConfig>;
  render(input: {
    format: Format;
    profile: { width: number; height: number; safe: { top: number; right: number; bottom: number; left: number } };
    config: TemplateConfig;           // already validated by configSchema
    photos: ResolvedAsset[];          // config.assets order, normalized by the engine
    logo?: ResolvedAsset;
    facts: ReadonlyMap<string, { id: string; text: string }>;
  }): { body: SafeHtml; css: string };
}

interface ResolvedAsset {
  assetId: string; role: 'product' | 'lifestyle' | 'detail' | 'logo';
  mime: 'image/png' | 'image/jpeg'; width: number; height: number; sha256: string;
  src: string;                        // engine-generated data URI; use only as <img src>
  focalPoint?: { x: number; y: number }; allowCrop: boolean;
}
```

- `body` must come from the shared `html` tagged template (it escapes every interpolation). A plain string is rejected.
- `render` must be pure: no filesystem, network, randomness or clock. The same input gives the same output.
- A thrown error becomes `TEMPLATE_FAILED`.

## 6. Tokens provided by the engine (on the canvas root)

```text
--lf-canvas-w  --lf-canvas-h
--lf-safe-top  --lf-safe-right  --lf-safe-bottom  --lf-safe-left
--lf-brand-primary  --lf-brand-secondary  --lf-brand-accent
--lf-font-heading  --lf-font-body          (bundled family + generic fallback)
--lf-fit-<group>                            (set only during fitting; default 1 via var(..., 1))
```

The engine sets the canvas width, height and `overflow: hidden`. Template CSS should not redefine canvas size.

## 7. Semantic attributes

| Attribute | Values | Meaning |
|---|---|---|
| `data-slot` | unique name per render | Element the engine checks |
| `data-required` | `"true"` / `"false"` / absent (= false) | Must be visible with non-zero size |
| `data-safe` | `"true"` / `"false"` / absent (= false) | Must stay inside the safe box |
| `data-fit-group` | `[a-z][a-z0-9-]{0,31}` | Engine may scale `--lf-fit-<group>` down in 0.05 steps |
| `data-fit-min` | number 0.5–1, default 0.8 | Lowest scale for that group |
| `data-allow-overlap` | space-separated slot names, or `*` | Intentional overlap (connectors, labels on photos, scrims) |
| `data-image-fit` | `contain` / `cover` | Required on every `<img>`; must match computed `object-fit` |
| `data-allow-crop` | present only if the asset's `allowCrop` is true | Required for `cover` |

Fitting CSS pattern: `font-size: calc(64px * var(--lf-fit-headline, 1));`. The engine never truncates, ellipsizes or hides copy. If fitting runs out, the render fails with `LAYOUT_OVERFLOW` and slot diagnostics.

Text slots must render with `var(--lf-font-heading)` or `var(--lf-font-body)`. A computed system fallback font fails with `FONT_MISSING`.

## 8. Markup and CSS rules

- No `<script>`, `on*=` attributes, `<link>`, `<iframe>`, `<object>`, `<base>` or external URLs. `<img src>` uses `ResolvedAsset.src` only.
- No user values inside `style`, `<style>` or URL attributes. Colors and fonts come through engine tokens.
- CSS is compiled locally before rendering: no `@import`, no `url()` except `data:`, no script-like constructs, ≤512 KB. Selectors are scoped under `rootClass`.
- Tailwind classes must be static in source; no dynamic class names built from input.

## 9. Fonts (interim)

| FontId | Family | Weights | Source |
|---|---|---|---|
| `inter` | `LF Inter` | 400, 700, 800, 900 | `@fontsource/inter` (OFL-1.1) |
| `fraunces` | `LF Fraunces` | 400, 700 | `@fontsource/fraunces` (OFL-1.1) |
| `montserrat` | `LF Montserrat` | 700, 800, 900 | `@fontsource/montserrat` (OFL-1.1) |
| `poppins` | `LF Poppins` | 400, 500, 600, 700 | `@fontsource/poppins` (OFL-1.1) |

Added after v0.2 by the engine owner for the owner-supplied T03 and T05 designs (`montserrat`, `poppins`, Inter 800/900). `FONT_IDS` in the shared module lists all four. **Pending cross-check by the template owner**, since the earlier agreement named only Inter and Fraunces.

These are interim fonts, not LayerFit brand fonts, and are replaced when brand guidelines are available. Licences are to be re-checked before external distribution.

## 10. Results and errors

The engine returns `RenderResult { status, taskId, creativeId, revision, format, artifacts[], diagnostics, error? }`. Error codes relevant to templates:

| Code | Typical template cause |
|---|---|
| `CONFIG_INVALID` | Config fails the template's narrowed schema |
| `FACT_MISSING` | Referenced fact not in snapshot |
| `TEMPLATE_FAILED` | `render` threw or returned a non-SafeHtml body |
| `CSS_INVALID` / `CSS_NOT_READY` | Forbidden CSS construct / unclosed rule |
| `NETWORK_BLOCKED` | Markup or CSS tried to load an external resource |
| `FONT_MISSING` | Text slot rendered in a non-bundled font |
| `SLOT_MISSING`, `LAYOUT_OVERFLOW`, `LAYOUT_CLIPPED`, `SLOT_COLLISION`, `SAFE_AREA_VIOLATION`, `OUT_OF_CANVAS`, `IMAGE_CROP_INVALID` | Layout issue at a named slot |

Two engine behaviours that affect callers (added in v0.2):
- `RenderResult.format` is `Format | null`. It is `null` when the request was too malformed to read a valid format; a default is never guessed. `creativeId` is `''` and `revision` is `0` in the same case.
- `RenderResult.error.message` never contains raw exception text, file paths or provider detail. Raw detail is kept internally (`RenderError.internal`) and reaches operators through the engine's `onFailure` hook only.

## 11. Parallel testing

1. **Own tests.** The template side uses its smoke harness; the engine side uses its own fixture template. Neither waits for the other.
2. **Contract conformance (no browser).** A shared test kit checks a `TemplateModule`: schema accepts and rejects the shared fixtures, `render` returns `{ SafeHtml, css }`, CSS rules pass, no forbidden markup, manifest slots present, attribute values valid. The template owner runs it before handing over a version; the engine owner runs it before integration.
3. **Integration by commit hash.** The template owner commits a checkpoint on a template branch and shares the hash. The engine renders that exact version: shared fixtures (shirt, bottle) × 3 formats, PNG + JPG decoded. Separate artifact folders and separate temporary browser profiles.
4. **Visual review.** Contact sheets per brief and format. Geometric validation is not design approval.

Violation reports go to the template owner via the user and contain: template id/version/commit, fixture, format, error code, slot, detail, and how to reproduce. The engine owner does not edit template files.

## 12. Open items

Resolved: square/portrait safe insets (§2) and callout anchor coordinate space (§4), both agreed in v0.2.

1. Location of the shared TS contract module and shared fixtures before the root package exists (proposal: `src/shared/` and `fixtures/shared/`, owned jointly). Today the module is at `src/shared/` on the engine branch and the fixtures at `fixtures/engine/`.
2. Who creates the root `package.json` at merge, and pinned versions (Zod 4.6.6 in the template package vs 4.6.7 installed in the engine worktree, declared `^4.1.12`).
3. Whether `language` lives in the snapshot (implemented that way in the engine, not yet confirmed by the template owner) or in the config.
4. Slot manifest granularity: per template (implemented), or per template and format (the manifest already allows an optional `formats` per slot).
5. Contract test kit (§11 step 2): written by the engine owner (usage in `docs/engine/contract-kit.md` on the engine branch). It has not yet been run on any real template module, because none exports a `TemplateModule` yet. Still a prerequisite for T01 integration.
