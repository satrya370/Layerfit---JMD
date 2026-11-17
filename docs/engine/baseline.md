# Engine baseline — CP00

Date: 17 November 2026. Scope: reproduce the prototype and record the environment before changing engine code.

## Reference and environment

| Item | Value |
|---|---|
| Reference repository | `references/IG-Content-Builder` (`C:\Users\Asus\LayerFit\references\IG-Content-Builder`) |
| Reference commit | `9ce00976664d1ac036bc38b75a8cf21621eac719` |
| Reference working tree | `git status --porcelain` empty before and after this work. Not modified. |
| Node | v22.18.0 |
| Chrome (system, operator-configured) | 157.0.8103.79 (`C:\Program Files\Google\Chrome\Application\chrome.exe`) |
| Puppeteer | 25.17.0 (reference pins 25.1.0; upgraded in prototype for advisories) |
| Sharp | 0.35.5 |
| Zod | 4.6.7 (engine worktree); 4.6.6 in `templates/part01` — see open items in the contract |
| TypeScript | 5.9.3 |
| OS | Windows 11 Home, 10.0.26200 |

## Prototype baseline (LayerFit prototype, before engine work)

Command, run from `C:\Users\Asus\LayerFit` with the system Chrome path set:

```powershell
$env:CHROMIUM_EXECUTABLE_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm.cmd run test:render
```

Result (`artifacts/foundation-smoke/report.json`):

| Measure | Value |
|---|---|
| Successful placements | 6 (2 synthetic products × 3 formats) |
| PNG / JPG files decoded | 6 / 6 |
| Expected failures (corrupt asset) | 3, failed independently; successes retained |
| Reported duration | 3846 ms (renderer-only, includes browser launch, encoding, intentional failures, contact sheet) |

This is a smoke timing for a six-placement run on this machine. It is not a benchmark and not an SLA for batches of 45.

## Reproduction note

`docs/verification.md` records 5237 ms for an earlier run of the same smoke. The re-run here measured 3846 ms. The cause of the difference was not investigated; both numbers are single short local runs.

## Engine foundation smoke (CP01–CP02 scope)

Command (worktree `C:\Users\Asus\Layerfit-JMD-engine`):

```powershell
$env:CHROMIUM_EXECUTABLE_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm.cmd run smoke
```

Result (`artifacts/engine-smoke/report.json`, ignored by Git):

| Measure | Value |
|---|---|
| Template | `fixture-hero@0.1.0` — engine test fixture, not a LayerFit concept |
| Positive placements | 6 (2 synthetic briefs × 3 formats), PNG + JPG each |
| Encoded files decoded with exact dimensions | 12 |
| Negative cases in the same batch | 3, with expected codes `NETWORK_BLOCKED`, `ASSET_INVALID`, `SAFE_AREA_VIOLATION` |
| Reported duration (9 tasks, batch) | 3801 ms |
| Per-stage timing, one successful placement (ms) | validate 3, assets 10, fonts 7, template 1, content 47, readiness 15, layout 6, screenshot 122, encode 46, storage 25 |

The per-stage numbers are for one placement. The screenshot stage dominates. Nothing here is a 45-output benchmark.

## Pixel determinism measured (not assumed)

Three renders of identical input (`fixture-hero@0.1.0`, shirt brief, square, PNG):

- Byte-identical across runs: **no** (file sizes identical at 54,173 bytes; content differs).
- Pixel values differing: 5 channel values out of 3,499,200, maximum difference 1 level.

So re-renders of the same input can differ by ±1 level in a few channel values. The engine therefore treats the stored file as the source of truth for a referenced revision (see `docs/engine/README.md`, storage section).
