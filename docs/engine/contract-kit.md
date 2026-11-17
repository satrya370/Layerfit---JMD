# Contract test kit

Implements step 2 of `docs/contracts/render-template-contract.md` §11 (contract v0.2). No browser needed.

Purpose: the template owner runs it before handing over a commit; the engine owner runs it again on the locked commit before integration. A pass means the module follows the shared contract. It does **not** mean the layout is good: overflow, collisions, safe area and glyph legibility are measured by the renderer in a real browser (see "What it does not check").

## What the template side must provide

1. A module file that exports `templateModule` (or a default export) of type `TemplateModule`:

```ts
export const templateModule: TemplateModule = {
  id: 'annotated-hero',
  version: '0.2.0',
  formats: ['square', 'portrait', 'vertical'],
  rootClass: 'lf-annotated-hero',
  slots: [{ name: 'headline', required: true }, /* … */],
  configSchema,            // Zod schema of the stored config (strict)
  render({ format, profile, config, photos, logo, facts }) { return { body, css }; },
};
```

2. A cases file that exports `contractCases` (an array, or a function returning one, sync or async). Each case:

```ts
{
  name: 'bottle-three-benefits',
  campaignId: '…uuid…',
  config: { /* a valid stored config for this template */ },
  facts: [{ id, text, verified: true }],         // facts the config references
  assets: [{ campaignId, assetId, bytes }],      // synthetic raster bytes the config references by assetId
  formats: ['square'],                            // optional, defaults to the module's formats
  rejects: [{ name: 'offer without fact', config: { … } }], // optional extra configs that must be rejected
}
```

Use synthetic assets and facts only.

## Run

```powershell
cd C:\Users\Asus\Layerfit-JMD-engine
npm.cmd run check:template -- --module <path\to\module.ts> --cases <path\to\cases.ts> --commit <hash> --out report.json
```

Add `--strict` to treat warnings as failures. Exit codes: 0 pass, 1 contract failure, 2 usage or load error. Example that passes: `--module fixtures/engine/templates/fixture-module.ts --cases fixtures/engine/contract-cases.ts`. Example that fails on purpose: `fixture-module-hostile.ts`.

Programmatic use: `checkTemplateContract(module, cases, { strict })` and `formatViolationReport(report, { commit, reproduce })` from `src/server/render/contract-kit.ts`.

## One thing that will fail until the template side changes

`body` must be `SafeHtml` created by the shared `html` builder, and the kit checks it with `instanceof` against the engine's copy of that class. A module that imports its own copy of the builder produces a different class and fails with `render.output`. Until there is one root package, import the builder from the exact module file the engine uses (`src/shared/html.ts`). The same applies in production: the engine rejects a non-`SafeHtml` body with `TEMPLATE_FAILED`.

## Checks

| Id | Status when violated | What it verifies |
|---|---|---|
| `cases.present` | fail | At least one case is supplied |
| `module.registry` | fail | The real registry accepts id, version, formats, `rootClass` and slot manifest (unique, well-formed names, at least one required slot) |
| `schema.accepts` | fail | The case config parses with the module's schema |
| `schema.strict` | fail | The schema rejects 10 generic hostile variants (unknown keys, CSS injection in colors, font outside the registry, path traversal in an asset id, image bytes in config, 500-character headline, control character, missing CTA, markup in `templateId`) plus any `rejects` supplied. Variants that do not apply to the config shape are skipped and counted |
| `assets.resolve` | fail | The case's assets resolve through the engine's asset resolver for that campaign |
| `render.output` | fail | `render()` does not throw, returns `body: SafeHtml` and a non-empty `css` string, for every format |
| `render.deterministic` | fail | Two renders of the same input are identical |
| `css.rules` | fail | No `@import`, no non-`data:` `url()`, no markup or script-like constructs (escape-decoded), at most 512 KB |
| `markup.forbidden` | fail | No `<script>`, `<link>`, `<iframe>`, `<object>`, `<embed>`, `<base>`, `<meta>`, `<form>`, `<style>`, media tags; no `on*` handlers; no `srcset`, `poster`, `action`; no `javascript:` |
| `markup.assets` | fail | Every `<img src>` is exactly an engine-resolved asset `src`; `href` values are `#fragments`; no external URL in any attribute (SVG `xmlns` is fine); no non-`data:` `url()` in `style` attributes |
| `slots.names` | fail | `data-slot` names are unique and well-formed |
| `slots.manifest` | fail | Every manifest-required slot for the format is in the markup (reports the slot name) |
| `attributes.values` | fail | `data-required`/`data-safe` are `"true"` or `"false"`; `data-fit-group` is `[a-z][a-z0-9-]{0,31}`; `data-fit-min` is 0.5–1; `data-image-fit` is `contain` or `cover`; `data-allow-overlap` names known slots or `*` |
| `image.fit` | fail | Every `<img>` has `data-image-fit`; `cover` needs `data-allow-crop` and an asset whose config `allowCrop` is true |
| `css.scoped` | warn | Selectors are under `.rootClass` or `[data-template="id"]` |
| `css.canvas` | warn | CSS contains a literal 1080/1350/1920 px size (the engine owns the canvas) |
| `css.tokens` | warn | CSS reads at least one `--lf-safe-*` token |
| `slots.undeclared` | warn | Slots in the markup that are not in the manifest |
| `slots.required-flag` | warn | Manifest-required slots without `data-required="true"` |
| `fit.group.unused` | warn | A `data-fit-group` the CSS never reads through `var(--lf-fit-<group>)`, so fitting cannot shrink it |

## What it does not check

- Layout: overflow, clipping, collisions, safe-area, canvas bounds and whether text is legible. The renderer reports these in a browser (`LAYOUT_OVERFLOW`, `SAFE_AREA_VIOLATION`, `SLOT_COLLISION`, …). The kit test suite includes a fixture with a safe-area defect that the kit accepts on purpose.
- Whether a fact is true, an offer is valid or expired, or an asset belongs to the right campaign. Those belong to the domain service.
- Visual design, brand fit, or whether an anchor points at the right product feature.
- Fonts actually loaded in a browser (the renderer checks that).

## Known limits of the kit

- Markup is read with a small tag tokenizer, not a full HTML parser. It is a conformance linter. The real controls remain escaping by construction, the page CSP and request interception.
- It cannot detect a template that ignores the contract at runtime in ways that do not show in the markup it produced for the supplied cases. More cases give better coverage.
- Only cases the template owner supplies are exercised. Hostile *configs* come from the generic variants and from `rejects`.

## Evidence

`tests/engine/contract-kit.test.ts` (17 tests) and `tests/engine/contract-kit-cli.test.ts` (4 tests) pass. The kit tests use deliberately broken variants of the fixture, one per rule. Two checks were also disabled temporarily to confirm the tests fail without them (forbidden tags and the asset-src rule; three tests failed, then the code was restored).

The kit has **not yet been run on any real template module**: none of T01–T03 exports a `TemplateModule` yet.
