# T07 — Lifestyle Benefit v3

Editorial ecommerce Meta Ads template inspired by Dutch agency advertising examples (not a copy of a specific campaign). Combines a lifestyle product photograph, clear benefit-oriented headline, supporting description, two product fact labels, and CTA.

## Run

Open `index.html?format=square` locally (or serve via HTTP). To export via Node.js, install `puppeteer` and run `node render.mjs`. `render.mjs` renders `square` (1080×1080), `portrait` (1080×1350), `story` (1080×1920).

`window.setCreative(data)` accepts: `format`, `brand`, `logoUrl`, `kicker`, `eyebrow`, `headline` (`\\n` for break), `description`, `features` (array up to 3), `cta`, `photoCaption`, `productLabel`, `imageUrl`, `imageAlt`, `imagePosition`, `colors` (`paper`, `ink`, `accent`).

Data is inserted with textContent/text nodes, not `innerHTML`. If actual product features, price, discounts, ratings, or reviews are unavailable, never manufacture them. Example copy describes the supplied screenshot containing two types of vacuum.

The demonstration image is cropped from the user's supplied reference artwork; replace it with authorized product/lifestyle photography before production. Layout uses fit-to-box headline adjustment; the renderer fails if the headline cannot fit. Story keeps key copy away from top/bottom UI zones. No automatic product-photo background removal.

Reference: https://improvedesign.nl/werk/toni-homi ; https://improvedesign.nl/meta-ads
