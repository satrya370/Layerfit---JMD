import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import sharp from 'sharp';
import puppeteer from 'puppeteer';
import { templateModule } from '../src/editorial-reframe.js';
import { contractCases, caseCreativeIds } from './editorial-contract-cases.js';
import { checkTemplateContract } from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';
import { createHarness } from '../../../../Layerfit-JMD-engine/fixtures/engine/harness.js';
import { renderOutput } from '../../../../Layerfit-JMD-engine/src/server/render/render-output.js';
import type { FontDefinition } from '../../../../Layerfit-JMD-engine/src/shared/fonts.js';
import { join as pathJoin } from 'node:path';

/**
 * Fidelity stand-in: the source design uses Arial, which the engine may not load (bundled fonts only).
 * For this study the 'inter' font token is mapped to Arimo (OFL-1.1, @fontsource), which is metrically
 * compatible with Arial/Helvetica, so line wrapping matches the source. Production fonts stay an engine
 * decision; no engine file is modified and no non-OFL font is bundled.
 */
const arimoAsInter: Record<string, FontDefinition> = {
  inter: {
    family: 'LF Arimo',
    fallback: 'sans-serif',
    licence: 'OFL-1.1',
    faces: [
      { weight: 400, style: 'normal', module: '@fontsource/arimo/files/arimo-latin-400-normal.woff2' },
      { weight: 700, style: 'normal', module: '@fontsource/arimo/files/arimo-latin-700-normal.woff2' },
    ],
  },
};

const out = resolve('artifacts/t04-engine-port');
await mkdir(out, { recursive: true });
const cases = await contractCases();
const conformance = await checkTemplateContract(templateModule, cases, { strict: false });
await writeFile(join(out, 'contract-report.json'), JSON.stringify(conformance, null, 2));
assert.ok(conformance.passed, JSON.stringify(conformance.checks.filter((check) => check.status === 'fail')));
// Expected, deliberate warns: `css.tokens` — T04 keeps the user-supplied source geometry
// (top 47 / left-right 45 / bottom 28) instead of the engine prototype safe box. Open contract item.
assert.ok(conformance.counts.warn > 0 && conformance.checks.every((check) => check.id !== 'css.tokens' || check.status === 'warn'), 'unexpected checks; review contract-report.json');

// Render the user-supplied source HTML as-is, unchanged, as the fidelity baseline.
const sourceDir = resolve('../../Template-example');
const originalCss = await readFile(join(sourceDir, 'styles.css'), 'utf8');
let originalHtml = await readFile(join(sourceDir, 'index.html'), 'utf8');
originalHtml = originalHtml.replace(/<script>[\s\S]*?<\/script>/, '').replace('<link rel="stylesheet" href="styles.css" />', `<style>${originalCss}</style>`);
for (const [filename, mime] of [['product-scene.jpg', 'image/jpeg'], ['brand-logo.png', 'image/png']] as const) {
  originalHtml = originalHtml.replace(`assets/${filename}`, `data:${mime};base64,${(await readFile(join(sourceDir, 'assets', filename))).toString('base64')}`);
}
await writeFile(join(out, 'T04-supplied-source.html'), originalHtml);
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 1 });
  await page.setContent(originalHtml, { waitUntil: 'load' });
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((image) => image.decode())); });
  await page.screenshot({ type: 'png', path: join(out, 'T04-supplied-source.png') });
} finally { await browser.close(); }

// Real engine pipeline for every case, PNG+JPG, artifacts copied next to the baseline.
const store = join(out, `store-${randomUUID()}`);
const harness = await createHarness({
  outputRoot: store, templates: [templateModule], assets: cases.flatMap((item) => item.assets),
  fontRegistry: arimoAsInter,
  fontResolve: (specifier) => pathJoin(process.cwd(), 'node_modules', specifier),
});
const results = [];
try {
  for (const [index, item] of cases.entries()) {
    const creativeId = caseCreativeIds[item.name]
      ?? (index === 0 ? 'a1111111-1111-4111-8111-111111111111' : 'b2222222-2222-4222-8222-222222222222');
    const result = await renderOutput({
      taskId: randomUUID(), jobId: randomUUID(), attempt: 1, format: 'square', encodings: ['png', 'jpg'],
      snapshot: {
        schemaVersion: 1, campaignId: item.campaignId, creativeId, revision: 1,
        templateId: templateModule.id, templateVersion: templateModule.version, language: 'nl', config: item.config, facts: item.facts,
      },
    }, harness.engine);
    results.push({ name: item.name, result });
    assert.equal(result.status, 'success', `case ${item.name}: ${JSON.stringify(result.diagnostics?.violations ?? result.error)}`);
    const label = item.name === 'reference-example' ? 'reference-example' : index === 0 ? 'shirt' : 'bottle';
    for (const artifact of result.artifacts) {
      const source = join(store, ...artifact.storageKey.split('/'));
      const meta = await sharp(source).metadata();
      assert.equal(meta.width, 1080);
      assert.equal(meta.height, 1080);
      await copyFile(source, join(out, `T04-engine-${label}.${artifact.encoding}`));
    }
  }
} finally { await harness.close(); }

// Fidelity comparison: user-supplied source left, engine render of the reference example right.
const width = 1080, height = 1080, gap = 16;
await sharp({ create: { width: width * 2 + gap, height, channels: 3, background: '#ffffff' } })
  .composite([
    { input: join(out, 'T04-supplied-source.png'), left: 0, top: 0 },
    { input: join(out, 'T04-engine-reference-example.png'), left: width + gap, top: 0 },
  ])
  .png().toFile(join(out, 'T04-source-vs-engine.png'));

await writeFile(join(out, 'engine-report.json'), JSON.stringify({
  kind: 'actual Claude engine integration, uncommitted working tree; synthetic cases plus one case using the user-supplied reference example values (reference-derived, NOT verified LayerFit claims)',
  conformance: conformance.counts,
  results: results.map(({ name, result }) => ({ name, status: result.status, violations: result.diagnostics.violations })),
}, null, 2));
console.log(JSON.stringify({
  out, conformance: conformance.counts,
  results: results.map(({ name, result }) => ({ name, status: result.status, violations: result.diagnostics.violations, error: result.error })),
}, null, 2));
