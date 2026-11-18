# LayerFit T17 — Minimal Discount Product Ad

Reusable static Meta Ads creative inspired by the **composition** of the supplied YETI advertisement. Only the image creative is exported: the video play control is excluded. No website-style footer/button.

The demo `25% OFF` is **not a real LayerFit promotion**. Never publish without replacing it with a verified offer. This template requires `discountText`; do not generate from an ordinary campaign brief without a real offer.

Dynamic input: `window.setCreative({ format, brand, discountText, headline, description, finePrint, imageUrl, imageAlt, colors })`. `headline` allows `\n` line breaks. Product images are independent from all text and may be replaced with genuine user-uploaded product photography.

Supported formats: square 1080×1080, portrait 1080×1350, story 1080×1920. `render.py` is a Playwright renderer; `render.mjs` is a Puppeteer equivalent for the Node-based project. Run `python render.py` or install Node dependencies then `node render.mjs`.
