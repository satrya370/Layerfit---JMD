# Reuse inventory — CP00

Reference: `ig-templates-demo` at commit `9ce00976664d1ac036bc38b75a8cf21621eac719` (package declares ISC). Prototype: `C:\Users\Asus\LayerFit` (src/server/render, src/server/assets). Licence and attribution review for external distribution is still pending (see `docs/audit.md`).

| Source | Element | Decision | Where it lives now | Note |
|---|---|---|---|---|
| Reference `scripts/build-and-render-demo.mjs` L43–52 | Browser connect/launch and page lifecycle | **Adapted** | `src/server/render/browser-manager.ts` | Sandbox kept on. Remote browsers are only disconnected, never closed. Page/context creation sits in an error boundary. Cleanup has its own timeout and failure is recorded, not thrown over the primary error. Bounded restart. Attribution in file header. |
| Reference L57–60, L97–102 | Per-slide loop with isolated try/catch, screenshot clip | **Adapted** | `src/server/render/render-output.ts` | Loop replaced by per-task `renderOutput` returning structured results. Fixed clip kept as explicit viewport + clip. |
| Reference L93–95 | `setContent`, `document.fonts.ready`, fixed 300 ms sleep | **Replaced** | `src/server/render/readiness.ts` | Per-face font checks, image decode, stable-layout check. No sleep. |
| Reference L87–91 | Raw `replaceAll` placeholder injection | **Not reused** | `src/server/render/document.ts`, `src/shared/html.ts` | Replaced by context-escaping `html` builder and an engine-owned document shell. |
| Reference L43–49 | `args: ['--no-sandbox']` | **Not reused** | — | Sandbox stays on by default. |
| Reference `lib/render-image-validation.cjs` | Remote HEAD/GET MIME validation | **Not reused** | — | Replaced by local byte decode. No remote fetch exists in the engine. |
| Reference `lib/image-resolver.cjs` | Candidate ranking, guessed domains, placeholders | **Not reused** | — | Asset-slot concept only, through owned asset IDs. |
| Reference `content-context.json` | Template guidance | **Concept only** | `src/shared/render-contract.ts` | Typed registry with budgets. |
| Reference n8n workflow | Orchestration | **Not reused** | — | Direct services and persistent job records instead. |
| Prototype `src/server/render/renderer.ts` | Schema, three format sizes, network blocking, PNG/JPG verification | **Replaced** | `src/server/render/*`, `src/server/storage/output-store.ts` | Prototype hardwired one template. Engine uses a registry. Encoding verification moved to `encode-output.ts` and now decodes both encodings. |
| Prototype `src/server/assets/normalize.ts` | Byte-level decode, 25 MP limit, rotate, re-encode | **Adapted** | `src/server/assets/normalize-image.ts` | Adds SHA-256 of source and output, alpha-aware PNG/JPEG choice, explicit error codes. |
| Prototype `src/templates/product-hero.ts` | Single hardwired template | **Replaced** | `fixtures/engine/templates/fixture-hero.ts` | Engine-only fixture. Not a LayerFit concept. |
| Prototype `scripts/render-smoke.ts` | Synthetic smoke + contact sheet | **Adapted** | `scripts/render-engine-smoke.ts` | Uses the engine batch path with negative cases in the same batch. |
| Prototype `tests/validation.test.ts` | Escaping, schema, decode tests | **Extended** | `tests/engine/unit.test.ts` | Adds registry, CSS, font, store, batch and error-mapping tests. |
| `templates/part01/**` (template owner) | Annotated Hero T01 | **Not touched** | — | Owned by the template side. Engine only reads it. |

## New in the engine (not from either source)

- Typed contract module (`src/shared/render-contract.ts`) with strict Zod schemas, error taxonomy, and format profiles.
- Stored-output policy: referenced files are kept, unreferenced leftovers may be replaced, nothing referenced is overwritten.
- Layout diagnostics with semantic attributes (`data-slot`, `data-required`, `data-safe`, `data-fit-group`, `data-allow-overlap`, `data-image-fit`) and bounded fitting.
- Fault-injection hooks used only by tests.
