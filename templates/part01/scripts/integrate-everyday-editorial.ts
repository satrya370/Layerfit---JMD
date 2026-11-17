import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import sharp from 'sharp';
import puppeteer from 'puppeteer';
import { templateModule } from '../src/everyday-editorial.js';
import { contractCases } from './everyday-editorial-cases.js';
import { checkTemplateContract } from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';
import { createHarness } from '../../../../Layerfit-JMD-engine/fixtures/engine/harness.js';
import { renderOutput } from '../../../../Layerfit-JMD-engine/src/server/render/render-output.js';
import type { FontDefinition, FontWeight } from '../../../../Layerfit-JMD-engine/src/shared/fonts.js';

const out = resolve('artifacts/t07-engine-port');
await mkdir(out, { recursive: true });
const cases = await contractCases();
const font: FontDefinition = {
  family: 'LF Arimo', fallback: 'sans-serif', licence: 'OFL-1.1',
  faces: ([400, 700] as FontWeight[]).map((weight) => ({ weight, style: 'normal', module: `@fontsource/arimo/files/arimo-latin-${weight}-normal.woff2` })),
};
const contract = await checkTemplateContract(templateModule, cases, { strict: false });
await writeFile(join(out, 'contract-report.json'), JSON.stringify(contract, null, 2));
assert.equal(contract.counts.fail, 0, JSON.stringify(contract.checks.filter((check) => check.status === 'fail')));

// Supplied source baseline; no network font or image request is needed. The browser's system Arial
// is used by the original, while engine render uses bundled Arimo as required by engine policy.
const sourceDir = resolve('../../Template-example/layerfit_t07_lifestyle_benefit_v3');
let sourceHtml = await readFile(join(sourceDir, 'index.html'), 'utf8');
const sourceCss = await readFile(join(sourceDir, 'styles.css'), 'utf8');
const photo = await readFile(join(sourceDir, 'assets/demo-lifestyle.jpg'));
sourceHtml = sourceHtml.replace('<link rel="stylesheet" href="styles.css">', `<style>${sourceCss}</style>`);
sourceHtml = sourceHtml.replace('src="assets/demo-lifestyle.jpg"', `src="data:image/jpeg;base64,${photo.toString('base64')}"`);
sourceHtml = sourceHtml.replace('<script src="./script.js"></script>', `<script>${await readFile(join(sourceDir, 'script.js'), 'utf8')}</script>`);
sourceHtml = sourceHtml.replace('<script src="script.js"></script>', `<script>${await readFile(join(sourceDir, 'script.js'), 'utf8')}</script>`);
await writeFile(join(out, 'T07-v3-supplied-source.html'), sourceHtml);
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined });
try {
  for (const [format, dims] of [['square', [1080, 1080]], ['portrait', [1080, 1350]], ['story', [1080, 1920]]] as const) {
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(true);
    await page.setRequestInterception(true);
    page.on('request', (request) => void (request.url().startsWith('data:') ? request.continue() : request.abort()));
    await page.setViewport({ width: dims[0], height: dims[1], deviceScaleFactor: 1 });
    await page.setContent(sourceHtml, { waitUntil: 'load' });
    const item = cases[0]!;
    const config = item.config as { brand: { name: string; primary: string; secondary: string; accent: string }; copy: { headline: string; cta: string }; t07: { kicker: string; eyebrow: string; headlineLines: string[]; descriptionFactId: string; photoCaption: string; productLabel: string; featureFactIds: string[]; imageAlt: string; imagePosition: string } };
    const factText = new Map(item.facts.map((fact) => [fact.id, fact.text]));
    await page.evaluate(async ({ f, data }) => {
      await (window as unknown as { setCreative: (input: Record<string, unknown>) => Promise<unknown> }).setCreative({ ...data, format: f });
      await document.fonts.ready;
    }, {
      f: format,
      data: {
        brand: config.brand.name, kicker: config.t07.kicker, eyebrow: config.t07.eyebrow,
        headline: config.t07.headlineLines.join('\n'), description: factText.get(config.t07.descriptionFactId),
        cta: config.copy.cta, photoCaption: config.t07.photoCaption, productLabel: config.t07.productLabel,
        features: config.t07.featureFactIds.map((id) => factText.get(id)),
        imageUrl: `data:image/jpeg;base64,${photo.toString('base64')}`, imageAlt: config.t07.imageAlt,
        imagePosition: config.t07.imagePosition.replace('-', '% ') + '%',
        colors: { paper: config.brand.secondary, ink: config.brand.primary, accent: config.brand.accent },
      },
    });
    await page.screenshot({ path: join(out, `T07-source-v3-${format}.png`), type: 'png' });
    await page.close();
  }
} finally { await browser.close(); }

const store = join(out, `store-${randomUUID()}`);
const harness = await createHarness({ templates: [templateModule], assets: cases.flatMap((item) => item.assets), outputRoot: store, fontRegistry: { inter: font }, fontResolve: (specifier) => resolve('node_modules', specifier) });
const results = [];
try {
  const item = cases[0]!;
  for (const format of ['square', 'portrait', 'vertical'] as const) {
    const dims: [number, number] = format === 'square' ? [1080, 1080] : format === 'portrait' ? [1080, 1350] : [1080, 1920];
    const result = await renderOutput({
      taskId: randomUUID(), jobId: randomUUID(), attempt: 1, format, encodings: ['png', 'jpg'],
      snapshot: { schemaVersion: 1, campaignId: item.campaignId, creativeId: '77111111-1111-4111-8111-111111111111', revision: 1, templateId: templateModule.id, templateVersion: templateModule.version, language: 'nl', config: item.config, facts: item.facts },
    }, harness.engine);
    results.push({ format, result });
    await writeFile(join(out, `engine-${format}.json`), JSON.stringify(result, null, 2));
    assert.equal(result.status, 'success', `${format}: ${JSON.stringify(result.diagnostics)}`);
    for (const artifact of result.artifacts) {
      const source = join(store, ...artifact.storageKey.split('/'));
      const meta = await sharp(source).metadata();
      assert.equal(meta.width, dims[0]); assert.equal(meta.height, dims[1]);
      await sharp(source).raw().toBuffer();
      await copyFile(source, join(out, `T07-engine-${format}.${artifact.encoding}`));
    }
  }
} finally { await harness.close(); }

for (const format of ['square', 'portrait', 'vertical'] as const) {
  const sourceFormat = format === 'vertical' ? 'story' : format;
  const dims: [number, number] = format === 'square' ? [1080, 1080] : format === 'portrait' ? [1080, 1350] : [1080, 1920];
  const source = join(out, `T07-source-v3-${sourceFormat}.png`), engine = join(out, `T07-engine-${format}.png`);
  await sharp({ create: { width: dims[0] * 2 + 16, height: dims[1], channels: 3, background: '#fff' } })
    .composite([{ input: source, left: 0, top: 0 }, { input: engine, left: dims[0] + 16, top: 0 }])
    .png().toFile(join(out, `T07-source-vs-engine-${format}.png`));
  const left = await sharp(source).removeAlpha().raw().toBuffer();
  const right = await sharp(engine).removeAlpha().raw().toBuffer();
  assert.equal(left.length, right.length);
  let error = 0;
  for (let i = 0; i < left.length; i++) error += Math.abs(left[i]! - right[i]!);
  await writeFile(join(out, `comparison-${format}.json`), JSON.stringify({ width: dims[0], height: dims[1], meanAbsoluteChannelError: error / left.length, exactPixelMatch: left.equals(right), note: 'MAE is not a visual similarity percentage; v3 source uses system Arial, engine uses bundled Arimo, and engine normalizes image bytes.' }, null, 2));
}
await writeFile(join(out, 'engine-report.json'), JSON.stringify({ sourceVersion: 'layerfit_t07_lifestyle_benefit_v3', fixtureOnly: true, sourceAssetApprovedForCampaign: false, contract: contract.counts, results: results.map(({ format, result }) => ({ format, status: result.status, diagnostics: result.diagnostics })) }, null, 2));
console.log(JSON.stringify({ out, contract: contract.counts, results: results.map(({ format, result }) => ({ format, status: result.status, violations: result.diagnostics.violations, fittingSteps: result.diagnostics.fittingSteps })) }, null, 2));
