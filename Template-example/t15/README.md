# LayerFit T21 — Lifestyle Benefit Editorial

**Konsep:** Foto penggunaan dan manfaat sebagai fokus.

### Files
- index.html, styles.css, script.js — actual ad layers, no Facebook UI
- creative.example.json — editable fields
- assets/ — demo image, replace for production
- render.py — Playwright local screenshot of 1080x1080, 1080x1350, 1080x1920

### Integration
Call `window.setCreative(data)` after loading DOM. All text is injected using textContent, not HTML injection. Text lengths should be validated with real product copy. Font fallbacks rely on installed fonts.

**Usage:** `python render.py` on system with `playwright` and Chromium. Update executable_path if the browser binary is different.

**Important:** This is a design demo; no claims of ad performance. T20/T22 sample asset is an illustrative SVG, not real product. T21 sample photo is cropped from user-supplied reference and should be replaced before commercial use.

### Node.js Puppeteer rendering (recommended for existing LayerFit engine)
`npm install && npm run render`. A self-contained asset is embedded into the page. This renders 3 static PNGs.

### Tested with
Python Playwright + Chromium successfully rendered the 3 exported demo sizes. Node Puppeteer script is syntax-checked but npm Puppeteer was not installed in this environment.

For Windows/JMD, `render.mjs` is the recommended starting point; Python `render.py` can also be used with `CHROMIUM_PATH` if needed.

**Input safety:** T22 is offer-gated. It will throw unless `verifiedPromotion:true` with a valid discount percent, or `demoMode:true` for a visibly labeled non-real preview.

**Typography:** Limit text length to fit real canvas sizes. Template engine should validate content, and visually inspect each render; no proof of conversion rate is implied by visual design.

Dynamic brand fields: `brand`, optional `logoUrl`, optional `fontFamily` (Inter, Arial, Lato, Georgia, Garamond), and `colors`. Set `imageUrl` to a validated uploaded product asset.
