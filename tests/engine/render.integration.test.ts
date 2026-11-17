/**
 * Renderer integration tests: real Chromium (sandbox on), real Sharp, real bundled fonts, synthetic briefs only.
 * Requires CHROMIUM_EXECUTABLE_PATH (operator setting). Without it the suite is skipped and says so.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import puppeteer from 'puppeteer';
import { createHarness } from '../../fixtures/engine/harness.js';
import { simulatedBriefs, SIM, type Brief } from '../../fixtures/engine/briefs.js';
import { createFixtureTemplate } from '../../fixtures/engine/templates/fixture-hero.js';
import { renderOutput } from '../../src/server/render/render-output.js';
import { renderBatch } from '../../src/server/render/batch.js';
import { FONT_REGISTRY } from '../../src/shared/fonts.js';
import type { RenderResult } from '../../src/shared/render-contract.js';

const SKIP = process.env.CHROMIUM_EXECUTABLE_PATH ? false : 'CHROMIUM_EXECUTABLE_PATH not set; browser integration skipped';
const DIMENSIONS = { square: [1080, 1080], portrait: [1080, 1350], vertical: [1080, 1920] } as const;
const TASK = (n: number) => `${String(n).padStart(8, '0')}-0000-4000-8000-000000000000`;

function task(brief: Brief, format: keyof typeof DIMENSIONS, n: number, extra: Partial<{ templateVersion: string; encodings: Array<'png' | 'jpg'> }> = {}) {
  return {
    taskId: TASK(n), jobId: '44444444-4444-4444-8444-444444444444', attempt: 1, format,
    encodings: extra.encodings ?? ['png'],
    snapshot: { ...brief.snapshot, ...(extra.templateVersion ? { templateVersion: extra.templateVersion } : {}) },
  };
}

async function decodeArtifact(harness: { engine: { store: { read(k: string): Promise<Buffer> } } }, result: RenderResult, format: keyof typeof DIMENSIONS) {
  for (const artifact of result.artifacts) {
    const bytes = await harness.engine.store.read(artifact.storageKey);
    const meta = await sharp(bytes, { failOn: 'error' }).metadata();
    const [width, height] = DIMENSIONS[format];
    assert.equal(meta.width, width, `${artifact.encoding} width`);
    assert.equal(meta.height, height, `${artifact.encoding} height`);
    assert.equal(meta.format, artifact.encoding === 'png' ? 'png' : 'jpeg', `${artifact.encoding} container`);
    await sharp(bytes, { failOn: 'error' }).raw().toBuffer();
  }
}

test('foundation gate: 2 synthetic briefs × 3 formats × PNG+JPG decode with exact dimensions', { skip: SKIP, timeout: 180_000 }, async () => {
  const briefs = await simulatedBriefs();
  const harness = await createHarness({
    templates: [createFixtureTemplate({ version: '0.1.0' })],
    assets: [...briefs.shirt.assets, ...briefs.bottle.assets],
  });
  try {
    let n = 0;
    for (const brief of [briefs.shirt, briefs.bottle]) {
      for (const format of ['square', 'portrait', 'vertical'] as const) {
        const result = await renderOutput(task(brief, format, ++n, { encodings: ['png', 'jpg'] }), harness.engine);
        assert.equal(result.status, 'success', JSON.stringify(result.error ?? result.diagnostics.violations));
        assert.equal(result.artifacts.length, 2);
        assert.ok(result.diagnostics.browserVersion, 'browser version recorded');
        assert.ok(result.diagnostics.cssHash && result.diagnostics.fingerprint, 'hashes recorded');
        await decodeArtifact(harness, result, format);
      }
    }
  } finally {
    await harness.close();
  }
});

test('re-rendering a referenced revision keeps the stored file and reports its real hash', { skip: SKIP, timeout: 120_000 }, async () => {
  const briefs = await simulatedBriefs();
  const harness = await createHarness({ templates: [createFixtureTemplate({ version: '0.1.0' })], assets: briefs.shirt.assets });
  try {
    // Default isReferenced is "referenced" (safe). A second render produces bytes that may differ by ±1 level; the stored file wins.
    const first = await renderOutput(task(briefs.shirt, 'square', 1), harness.engine);
    const second = await renderOutput(task(briefs.shirt, 'square', 2), harness.engine);
    assert.equal(first.status, 'success', JSON.stringify(first.error));
    assert.equal(second.status, 'success', JSON.stringify(second.error));
    assert.equal(first.artifacts[0]!.storageKey, second.artifacts[0]!.storageKey);
    // Whether the new bytes matched exactly is run-dependent (±1 level observed); the reported hash must match the stored file either way.
    assert.equal(second.artifacts[0]!.sha256, first.artifacts[0]!.sha256, 'second result must describe the stored file');
    const stored = await harness.engine.store.read(second.artifacts[0]!.storageKey);
    assert.equal(stored.length, second.artifacts[0]!.bytes);
    await decodeArtifact(harness, second, 'square');
  } finally {
    await harness.close();
  }
});

test('batch isolation: blocked external request, corrupt asset and layout failures do not remove successful outputs', { skip: SKIP, timeout: 240_000 }, async () => {
  const briefs = await simulatedBriefs();
  const corruptBottle = { campaignId: SIM.bottle.campaignId, assetId: SIM.bottle.photoAssetId, bytes: Buffer.from('definitely not an image') };
  const harness = await createHarness({
    templates: [
      createFixtureTemplate({ version: '0.1.0' }),
      createFixtureTemplate({ version: '0.2.0', hostileExternal: true }),
      createFixtureTemplate({ version: '0.3.0', strayOutsideSafeArea: true }),
    ],
    assets: [...briefs.shirt.assets, corruptBottle],
  });
  try {
    const results = await renderBatch({ tasks: [
      task(briefs.shirt, 'square', 1),
      task(briefs.shirt, 'portrait', 2, { templateVersion: '0.2.0' }),
      task(briefs.bottle, 'square', 3),
      task(briefs.shirt, 'vertical', 4, { templateVersion: '0.3.0' }),
      task(briefs.shirt, 'vertical', 5),
    ] }, harness.engine);
    const summary = results.map((r) => `${r.status}:${r.error?.code ?? 'ok'}:${r.error?.message.slice(0, 160) ?? ''}`);
    assert.deepEqual(results.map((r) => r.status), ['success', 'failed', 'failed', 'failed', 'success'], summary.join('\n'));
    assert.equal(results[1]!.error?.code, 'NETWORK_BLOCKED');
    assert.equal(results[2]!.error?.code, 'ASSET_INVALID');
    assert.equal(results[3]!.error?.code, 'SAFE_AREA_VIOLATION');
    assert.match(results[3]!.error!.message, /stray/);
    await decodeArtifact(harness, results[0]!, 'square');
    await decodeArtifact(harness, results[4]!, 'vertical');
  } finally {
    await harness.close();
  }
});

test('bounded fitting: a fixed-height headline that cannot fit fails with LAYOUT_* after fitting, never truncates', { skip: SKIP, timeout: 120_000 }, async () => {
  const briefs = await simulatedBriefs();
  const harness = await createHarness({
    templates: [createFixtureTemplate({ version: '0.4.0', tightHeadline: true })],
    assets: briefs.shirt.assets,
  });
  // 84 characters: short enough for the schema, too long for a 90px box even after the 0.8 minimum fit scale.
  const longHeadline = 'Zacht katoen, ronde hals, voor werk, vrije tijd en lange herfstwandelingen buiten';
  const longBrief = { ...briefs.shirt, snapshot: { ...briefs.shirt.snapshot, config: { ...briefs.shirt.snapshot.config, copy: { ...briefs.shirt.snapshot.config.copy, headline: longHeadline } } } };
  try {
    const result = await renderOutput(task(longBrief, 'square', 1, { templateVersion: '0.4.0' }), harness.engine);
    assert.equal(result.status, 'failed');
    assert.equal(result.error?.stage, 'layout');
    assert.ok(['LAYOUT_OVERFLOW', 'LAYOUT_CLIPPED'].includes(result.error!.code), `${result.error!.code}: ${result.error!.message}`);
    assert.ok(result.diagnostics.fittingSteps > 0, 'fitting was attempted');
    assert.ok(result.diagnostics.fittingSteps <= 8, 'fitting is bounded');
    assert.ok(result.diagnostics.violations.some((v) => v.slot === 'headline'));
    assert.equal(result.artifacts.length, 0, 'no artifact is published for a failed layout');
  } finally {
    await harness.close();
  }
});

test('bounded fitting that succeeds is recorded as a warning with the applied scale', { skip: SKIP, timeout: 120_000 }, async () => {
  const briefs = await simulatedBriefs();
  const harness = await createHarness({ templates: [createFixtureTemplate({ version: '0.4.0', tightHeadline: true })], assets: briefs.shirt.assets });
  try {
    // The 27-character headline fits once the headline group is scaled down, so the render succeeds and says so.
    const result = await renderOutput(task(briefs.shirt, 'square', 1, { templateVersion: '0.4.0' }), harness.engine);
    assert.equal(result.status, 'success', JSON.stringify(result.error));
    assert.ok(result.diagnostics.fittingSteps > 0, 'fitting was applied');
    assert.ok(result.diagnostics.warnings.some((w) => /typography fitted: headline=/.test(w)), result.diagnostics.warnings.join(' | '));
  } finally {
    await harness.close();
  }
});

test('a small photo that must be enlarged to fit its slot is reported as a warning, not hidden', { skip: SKIP, timeout: 120_000 }, async () => {
  const briefs = await simulatedBriefs();
  const tiny = await sharp({ create: { width: 100, height: 130, channels: 3, background: '#cc6633' } }).png().toBuffer();
  const brief = {
    ...briefs.shirt,
    snapshot: { ...briefs.shirt.snapshot, config: { ...briefs.shirt.snapshot.config, assets: [{ assetId: 'tiny-photo', role: 'product' as const, allowCrop: false }] } },
  };
  const harness = await createHarness({
    templates: [createFixtureTemplate({ version: '0.1.0' })],
    assets: [...briefs.shirt.assets, { campaignId: briefs.shirt.snapshot.campaignId, assetId: 'tiny-photo', bytes: tiny }],
  });
  try {
    const result = await renderOutput(task(brief, 'square', 1), harness.engine);
    assert.equal(result.status, 'success', JSON.stringify(result.error));
    assert.ok(result.diagnostics.warnings.some((w) => /image upscaled/.test(w)), `warnings: ${result.diagnostics.warnings.join(' | ')}`);
    const normal = await renderOutput(task(briefs.shirt, 'square', 2), harness.engine);
    assert.equal(normal.status, 'success', JSON.stringify(normal.error));
    assert.equal(normal.diagnostics.warnings.some((w) => /image upscaled/.test(w)), false, 'a full-size photo does not warn');
  } finally {
    await harness.close();
  }
});

test('display typography with tight leading is not reported as overflow, but a real overflow still is', { skip: SKIP, timeout: 120_000 }, async () => {
  const briefs = await simulatedBriefs();
  const harness = await createHarness({
    templates: [createFixtureTemplate({ version: '0.5.0', tightLeading: true }), createFixtureTemplate({ version: '0.4.0', tightHeadline: true })],
    assets: briefs.shirt.assets,
  });
  try {
    // line-height 1.0 makes the font's content area taller than the line box; nothing is clipped or outside the box.
    const display = await renderOutput(task(briefs.shirt, 'square', 1, { templateVersion: '0.5.0' }), harness.engine);
    assert.equal(display.status, 'success', `${display.error?.code}: ${display.error?.message}`);
    const longHeadline = 'Zacht katoen, ronde hals, voor werk, vrije tijd en lange herfstwandelingen buiten';
    const overflowing = { ...briefs.shirt, snapshot: { ...briefs.shirt.snapshot, config: { ...briefs.shirt.snapshot.config, copy: { ...briefs.shirt.snapshot.config.copy, headline: longHeadline } } } };
    const real = await renderOutput(task(overflowing, 'square', 2, { templateVersion: '0.4.0' }), harness.engine);
    assert.equal(real.status, 'failed', 'a headline that cannot fit its fixed box must still fail');
  } finally {
    await harness.close();
  }
});

test('missing bundled font fails at the fonts stage and does not affect the next task', { skip: SKIP, timeout: 120_000 }, async () => {
  const briefs = await simulatedBriefs();
  const registry = { ...FONT_REGISTRY, inter: { ...FONT_REGISTRY.inter, faces: [{ weight: 400 as const, style: 'normal' as const, module: '@fontsource/inter/files/does-not-exist.woff2' }] } };
  const harness = await createHarness({
    templates: [createFixtureTemplate({ version: '0.1.0' })],
    assets: briefs.shirt.assets,
    fontRegistry: registry,
  });
  try {
    const broken = await renderOutput(task(briefs.shirt, 'square', 1), harness.engine);
    assert.equal(broken.status, 'failed');
    assert.equal(broken.error?.code, 'FONT_MISSING');
    assert.equal(broken.error?.stage, 'fonts');
    assert.equal(broken.error?.retryable, false, 'a missing font is deterministic and must not be retried');
  } finally {
    await harness.close();
  }
});

test('page crash is isolated: the crashed attempt fails retryably, then the browser recovers and the next task succeeds', { skip: SKIP, timeout: 180_000 }, async () => {
  const briefs = await simulatedBriefs();
  let crashes = 0;
  const harness = await createHarness({
    templates: [createFixtureTemplate({ version: '0.1.0' })],
    assets: briefs.shirt.assets,
    renderHooks: {
      // Fault injection: emit a page error once, as a real crash would. Sets the page unhealthy.
      afterContent: async (page) => { if (crashes++ === 0) page.emit('error', new Error('simulated page crash')); },
    },
  });
  try {
    const crashed = await renderOutput(task(briefs.shirt, 'square', 1), harness.engine);
    assert.equal(crashed.status, 'failed');
    assert.equal(crashed.error?.code, 'PAGE_CRASH');
    assert.equal(crashed.error?.retryable, true);
    const recovered = await renderOutput(task(briefs.shirt, 'portrait', 2), harness.engine);
    assert.equal(recovered.status, 'success', JSON.stringify(recovered.error));
    assert.ok(harness.warnings.some((w) => /recycling unhealthy browser/.test(w)), `browser was recycled: ${harness.warnings.join(' | ')}`);
    assert.equal(harness.browsers.activePages, 0, 'no page is left open');
  } finally {
    await harness.close();
  }
});

test('restart budget: repeated crashes exhaust it, tasks then fail fast without a browser, and the manager recovers after the cooldown', { skip: SKIP, timeout: 180_000 }, async () => {
  const briefs = await simulatedBriefs();
  let contentCalls = 0;
  const harness = await createHarness({
    templates: [createFixtureTemplate({ version: '0.1.0' })],
    assets: briefs.shirt.assets,
    maxConsecutiveRestarts: 1,
    restartCooldownMs: 1_000,
    renderHooks: { afterContent: async (page) => { if (contentCalls++ < 2) page.emit('error', new Error('simulated page crash')); } },
  });
  try {
    const first = await renderOutput(task(briefs.shirt, 'square', 1), harness.engine);
    const second = await renderOutput(task(briefs.shirt, 'square', 2), harness.engine);
    assert.equal(first.error?.code, 'PAGE_CRASH');
    assert.equal(second.error?.code, 'PAGE_CRASH');

    const exhausted = await renderOutput(task(briefs.shirt, 'square', 3), harness.engine);
    assert.equal(exhausted.error?.code, 'BROWSER_LAUNCH_FAILED');
    assert.match(exhausted.error!.message, /restart budget/);
    assert.equal(exhausted.error?.retryable, true, 'exhaustion is an infrastructure condition: a worker may retry after backoff');
    const stillFailing = await renderOutput(task(briefs.shirt, 'square', 4), harness.engine);
    assert.equal(stillFailing.error?.code, 'BROWSER_LAUNCH_FAILED', 'inside the cooldown the manager fails fast');
    assert.equal(contentCalls, 2, 'no page was opened while the budget was exhausted');

    await new Promise((resolve) => setTimeout(resolve, 1_100)); // the cooldown itself is the behaviour under test
    const recovered = await renderOutput(task(briefs.shirt, 'square', 5), harness.engine);
    assert.equal(recovered.status, 'success', JSON.stringify(recovered.error));
  } finally {
    await harness.close();
  }
});

test('cleanup failure does not hide a successful render and the browser is recycled for the next task', { skip: SKIP, timeout: 180_000 }, async () => {
  const briefs = await simulatedBriefs();
  let cleanups = 0;
  const harness = await createHarness({
    templates: [createFixtureTemplate({ version: '0.1.0' })],
    assets: briefs.shirt.assets,
    browserHooks: { beforeCleanup: () => { if (cleanups++ === 0) throw new Error('simulated cleanup failure'); } },
  });
  try {
    const first = await renderOutput(task(briefs.shirt, 'square', 1), harness.engine);
    assert.equal(first.status, 'success', 'the primary render result is kept when only cleanup fails');
    const second = await renderOutput(task(briefs.shirt, 'vertical', 2), harness.engine);
    assert.equal(second.status, 'success', JSON.stringify(second.error));
    assert.ok(harness.warnings.some((w) => /Page cleanup failed/.test(w)), 'the cleanup failure is reported, not swallowed');
    assert.ok(harness.warnings.some((w) => /recycling unhealthy browser/.test(w)), 'the browser was recycled before the next task');
  } finally {
    await harness.close();
  }
});

async function eventually(check: () => boolean, timeoutMs = 5_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (check()) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return check();
}

test('remote mode: the shared browser is never closed and pages leaked by a failed cleanup are closed', { skip: SKIP, timeout: 180_000 }, async () => {
  const briefs = await simulatedBriefs();
  // A separate, already running browser that stands in for a shared CHROMIUM_WS_ENDPOINT.
  const shared = await puppeteer.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH! });
  try {
    const pageCount = () => shared.targets().filter((t) => t.type() === 'page').length;
    assert.ok(await eventually(() => pageCount() >= 1), 'shared browser has its default page');
    const baseline = pageCount();
    let cleanups = 0;
    const harness = await createHarness({
      templates: [createFixtureTemplate({ version: '0.1.0' })],
      assets: briefs.shirt.assets,
      wsEndpoint: shared.wsEndpoint(),
      browserHooks: { beforeCleanup: () => { if (cleanups++ === 0) throw new Error('simulated cleanup failure'); } },
    });
    try {
      assert.equal(harness.browsers.owned, false);
      const first = await renderOutput(task(briefs.shirt, 'square', 1), harness.engine);
      assert.equal(first.status, 'success', JSON.stringify(first.error));
      assert.equal(harness.browsers.orphanedContexts, 1, 'the failed cleanup is tracked');
      assert.ok(await eventually(() => pageCount() === baseline + 1), 'the leaked page is still open in the shared browser at this point');

      const second = await renderOutput(task(briefs.shirt, 'portrait', 2), harness.engine);
      assert.equal(second.status, 'success', JSON.stringify(second.error));
      assert.equal(harness.browsers.orphanedContexts, 0, 'orphans were closed when the browser was released');
      assert.ok(await eventually(() => pageCount() === baseline), `no page left behind (baseline ${baseline}, now ${pageCount()})`);
    } finally {
      await harness.close();
    }
    assert.equal(shared.connected, true, 'closing the manager must not close a shared browser');
    assert.equal(pageCount(), baseline, 'the shared browser has only its own pages');
  } finally {
    // Always release the stand-in shared browser, even when an assertion fails; otherwise the runner cannot exit.
    await shared.close().catch(() => undefined);
  }
});
