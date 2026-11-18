# T10 — Atmospheric Editorial Meta Ad

Converted from the user-provided spa design reference into editable HTML, CSS and JS. The overall composition is preserved: lime-to-blue background, editorial serif title on the left, portrait image on the right, short microcopy at the top, and three unboxed benefit columns at the bottom. The requested revision adds an optional short description below the title and an understated underlined CTA with an arrow; no filled button or website-style footer.

The photograph in `assets/demo-spa-photo.png` was **cropped only from the user-supplied screenshot** as a demonstrator. It is **not a standalone original product photograph**; replace it with an authorized product/lifestyle image for actual ads. Everything else is generated with HTML/CSS.

To customize, call `window.setCreative({ topLeft, topRight, eyebrow, headline, descriptionFactId, facts, cta, features, imageUrl, colors, format })`. Description resolves exact text from `facts: [{id, text, verified:true}]` (at most 140 characters); absent/unverified referenced facts fail closed. CTA is optional plain text (at most 32 characters), not a hyperlink. Leave both absent to restore original title geometry. The content passed into the template must be grounded in the user's product information, and should not include invented addresses, features or prices. The example description repeats existing reference service labels; its verified flag is a fixture assertion only, not campaign substantiation. Images must be package-local under `assets/` or embedded raster data, never arbitrary remote URLs.

Three viewport layouts: square 1080×1080, portrait 1080×1350, story 1080×1920.

Run it in a browser using a local HTTP server, or call `python render.py` after installing Playwright and Chromium (the script looks for a locally installed Chromium/Chrome/Edge browser, then falls back to the Playwright-managed Chromium). For integration with LayerFit, the existing IG Content Builder Puppeteer renderer may be used instead.

Notes: The exact reference font may not be available, so a Georgia/Times serif stack is used; photo contrast, letterforms and spacing may differ slightly from the screenshot.

Revision preview/test: `node templates/part01/scripts/render-t10-copy-revision.mjs` from the repository (system Chrome). Saves PNG/JPG, self-contained HTML, a contact sheet and bounds/binding tests under `templates/part01/artifacts/t10-copy-revision/`. Original source previews are retained. This is a standalone design preview, NOT a real-engine contract gate; the part02 engine module remains unchanged. Original inset positions are retained and are not certified against engine safe areas. Long arbitrary copy still needs layout review.
