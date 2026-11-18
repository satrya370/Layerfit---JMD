# T14 — Bold Outlined Product Poster (Conzuri reference recreation)

This package contains two separate outputs:

1. **Actual editable static ad**: `index.html` + `styles.css` + `script.js`, default 9:16 (540x960 logical CSS, exports 1080x1920 PNG). Fully editable outlines/headlines/brand and replaceable image.
2. **Meta screenshot UI preview**: `feed-preview.html` + `feed-preview.css`, reproducing the ad display context at 714x1458. This is **not** part of the exported ad creative. Top sponsored copy and bottom platform CTA belong to Meta, not the image ad.

`assets/boot-scene.png` is a crop from the user-provided screenshot with feathered edges. It contains the boot plus a little of the original background. For truly independent product replacement use a transparent isolated product image (PNG/WebP) and adjust the image placement CSS.

## Run

From this directory:

```bash
python -m http.server 8123
```

Open `http://localhost:8123/` or `http://localhost:8123/feed-preview.html`.

Render previews with `python render.py`, which uses Python Playwright and a locally installed Chromium. Or integrate the source into your Puppeteer pipeline.

Call `window.setCreative({brand,announcement,topLines,mainHeadline,bottomLines,teaser,teaserEmoji,imageUrl,format})` to replace the ad data. Set `format` to `story`, `portrait`, or `square`.

Do not use unverified product claims from this reference for other products; the copy is reproduced for layout demonstration only.

You may also render with Puppeteer using `npm install && npm run render` (adapter included; Python Chromium renderer was used for visual QA here).

**Important:** This is a close recreation, not a pixel-perfect extraction of the original artwork. The image area uses a photo cut from the user-provided screenshot. Text is recreated as editable HTML/CSS, so the font contours differ slightly. The Meta UI preview includes a “Learn More” control because that belongs to Meta's interface, not the static creative.
