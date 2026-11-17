# T01 reference matching study

User rejected the previous T01/T02/T03 visual interpretations. This is a separate local reference-fidelity study, not approved campaign output or completed production template.

Run from this directory:

```powershell
$env:CHROMIUM_EXECUTABLE_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npx.cmd tsx scripts/rebuild-t01-reference.ts
```

Outputs under ignored `artifacts/t01-reference-rebuild/`:
- `T01-reference-rebuild.png` / `.jpg`: screenshot of reconstructed HTML/CSS, 779×951.
- `T01-reference-rebuild.html`: self-contained HTML with local embedded font and photo.
- `T01-reference-vs-rebuild.png`: supplied reference left, reconstructed HTML right.
- `reference-photo-extract.png`: photographic middle from user-supplied reference with baked annotation masks. This is not a clean original asset; masked pixels are not recoverable.
- `comparison-report.json`: pixel comparison and provenance; explicitly `exactPixelMatch: false`.

HTML/CSS recreates headline, pills, arrows, offer and footer. It does not use the full screenshot as output or background. Photography is reference-derived solely for this requested study; logo/domain/copy/prices are source-reference examples, not verified LayerFit product claims. Do not publish as an ad or present as a complete reusable campaign generator.

Exact original clean photography and typeface are not available; therefore the result is **not 100% pixel-identical**. No visual acceptance is claimed until the user reviews it.
