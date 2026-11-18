/**
 * One creative revision × one format. Adapted from the per-slide loop of IG-Content-Builder
 * (commit 9ce00976664d1ac036bc38b75a8cf21621eac719, ig-templates-demo/scripts/build-and-render-demo.mjs lines 57–112):
 * per-output error isolation is kept; plan JSON, carousel constants, remote image validation, raw placeholder
 * replacement and the fixed 300ms sleep are replaced. Never calls AI and never changes copy.
 */
import { createHash, randomUUID } from 'node:crypto';
import type { Page } from 'puppeteer';
import {
  FORMAT_PROFILES, FORMATS, renderRequestSchema, type LayoutViolation, type RenderRequest, type RenderResult, type RenderStage, type ResolvedFact, type TemplateConfig,
} from '../../shared/render-contract.js';
import type { RenderAssetResolver } from '../assets/resolve-render-assets.js';
import type { OutputStore } from '../storage/output-store.js';
import type { BrowserManager } from './browser-manager.js';
import { composeDocument } from './document.js';
import { encodeArtifacts } from './encode-output.js';
import { RenderError, toRenderError, withTimeout } from './errors.js';
import type { FontLoader } from './fonts.js';
import { installEvaluateShim, waitForReadiness, waitForStableLayout } from './readiness.js';
import type { TemplateRegistry } from './registry.js';
import { fitAndValidate } from './validate-layout.js';

export interface RenderTimeouts { contentMs: number; readinessMs: number; layoutMs: number; screenshotMs: number; taskDeadlineMs: number }
const DEFAULT_TIMEOUTS: RenderTimeouts = { contentMs: 15_000, readinessMs: 15_000, layoutMs: 15_000, screenshotMs: 20_000, taskDeadlineMs: 60_000 };

export interface RenderHooks {
  /** Test-only fault injection after HTML is set (e.g. crash the page). */
  afterContent?(page: Page): Promise<void>;
  beforeEncode?(): void | Promise<void>;
}

export interface RenderEngine {
  browsers: BrowserManager;
  templates: TemplateRegistry;
  assets: RenderAssetResolver;
  fonts: FontLoader;
  store: OutputStore;
  /** Whether a storage key is referenced by a committed output record (DB). Protects published files. */
  isReferenced?: (key: string) => boolean | Promise<boolean>;
  timeouts?: Partial<RenderTimeouts>;
  maxFitSteps?: number;
  hooks?: RenderHooks;
  /** Operator log hook. Receives raw `internal` detail that is deliberately kept out of RenderResult. */
  onFailure?: (info: { taskId: string; code: string; stage: string; internal?: string }) => void;
}

/** Facts referenced by the config must exist in the snapshot before any browser work starts. */
function referencedFactIds(config: TemplateConfig): string[] {
  return [
    ...config.copy.benefits.flatMap((b) => b.factIds),
    ...(config.copy.bodyFactIds ?? []),
    config.offerFactId, config.heroFactId, config.proofFactId, config.disclaimerFactId, config.comparisonEvidenceId,
  ].filter((id): id is string => typeof id === 'string');
}

const issues = (error: { issues: Array<{ path: PropertyKey[]; message: string }> }) =>
  error.issues.slice(0, 3).map((i) => `${i.path.map(String).join('.')} ${i.message}`).join('; ');

/** Never throws for a valid envelope: every failure becomes a structured failed result so batch callers keep other outputs. */
export async function renderOutput(input: unknown, engine: RenderEngine): Promise<RenderResult> {
  const started = performance.now();
  const stageMs: Partial<Record<RenderStage, number>> = {};
  const warnings: string[] = [];
  let violations: LayoutViolation[] = [];
  let fittingSteps = 0;
  let cssHash: string | undefined;
  let fingerprint: string | undefined;
  let browserVersion: string | undefined;

  const raw = (typeof input === 'object' && input !== null ? input : {}) as Partial<RenderRequest>;
  const snapshotRaw = (raw.snapshot ?? {}) as Partial<RenderRequest['snapshot']>;
  const base = {
    taskId: typeof raw.taskId === 'string' ? raw.taskId : '',
    creativeId: typeof snapshotRaw.creativeId === 'string' ? snapshotRaw.creativeId : '',
    revision: typeof snapshotRaw.revision === 'number' ? snapshotRaw.revision : 0,
    format: FORMATS.find((f) => f === raw.format) ?? null,
    templateId: typeof snapshotRaw.templateId === 'string' ? snapshotRaw.templateId : '',
    templateVersion: typeof snapshotRaw.templateVersion === 'string' ? snapshotRaw.templateVersion : '',
  };

  const timeouts = { ...DEFAULT_TIMEOUTS, ...engine.timeouts };
  // One deadline for the whole task. Checked between stages and handed to the browser stage as the remaining budget.
  // This is cooperative: it cannot interrupt a native call (e.g. a hung Sharp or Chromium call) that is already running.
  const remainingMs = () => timeouts.taskDeadlineMs - (performance.now() - started);
  const guard = (at: RenderStage) => { if (remainingMs() <= 0) throw new RenderError('TASK_DEADLINE', at, 'Task exceeded its deadline'); };

  let stage: RenderStage = 'validate';
  const timed = async <T>(name: RenderStage, work: () => Promise<T>): Promise<T> => {
    stage = name;
    const t = performance.now();
    try { return await work(); } finally { stageMs[name] = Math.round((stageMs[name] ?? 0) + performance.now() - t); }
  };
  const result = (status: RenderResult['status'], extra: Partial<RenderResult> = {}): RenderResult => ({
    status, taskId: base.taskId, creativeId: base.creativeId, revision: base.revision, format: base.format, artifacts: [],
    diagnostics: {
      templateId: base.templateId, templateVersion: base.templateVersion,
      ...(browserVersion ? { browserVersion } : {}),
      ...(cssHash ? { cssHash } : {}), ...(fingerprint ? { fingerprint } : {}),
      durationMs: Math.round(performance.now() - started), stageMs, warnings, fittingSteps, violations,
    },
    ...extra,
  });

  try {
    const parsed = renderRequestSchema.safeParse(input);
    if (!parsed.success) throw new RenderError('REQUEST_INVALID', 'validate', `Invalid render request: ${issues(parsed.error)}`);
    const request = parsed.data;
    const { snapshot, format } = request;
    const profile = FORMAT_PROFILES[format];

    const { template, config, facts } = await timed('validate', async () => {
      const template = engine.templates.get(snapshot.templateId, snapshot.templateVersion);
      if (!template.formats.includes(format)) throw new RenderError('TEMPLATE_UNKNOWN', 'validate', `Template does not support ${format}`);
      const configResult = template.configSchema.safeParse(snapshot.config);
      if (!configResult.success) throw new RenderError('CONFIG_INVALID', 'validate', `Invalid creative config: ${issues(configResult.error)}`);
      const config = configResult.data;
      if (config.templateId !== snapshot.templateId) throw new RenderError('CONFIG_INVALID', 'validate', 'config.templateId does not match snapshot');
      const facts = new Map<string, ResolvedFact>(snapshot.facts.map((f) => [f.id, f]));
      const missing = referencedFactIds(config).filter((id) => !facts.has(id));
      if (missing.length) throw new RenderError('FACT_MISSING', 'validate', `Config references facts not in snapshot: ${missing.join(', ')}`);
      return { template, config, facts };
    });

    guard('assets');
    const assets = await timed('assets', () => engine.assets.resolve(snapshot.campaignId, config));
    guard('fonts');
    const fonts = await timed('fonts', async () => ({
      heading: await engine.fonts.load(config.brand.fontHeadingId),
      body: await engine.fonts.load(config.brand.fontBodyId),
    }));

    const { html } = await timed('template', async () => {
      let output;
      try {
        output = template.render({ format, profile, config, photos: assets.photos, ...(assets.logo ? { logo: assets.logo } : {}), facts });
      } catch (cause) {
        if (cause instanceof RenderError) throw cause;
        throw new RenderError('TEMPLATE_FAILED', 'template', 'Template render function threw an error', { cause });
      }
      const composed = composeDocument({
        templateId: template.id, templateVersion: template.version, rootClass: template.rootClass, profile, config, language: snapshot.language, fonts, output,
      });
      cssHash = composed.cssHash;
      return composed;
    });

    // Fingerprint covers everything that changes the pixels: template version, config, facts, asset/font bytes, CSS and format.
    fingerprint = createHash('sha256').update(JSON.stringify({
      templateId: template.id, templateVersion: template.version, format, language: snapshot.language, config, facts: snapshot.facts,
      assets: assets.hashes, fonts: [fonts.heading, fonts.body].flatMap((f) => f.faces.map((face) => face.sha256)), cssHash,
    })).digest('hex').slice(0, 16);

    const faces = [...new Map([fonts.heading, fonts.body].flatMap((f) => f.faces.map((face) => [`${face.family}:${face.weight}`, { family: face.family, weight: face.weight }]))).values()];

    guard('browser'); // do not launch or reuse a browser for a task that is already out of time
    const png = await engine.browsers.withPage(async (page) => {
      browserVersion = engine.browsers.version;
      const blocked: string[] = [];
      await timed('content', async () => {
        await page.setJavaScriptEnabled(false);
        await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
        await page.setRequestInterception(true);
        page.on('request', (request) => {
          const url = request.url();
          // Only data: URLs are allowed (engine-embedded assets and fonts). Everything else is aborted.
          if (url.startsWith('data:')) { void request.continue().catch(() => undefined); return; }
          blocked.push(url.slice(0, 80));
          void request.abort('blockedbyclient').catch(() => undefined);
        });
        await page.setViewport({ width: profile.width, height: profile.height, deviceScaleFactor: 1 });
        await withTimeout(page.setContent(html, { waitUntil: 'load', timeout: timeouts.contentMs }), timeouts.contentMs + 1_000, 'CONTENT_TIMEOUT', 'content');
        await installEvaluateShim(page);
        await engine.hooks?.afterContent?.(page);
      });
      // Checked before readiness: a blocked image would otherwise surface as a misleading "did not decode" error.
      if (blocked.length) throw new RenderError('NETWORK_BLOCKED', 'content', `Template requested blocked resources: ${[...new Set(blocked)].slice(0, 3).join(', ')}`);
      await timed('readiness', async () => {
        await waitForReadiness(page, faces, timeouts.readinessMs);
        await waitForStableLayout(page);
      });
      const fit = await timed('layout', () => withTimeout(fitAndValidate(page, {
        width: profile.width, height: profile.height, safe: profile.safe, fontFamilies: [fonts.heading.family, fonts.body.family],
      }, engine.maxFitSteps ?? 8), timeouts.layoutMs, 'READINESS_TIMEOUT', 'layout'));
      fittingSteps = fit.steps;
      violations = fit.violations;
      warnings.push(...fit.warnings);
      if (Object.keys(fit.scales).length) warnings.push(`typography fitted: ${Object.entries(fit.scales).map(([g, s]) => `${g}=${s}`).join(', ')}`);
      if (fit.slotCount === 0) throw new RenderError('SLOT_MISSING', 'layout', 'Template exposes no data-slot elements');
      const missingRequired = template.slots.filter((s) => s.required && (!s.formats || s.formats.includes(format)))
        .filter((s) => !fit.visibleSlots.includes(s.name)).map((s) => s.name);
      if (missingRequired.length) {
        throw new RenderError('SLOT_MISSING', 'layout', `Required slots not visible: ${missingRequired.join(', ')} (visible: ${fit.visibleSlots.join(', ') || 'none'})`);
      }
      if (fit.violations.length) {
        const first = fit.violations[0]!;
        throw new RenderError(first.code, 'layout', fit.violations.slice(0, 5).map((v) => `${v.code} ${v.slot}: ${v.detail}`).join('; '));
      }
      return timed('screenshot', async () => Buffer.from(await withTimeout(page.screenshot({
        type: 'png', clip: { x: 0, y: 0, width: profile.width, height: profile.height }, captureBeyondViewport: false,
      }), timeouts.screenshotMs, 'SCREENSHOT_TIMEOUT', 'screenshot')));
    }, { deadlineMs: Math.max(1, Math.floor(remainingMs())) });

    guard('encode');
    const encoded = await timed('encode', async () => {
      await engine.hooks?.beforeEncode?.();
      return encodeArtifacts(png, request.encodings, profile.width, profile.height, config.brand.secondary);
    });
    const keyParts = { campaignId: snapshot.campaignId, creativeId: snapshot.creativeId, revision: snapshot.revision, fingerprint, format };
    const items = encoded.map((artifact) => ({ ...artifact, key: engine.store.key(keyParts, artifact.encoding) }));
    guard('storage');
    const published = await timed('storage', () => engine.store.publish(randomUUID(), items.map(({ key, bytes, sha256 }) => ({ key, bytes, sha256 })), engine.isReferenced ?? (() => true)));
    const byKey = new Map(published.map((record) => [record.key, record]));
    if (published.some((record) => record.kept)) warnings.push('existing revision output kept; reported hash is the stored file');
    return result('success', {
      artifacts: items.map(({ encoding, key, width, height }) => {
        const record = byKey.get(key)!;
        return { encoding, storageKey: key, width, height, bytes: record.bytes, sha256: record.sha256 };
      }),
    });
  } catch (error) {
    const failure = toRenderError(error, stage);
    try { engine.onFailure?.({ taskId: base.taskId, code: failure.code, stage: failure.stage, ...(failure.internal ? { internal: failure.internal } : {}) }); }
    catch { /* a failing log hook must not change the render result */ }
    return result('failed', { error: { code: failure.code, stage: failure.stage, retryable: failure.retryable, message: failure.message } });
  }
}
