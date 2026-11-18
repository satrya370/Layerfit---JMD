# T16 — Discount + Gift Meta Ad

Static image creative derived from the supplied Prose reference. This is **the image creative only**, not the surrounding Facebook UI.

Features: editable discount percentage, free gift toggle, headline, description, product image, four color tokens, and 3 placement sizes.

**Eligibility:** T16 must only be used with an actual, verified discount; set `mode: "production", verifiedDiscount: true` AND provide an explicit `discountPercent` after checking the promotion. The example 50% discount is from the user's screenshot and is demonstration data, not a LayerFit offer. Do not use this example copy with an unrelated brand.

Run `npm install && npm run render` to create PNG outputs. Replace `assets/demo-products.png` with your own licensed product photo(s).

Use `window.setCreative(data)` in the browser to inject campaign content. On a no-discount brief, skip T16 and select another template; do not fabricate a promotion.
