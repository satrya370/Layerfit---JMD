# Part 01 template prototype — T01 Hero, T02 Dual Panel, T03 Dark Offer

Status: CP00 partial design contract; CP01 partial foundation; CP02 T01 partial; CP03 T02 template-level gate passed; CP04 T03 render gate passed but domain validity remains pending. Not integrated into the LayerFit app or Claude's renderer engine. Not a live LayerFit ad.

## CP00 wireframes and contract

```text
SQUARE 1080×1080
┌────────────────────────────────────────────┐
│ BRAND                                       │
│ Large editorial headline                   │
├────────────────────────────────────────────┤
│ Product image (contain)        Benefit pill│
│                                Benefit pill│
├────────────────────────────────────────────┤
│ CTA                             Brand/offer│
└────────────────────────────────────────────┘

PORTRAIT 1080×1350
┌────────────────────────────────────────────┐
│ BRAND                                       │
│ Large headline                              │
├────────────────────────────────────────────┤
│ Product image (larger)          Benefit     │
│                                 Benefit     │
├────────────────────────────────────────────┤
│ CTA                             Brand/offer│
└────────────────────────────────────────────┘

VERTICAL 1080×1920 — content inset top 250/bottom 350/sides 70px
┌────────────────────────────────────────────┐
│               reserved top safe area        │
│ BRAND                                       │
│ Headline                                    │
│                                            │
│ Product image (contain; vertical stage)    │
│                                            │
│ Benefit pill             Benefit pill      │
│ CTA                          Brand/offer   │
│             reserved bottom safe area      │
└────────────────────────────────────────────┘
```

The current T01 uses a cream background, green brand pill, editorial heading, contained product image, fact-backed benefit pills and CTA. Unlike the reference screenshot, it does not assume product price, sale price, USB-C, cleaning/time claims, competitor logos, or external site footer. A verified offer is opt-in and requires a fact ID; actual verification/ownership/expiry is enforced by the application/engine boundary, not yet integrated in this template package.

### Template boundary

`renderAnnotatedHeroHtml(config, format, compiledCss)` accepts a strict config and locally compiled CSS; it embeds supplied PNG/JPEG/WebP bytes as a data URL. Caller must first establish that facts/assets belong to the campaign, verify semantic claims and decode/normalize actual bytes. Do not pass arbitrary URL/path/HTML. Optional callout anchors refer to normalized coordinates on the full product-stage canvas and should only be set from an actual preview/editor measurement. No anchor means benefit rail without connector. Vertical hides connector geometry and lays benefits below the image. Locale is explicitly validated as `nl`, `en`, or `id` for the document language.

Brand font currently maps to installed system Georgia/Arial for the prototype. Fonts are not bundled and this is not brand-font verification. Tailwind v3 CSS is compiled locally; no CDN import.

## Run locally

```powershell
cd C:\Users\Asus\Layerfit-JMD\templates\part01
npm.cmd ci
npm.cmd run build:css
npm.cmd run typecheck
npm.cmd test
$env:CHROMIUM_EXECUTABLE_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm.cmd run smoke
npm.cmd run smoke:dual-panel
npm.cmd run smoke:dark-offer
```

Artifacts go to ignored `artifacts/template-part01/` (synthetic shirt and bottle fixtures, three formats each, PNG and JPEG). The smoke harness uses a temporary Puppeteer browser only to validate template markup/render; it is not the production browser manager, campaign app, or end-to-end user flow. A different Chrome executable may be configured by the operator. Do not use an authenticated browser profile.

## Current tests

- Strict schema rejects arbitrary colors/IDs/unsupported font values, empty fact references, malformed anchors and path-like IDs.
- HTML text is escaped; dimensions/formats explicit; no default prices/promotions/social proof.
- Local CSS includes distinct square/portrait/vertical profiles; product photo uses `contain`.
- Chromium smoke waits for font/image readiness, checks canvas/slot bounds and text overflow, then writes PNG/JPEG and verifies exact dimensions.
- Positive connector geometry is smoke-rendered on the shirt; exact anchor mapping to a real image feature still requires preview geometry/editor support.
- Multi-format smoke uses two synthetic products, not a 4-template batch.
- T03 `dark-offer-stack` accepts offer/proof **fact IDs only**. The visible text is resolved from the supplied fact snapshot; no free offer/proof labels, stars, urgency, payment logos, prices or discount codes are hardcoded. If a fact is absent, that block is omitted. Production must supply only currently valid/verified facts; expiry validation is a domain-service responsibility and is not implemented in this template prototype.
- T03 uses one or two asset IDs and engine-resolved local raster bytes. Product photos use contain in rounded frames; lifestyle/detail photos may use circular cover only when crop permission is explicit. A single photo is rendered once, not duplicated.
- T03 smoke: two synthetic fixtures × three formats = six placements, PNG and JPEG each. The optional offer/proof fixture is visibly labeled `TEST FIXTURE ONLY`; it is test data, not a publishable promotion or review.
- T03 offer/proof copy is resolved from fact IDs. Missing IDs fail closed. Active/expiry/ownership checks must happen before the render snapshot is created; this template package does not implement those domain checks.
- T02 config supports two modes: `dual-benefit` is the safe default; `verified-comparison` requires an evidence ID. Each panel fact carries fact IDs, but the app/domain service must verify those IDs against the campaign snapshot.
- T02 stores asset IDs in config and receives resolver-issued raster data URIs separately. Remote URLs, SVG and mismatched asset metadata are rejected. Product images use contain; lifestyle/detail may cover only with explicit crop permission.
- T02 2-photo and 1-photo fallback each render all three formats. In fallback, the right panel is informational; it does not duplicate the photo. Comparison mode without evidence is rejected.
- T02 smoke output is six placements / twelve image files; contact sheet was visually inspected. This does not test positive competitor comparison or claim truth.

## Remaining CP00–CP02 work

- Validate actual uploaded bytes in the asset service and establish campaign ownership/fact verification.
- Add visual tuning with actual LayerFit brand tokens/assets when approved and available.
- Implement preview-based anchor placement and inspect connectors on photo containment geometry.
- Test long Dutch copy, maximum 3 benefits, offer verified/expired behavior, and reduced image resolution.
- Add explicit single-photo fallback assertions (each current fixture uses one photo, but the fallback was not separately asserted).
- For T03: integrate with active/verified fact lifecycle, test expired/unapproved offer handling in domain layer, verify maximum Dutch copy, and perform the shared engine contract test after agreement.
- For T02: verify the positive evidence-backed comparison visually, maximum Dutch copy, real asset/fact ownership, root font-registry integration, and engine diagnostics once contract is agreed.
- Bundle approved font assets and add deterministic font identity/readiness check.
- Agree registry/HTML/CSS adapter contract with rendering-engine implementer, then integrate without duplicate render pipelines.
- T04 and remaining registry concepts to reach 15, full 45-image acceptance, editor, persistence and ZIP remain out of scope here.
