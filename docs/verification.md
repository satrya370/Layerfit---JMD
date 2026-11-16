# Verification report — foundation prototype

Date: 16 November 2026. Local prototype authorized for synthetic assets only.

## Completed and tested
- Reference clone clean: `git status --porcelain` returned no changes after work.
- `npm.cmd run typecheck`: pass.
- `npm.cmd run lint`: pass.
- `npm.cmd test`: 3 tests pass (escaping, input/path/CSS validation, image decode and SVG rejection).
- `npm.cmd run test:render` with system Chrome: pass. Two synthetic product inputs (shirt and bottle), one Product Hero concept, three dimensions each. Six PNG and six JPG files decoded and dimension-checked. Text/image layout bounds checked before screenshots. Three corrupt-asset outputs failed without losing successful images.
- Contact sheet visually inspected: images contained, headline/body/CTA visible, distinct square versus tall composition. This is technical validation, not final LayerFit design approval.
- Final measured smoke duration 5237ms includes browser launch, six renders/JPEG conversion, three intentional failures and contact-sheet/report work. Not an AI batch benchmark or a claim about 45-image speed.
- Final dependency installation reports zero vulnerabilities; production audit also zero. Puppeteer upgraded from reference 25.1.0 to 25.17.0 and Sharp to 0.35.5 due to observed advisories. TypeScript ESLint nested minimatch override ^11.0.1; lint passed with override. Reference dependencies untouched.

## Artifacts
`artifacts/foundation-smoke/report.json`, `render-log.json`, `contact-sheet.png`, and individual `synthetic-shirt-*` / `synthetic-bottle-*` PNG/JPG. Ignored by Git, available in this workspace. Reproducible via `scripts/render-smoke.ts`.

## Environment failures and resolution
Initial rendering timed out. Pinned updated Chrome download left an incomplete cache; older cached Chrome failed Network.enable. Explicit system Chrome executable (`C:\Program Files\Google\Chrome\Application\chrome.exe`, installed directory 157.0.8103.52) succeeded. Renderer now has launch/protocol/readiness timeouts and configurable executable path. Tight headline line-height triggered overflow validation and was corrected before the successful run. No user browser profile/cookies used; no infrastructure changes or deployment.

## Partial / not implemented
- Foundation renderer is partial M1. No Next.js UI/API server, database, actual HTTP upload, campaign management, job queue, favorites/editor or ZIP yet.
- One concept only; 15-concept/45-image requirement not fulfilled.
- System Arial/Georgia fonts are a prototype fallback, not bundled brand fonts. Logo handling and approved LayerFit styling still pending.
- AI strategy, semantic claim grounding and usage/cost ledger not implemented. No provider call made; token usage/cost **not measured**, not reported as zero-cost AI.
- No full browser E2E tests, live-product test or real LayerFit outputs.
- Browser launch/page creation failures can still abort a batch; durable job recovery and persist-on-fatal-error remain required for production reliability.
- Geometry checks cover required regions; comprehensive overlapping-element/glyph checks and long-copy fitting still pending.
- Clean-install verification and Linux/JMD rendering still pending.

## Blockers
JMD access/configuration and deployment permission; approved provider credentials/model/rates; real brand guidelines/assets; verifiable Dutch ad examples (Meta access attempt failed). Local implementation can continue with simulation fixtures, but these blockers prevent official acceptance.

## Next implementation gate
Finish M1 with persisted campaigns/assets and one-template web create/render/reopen flow, then M2 validated real AI strategy/cost tracking. Keep completed code separate from verified acceptance claims in TODO.md.
