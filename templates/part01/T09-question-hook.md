# T09 — Question Hook engine port

Ported from `../../Template-example/layerfit-t09-question-hook/` to `src/question-hook-t09.ts` (`question-hook-t09@0.1.0`), with scoped CSS extracted from the supplied stylesheet. Supports square, portrait and vertical (`story`) compositions.

**Requested edit:** removed the oversized outlined ghost question mark from markup and CSS. The source did not actually animate it; it was a static decorative glyph. The question mark in the actual headline remains. Glow, ring, product, features and CTA stay.

The strict config resolves description and feature copy by verified fact IDs, photo and optional logo by asset ID, uses the engine's bundled Space Grotesk/Inter font files, and permits cover only when crop is explicitly allowed. The user-provided SVG logo is rasterized to PNG only in the local test fixture; the engine resolver never accepts SVG.

Run from `templates/part01/`:

```powershell
npm.cmd run typecheck
npx.cmd --yes tsx --test tests/question-hook-t09.test.ts
$env:CHROMIUM_EXECUTABLE_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npx.cmd tsx scripts/integrate-question-hook-t09.ts
```

Artifacts in `artifacts/t09-engine-port/`; `T09-source-vs-engine-square.png` (plus portrait/vertical) compares the modified source baseline on the left with engine render on the right. The T09 fixtures use example SONIQ/TONI HOMI copy and assets only for this requested local fidelity check; `verified:true` is not product substantiation or publication authorization. Contract kit reports 65 pass / 0 fail / 12 warnings, all due to not using engine safe-inset tokens (one warning per case/format). Strict safe-area acceptance, app registration and real brand review remain open. No engine files changed, no AI, commit, push or deployment.
