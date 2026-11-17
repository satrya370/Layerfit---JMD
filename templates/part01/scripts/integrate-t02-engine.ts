import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import sharp from 'sharp';
import puppeteer from 'puppeteer';
import { templateModule } from '../src/comparison-banner.js';
import { contractCases } from './comparison-banner-cases.js';
import { checkTemplateContract } from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';
import { createHarness } from '../../../../Layerfit-JMD-engine/fixtures/engine/harness.js';
import { renderOutput } from '../../../../Layerfit-JMD-engine/src/server/render/render-output.js';
import type { FontDefinition, FontWeight } from '../../../../Layerfit-JMD-engine/src/shared/fonts.js';

const out = resolve('artifacts/t02-engine-port');
await mkdir(out, { recursive: true });
const fonts: Record<string, FontDefinition> = Object.fromEntries([
  ['montserrat', [400, 700, 800]], ['poppins', [400, 500, 600, 700]],
].map(([name, weights]) => [name, {
  family: name === 'montserrat' ? 'Montserrat' : 'Poppins', fallback: 'sans-serif', licence: 'OFL-1.1',
  faces: (weights as number[]).map((weight) => ({ weight: weight as FontWeight, style: 'normal', module: `@fontsource/${name}/files/${name}-latin-${weight}-normal.woff2` })),
}]));
const cases = await contractCases();
const contract = await checkTemplateContract(templateModule, cases, { strict: false });
await writeFile(join(out, 'contract-report.json'), JSON.stringify(contract, null, 2));
assert.equal(contract.counts.fail, 0, JSON.stringify(contract.checks.filter((check) => check.status === 'fail')));
assert.ok(contract.checks.filter((check) => check.status === 'warn').every((check) => check.id === 'css.tokens'), 'Unexpected contract warning');

// Exact supplied DOM and stylesheet, with local fonts/images replacing network paths.
// Capture creative only: remove external page chrome and expand the same square composition to 1080.
const sourceDir = resolve('../../Template-example/comparison-banner');
let baseline = await readFile(join(sourceDir, 't02.html'), 'utf8');
let fontCss = '';
for (const font of Object.values(fonts)) {
  for (const face of font.faces) {
    const bytes = await readFile(resolve('node_modules', face.module));
    fontCss += `@font-face{font-family:'${font.family}';font-weight:${face.weight};font-style:normal;src:url(data:font/woff2;base64,${bytes.toString('base64')}) format('woff2');}`;
  }
}
baseline = baseline.replace(/<link[^>]+>/g, '');
baseline = baseline.replace('</head>', `<style>${fontCss}\n${await readFile(join(sourceDir, 't02.css'), 'utf8')}\nbody{padding:0;display:block;min-height:0}.ad{width:1080px;box-shadow:none}</style></head>`);
for (const name of ['rug-cleaner', 'sofa-cleaning', 'robot-vacuum']) {
  baseline = baseline.replace(`images/${name}.jpg`, `data:image/jpeg;base64,${(await readFile(join(sourceDir, 'images', `${name}.jpg`))).toString('base64')}`);
}
await writeFile(join(out, 'T02-supplied-source.html'), baseline);
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined });
try {
  const page = await browser.newPage();
  await page.setJavaScriptEnabled(false);
  await page.setRequestInterception(true);
  page.on('request', (request) => void (request.url().startsWith('data:') ? request.continue() : request.abort()));
  await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 1 });
  await page.setContent(baseline, { waitUntil: 'load' });
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((image) => image.decode())); });
  await page.screenshot({ path: join(out, 'T02-supplied-source.png'), type: 'png' });
} finally { await browser.close(); }

const store = join(out, `store-${randomUUID()}`);
const harness = await createHarness({
  templates: [templateModule], assets: cases.flatMap((item) => item.assets), outputRoot: store,
  fontRegistry: fonts, fontResolve: (specifier) => resolve('node_modules', specifier),
});
try {
  const item = cases[0]!;
  const result = await renderOutput({
    taskId: randomUUID(), jobId: randomUUID(), attempt: 1, format: 'square', encodings: ['png', 'jpg'],
    snapshot: { schemaVersion: 1, campaignId: item.campaignId, creativeId: 'e1111111-1111-4111-8111-111111111111', revision: 1, templateId: templateModule.id, templateVersion: templateModule.version, language: 'nl', config: item.config, facts: item.facts },
  }, harness.engine);
  // Persist failures too: no false success, no losing the diagnostic report on assertion.
  await writeFile(join(out, 'engine-report.json'), JSON.stringify({ referenceStudyOnly: true, productionClaimsVerified: false, result }, null, 2));
  assert.equal(result.status, 'success', JSON.stringify(result.diagnostics));
  for (const artifact of result.artifacts) {
    const source = join(store, ...artifact.storageKey.split('/'));
    const meta = await sharp(source).metadata();
    assert.equal(meta.width, 1080); assert.equal(meta.height, 1080);
    await sharp(source).raw().toBuffer();
    await copyFile(source, join(out, `T02-engine-reference.${artifact.encoding}`));
  }
  console.log(JSON.stringify(result.diagnostics, null, 2));
} finally { await harness.close(); }
await sharp({ create: { width: 2176, height: 1080, channels: 3, background: '#ffffff' } })
  .composite([{ input: join(out, 'T02-supplied-source.png'), left: 0, top: 0 }, { input: join(out, 'T02-engine-reference.png'), left: 1096, top: 0 }])
  .png().toFile(join(out, 'T02-source-vs-engine.png'));
const a = await sharp(join(out, 'T02-supplied-source.png')).removeAlpha().raw().toBuffer();
const b = await sharp(join(out, 'T02-engine-reference.png')).removeAlpha().raw().toBuffer();
assert.equal(a.length, b.length);
let absoluteError = 0;
for (let i = 0; i < a.length; i++) absoluteError += Math.abs(a[i]! - b[i]!);
await writeFile(join(out, 'comparison-report.json'), JSON.stringify({
  width: 1080, height: 1080, meanAbsoluteChannelError: absoluteError / a.length,
  exactPixelMatch: a.equals(b),
  notes: ['Source DOM/CSS and engine use the same local Montserrat/Poppins font files.', 'Only preview page chrome is removed; square expanded from 960 to 1080 for both renders.', 'Engine normalizes photos; differences in decoded/re-encoded photography may remain.', 'Reference example only, NOT substantiated campaign claims.'],
}, null, 2));
console.log(JSON.stringify({ out, contract: contract.counts }));
