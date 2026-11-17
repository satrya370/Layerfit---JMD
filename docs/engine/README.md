# Rendering engine — status and how to verify

Plan: `rendering_engine_plan.md`. Contract: `docs/contracts/render-template-contract.md` (v0.1; the template owner agreed to it as relayed by the user, but the implementation has not yet been cross-checked against it by the template owner). Log: `rendering_engine_log.md`.

## Status by checkpoint

Labels follow the plan: **complete** only where the gate has evidence; otherwise partial, not started, or blocked.

| CP | Scope | Status | Evidence |
|---|---|---|---|
| CP00 | Baseline, reuse inventory | **complete** for documentation and reproduction | `baseline.md`, `reuse-inventory.md` |
| CP01 | Typed service, registry adapter, batch envelope, CLI wrapper | **partial** — the service, registry, batch envelope and errors are implemented and tested. The CLI wrapper (`scripts/render-layerfit.ts`) is not written; the smoke script uses the same service | unit tests; `npm run smoke` |
| CP02 | Assets, fonts, CSS, isolation | **partial** — assets, fonts, CSP and network interception are tested in a browser. Tailwind compilation belongs to the template side and is not part of the engine. CSS cache by build hash is not implemented (hash is recorded) | unit + integration tests |

Gate for CP02 as written: "render succeeds when internet access is blocked; requested font is proven loaded; invalid assets fail; Tailwind classes survive compile". The first three are met for the fixture. The Tailwind item is not met by the engine and is a template-side item.

Not started: CP03 browser pool beyond one browser per manager (worker concurrency, watchdog), CP04 full multi-format readiness beyond the fixture, CP05 full collision/safe-area/crop matrix, CP06 full manifest and storage cleanup policy, CP07 durable queue, CP08 API/editor/export integration, CP09 benchmarks and JMD gate. Note that CP03 items already partly exist in `browser-manager.ts` (ownership, restart budget, cleanup failure handling, orphan-context cleanup). Connect mode is tested only against a second local Chrome (see known limitations); restart-budget exhaustion and watchdog behaviour for hung native stages are not tested.

## Commands

```powershell
cd C:\Users\Asus\Layerfit-JMD-engine
npm.cmd ci
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test                       # unit tests always run; browser tests are skipped if CHROMIUM_EXECUTABLE_PATH is unset
$env:CHROMIUM_EXECUTABLE_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm.cmd test                       # full suite: 89 tests (engine unit, browser integration, contract kit + CLI, and the T03/T05/T08 template tests)
npm.cmd run smoke                  # foundation smoke: 6 placements + 3 negative cases, writes artifacts/engine-smoke/
npm.cmd run check:template -- --module <module.ts> --cases <cases.ts> --commit <hash>   # contract kit, see contract-kit.md
```

Last recorded results (17 November 2026, after the T03/T05 integration, local Windows, system Chrome 157):

- typecheck: pass
- lint: pass
- test with Chrome: 89 of 89 pass (after the T08 photo-overlay rebuild)
- test without Chrome: 74 pass, 15 skipped (browser tests), exit 0
- smoke: pass after the template work (6 placements, 12 files decoded at exact dimensions, 3 expected negative codes, 6.8 s reported for the 9-task batch; the font registry is larger now, which is the likely reason it is slower than the 3.6–4.5 s seen earlier, not measured)

Template integration (T03 `dark-offer-stack`, T05 `split-composition`): see `templates.md`. Engine changes made for it: the layout validator allows 0.2 em of vertical content-area hang, the font registry gained Montserrat, Poppins and Inter 800/900, and engine work done just before: whole-task deadline, restart-budget cooldown, `createRenderEngine` factory, `hardening.test.ts`.

A skipped test is reported as skipped, never as a pass.

## How the tests are split

| Level | File | Browser | What it proves |
|---|---|---|---|
| Unit | `tests/engine/unit.test.ts` | no | Schema strictness, escaping, SafeHtml, registry, CSS rules, error mapping, fonts (real WOFF2), image normalization, asset ownership, output keys and publish rules, batch envelope, validation before browser |
| Integration | `tests/engine/render.integration.test.ts` | yes | Full pipeline on the fixture: decode and dimensions, idempotent re-render, batch isolation, bounded fitting (fail and succeed cases), missing font, page crash recovery with recycle check, cleanup-failure handling, and remote (connect) mode against a second local Chrome |
| Smoke | `scripts/render-engine-smoke.ts` | yes | Same pipeline through `renderBatch`, plus negative cases and a contact sheet for visual review |

Fault injection uses hooks in `RenderHooks` and `BrowserHooks`. These are test seams. The page crash is simulated by emitting a page `error` event, which is what Puppeteer does on a real crash. This is not a real renderer crash.

Fixtures are in `fixtures/engine/`. They are synthetic and do not count as LayerFit concepts.

## Decisions taken while implementing (to cross-check with the template owner)

1. **Document shell is owned by the engine.** The template returns `{ body: SafeHtml, css }`. The canvas root is `<main data-canvas class="{rootClass}">`.
2. **Safe insets** (single source in `src/shared/render-contract.ts`, order top/right/bottom/left): square 60/70/60/70, portrait 70/70/70/70, vertical 250/70/350/70 (spec). Agreed with the template owner, whose proposal matches. T01 still uses its prototype values (62/72/60/72 and 74/70/72/70) and must switch to the engine tokens.
3. **`data-required` and `data-safe`** are active only when the value is `"true"`. `"false"` and absent both mean inactive.
4. **Connector overlap** must be declared with `data-allow-overlap` on the overlapping slots. Undeclared overlaps fail with `SLOT_COLLISION`.
5. **Text overflow tolerance.** Glyph content areas can exceed a tight line box by a few pixels. The check allows a slack of max(2 px, 0.25 × font size). Real clipping is still caught by `scrollWidth/scrollHeight` and `LAYOUT_CLIPPED`.
6. **Fitting** scales only groups named by violations, in 0.05 steps, not below `data-fit-min`, at most 8 steps. Violations without a fit group are never fitted and always fail.
7. **Blocked external images** are classified as `NETWORK_BLOCKED`, not `ASSET_INVALID`. CSP stops them before any request is issued, so interception alone does not see them.
8. **Storage for referenced revisions.** Pixels of identical input can differ by ±1 level between runs (measured). A referenced file is kept and the result reports its real hash, with a warning. An unreferenced leftover is replaced. Nothing referenced is overwritten. `STORAGE_CONFLICT` is defined in the contract but is no longer raised by `publish`.
9. **Error messages are safe by construction.** `RenderResult.error.message` never contains raw exception text (paths, provider detail). The raw text is kept in `RenderError.internal` and reaches operators only through the optional `RenderEngine.onFailure` hook.
10. **Batch envelope rule.** A repeated valid `taskId` rejects the whole batch (ambiguous double publish). Tasks without a usable `taskId` are not duplicates of each other; each fails individually with `REQUEST_INVALID`.
11. **`RenderResult.format` is `Format | null`.** It is `null` when the request was too malformed to read a valid format. A guessed default is never reported.
12. **Format profiles are frozen**, so template code cannot change the shared safe area for later renders.
13. **CSS validation decodes CSS escapes** before checking for `@import`, `url()` and script-like constructs. Escaped class names such as Tailwind `.md\:flex` stay valid.
14. **Remote mode tracks leaked contexts.** If a page cleanup fails, its context is remembered and closed when the browser is released. The shared browser itself is never closed.
15. **Callout anchors** are normalized to the product-stage box where the connector SVG lives (template owner's proposal, confirmed). The editor accepts clicks only inside the visible, `object-fit: contain` image area and converts them to stage coordinates. The engine does not check whether an anchor points at the right product feature; it only checks bounds, safe area, collisions and declared overlaps.

## Security boundaries

- Browser: sandbox on by default. `CHROMIUM_EXECUTABLE_PATH` and `CHROMIUM_WS_ENDPOINT` come from the operator environment only; neither is read from request data.
- Page: JavaScript disabled for template content. CSP `default-src 'none'`, `img-src data:`, `font-src data:`, `script-src 'none'`. Request interception aborts every non-`data:` request.
- `data:` URLs are allowed by interception. This relies on the template body being trusted code that uses `ResolvedAsset.src` only. The contract test kit (not yet written) is meant to enforce this.
- Storage keys are server-generated (`campaigns/<uuid>/creatives/<uuid>/r<n>/<fingerprint>/<format>.<enc>`). Paths are checked for traversal and symlink escape. Writes go to a staging folder, are fsynced, and are published with `link()` so an existing final file is never overwritten in place.

## Known limitations (not hidden)

- Renders are not byte-deterministic across runs (±1 level in a few channel values). Visual equality is the target, not byte equality.
- One unexplained slow run: the re-render integration test took 52 s once inside a full suite run. It took about 1.5 s on two isolated reruns and did not recur in five later full-suite runs (all under 30 s). The cause was not identified. If it recurs, the per-stage timings in the report are the first place to look.
- Connect mode (`CHROMIUM_WS_ENDPOINT`) is tested against a second Chrome launched locally, not against a real remote or containerised browser. It proves that the shared browser is not closed and that leaked pages are closed. It does not prove behaviour over a network, with authentication, or with other clients using the same browser.
- `RenderResult.creativeId` is an empty string and `revision` is 0 when the request was too malformed to read them.
- No font brand validation: `@fontsource` Inter and Fraunces are interim fonts under OFL-1.1.
- No JMD testing. No real LayerFit assets. No AI. No application E2E.
- Zod version differs: 4.6.7 installed in this worktree, 4.6.6 pinned in `templates/part01`. Resolve when the root package is created.
