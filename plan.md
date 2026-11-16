# LayerFit AI Creative Generator — Project Plan

**Status:** planning and renderer foundation prototype. This plan is not a claim that the full application or acceptance criteria are complete.
**Target delivery:** 30 November 2026.

## Goal

Build a reusable web application that turns a product and campaign brief into at least 15 visually distinct static Meta Ads concepts, each rendered as square (1080×1080), portrait (1080×1350), and vertical (1080×1920) assets: 45 images per campaign. Users can review, edit, favorite, re-render, regenerate copy, and export creatives.

## Requirements and guardrails

- Collect product details, verified benefits, product photos, logo, brand colors/fonts, audience, objective, campaign brief, language, and requested concept count.
- Use AI for batch strategy and copy, not image generation or per-format calls. Validate structured output and ground factual copy in supplied, verified product facts. Never invent claims, prices, discounts, testimonials, or performance statistics.
- Build creatives with reusable HTML/CSS templates and Puppeteer/Chromium. Layouts must be meaningfully different, adapt to each format, respect safe areas, and validate dimensions and clipping.
- Keep editable creative configuration, assets, job status, errors, rendering duration, and AI token/cost records. Editing and re-rendering must not call AI; copy regeneration is a separate action.
- Provide campaign history, gallery, placement previews, favorites, individual PNG/JPG downloads, and bulk ZIP export. Preserve successful outputs if another creative fails.
- Keep API keys server-side; validate uploads and input; escape rendered text; block arbitrary external asset requests.
- No production deployment until JMD access, environment and permissions are confirmed. Keep brand assets in the approved JMD environment.

## Repository audit summary

The existing IG Content Builder was cloned separately for reference. Its Puppeteer batch renderer is a useful foundation: it reuses a browser/page, injects plan data into HTML, waits for fonts, screenshots PNGs, and records per-slide failures. Its 24 HTML files are eight carousel families—not 15 standalone ad concepts—and use a fixed 1080×1350 canvas. Raw placeholder replacement, remote image handling, external font dependencies, lack of multi-format validation, and lack of persistent edit/export support need improvement. The 74-node n8n workflow includes useful orchestration patterns, but direct backend services are simpler for this product; do not wholesale-import it.

## Architecture direction

- Next.js/React/TypeScript application with direct Node backend services.
- SQLite persistence for campaigns, verified facts, assets, creative configurations/revisions, render outputs, jobs, and AI usage.
- Modular services: campaign/asset management, AI provider and grounding, template registry, Puppeteer renderer, job processing, editing, and export.
- Adapt the existing Puppeteer rendering lifecycle rather than replacing it. Normalize and embed owned assets; do not fetch arbitrary URLs during rendering.
- One configurable AI provider/model, strict schema validation, bounded retries, and a token/cost ledger. Unknown provider usage or pricing must be reported as unknown, not zero.

## Milestones and acceptance gates

### 0. Audit and planning
- [x] Clone and audit the IG Content Builder reference separately.
- [x] Read the original assignment and document reuse decisions, risks, and JMD constraint.
- [x] Define specification, architecture, API/data model, and implementation gates.
- [ ] Complete Netherlands Meta Ad Library research when access permits; record only verifiable ad links and observations.

### 1. Foundation
- [ ] Set up application, persistence, validated upload, campaign history, and job records.
- [x] Prototype one dynamic HTML/CSS concept, three format profiles, image normalization, output validation, and per-output failure handling.
- [x] Typecheck, lint, unit-test input escaping/validation, and run renderer smoke test on two synthetic products across all three sizes.
- [ ] Gate: create, render, and reopen a persisted campaign through the application; verify image dimensions and no visible overflow.

### 2. AI strategy and accounting
- [ ] Add configurable provider/model and strict structured strategy schema.
- [ ] Ground copy in supplied verified facts; reject unsupported claims and record fact references.
- [ ] Track provider usage, rate snapshots, estimated cost, and duration per call/batch/creative.
- [ ] Gate: test successful, malformed, truncated, and provider-error responses; verify no fabricated facts and accurate cost math. Run a live-provider test only with approved credentials.

### 3. Creative batch generation
- [ ] Build at least 15 distinct compositions, not color/headline-only variants.
- [ ] Adapt each concept to square, portrait, and vertical formats; implement asset fallback and vertical safe areas.
- [ ] Add batch progress, bounded retry, partial success, and failed-output retry without extra AI calls.
- [ ] Gate: two different simulation briefs each produce 15 concepts × 3 formats; decode and visually inspect all 45 outputs per brief.

### 4. Dashboard and editing
- [ ] Implement campaign form/list, progress/error states, gallery, placement preview, and favorites.
- [ ] Edit headline/body/CTA and replace photo; re-render without AI.
- [ ] Regenerate an individual concept's copy through a separate explicit AI action.
- [ ] Gate: verify changes persist and rendered revisions match the editor; verify failures remain visible and do not erase successful outputs.

### 5. Export and quality assurance
- [ ] Download individual PNG/JPG and bulk ZIP with an export manifest.
- [ ] Test image decoding, exact dimensions, overflow/safe-area checks, ZIP contents, restart/error paths, lint, typecheck, and tests.
- [ ] Gate: export a complete 45-image batch; label incomplete exports and report missing outputs accurately.

### 6. Delivery and live test
- [ ] Verify clean installation instructions and document actual generation time, AI usage/cost, remaining manual work, limitations, and scaling path to 100+ creatives.
- [ ] Prepare demonstration and run a new product/brief live test.
- [ ] Confirm JMD runtime, Chromium dependencies, storage, secrets, network, process supervision, and access controls with the owner.
- [ ] Deploy only after JMD access/configuration and explicit permission are in place; keep assets on the approved server.

## Current prototype evidence and limitations

The local renderer foundation has been tested using two synthetic products (shirt and bottle), one template concept, and three formats each. Six PNG and six JPEG files decoded with expected dimensions; three deliberately corrupted asset outputs failed independently. Typecheck, lint, and three unit tests passed. Smoke duration was approximately 5.2 seconds for that small renderer-only run; this is not a benchmark for 45 creatives. No application UI/API, persistence, AI integration, 15-concept library, ZIP export, real brand assets, full end-to-end test, or JMD deployment has been completed.

## Blockers and assumptions

- JMD server access, runtime details, storage/network configuration, and deployment authorization are pending. Local synthetic-asset prototyping is not official deployment approval.
- Approved AI provider credentials, model choice, and price schedule are pending; live AI/token cost is not yet verified.
- LayerFit brand guidelines, logo/product assets, and approved fonts are pending.
- Direct access to Meta Ad Library failed during initial research. No Dutch ad reference or performance claim is currently verified; do not fabricate links or infer ROAS from ad longevity.
- Initial architecture assumes one host and SQLite. Measure before scaling workers; multi-host operation may require shared database, storage, and queue infrastructure.
