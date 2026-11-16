# LayerFit AI Creative Generator

Target: one verified product brief → 15 visual concepts → 45 static Meta ad images, with editing and export. **Current status: audit/planning complete; renderer foundation prototype tested. Web application, AI and complete 45-image pipeline are not implemented.**

## Workspace
- `references/IG-Content-Builder/`: untouched reference clone (excluded from project Git).
- `spec.md`: requirements, quality/security/AI contracts and acceptance.
- `docs/audit.md`: source findings/reuse decisions and assignment precedence.
- `docs/architecture.md`: architecture, data model, planned API and deployment blockers.
- `docs/research.md`: honest Meta Ad Library access/research status.
- `TODO.md`: implementation gates/evidence.
- `AGENTS.md`, `CLAUDE.md`: shared implementation instructions.

## Environment/setup status
Requires Node >=22.12.0. Local tests use Node 22.18.0. Use `npm.cmd` in PowerShell; no execution-policy changes required.

```powershell
cd C:\Users\Asus\LayerFit
npm.cmd ci
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
# Set this only to an installed, approved Chromium/Chrome executable:
$env:CHROMIUM_EXECUTABLE_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm.cmd run test:render
```

`npm install` and the checks above were executed successfully; clean `npm ci` has not yet been independently verified. Puppeteer can install its pinned browser using `npx.cmd puppeteer browsers install chrome`; this download did not complete successfully in this environment. Existing system Chrome worked with explicit path. This launches an isolated temporary browser profile, not your logged-in profile. No sandbox-disabling flags are used.

Output: `artifacts/foundation-smoke/` contains six PNGs, six JPEGs, contact sheet and machine-readable reports. One template × two synthetic products × three sizes. Three deliberately corrupt-asset outputs fail as expected. These are renderer integration tests, **not** AI or browser application E2E tests. See `docs/verification.md` for evidence and limitations.

Local audit/docs and synthetic-asset prototype work explicitly approved. Real brand assets and official development belong on JMD after access and rules are confirmed. No deployment has occurred. Provider credentials/pricing, JMD access/configuration and LayerFit brand assets/guidelines are outstanding.
