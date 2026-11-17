import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import sharp from 'sharp';
import puppeteer from 'puppeteer';
import { templateModule } from '../src/question-hook-t09.js';
import { contractCases } from './question-hook-t09-cases.js';
import { checkTemplateContract } from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';
import { createHarness } from '../../../../Layerfit-JMD-engine/fixtures/engine/harness.js';
import { renderOutput } from '../../../../Layerfit-JMD-engine/src/server/render/render-output.js';
import type { FontDefinition, FontWeight } from '../../../../Layerfit-JMD-engine/src/shared/fonts.js';

const out = resolve('artifacts/t09-engine-port');
await mkdir(out, { recursive: true });
const cases = await contractCases();
const faces = (family: string, weights: FontWeight[], prefix: string): FontDefinition => ({
  family, fallback: 'sans-serif', licence: 'OFL-1.1',
  faces: weights.map((weight) => ({ weight, style: 'normal', module: `@fontsource/${prefix}/files/${prefix}-latin-${weight}-normal.woff2` })),
});
const fontRegistry: Record<string, FontDefinition> = {
  montserrat: faces('LF Space Grotesk', [500, 700], 'space-grotesk'),
  inter: faces('LF Inter', [400, 500, 600, 700, 800], 'inter'),
};
const contract = await checkTemplateContract(templateModule, cases, { strict: false });
await writeFile(join(out, 'contract-report.json'), JSON.stringify(contract, null, 2));
assert.equal(contract.counts.fail, 0, JSON.stringify(contract.checks.filter((check) => check.status === 'fail')));

const sourceDir = resolve('../../Template-example/layerfit-t09-question-hook');
const originalCss = await readFile(join(sourceDir, 'styles.css'), 'utf8');
let sourceHtml = await readFile(join(sourceDir, 'index.html'), 'utf8');
// User-requested visual edit applied to the comparison source as well: remove the giant static ghost question mark.
sourceHtml = sourceHtml.replace(/\s*<div class="ad__ghostq" id="ghostQ">\?<\/div>/, '');
sourceHtml = sourceHtml.replace(/<link[^>]+>/g, '');
const fontNames: Record<string, string> = { inter: 'Inter', 'space-grotesk': 'Space Grotesk' };
let localFontCss = '';
for (const [pkg, font] of Object.entries(fontRegistry).map(([key, value]) => [key === 'montserrat' ? 'space-grotesk' : key, value] as const)) {
  for (const face of font.faces) {
    const file = resolve('node_modules', face.module);
    const bytes = await readFile(file);
    localFontCss += `@font-face{font-family:"${fontNames[pkg]}";font-style:normal;font-weight:${face.weight};src:url(data:font/woff2;base64,${bytes.toString('base64')}) format('woff2');}`;
  }
}
const pngLogoSvg = await readFile(join(sourceDir, 'assets/soniq-logo.svg'));
const svgData = `data:image/svg+xml;base64,${pngLogoSvg.toString('base64')}`;
sourceHtml = sourceHtml.replace('</head>', `<style>${localFontCss}\n${originalCss}</style></head>`);
sourceHtml = sourceHtml.replace('src="assets/soniq-logo.svg"', `src="${svgData}"`);
sourceHtml = sourceHtml.replace('src="assets/headphone.png"', `src="data:image/png;base64,${(await readFile(join(sourceDir, 'assets/headphone.png'))).toString('base64')}"`);
sourceHtml = sourceHtml.replace('<script src="script.js"></script>', `<script>${await readFile(join(sourceDir, 'script.js'), 'utf8')}</script>`);
await writeFile(join(out, 'T09-supplied-source-no-ghostq.html'), sourceHtml);

const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined });
try {
  for (const item of cases) {
    const data = item.config as {
      brand: { name: string; primary: string; secondary: string; accent: string; logoAssetId?: string };
      copy: { headline: string; cta: string };
      assets: Array<{ assetId: string }>;
      t09: { descriptionFactId: string; featureFactIds: string[]; imageAlt: string; imageMode: 'contain' | 'cover' };
    };
    const formatFacts = new Map(item.facts.map((fact) => [fact.id, fact.text]));
    const photo = item.assets.find((asset) => asset.assetId === data.assets[0]!.assetId)!;
    const logo = data.brand.logoAssetId ? item.assets.find((asset) => asset.assetId === data.brand.logoAssetId) : undefined;
    const imageMeta = await sharp(photo.bytes).metadata();
    const imageMime = imageMeta.format === 'png' ? 'image/png' : 'image/jpeg';
    const inputData = {
      brand: data.brand.name,
      headline: data.copy.headline,
      description: formatFacts.get(data.t09.descriptionFactId),
      cta: data.copy.cta,
      imageUrl: `data:${imageMime};base64,${photo.bytes.toString('base64')}`,
      imageAlt: data.t09.imageAlt,
      imageMode: data.t09.imageMode,
      logoUrl: logo ? `data:image/png;base64,${logo.bytes.toString('base64')}` : null,
      features: data.t09.featureFactIds.map((id) => formatFacts.get(id)),
      colors: { bg: data.brand.primary, surface: data.brand.secondary, accent: data.brand.accent, text: '#ffffff', muted: '#a6acb8', onAccent: data.brand.primary },
    };
    for (const [format, dimensions] of [['square', [1080, 1080]], ['portrait', [1080, 1350]], ['story', [1080, 1920]]] as const) {
      const page = await browser.newPage();
      await page.setJavaScriptEnabled(true);
      await page.setRequestInterception(true);
      page.on('request', (request) => void (request.url().startsWith('data:') ? request.continue() : request.abort()));
      await page.setViewport({ width: dimensions[0], height: dimensions[1], deviceScaleFactor: 1 });
      await page.setContent(sourceHtml, { waitUntil: 'load' });
      await page.evaluate(async (data) => {
        await (window as unknown as { setCreative: (input: Record<string, unknown>) => Promise<unknown> }).setCreative(data);
        await document.fonts.ready;
      }, { ...inputData, format });
      await page.screenshot({ path: join(out, `T09-source-${item.name}-${format}.png`), type: 'png' });
      await page.close();
    }
  }
} finally { await browser.close(); }

const store = join(out, `store-${randomUUID()}`);
const harness = await createHarness({ templates: [templateModule], assets: cases.flatMap((item) => item.assets), outputRoot: store, fontRegistry, fontResolve: (specifier) => resolve('node_modules', specifier) });
const results = [];
try {
  for (const [index, item] of cases.entries()) {
    for (const format of ['square', 'portrait', 'vertical'] as const) {
      const dimensions: [number, number] = format === 'square' ? [1080, 1080] : format === 'portrait' ? [1080, 1350] : [1080, 1920];
      const creativeId = index === 0 ? 'a9111111-1111-4111-8111-111111111111' : 'a9222222-2222-4222-8222-222222222222';
      const result = await renderOutput({
        taskId: randomUUID(), jobId: randomUUID(), attempt: 1, format, encodings: ['png', 'jpg'],
        snapshot: { schemaVersion: 1, campaignId: item.campaignId, creativeId, revision: 1, templateId: templateModule.id, templateVersion: templateModule.version, language: 'nl', config: item.config, facts: item.facts },
      }, harness.engine);
      results.push({ name: item.name, format, result });
      await writeFile(join(out, `engine-${item.name}-${format}.json`), JSON.stringify(result, null, 2));
      assert.equal(result.status, 'success', `${item.name} ${format}: ${JSON.stringify(result.diagnostics)}`);
      for (const artifact of result.artifacts) {
        const stored = join(store, ...artifact.storageKey.split('/'));
        const meta = await sharp(stored).metadata();
        assert.equal(meta.width, dimensions[0]); assert.equal(meta.height, dimensions[1]);
        await sharp(stored).raw().toBuffer();
        await copyFile(stored, join(out, `T09-engine-${item.name}-${format}.${artifact.encoding}`));
      }
      if (index === 0) {
        const source = join(out, `T09-source-${item.name}-${format === 'vertical' ? 'story' : format}.png`);
        const engine = join(out, `T09-engine-${item.name}-${format}.png`);
        await sharp({ create: { width: dimensions[0] * 2 + 16, height: dimensions[1], channels: 3, background: '#fff' } })
          .composite([{ input: source, left: 0, top: 0 }, { input: engine, left: dimensions[0] + 16, top: 0 }])
          .png().toFile(join(out, `T09-source-vs-engine-${format}.png`));
      }
    }
  }
} finally { await harness.close(); }
await writeFile(join(out, 'engine-report.json'), JSON.stringify({ fixtureOnly: true, claimsVerifiedForCampaign: false, giantGhostQuestionMarkRemoved: true, contract: contract.counts, results: results.map(({ name, format, result }) => ({ name, format, status: result.status, diagnostics: result.diagnostics })) }, null, 2));
console.log(JSON.stringify({ out, contract: contract.counts, results: results.map(({ name, format, result }) => ({ name, format, status: result.status, violations: result.diagnostics.violations, fittingSteps: result.diagnostics.fittingSteps })) }, null, 2));
