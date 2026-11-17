# Project instructions

Read spec.md, docs/audit.md, docs/architecture.md and TODO.md before changes. Original PDF requirements take precedence subject to user's explicit local-prototype exception. JMD access remains a blocker for official deployment. Local tests use synthetic assets only; no production deployment without permission.

Never edit reference repository. Reuse audited Puppeteer lifecycle with attribution, do not wholesale import n8n. Keep direct backend modular and creative configs persisted. Validate and escape all inputs; renderer must not fetch arbitrary URLs. No fake AI fallback presented as live AI, no invented claims/prices/testimonials, no unverified ad performance claims. Record cost as unknown when usage/pricing unavailable.

## Parallel template/renderer work
Template work logs to `template_part01_log.md`; renderer work logs to `rendering_engine_log.md`. Before starting a CP, read the plan and latest counterpart log; after each CP, append scope, status (complete only with gate evidence; otherwise partial/blocked), files, commands/results, artifacts, open issues and handoff. Do not edit the other owner's log or overwrite their files. Cross-check counterpart log before declaring shared integration complete. Keep both logs chronological and secret-free. Do not commit/push unless explicitly requested.

Mark progress only with test evidence. Distinguish unit/fixture, rendering, browser E2E, real AI and JMD verification. Failures retain successful outputs. Rendering/editing must not invoke AI unless explicitly regenerating copy. Use npm.cmd on this Windows environment. Do not modify execution policy. No subagent delegation required.
