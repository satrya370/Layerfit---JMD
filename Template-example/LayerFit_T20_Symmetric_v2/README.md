# LayerFit T20 — Symmetric Circular Benefits v2

**Purpose:** Reusable HTML/CSS static ad with a product at the center and its real, supplied benefits arranged around it. This is an editorial ad, not a website layout.

## Improvements

- Balanced 5-benefit configuration: one top, mirrored left/right, mirrored bottom left/right.
- Separate radial zones for text, central image, and orbit. No duplicate legal copy or website footer.
- Deliberately recomposed exports: square 1080×1080, portrait 1080×1350, story 1080×1920.
- Real product photo cropped from the user's reference image as an illustrative cutout, stored separately from copy. Replace it with your own transparent PNG/WebP for production.
- Benefits are dynamic. With 2 items, left/right slots are used; with 3, top/left/right; with 4, top/left/right/bottom; with 5, all five positions.

## Source files

- `index.html`, `styles.css`, `script.js`
- `creative.example.json` (sample content only, not verified LayerFit claims)
- `assets/waxli-demo-cutout.png` (demo asset from user's reference screenshot)
- `render.py`: Python Playwright screenshot renderer using system Chromium.
- `previews/`: screenshot exports.

## Integration

`window.setCreative({ brand, topline, imageUrl, imageAlt, benefits, colors, format })`

The renderer does not invent new benefits. It uses only the array supplied by the AI/content engine. For production use, validate every claim and use permitted product imagery. The supplied photo is an example from the screenshot, **not** an asset licensed for arbitrary reuse.

To export locally: `python render.py` with `playwright` installed and a Chromium browser available. Use the actual Chromium path if your environment requires one.
