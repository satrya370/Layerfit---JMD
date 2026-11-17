# T02 supplied comparison-banner port

Source: `../../Template-example/comparison-banner/t02.html` and `t02.css`. Source files are unchanged. `src/comparison-banner.ts` exports `templateModule` (`dual-panel` v0.3.0); `comparison-banner-css.ts` extracts the actual source CSS using PostCSS rather than redesigning it. The source CSS must remain available at that path until package consolidation.

Run from `templates/part01/`:

```powershell
npm.cmd run typecheck
npm.cmd test
$env:CHROMIUM_EXECUTABLE_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npx.cmd tsx scripts/integrate-t02-engine.ts
```

Outputs in `artifacts/t02-engine-port/`:
- `T02-engine-reference.png` / `.jpg`: real engine output, 1080×1080.
- `T02-source-vs-engine.png`: actual source left, engine right; same local fonts, assets and text.
- `T02-supplied-source.html` / `.png`: source baseline without external page chrome, expanded from preview width 960 to 1080.
- `engine-report.json`, `contract-report.json`, `comparison-report.json`: diagnostics, contract warning and pixel comparison.

Local fonts: Montserrat 400/700/800 and Poppins 400/500/600/700 (OFL). Inject this registry when running the module; the default engine Montserrat registry lacks the regular weight. No Google Fonts requests or fallback to another font.

The schema extends the engine config with a strict `t02` object: two slogan lines, left label, badge text, and three fact IDs per panel. Three explicit crop-approved lifestyle/detail assets are required in left/right/circle order. Comparison evidence and all six facts must be resolved/verified; missing references fail closed. User text is escaped, never inserted as raw HTML. Domain services must substantiate claims and their campaign relevance before rendering real ads.

Reference assets, brand, text and comparison claims appear ONLY in the isolated user-requested fidelity fixture. Its `verified:true` flags are fixture assertions, not actual proof or campaign authorization. Do not publish those examples as LayerFit ads.

This port is square-only and retains the supplied edge positioning, not engine safe insets. Contract kit has one safe-token warning (strict gate not passed). Permanent registry integration, other formats, synthetic two-product matrix and single-photo fallback are not completed. The previous `dual-panel.ts` is preserved; do not register both under the same ID. No engine files changed; shared imports currently rely on the adjacent engine worktree.
