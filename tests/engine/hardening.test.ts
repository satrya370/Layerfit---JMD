/**
 * Paths that existed in the code but had no test: EXIF orientation, metadata removal, browser launch failure,
 * and the whole-task deadline. None of these needs a working browser.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { normalizeImage } from '../../src/server/assets/normalize-image.js';
import { renderOutput } from '../../src/server/render/render-output.js';
import { createHarness } from '../../fixtures/engine/harness.js';
import { simulatedBriefs } from '../../fixtures/engine/briefs.js';
import { createFixtureTemplate } from '../../fixtures/engine/templates/fixture-hero.js';

const request = (brief: { snapshot: unknown }, n: number) => ({
  taskId: `${String(n).padStart(8, '0')}-0000-4000-8000-000000000000`,
  jobId: '44444444-4444-4444-8444-444444444444', attempt: 1, format: 'square', encodings: ['png'], snapshot: brief.snapshot,
});

test('EXIF orientation is applied to the pixels and metadata is stripped from the normalized image', async () => {
  // 40×20 pixels stored with EXIF orientation 6 (rotate 90°): the visible image is 20×40.
  const source = await sharp({ create: { width: 40, height: 20, channels: 3, background: '#336699' } })
    .jpeg().withMetadata({ orientation: 6 }).toBuffer();
  assert.equal((await sharp(source).metadata()).orientation, 6, 'precondition: the source carries orientation 6');

  const normalized = await normalizeImage(source);
  assert.equal(normalized.width, 20, 'width and height are swapped after applying the orientation');
  assert.equal(normalized.height, 40);
  const meta = await sharp(normalized.bytes).metadata();
  assert.equal(meta.width, 20);
  assert.equal(meta.height, 40);
  assert.equal(meta.orientation, undefined, 'orientation tag is not carried over');
  assert.equal(meta.exif, undefined, 'EXIF block is removed');
});

test('normalization never enlarges an image and respects the maximum edge', async () => {
  const small = await sharp({ create: { width: 50, height: 60, channels: 3, background: '#aaaaaa' } }).png().toBuffer();
  const unchanged = await normalizeImage(small, 2400);
  assert.equal(unchanged.width, 50, 'a small image is not upscaled by normalization');
  const big = await sharp({ create: { width: 3000, height: 1500, channels: 3, background: '#aaaaaa' } }).png().toBuffer();
  const limited = await normalizeImage(big, 2400);
  assert.equal(limited.width, 2400);
  assert.equal(limited.height, 1200);
});

test('a browser that cannot be launched fails without retry and without leaking the executable path', async () => {
  const briefs = await simulatedBriefs();
  const harness = await createHarness({
    templates: [createFixtureTemplate({ version: '0.1.0' })],
    assets: briefs.shirt.assets,
    executablePath: '/definitely/missing/chrome-binary',
  });
  const reported: string[] = [];
  harness.engine.onFailure = (info) => { reported.push(info.internal ?? ''); };
  try {
    const result = await renderOutput(request(briefs.shirt, 1), harness.engine);
    assert.equal(result.status, 'failed');
    assert.equal(result.error?.code, 'BROWSER_LAUNCH_FAILED');
    assert.equal(result.error?.retryable, false, 'a missing executable is configuration, not a transient fault');
    assert.doesNotMatch(result.error!.message, /definitely|missing|chrome-binary/);
    assert.match(reported.join(' '), /definitely|executable|not found/i, 'the operator hook still receives the raw detail');
  } finally {
    await harness.close();
  }
});

test('the whole-task deadline stops a task before it uses a browser and is retryable', async () => {
  const briefs = await simulatedBriefs();
  const harness = await createHarness({
    templates: [createFixtureTemplate({ version: '0.1.0' })],
    assets: briefs.shirt.assets,
    timeouts: { taskDeadlineMs: 0 },
  });
  try {
    const result = await renderOutput(request(briefs.shirt, 1), harness.engine);
    assert.equal(result.status, 'failed');
    assert.equal(result.error?.code, 'TASK_DEADLINE');
    assert.equal(result.error?.retryable, true);
    assert.equal(harness.browsers.version, undefined, 'no browser was started for a task that was already out of time');
    assert.equal(result.artifacts.length, 0);
  } finally {
    await harness.close();
  }
});
