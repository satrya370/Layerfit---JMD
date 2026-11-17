/**
 * Engine foundation smoke: 1 fixture template × 3 formats × 2 synthetic briefs, PNG + JPG, through the real
 * renderBatch path, plus expected negative cases in the same batch. Synthetic assets only; no AI; no LayerFit assets.
 * Requires CHROMIUM_EXECUTABLE_PATH. Writes to the ignored artifacts/engine-smoke/ folder.
 */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import sharp from 'sharp';
import { createHarness } from '../fixtures/engine/harness.js';
import { simulatedBriefs, type Brief } from '../fixtures/engine/briefs.js';
import { createFixtureTemplate } from '../fixtures/engine/templates/fixture-hero.js';
import { renderBatch } from '../src/server/render/batch.js';

if (!process.env.CHROMIUM_EXECUTABLE_PATH) throw new Error('Set CHROMIUM_EXECUTABLE_PATH to an installed Chrome/Chromium executable');

const outDir = resolve('artifacts/engine-smoke');
const storeDir = join(outDir, 'store');
await mkdir(storeDir, { recursive: true });

const briefs = await simulatedBriefs();
// Negative case: same bottle campaign, but the config points at an asset whose bytes are not an image.
const corruptAssetId = 'bottle-corrupt';
const corruptBottle = {
  snapshot: { ...briefs.bottle.snapshot, config: { ...briefs.bottle.snapshot.config, assets: [{ assetId: corruptAssetId, role: 'product' as const, allowCrop: false }] } },
};
const harness = await createHarness({
  outputRoot: storeDir,
  templates: [
    createFixtureTemplate({ version: '0.1.0' }),
    createFixtureTemplate({ version: '0.2.0', hostileExternal: true }),
    createFixtureTemplate({ version: '0.3.0', strayOutsideSafeArea: true }),
  ],
  assets: [
    ...briefs.shirt.assets,
    ...briefs.bottle.assets,
    { campaignId: briefs.bottle.snapshot.campaignId, assetId: corruptAssetId, bytes: Buffer.from('corrupt synthetic bytes') },
  ],
});

const FORMATS = ['square', 'portrait', 'vertical'] as const;
const task = (brief: Pick<Brief, 'snapshot'>, format: (typeof FORMATS)[number], n: number, templateVersion?: string) => ({
  taskId: `${String(n).padStart(8, '0')}-0000-4000-8000-000000000000`,
  jobId: '44444444-4444-4444-8444-444444444444', attempt: 1, format, encodings: ['png', 'jpg'],
  snapshot: { ...brief.snapshot, ...(templateVersion ? { templateVersion } : {}) },
});

const positive = [briefs.shirt, briefs.bottle].flatMap((brief, b) => FORMATS.map((format, f) => task(brief, format, b * 3 + f + 1)));
const negative = [
  task(briefs.shirt, 'square', 101, '0.2.0'), // blocked external request
  task(corruptBottle, 'square', 102), // corrupt asset
  task(briefs.shirt, 'vertical', 103, '0.3.0'), // safe-area violation
];

const started = performance.now();
const results = await renderBatch({ tasks: [...positive, ...negative] }, harness.engine);
const durationMs = Math.round(performance.now() - started);
await harness.close();

const successes = results.filter((r) => r.status === 'success');
assert.equal(successes.length, positive.length, JSON.stringify(results.map((r) => [r.taskId, r.status, r.error?.code])));
const expectedCodes = ['NETWORK_BLOCKED', 'ASSET_INVALID', 'SAFE_AREA_VIOLATION'];
assert.deepEqual(results.slice(positive.length).map((r) => r.error?.code), expectedCodes);

// Decode every produced file and check exact dimensions.
const dims = { square: [1080, 1080], portrait: [1080, 1350], vertical: [1080, 1920] } as const;
const decoded: Array<{ creativeId: string; format: string; encoding: string; width: number; height: number; bytes: number }> = [];
const previews: Buffer[] = [];
for (const result of successes) {
  assert.ok(result.format, 'a successful result always carries its format');
  for (const artifact of result.artifacts) {
    const bytes = await sharp(join(storeDir, ...artifact.storageKey.split('/')), { failOn: 'error' }).raw().toBuffer({ resolveWithObject: true });
    const size: readonly [number, number] = dims[result.format];
    const [width, height] = size;
    assert.equal(bytes.info.width, width);
    assert.equal(bytes.info.height, height);
    decoded.push({ creativeId: result.creativeId, format: result.format, encoding: artifact.encoding, width, height, bytes: artifact.bytes });
    if (artifact.encoding === 'png') previews.push(await sharp(bytes.data, { raw: bytes.info }).resize(270, 480, { fit: 'contain', background: '#dedede' }).png().toBuffer());
  }
}
assert.equal(decoded.length, positive.length * 2, 'two encodings per placement');

const sheetWidth = 3 * 270;
const sheetRows = Math.ceil(previews.length / 3);
await sharp({ create: { width: sheetWidth, height: sheetRows * 480, channels: 3, background: '#dedede' } })
  .composite(previews.map((input, i) => ({ input, left: (i % 3) * 270, top: Math.floor(i / 3) * 480 })))
  .png().toFile(join(outDir, 'contact-sheet.png'));

const browserVersion = successes[0]?.diagnostics.browserVersion;
assert.ok(browserVersion, 'browser version is recorded in diagnostics');

const report = {
  kind: 'engine foundation smoke; synthetic assets only; no AI; not application E2E',
  template: { id: 'fixture-hero', version: '0.1.0', note: 'engine test fixture, not a LayerFit ad concept' },
  placements: positive.length,
  encodedFiles: decoded.length,
  expectedNegativeCases: negative.length,
  negativeCodes: expectedCodes,
  durationMs,
  environment: { node: process.version, browser: browserVersion, chromeExecutable: process.env.CHROMIUM_EXECUTABLE_PATH },
  decoded,
  results: results.map((r) => ({ taskId: r.taskId, creativeId: r.creativeId, format: r.format, status: r.status, error: r.error, stageMs: r.diagnostics.stageMs, warnings: r.diagnostics.warnings, fittingSteps: r.diagnostics.fittingSteps })),
};
await writeFile(join(outDir, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ placements: report.placements, encodedFiles: report.encodedFiles, negativeCodes: report.negativeCodes, durationMs, report: join(outDir, 'report.json') }, null, 2));
