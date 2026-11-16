# Architecture and decisions

## ADR 001 — direct backend
Choose Next.js + React + TypeScript for UI and Node route handlers, Zod schemas, SQLite persistence, Puppeteer (existing approach), Sharp and ZIP streaming. No n8n dependency: its messaging/Sheets workflow adds unrelated orchestration. Use ordinary CSS initially; Tailwind is optional, not a requirement. Long-running Node server/worker, not short-timeout serverless deployment.

## Modules / planned paths
`src/domain` schemas/types; `src/server/campaigns` persistence; `src/server/ai` provider/grounding/ledger; `src/templates` registry/shared components/layouts; `src/server/render` adapted Puppeteer engine; `src/server/assets` normalization; `src/server/jobs` durable queue; `src/server/export` PNG/JPEG/ZIP; `src/app` UI/routes. Prototype spike may precede this structure and must be clearly identified.

## Data model (SQLite, UUID primary keys)
- Campaign: brief JSON/schemaVersion, created/updated timestamps, status, requested count.
- Asset: campaignId, role photo/logo, owned relative path, decoded dimensions, hash, MIME.
- Fact: campaignId, text, verified flag; immutable IDs referenced by copy.
- Creative: campaignId, templateId/version, strategy/config JSON, photoAssetId, favorite, revision.
- Output: creativeId, revision, format, PNG/JPEG paths, status, error, dimensions, duration; unique(creativeId,revision,format).
- Job: campaignId/creativeId, type strategy/render/regenerate, status queued/running/completed/partial/failed/interrupted, attempt, counters, timestamps/error, idempotency key.
- AIUsage: campaignId/jobId/creativeId, provider/model, attempt, usage/rate snapshot/cost, response status.
Use transactions for transitions; write images to temporary files then rename before marking success. Keep last successful revision until new render succeeds; display stale-preview label while editing. Don't hold DB transactions while calling AI/browser.

## API contracts (planned, not yet implemented)
All IDs UUID, JSON errors `{error:{code,message,fields?}}`. 400 validation, 404 unknown ID, 409 revision/job conflict, 413 size, 429 capacity, 502 provider error. Do not leak keys or provider raw errors.
| Method/path | Request | Response |
|---|---|---|
| POST /api/campaigns | validated product/brand/brief fields | 201 campaign |
| GET /api/campaigns | pagination cursor | campaign summaries/cursor |
| GET /api/campaigns/:id | — | brief, creatives, jobs, totals |
| POST /api/campaigns/:id/assets | multipart role + file | 201 normalized asset |
| POST /api/campaigns/:id/generate | idempotency key | 202 jobId |
| GET /api/jobs/:id | — | progress, success/failure counts/errors |
| PATCH /api/creatives/:id | expectedRevision, headline/body/cta/photoAssetId/favorite | creative/new revision |
| POST /api/creatives/:id/render | expectedRevision | 202 jobId, no AI |
| POST /api/creatives/:id/regenerate | expectedRevision | 202 AI jobId |
| GET /api/outputs/:id?encoding=png\|jpg | — | image bytes/download |
| GET /api/campaigns/:id/export?encoding=png\|jpg&favorites=false | — | streamed ZIP + manifest |

## Pipeline
UI validates → API revalidates → persist → enqueue AI job → compact verified facts + brief + registry IDs/budgets → strict parse/grounding → persist creative configs/usage → enqueue 3 outputs per creative → embed owned assets + escape content → set viewport + HTML → await fonts + image decode → layout validation/limited typography fitting → screenshot → Sharp decode/check + JPEG → atomic storage/output record → gallery polls real job progress.
Export selects successful current revisions only; manifest gives concept, template, size, revision and missing-output details. Names use safe generated IDs, not arbitrary product names. Font assets are bundled; approved user fonts can be added later after validation/licensing checks.

## ADR 002 — reuse boundary
Adapt browser initialization, viewport/setContent/fonts/screenshot, per-slide try/catch and render log from audited renderer. Add dimensions/configuration, timeouts, network isolation, escaping, image decode, layout checks and resource cleanup. Source attribution retained. No direct reuse of unsafe remote resolver. Existing template typography inspires selected layouts; carousel count is not concept count.

## ADR 003 — environment
Local Windows is approved for prototype/simulations only. Node 22.18 is present; npm.cmd avoids PowerShell policy change. JMD pending: SSH/workspace, OS/runtime, non-root Chromium sandbox/deps, RAM/disk budget, writable data paths, provider egress, environment secret injection, reverse proxy/access control, process supervisor, backups and restart procedure. No deployment or infrastructure modification until authorized.
