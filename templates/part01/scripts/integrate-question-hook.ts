import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import sharp from 'sharp';
import puppeteer from 'puppeteer';
import { templateModule } from '../src/question-hook.js';
import { contractCases } from './question-hook-cases.js';
import { checkTemplateContract } from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';
import { createHarness } from '../../../../Layerfit-JMD-engine/fixtures/engine/harness.js';
import { renderOutput } from '../../../../Layerfit-JMD-engine/src/server/render/render-output.js';
import type { FontDefinition, FontWeight } from '../../../../Layerfit-JMD-engine/src/shared/fonts.js';

const out = resolve('artifacts/t06-engine-port');
await mkdir(out, { recursive: true });
const cases = await contractCases();
const font: FontDefinition = {
  family: 'LF Arimo', fallback: 'sans-serif', licence: 'OFL-1.1',
  faces: ([400, 700] as FontWeight[]).map((weight) => ({
    weight, style: 'normal', module: `@fontsource/arimo/files/arimo-latin-${weight}-normal.woff2`,
  })),
};
const contract = await checkTemplateContract(templateModule, cases, { strict: false });
await writeFile(join(out, 'contract-report.json'), JSON.stringify(contract, null, 2));
assert.equal(contract.counts.fail, 0, JSON.stringify(contract.checks.filter((check) => check.status === 'fail')));

// Source baseline: supplied HTML/CSS/script and source image. Source uses system Arial;
// engine uses bundled Arimo because the renderer forbids unbundled platform fonts.
const sourceDir = resolve('../../Template-example/T06_Question_Hook');
let sourceHtml = await readFile(join(sourceDir, 'index.html'), 'utf8');
const sourceCss = await readFile(join(sourceDir, 'styles.css'), 'utf8');
const imageBytes = await readFile(join(sourceDir, 'assets/demo-product.png'));
sourceHtml = sourceHtml.replace('<link rel="stylesheet" href="./styles.css" />', `<style>${sourceCss}</style>`);
sourceHtml = sourceHtml.replace('<script src="./script.js"></script>', `<script>window.T06_DEFAULT_IMAGE='data:image/png;base64,${imageBytes.toString('base64')}';</script><script>${await readFile(join(sourceDir, 'script.js'), 'utf8')}</script>`);
sourceHtml = sourceHtml.replace('./assets/demo-product.png', `data:image/png;base64,${imageBytes.toString('base64')}`);
await writeFile(join(out, 'T06-supplied-source.html'), sourceHtml);

const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined });
try {
  for (const format of ['square', 'portrait', 'story'] as const) {
    const dims: [number, number] = format === 'square' ? [1080, 1080] : format === 'portrait' ? [1080, 1350] : [1080, 1920];
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(true); // source script builds text through text nodes, never innerHTML
    await page.setRequestInterception(true);
    page.on('request', (request) => void (request.url().startsWith('data:') ? request.continue() : request.abort()));
    await page.setViewport({ width: dims[0], height: dims[1], deviceScaleFactor: 1 });
    await page.setContent(sourceHtml, { waitUntil: 'load' });
    await page.evaluate(async (f) => { await (window as unknown as { setCreative: (input: { format: string }) => Promise<unknown> }).setCreative({ format: f }); await document.fonts.ready; }, format);
    await page.screenshot({ path: join(out, `T06-source-${format}.png`), type: 'png' });
    await page.close();
  }
} finally { await browser.close(); }

const store = join(out, `store-${randomUUID()}`);
const harness = await createHarness({ templates: [templateModule], assets: cases.flatMap((item) => item.assets), outputRoot: store, fontRegistry: { inter: font }, fontResolve: (specifier) => resolve('node_modules', specifier) });
const results = [];
try {
  const item = cases[0]!;
  for (const format of ['square', 'portrait', 'vertical'] as const) {
    const result = await renderOutput({
      taskId: randomUUID(), jobId: randomUUID(), attempt: 1, format, encodings: ['png', 'jpg'],
      snapshot: { schemaVersion: 1, campaignId: item.campaignId, creativeId: 'f1111111-1111-4111-8111-111111111111', revision: 1, templateId: templateModule.id, templateVersion: templateModule.version, language: 'nl', config: item.config, facts: item.facts },
    }, harness.engine);
    results.push({ format, result });
    await writeFile(join(out, `engine-${format}.json`), JSON.stringify(result, null, 2));
    assert.equal(result.status, 'success', `${format}: ${JSON.stringify(result.diagnostics)}`);
    for (const artifact of result.artifacts) {
      const source = join(store, ...artifact.storageKey.split('/'));
      const dims: [number, number] = format === 'square' ? [1080, 1080] : format === 'portrait' ? [1080, 1350] : [1080, 1920];
      const meta = await sharp(source).metadata();
      assert.equal(meta.width, dims[0]); assert.equal(meta.height, dims[1]);
      await sharp(source).raw().toBuffer();
      await copyFile(source, join(out, `T06-engine-${format}.${artifact.encoding}`));
    }
  }
} finally { await harness.close(); }

for (const format of ['square', 'portrait', 'vertical'] as const) {
  const source = join(out, `T06-source-${format === 'vertical' ? 'story' : format}.png`), engine = join(out, `T06-engine-${format}.png`);
  const dims: [number, number] = format === 'square' ? [1080, 1080] : format === 'portrait' ? [1080, 1350] : [1080, 1920];
  await sharp({ create: { width: dims[0] * 2 + 16, height: dims[1], channels: 3, background: '#fff' } })
    .composite([{ input: source, left: 0, top: 0 }, { input: engine, left: dims[0] + 16, top: 0 }])
    .png().toFile(join(out, `T06-source-vs-engine-${format}.png`));
  const sourcePixels = await sharp(source).removeAlpha().raw().toBuffer();
  const enginePixels = await sharp(engine).removeAlpha().raw().toBuffer();
  assert.equal(sourcePixels.length, enginePixels.length);
  let channelError = 0;
  for (let i = 0; i < sourcePixels.length; i++) channelError += Math.abs(sourcePixels[i]! - enginePixels[i]!);
  await writeFile(join(out, `comparison-${format}.json`), JSON.stringify({ width: dims[0], height: dims[1], meanAbsoluteChannelError: channelError / sourcePixels.length, exactPixelMatch: sourcePixels.equals(enginePixels), note: 'Pixel MAE is not a visual-similarity percentage; source uses system Arial while engine uses bundled Arimo.' }, null, 2));
}
await writeFile(join(out, 'engine-report.json'), JSON.stringify({ referenceFixtureOnly: true, claimsVerifiedForCampaign: false, contract: contract.counts, results: results.map(({ format, result }) => ({ format, status: result.status, diagnostics: result.diagnostics })) }, null, 2));
console.log(JSON.stringify({ out, contract: contract.counts, results: results.map(({ format, result }) => ({ format, status: result.status, violations: result.diagnostics.violations, fittingSteps: result.diagnostics.fittingSteps })) }, null, 2));
