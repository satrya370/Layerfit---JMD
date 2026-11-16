# LayerFit AI Creative Generator — specification

Status: implementation specification, not a completion report. Original assignment and approved local exception: `docs/audit.md`.

## Product scope
Reusable single-operator web application. A campaign produces at least 15 genuinely different concepts × square 1080×1080, portrait 1080×1350 and vertical 1080×1920 = 45 images. User can revisit campaigns, favorite, edit copy, replace product image, re-render without AI, regenerate individual copy with AI and export individual PNG/JPG or bulk ZIP. No image/video generation, publishing, Shopify or performance prediction in initial scope.

Required inputs: product name/information; 1–8 product photos; logo; verified benefits/facts; primary/supporting colors; font choice; audience; objective; campaign brief; concept count (15–30 initially). Optional category, language (default Dutch), URL (metadata only), guidelines, prohibited claims and creative instructions. Brand assets only on approved environment. Local prototype uses synthetic assets.

## Validation/security contract
All API bodies validated server-side; limits: name 100, headline 90, body 240, CTA 32, hook 80, brief 4000 characters. Facts have stable IDs and text <=240 characters. Hex colors and bundled font IDs only. Raster uploads PNG/JPEG/WebP, <=10MB each, <=25MP, <=8 photos; inspect actual bytes, decode/re-encode via Sharp, discard metadata, reject SVG and invalid MIME. Generate asset/file IDs server-side, no user paths or arbitrary render URLs. Escape HTML text/attributes; CSS from registry/validated values only. Renderer blocks external requests and scripts; use data-embedded normalized images and local fonts. Bind prototype to localhost. JMD reverse-proxy authentication, TLS and resource/storage quotas must be confirmed before public access.

## Truthfulness
Verified facts are the only factual authority; audience and creative instructions are not product evidence. Model returns fact references for statements. Enforce schema, membership, numeric/price/promotion restrictions and forbidden claims; reject unsupported outputs. Schema alone cannot guarantee semantic truth. Initial conservative mode uses exact verified fact text for factual body/benefits; creative hooks/headlines require semantic review or constrained source selection. Do not describe free-form AI copy as guaranteed hallucination-free. Record provenance and surface rejected output without publishing it. Editing cannot bypass factual validation.

## AI output contract
`{concepts:[{templateId,angle,hook,headline,body,cta,visualConcept,audienceApproach,factIds:string[]}]}`.
Exactly requested count, first 15 unique registered templates; variants beyond 15 may repeat layouts and are labelled variants. Template IDs and field budgets validated; no generated URLs/HTML/prices/testimonials. One batch call preferred, at most one schema correction plus bounded transient retry. Individual regeneration receives original brief and selected concept only. Model/base URL/API key/timeouts/token ceiling/prices configurable server-side. Missing key produces actionable configuration error, never fake AI success.

## Accounting
Record every received API usage including invalid-response attempts and regeneration: provider, model, input/output/cached tokens when available, rate snapshot, currency USD, estimated cost, stage, timestamps. Missing usage/rates -> unknown, never zero. Cost = priced input tokens + priced output tokens (per-million rates); cached pricing only if configured and usage known. Show total batch and campaign lifetime cost, average per concept and per rendered image with denominator labels. Separate AI/render/export durations and total elapsed time.

## Creative quality
Registry: hero, split, editorial, feature cards, typography, spotlight, lifestyle frame, detail showcase, asymmetric grid, dual benefits, minimal poster, gallery, color blocks, product focus, conversion poster. Distinct DOM/layout/hierarchy, not color swaps. One-photo fallback uses same genuine photo in alternate composition without inventing lifestyle/detail imagery. Preserve full product via contain; deliberate crop requires explicit selected detail asset. Brand settings shared by all layouts. Vertical initial conservative safe inset top 250px/bottom 350px and sides 70px; placement UI changes require actual preview review. No claims of universal Meta-safe geometry.

## Batch reliability
Persist campaign before enqueue; one render worker/browser initially, isolated page per task, max pending jobs and timeouts. Progress based on output records, not simulated timers. Failure of one output preserves successes. Retry failed formats only; no AI call for render failures. Restart marks interrupted jobs recoverable. Revisioned configs prevent concurrent edits overwriting new versions; export includes a manifest of current revisions and failures. Complete export requires 45 successful current outputs; partial export explicitly labelled.

## Acceptance/testing
Meaningful unit tests: validation, escaping, fact grounding, cost math, template coverage. Renderer integration: all 15×3, decoded PNG/JPEG dimensions, font/image readiness, no clipped content, bounds/safe-area checks, corrupted asset isolation. Two distinct synthetic product briefs (apparel and reusable bottle) exercise full UI→API→AI adapter→render→gallery→edit/re-render→favorite→individual regenerate→PNG/JPG/ZIP; check ZIP entries and decode all files. Fixture AI tests are explicitly separate from live-provider tests. Actual provider testing remains blocked until approved credentials; brand styling approval and JMD live test remain required. Report durations and manual interventions, not speculative speed.

Deadline 30 November 2026. Weekly brief: completed/tested, next work, blockers. Milestone gates in TODO.md. Scaling to 100+: queue/pagination and sequential batches initially; measure memory/storage and throughput before adding workers. SQLite WAL single host; multi-host requires shared storage/database/queue decision.
