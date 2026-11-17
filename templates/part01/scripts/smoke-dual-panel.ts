import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import puppeteer from 'puppeteer';
import sharp from 'sharp';
import { formats, type CreativeFormat } from '../src/schema.js';
import { dualPanelSchema, renderDualPanelBody, type DualPanelConfig, type ResolvedDualPanelAsset } from '../src/dual-panel.js';

// Two synthetic product briefs; no competitor/reference imagery and no claim of application E2E.
const css = await readFile(new URL('../dist/template.css', import.meta.url), 'utf8');
const frontBytes = await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="700" height="900"><rect width="700" height="900" fill="#d7dfd4"/><path d="M230 70L100 170 25 360 155 420 210 320 175 840 525 840 490 320 545 420 675 360 600 170 470 70 390 120 310 120Z" fill="#365846"/><path d="M310 120Q350 220 390 120" fill="none" stroke="#f0eee3" stroke-width="20"/></svg>')).png().toBuffer();
const detailBytes = await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="700" height="900"><rect width="700" height="900" fill="#eee8dc"/><path d="M0 620Q180 480 350 620T700 620V900H0Z" fill="#355541"/><path d="M80 100H620M80 150H620M80 200H620M80 250H620M80 300H620" stroke="#c5d4c5" stroke-width="24" opacity=".55"/></svg>')).png().toBuffer();
const bottleBytes = await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="700" height="900"><rect width="700" height="900" fill="#f3e9db"/><rect x="270" y="90" width="160" height="110" rx="20" fill="#263842"/><rect x="185" y="165" width="330" height="650" rx="90" fill="#d9824d"/><rect x="220" y="330" width="260" height="180" rx="18" fill="#fff0df"/></svg>')).png().toBuffer();

const shirtId = '00000000-0000-4000-8000-000000000011';
const detailId = '00000000-0000-4000-8000-000000000012';
const bottleFactId = '00000000-0000-4000-8000-000000000013';
const shirt: DualPanelConfig = {
  schemaVersion: 1, templateId: 'dual-panel', creativeId: 'synthetic-shirt-panels', language: 'nl', mode: 'dual-benefit',
  brand: { name: 'Atelier Sample', primary: '#304b3a', secondary: '#f2ece1', accent: '#d3ad70', fontHeadingId: 'fraunces', fontBodyId: 'inter' },
  product: { name: 'Synthetic shirt' }, headline: 'Twee details van één ontwerp',
  panels: [
    { label: 'Everyday view', assetId: 'shirt-front', facts: [{ text: 'Cotton fabric', factIds: [shirtId] }, { text: 'Classic crew neck', factIds: [detailId] }] },
    { label: 'Fabric detail', assetId: 'shirt-detail', facts: [{ text: 'Crew neckline', factIds: [detailId] }] },
  ],
  assets: [
    { assetId: 'shirt-front', role: 'lifestyle', allowCrop: true },
    { assetId: 'shirt-detail', role: 'detail', allowCrop: true },
  ],
  cta: 'Bekijk het shirt',
};
const bottle: DualPanelConfig = {
  schemaVersion: 1, templateId: 'dual-panel', creativeId: 'synthetic-bottle-fallback', language: 'nl', mode: 'dual-benefit',
  brand: { name: 'Terra Sample', primary: '#a85832', secondary: '#f5eade', accent: '#e2a967', fontHeadingId: 'inter', fontBodyId: 'inter' },
  product: { name: 'Synthetic reusable bottle' }, headline: 'Een fles voor dagelijks gebruik',
  panels: [
    { label: 'De fles', assetId: 'bottle-photo', facts: [{ text: 'Reusable bottle', factIds: [bottleFactId] }] },
    { label: 'Product details', facts: [{ text: 'Screw cap', factIds: [detailId] }] },
  ],
  assets: [{ assetId: 'bottle-photo', role: 'product', allowCrop: false }],
  cta: 'Bekijk de fles',
};

const fixtures = [
  { config: shirt, bytes: new Map([['shirt-front', frontBytes], ['shirt-detail', detailBytes]]) },
  { config: bottle, bytes: new Map([['bottle-photo', bottleBytes]]) },
];
const output = resolve('artifacts/template-part01');
await mkdir(output, { recursive: true });
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined, timeout: 30_000, protocolTimeout: 30_000 });
const results: Array<{ creativeId: string; format: string; png: string; jpg: string }> = [];
const started = performance.now();
try {
  for (const fixture of fixtures) for (const format of ['square', 'portrait', 'vertical'] as CreativeFormat[]) {
    const { width, height, safeTop, safeBottom } = formats[format];
    const assets: ResolvedDualPanelAsset[] = fixture.config.assets.map((asset) => {
      const bytes = fixture.bytes.get(asset.assetId);
      assert.ok(bytes, `missing synthetic asset ${asset.assetId}`);
      return { ...asset, mime: 'image/png', width: 700, height: 900, src: `data:image/png;base64,${bytes.toString('base64')}` };
    });
    const body = renderDualPanelBody(fixture.config, assets);
    const resolvedAssetById = new Map(assets.map((asset) => [asset.assetId, asset]));
    assert.equal((body.match(/<img\b/g) ?? []).length, fixture.config.assets.length);
    for (const panel of fixture.config.panels) if (panel.assetId) assert.ok(resolvedAssetById.has(panel.assetId));

    // This harness owns a trusted shell solely for prototype testing; production shell belongs to engine.
    const headingFont = fixture.config.brand.fontHeadingId === 'fraunces' ? 'Georgia, serif' : 'Arial, sans-serif';
    const html = `<!doctype html><html lang="${fixture.config.language}"><head><meta charset="utf-8"><style>${css}</style></head><body><main class="lf-dual-panel" data-format="${format}" data-template="dual-panel" data-canvas-width="${width}" data-canvas-height="${height}" style="width:${width}px;height:${height}px;position:relative;overflow:hidden;--lf-brand-primary:${fixture.config.brand.primary};--lf-brand-secondary:${fixture.config.brand.secondary};--lf-brand-accent:${fixture.config.brand.accent};--lf-font-heading:${headingFont};--lf-font-body:Arial,sans-serif;--lf-safe-top:${safeTop}px;--lf-safe-right:70px;--lf-safe-bottom:${safeBottom}px;--lf-safe-left:70px">${body}</main></body></html>`;
    const page = await browser.newPage();
    try {
      await page.setJavaScriptEnabled(false);
      await page.setRequestInterception(true);
      page.on('request', (request) => void (request.url().startsWith('data:') ? request.continue() : request.abort()));
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await page.setContent(html, { waitUntil: 'load', timeout: 15_000 });
      await page.waitForFunction(() => document.fonts.status === 'loaded' && [...document.images].every((image) => image.complete && image.naturalWidth > 0), { timeout: 15_000 });
      const issues = await page.evaluate(() => {
        const root = document.querySelector<HTMLElement>('.lf-dual-panel')!;
        const errors: string[] = [];
        if (root.scrollWidth !== root.clientWidth || root.scrollHeight !== root.clientHeight) errors.push('canvas overflow');
        for (const node of document.querySelectorAll<HTMLElement>('[data-safe="true"]')) {
          const rect = node.getBoundingClientRect();
          if (rect.left < 69 || rect.right > innerWidth - 69) errors.push(`${node.dataset.slot}: horizontal safe-area violation`);
          if (rect.top < 1 || rect.bottom > innerHeight - 1) errors.push(`${node.dataset.slot}: vertical canvas overflow`);
          if (node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1) errors.push(`${node.dataset.slot}: content overflow ${node.scrollWidth}x${node.scrollHeight}/${node.clientWidth}x${node.clientHeight}`);
        }
        for (const node of document.querySelectorAll<HTMLImageElement>('[data-image-fit]')) {
          if (getComputedStyle(node).objectFit !== node.dataset.imageFit) errors.push(`${node.dataset.slot}: object-fit mismatch`);
        }
        return errors;
      });
      assert.deepEqual(issues, [], `${fixture.config.creativeId}/${format}: ${issues.join('; ')}`);
      const png = Buffer.from(await page.screenshot({ type: 'png' }));
      const jpg = await sharp(png).jpeg({ quality: 92 }).toBuffer();
      for (const [encoding, bytes] of [['png', png], ['jpg', jpg]] as const) {
        const meta = await sharp(bytes).metadata();
        assert.equal(meta.width, width);
        assert.equal(meta.height, height);
        const path = join(output, `dual-panel-${fixture.config.creativeId}-${format}.${encoding}`);
        await sharp(bytes).toFile(path);
        if (encoding === 'png') results.push({ creativeId: fixture.config.creativeId, format, png: path, jpg: '' });
        else results.at(-1)!.jpg = path;
      }
    } finally { await page.close(); }
  }
} finally { await browser.close(); }
assert.equal(results.length, 6);
assert.equal(dualPanelSchema.safeParse({ ...bottle, mode: 'verified-comparison' }).success, false, 'comparison without evidence must be rejected');
console.log(JSON.stringify({ kind: 'T02 template smoke; two synthetic briefs; no application/engine integration', placementCount: results.length, imageFileCount: results.length * 2, durationMs: Math.round(performance.now() - started), results }, null, 2));
