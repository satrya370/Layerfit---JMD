# Owner-supplied templates connected to the engine (T03, T05)

Date: 17 November 2026. Both templates are `TemplateModule`s that follow `docs/contracts/render-template-contract.md` v0.2 and run through the real engine (registry, asset resolver, fonts, layout validation, fitting, PNG/JPG, storage). The owner's original HTML/CSS files were **not modified**; they stay as the visual reference.

| Template | Engine id | Source design | Module |
|---|---|---|---|
| T03 Dark Offer Stack | `dark-offer-stack@0.1.0` | `Template-example/promo-banner/` (`t03.html`, `t03.css`) | `src/templates/part01/dark-offer-stack/` |
| T05 Split Composition | `split-composition@0.1.0` | `Template-example/layerfit_t05/` (`index.html`, `styles.css`, `script.js`) | `src/templates/part02/split-composition/` |
| T16 Discount Offer | `discount-offer@0.1.0` | `Template-example/LayerFit_T16_Discount_Offer/` (`index.html`, `styles.css`, `script.js`, `render.mjs`) | `src/templates/part02/discount-offer/` |
| T14 Outline Poster | `outline-poster@0.1.0` | `Template-example/LayerFit_T14_Conzuri_Outline_Ad/` (`index.html`, `styles.css`, `script.js`, `render.mjs`) | `src/templates/part02/outline-poster/` |
| T10 Atmospheric Editorial | `atmospheric-editorial@0.1.0` | `Template-example/T10_Atmospheric_Editorial/` (`index.html`, `styles.css`, `script.js`, `render.py`) | `src/templates/part02/atmospheric-editorial/` |
| T08 Photo Overlay | `photo-overlay@0.1.0` | Original design by the engine owner (see the T08 section at the end) | `src/templates/part02/photo-overlay/` |

Each folder has `schema.ts` (config limits), `render.ts` (markup with `data-slot` etc.), `styles.css` (the design, editable without touching TypeScript) and `index.ts` (module). Fixtures: `fixtures/templates/<id>/cases.ts`. Tests: `tests/templates/`.

## What was kept from the designs

Layout idea, proportions, palette (as brand tokens), typography character, the round photo apertures and cream footer (T03), the dark/light split, arch outline, tilted photo card, round sticker and floating pill (T05).

## What was changed, and why

| Owner design | In the engine | Reason |
|---|---|---|
| **T03** Trustpilot logo + 5 stars | Optional proof pill, text from `proofFactId` only | `AGENTS.md` / `spec.md`: no invented reviews; a rating is shown only from a verified fact. The Trustpilot mark is a third-party brand |
| **T03** "5% EXTRA KORTING", code `EXTRA5` | Headline from `copy.headline`; offer line from `offerFactId` only | No invented discounts or codes |
| **T03** "Vandaag besteld, morgen in huis", "Gratis retourneren" | Benefits from `copy.benefits` (each tied to fact IDs) | No unverified fulfilment or returns claims |
| **T03** Klarna badges, "Alleen vandaag geldig" | Footer: CTA on the left, brand mark or name on the right | Payment brands only with a licensed asset and a fact; no urgency claims |
| **T05** "PRODUCT SPOTLIGHT · 05/15", "T / 05", "01 / 01", slogan | Not rendered. Sticker is an icon | Template scaffolding, no slot in the contract, should not appear in an ad |
| **T05** overline, panel label, floating pill, footer note | Overline from `offerFactId`, panel label from `proofFactId`, pill from the first benefit, remaining benefits as chips | Every text comes from copy or verified facts; no benefit shown twice |
| Photos with `object-fit: cover` | `contain` by default; `cover` only when the asset's `allowCrop` is true | Product must stay whole (spec) |
| Photo card overhanging the panel edge (T05) | Card inside the safe box; panels still bleed to the canvas edge as background | Principal product must respect the safe area |
| Google Fonts link (T03) | Bundled Montserrat and Poppins (OFL-1.1) | The renderer blocks all network requests |
| Arial 900 (T05) | Bundled Inter 400/700/800/900 | Closest bundled face; Arial is a system font |
| Hard-coded colors | Brand tokens, with schema contrast checks | Text can never become unreadable (WCAG 4.5:1 text, 3:1 graphics) |
| Free-text labels (`eyebrow`, `footerNote`, …) | Rejected by the strict schema | Offer, proof and labels must come from facts |
| `overflow-wrap: anywhere` | Removed | It broke words mid-word and hid overflow; too-wide words are shrunk by fit groups and otherwise fail |
| Single 540 px banner (T03) | Three explicit layouts: square is two columns, portrait and vertical one column, scaled per format | Plan: different compositions per format, not one stretched layout |
| T05 text via `\n` and `[[…]]` | `copy.accentPhrase` (must be a substring of the headline), shown on its own line | Same effect, no markup or control characters in config |

Limits (first limits, not guarantees of fit): T03 headline 55, benefit 48, up to 3 benefits, 1–2 photos. T05 headline 50, body 120, benefit 32, up to 3 benefits, exactly 1 photo.

## Verification (17 Nov, local Windows, system Chrome 157.0.8103.79)

```text
npm.cmd run typecheck      PASS
npm.cmd run lint           PASS
npm.cmd test (Chrome set)  PASS 81/81   (56 s and 76 s in two full runs)
npm.cmd test (no Chrome)   PASS 67, skipped 14 (browser tests), exit 0
```

| | Cases | Placements | Rendered | Expected layout failure |
|---|---|---|---|---|
| T03 | 5 synthetic | 15 | 14, each PNG + JPG decoded at exact size | 1 (`unbreakable-word` in square) |
| T05 | 5 synthetic | 15 | 12, each PNG + JPG decoded at exact size | 3 (`unbreakable-word` in all formats) |

Contract kit: all cases of both templates pass with no failures and no warnings. Contact sheets are in `artifacts/templates/<id>/` (ignored by Git). Every sheet that renders was inspected (T03: five cases; T05: four rendering cases, the fifth fails in all formats by design), plus a full-resolution close-up of T05 square. Visual inspection found defects that no automatic check reported (items 2, 4 and 5 below).

Mutation checks: T05's scaffold-text test fails when "05/15" is reintroduced; the T03 and engine checks listed in the engine log were also confirmed to fail without their fixes.

## Defects found while connecting them

1. **Engine validator, vertical overflow (fixed).** `scrollHeight > clientHeight + 1` flagged tight display leading. A font's content area is taller than a `line-height: 1.0–1.1` line box, so the last line hangs a few pixels with nothing outside the box. This failed every placement of both designs. The vertical check now allows 0.2 em (a real spill is at least one line, about 1 em). Regression test: `tight leading` in `tests/engine/render.integration.test.ts`; the "real overflow still fails" case stays.
2. **Template CSS, mid-word breaks (fixed).** `overflow-wrap: anywhere` produced "DAGELIJK / S GEBRUIK" and no overflow was ever detected, so fitting never shrank the text. Found only by looking at the render, not by any check.
3. **Template CSS, photos did not shrink (fixed).** With long copy the footer was pushed outside the safe area; the photo block is now flexible and the circles shrink.
4. **Template CSS, letter-spacing (fixed).** The designs' tight tracking was tuned for Arial; with Inter 900 letters collided. Loosened.
5. **T05 vertical, long copy (fixed).** The dark panel grew to about 1150 px and the photo card shrank to a small box over a flattened arch, although every check passed. Found by looking at the sheet. Fixes: the photo panel has a 440 px minimum, the right panel is a member of the `headline` fit group so the fitter shrinks the headline first, and the arch radius is proportional. Until the fit-group link was added, a violation in the right panel could not trigger fitting at all, because fit groups are attached to the violating slot and its ancestors.
6. Fixture data errors caught by the schema itself (a 33-character benefit against a 32 budget) and by the renderer (a 15-letter word that fits no format): both are now explicit cases with expected outcomes.

## Not done / limits

- The owner's own photos (`promo-banner/images/*.jpg`, `layerfit_t05/assets/demo-product.png`) are **not** used: project rules allow synthetic assets only for local tests, and their provenance is not stated. Outputs therefore show invented bottle/shirt shapes, not the real product look of the previews.
- The visual match with the owner's previews is by eye on synthetic images; there is no pixel comparison.
- Fonts are interim (OFL-1.1), not LayerFit brand fonts. Montserrat/Poppins weights and Inter 800/900 were added to the shared registry (`src/shared/fonts.ts`, `FONT_IDS`): the template owner should cross-check this shared change.
- Offer and proof text appear exactly as given. Whether a fact is true, current or expired is the domain service's job, as in the rest of the contract.
- No JMD run, no real LayerFit assets, no application E2E. T03/T05 are not registered in any application; they run through the engine harness only.
- `templates/part01/` (the other agent's T01–T03 fragments, including its own `dark-offer-stack`) was not touched. Its `dark-offer-stack` and the one added here are two independent implementations of the same plan id; they have not been reconciled.

## T08 Photo Overlay (original design)

Second attempt. The first T08 (a bento grid of rounded tiles) was rejected by the user as obviously AI-generated design and was discarded completely; this is a rebuild from the research below. Standalone package plus engine module, same CSS in both.

| | Location |
|---|---|
| Engine module | `src/templates/part02/photo-overlay/` (`schema.ts`, `render.ts`, `styles.css`, `index.ts`), fixtures in `fixtures/templates/photo-overlay/` |
| Standalone package | `C:\Users\Asus\Layerfit-JMD\Template-example\layerfit_t08\` (`index.html`, `styles.css`, `script.js`, `creative.example.json`, `render.mjs`, `README.md`, `assets/`, `previews/`) and `Template-example\layerfit_t08.zip` |

### Research (directional only)

Vendor blogs, not independently verified; the Dutch Meta Ad Library is unreachable, so no Dutch ad reference is verified. Practice they agree on: one message, the headline is the largest element, at most three text levels, bold high-contrast text over a product or lifestyle photo, designed for phone size first. Tells of generic AI layouts: identical rounded cards, radius and soft shadows everywhere, decorative gradients, numbered circles, symmetric tidy grids, too many elements. Safe zones: about 14 % (about 250 px) clear at the top of 9:16; the bottom figure differs by source (20 to 35 %).

### Design

Photo first. A photo that may be cropped (asset `allowCrop`) fills the canvas under a dark scrim; a photo that must stay whole sits on a flat field and the text goes on a solid primary-colour panel. Three text levels: headline (Inter 900, the accent phrase on a flat accent marker block), one support line (description and/or up to three ticked benefits) and one square CTA. A white brand plate (or logo) top left. Optional offer tag, text only from an offer fact. No cards, shadows or decorative gradients; the scrim is the only gradient. The photo is in the headline fit group, so a violation shrinks the headline rather than the product.

### Evidence (17 Nov, local, system Chrome 157)

typecheck and lint pass; `npm.cmd test` with Chrome 89 of 89 pass (74 pass and 15 skipped without Chrome). Contract kit: no failures or warnings across 4 cases x 3 formats plus 13 reject variants. Standalone `node render.mjs`: 3 of 3 outputs pass, tested on ONE image on purpose (the user asked for speed). The drift test compares the standalone CSS with the engine CSS and checks class, slot and no-innerHTML parity.

### Limits

- The preview uses the user's own product photo from `layerfit_t05/assets` (466 x 499, cropped, provenance unknown): a flagged deviation from the synthetic-assets rule, for design preview only. It is soft when upscaled to the canvas.
- Story: the cover crop cuts the right-hand product partly; a photo with a centred subject works better.
- Fonts are interim OFL fonts, not brand fonts; no brand approval, no Dutch ad verified, no performance claim, not registered in an application, no JMD run.

## T10 Atmospheric Editorial (redesigned)

The first port kept the reference's lime-to-blue gradient and side-by-side layout; the user rejected it as unattractive. Rebuilt as a magazine-style ad. The standalone folder `Template-example/T10_Atmospheric_Editorial/` is the user's own and was not changed; the engine module no longer matches it.

- **Layout:** the photo bleeds across the top with no text on it (square 540 px, portrait 720 px, story 980 px high). A flat paper band below holds a meta line (brand, optional offer from a fact) over a hairline rule, a large serif headline (heading font token, Fraunces in the cases), up to three small-caps benefits in a column and one solid button.
- **Colours:** secondary = band, primary = button (white text), accent = offer text and benefit markers. The schema checks ink on the band, white on the button and accent on the band (all at least 4.5). No gradients, shadows or cards.
- **Not supported:** body text, accent marker, proof, callouts, comparison. The photo must allow cropping.
- **Story:** the band's bottom padding is the 350 px safe zone, so the text block ends above it; the top zone is covered by the photo.

Evidence (local, system Chrome): typecheck and lint pass; `npm.cmd test` 96 of 96 pass, including the contract kit (no failures or warnings) and the render matrix (synthetic scene, 2 cases × 3 formats). A design preview with the spa photo from the user's T10 folder was rendered through the engine to the ignored `artifacts/templates/atmospheric-editorial-preview/`; that photo is only 271 × 392 px and was cropped from a screenshot, so it is blurry at full width and is not usable for a real ad.

## T14 Outline Poster (ported from the Conzuri reference)

Stretched outlined type above and below the product, a white headline, a teaser line and a spaced brand mark, on a dark background. The reference is 2x in every format, so the engine CSS uses the same numbers at 1080 px.

- **Mapping:** top lines are `copy.body` split on "|"; bottom lines are `copy.benefits` (each needs a fact); the teaser is `copy.cta`; the offer is an offer fact. The Meta feed mock-up in the reference (`feed-preview.html`, `feed-preview.css`) is not ported: it is platform UI, not creative.
- **Known gaps (recorded as expected layout failures in the render test):** the reference places the outlined top lines and the teaser inside the platform top and bottom zones, and the headline and bottom lines reach the edges. The engine's safe-area rules reject that geometry. The test records these failures instead of hiding them.
- **Fonts:** the reference uses Inter Display / Arial Black; the engine uses bundled Inter 900. Stretched widths therefore differ slightly.
- **Brand and copy** come from the user's reference. Their rights were not verified, and the ad is not published anywhere.

Evidence (local, system Chrome): typecheck and lint pass; `npm.cmd test` 103 of 103 pass. The contract kit reports no failures or warnings. The visual preview with the reference photo is an unvalidated screenshot of the module markup, in `artifacts/templates/outline-poster-preview/`.


Did you mean this?
  npm test # Test a package
To see a list of supported npm commands, run:
  npm help 103 of 103 pass. The contract kit reports no failures or warnings. The visual preview with the reference photo is an unvalidated screenshot of the module markup, in .

## T16 Discount Offer (ported from the Prose reference)

Outlined offer tag at the top, a large headline, the product on a soft glow, a supporting line and one button. The example copy and the product photo come from the user's reference (Prose), which the user supplied; rights not verified.

- **Eligibility:** the offer tag is a verified fact (`offerFactId`), and the schema rejects a config without one. The reference's free-text discount and `mode`/`verifiedDiscount` flags are replaced by that fact, so the text on the tag is always the verified wording.
- **Added CTA:** the reference had no button; `copy.cta` is now drawn as a pill button (requested).
- **Not ported:** the reference's separate `freeGift` flag (folded into the offer fact text) and the Facebook UI.
- **Layout:** the blocks flow in a column inside the safe area (tag, headline, product, supporting line, button), so long text wraps (balanced) and pushes the others instead of overlapping them. The product takes the remaining height and is in the headline fit group: when the text is long the headline shrinks before the product gets too small. Headline sizes were reduced (56 / 62 / 78 px in square / portrait / story, from 75 / 80 / 100). The story layout keeps everything out of the 250 px top and 350 px bottom zones.

Evidence (local, system Chrome): typecheck and lint pass; `npm.cmd test` 110 of 110 pass. The `long` synthetic case sets the tag, headline, supporting line and button at or near their budgets. A preview with the reference photo and longer copy (`prose-long.png`, same image as `prose-short.png`) shows the text wrapping onto more lines in all three formats without touching the product or another block. Contract kit: no failures or warnings. Previews: `artifacts/templates/discount-offer-preview/`.

## T17 Minimal Discount (reworked)

Module `src/templates/part02/minimal-discount/` (id `minimal-discount`, v0.1.0, square/portrait/vertical). The standalone package `Template-example/LayerFit_T17_Minimal_Discount` (fixed positions, gold headline on beige, no CTA) is not changed and no longer matches the module. A first rework (centered stack, brand between hairlines, product on a disc) was rejected by the user as generic and too thin on copy; this is the second version.

- **Layout:** a split ad. The product stands large on a solid colour panel that bleeds to the canvas edges: the right column in square and portrait, a band across the top (behind the brand) in story. The copy column is left-aligned: brand wordmark in the top-left corner, the verified offer as the largest text, a headline, an optional supporting paragraph, up to three benefits with ticks and a button with an arrow. Text wraps (balanced); fit groups `offer`, `headline`, `support`, `list`, `cta` shrink type when copy is long.
- **Colors:** secondary = background, primary = ink and button fill, accent = product panel and benefit ticks. No gradients. Schema checks ink on background, ink on panel and white on button at 4.5:1, and that the panel differs from the background.
- **Facts-only:** the offer text comes from `offerFactId` in the verified snapshot; a missing fact is rejected by the schema and fails closed in `render`. Benefits carry fact ids (shared contract).
- **Budgets:** headline 44, supporting paragraph 110, benefit 30 (max 3), CTA 24, brand 20. The offer fact has no schema budget; keep it to a few words (it is the hero text).
- **Evidence:** typecheck, lint and the T17 tests pass (contract kit with no warnings, 3 cases x 3 formats rendered through the real engine, including a `long` case near every budget). Preview with the package demo tumbler: `artifacts/templates/minimal-discount-preview/`, script `artifacts/preview-t17.ts`.
