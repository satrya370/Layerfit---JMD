# Repository audit — 16 November 2026

Reference: https://github.com/satrya370/IG-Content-Builder-Workflow-N8n.git
Cloned into `references/IG-Content-Builder`, commit `9ce00976664d1ac036bc38b75a8cf21621eac719`. Reference working tree must remain unchanged. This is a source audit; original pipeline has not yet been executed.

## Source of requirements
Read all four pages of `C:\Users\Asus\Downloads\Proefopdracht Satrya – LayerFit AI Creative Generator.pdf` (12 November 2026). Original assignment takes precedence. It also requires weekly updates, reporting manual effort and scaling to 100+ creatives, consistent LayerFit styling, and **all work on JMD**. User subsequently explicitly permits local audit, documentation and simulation-only prototype work; official development, real brand assets and deployment remain blocked on JMD access/confirmation. No production deployment authorized.

## Inventory and reuse decisions
| Component | Findings | Decision |
|---|---|---|
| `ig-templates-demo/scripts/build-and-render-demo.mjs` | 132-line ESM CLI; reads JSON plan, merges constants, injects HTML placeholders, opens one browser/page for batch, waits for fonts, screenshots PNG, isolates slide errors, writes render-log | Adapt lifecycle, injection contract and per-output logging into typed service; retain Puppeteer rather than replace engine |
| `ig-templates-demo/templates/` | 24 HTML files: 8 carousel families × intro/body/closing; SVG siblings are not additional concepts; fixed 1080×1350 | Reuse useful typography/composition patterns, not carousel copy/pagination. Build 15 standalone ad compositions with three layout profiles |
| `ig-templates-demo/lib/render-image-validation.cjs` | Required-field checks and HEAD/GET MIME validation | Replace validation implementation with local asset decode; retain required-slot concept |
| `ig-templates/lib/image-resolver.cjs` | 479-line CommonJS module; image plans, candidate ranking, brand maps, guessed domains, third-party placeholders | Retain asset-slot/fallback design concept only. Do not reuse remote scraping or placeholder behavior for product assets |
| `ig-templates/scripts/resolve-images.mjs` | CLI reads brief/findings/brand map and writes candidates | Replace orchestration with owned-asset IDs; no separate CLI process needed |
| `content-context.json` | Template guidance and placeholder definitions shared with planner | Adapt as typed registry with field budgets and capabilities |
| `ig_content_builder_workflow_n8n.json` | 74 nodes; Sheets/Telegram/form triggers, brief→research→planner→caption AI, retries, file writes, email output and quota nodes | Reuse orchestration lessons, not whole workflow; direct application services and durable job records |

## Rendering and security limitations
- Renderer lines 87–91 insert raw values via `replaceAll`; HTML/attribute injection possible; missing placeholders silently disappear.
- Template and slide identifiers influence file paths without validation in standalone renderer. Upstream mpId normalization reduces only one entry point's exposure.
- Browser launched with sandbox disabled. Retain sandbox by default; environment-specific exceptions require investigation.
- External image validation lacks timeout, byte limit, decoded dimension verification, redirect/private-network restrictions. HEAD returning 405 does not trigger GET fallback (only thrown errors do).
- Required-image checks often test whether a field already exists, so missing values can escape validation. Plan validator uses plan template while renderer supports per-slide overrides.
- URL extension/host matching in resolver is heuristic, not actual content validation; host regex checks full URL. `isOfficialDomain` merely excludes a few domains and is not evidence of ownership.
- Templates import Google Fonts remotely; some product-like image slots use `object-fit: cover`. Renderer waits 300ms, not image decode, and does not detect text clipping or safe areas.
- Fixed viewport and screenshot clip; no JPEG/ZIP, output decoding, placement layout, durations, persistence for edits or cost ledger.
- `browser.close()` lacks outer finally; connected browser ownership needs explicit handling.
- Workflow stores environment-specific IDs, owner access hash, emails, paths and credential references. These must not be copied into application defaults or logs. No credential values are needed for reuse.

## AI/data audit
Planner generates seven slides with free-form `data` keys. Template guide compaction and exclusion of image URLs are good reusable principles. `Parse Plan` explicitly ignores image candidates and uses user image input; resolver branch should not be assumed active end-to-end. JSON is repaired heuristically; validation happens partly after file writes. Planner token ceilings escalate 16k/24k/32k on retries. Usage is inspected on truncation but not maintained as a cost ledger. Research-led prompts encourage numbers and claims, unsuitable for verified-product-only ads. Replace with strict JSON validation, fact IDs, bounded retries and no invented evidence.

## Dependencies/environment
Demo package declares Puppeteer ^25.1.0; lock resolves 25.1.0 requiring Node >=22.12.0. Local Node is 22.18.0. PowerShell blocks npm.ps1: use `npm.cmd`, without changing execution policy. Package test command references tests absent in clone. Original scripts assume `/home/node` and browser endpoint `ws://chromium:3000` in workflow. JMD runtime, Chromium, permissions, network and storage unknown. Package declares ISC; retain source attribution and confirm repository-level reuse rights before external distribution.

## New modules required
Campaign/asset persistence, structured strategy adapter, fact validation, usage ledger, 15-template registry, responsive formats, job state/retry/recovery, dashboard/editor, favorite selection, exports, meaningful automated and visual tests.
