import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import puppeteer from 'puppeteer';
import sharp from 'sharp';
import { renderAnnotatedHeroHtml } from '../src/annotated-hero.js';
import type { AnnotatedHeroConfig, CreativeFormat } from '../src/schema.js';

// Synthetic-only template smoke test. Production browser lifecycle/job ownership belongs to engine.
const css = await readFile(new URL('../dist/template.css', import.meta.url), 'utf8');
const image = await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="700" height="900"><path d="M220 70L90 170 20 360 160 420 210 320 180 840 520 840 490 320 540 420 680 360 610 170 480 70 390 120 310 120Z" fill="#375a46"/><path d="M310 120Q350 220 390 120" fill="none" stroke="#dce7dc" stroke-width="18"/></svg>')).png().toBuffer();
const bottleImage = await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="700" height="900"><rect x="270" y="60" width="160" height="100" rx="20" fill="#283640"/><rect x="190" y="140" width="320" height="680" rx="92" fill="#dc8452"/><rect x="220" y="330" width="260" height="190" rx="20" fill="#faeddf"/><circle cx="350" cy="425" r="50" fill="#283640"/></svg>')).png().toBuffer();
const shirt: AnnotatedHeroConfig = {
  schemaVersion: 1, templateId: 'annotated-hero', creativeId: 'simulated-shirt',
  language: 'en',
  brand: { name: 'Atelier Sample', primary: '#304b3a', background: '#f2ece1', text: '#203228', fontHeading: 'serif', fontBody: 'sans' },
  product: { name: 'Simulated green shirt' },
  copy: { headline: 'A calm layer for everyday movement', benefits: [
    { text: 'Cotton fabric', factIds: ['00000000-0000-4000-8000-000000000001'] },
    { text: 'Classic crew neck', factIds: ['00000000-0000-4000-8000-000000000002'] },
  ], cta: 'Explore the shirt' },
  image: { mime: 'image/png', bytes: image },
  callouts: [{ benefitIndex: 0, anchor: { x: 0.58, y: 0.36 } }],
};
const bottle: AnnotatedHeroConfig = {
  ...shirt,
  creativeId: 'simulated-bottle',
  language: 'nl',
  brand: { name: 'Terra Sample', primary: '#a85832', background: '#f5eade', text: '#292b2d', fontHeading: 'sans', fontBody: 'sans' },
  product: { name: 'Simulated reusable bottle' },
  copy: { headline: 'Een fles voor dagelijks gebruik', benefits: [{ text: 'Herbruikbare fles', factIds: ['00000000-0000-4000-8000-000000000003'] }], cta: 'Bekijk de fles' },
  image: { mime: 'image/png', bytes: bottleImage },
  callouts: undefined,
};
const fixtures = [shirt, bottle];
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined, timeout: 30_000, protocolTimeout: 30_000 });
const output = resolve('artifacts/template-part01');
await mkdir(output, { recursive: true });
const results: Array<{ format: string; png: string; jpg: string }> = [];
const started = performance.now();
try {
  for (const fixture of fixtures) for (const format of ['square', 'portrait', 'vertical'] as CreativeFormat[]) {
    const page = await browser.newPage();
    try {
      const html = renderAnnotatedHeroHtml(fixture, format, css);
      await page.setJavaScriptEnabled(false);
      await page.setRequestInterception(true);
      page.on('request', (request) => void (request.url().startsWith('data:') ? request.continue() : request.abort()));
      const width = 1080;
      const height = format === 'square' ? 1080 : format === 'portrait' ? 1350 : 1920;
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await page.setContent(html, { waitUntil: 'load', timeout: 15_000 });
      await page.waitForFunction(() => document.fonts.status === 'loaded' && [...document.images].every((image) => image.complete && image.naturalWidth > 0), { timeout: 15_000 });
      const diagnostics = await page.evaluate((expectedFont) => {
        const root = document.querySelector<HTMLElement>('.lf-canvas')!;
        const issues: string[] = [];
        const headline = document.querySelector<HTMLElement>('[data-slot="headline"]')!;
        const computedFont = getComputedStyle(headline).fontFamily;
        if (!computedFont.toLowerCase().includes(expectedFont)) issues.push(`requested heading font was not applied: ${computedFont}`);
        if (root.scrollWidth !== root.clientWidth || root.scrollHeight !== root.clientHeight) issues.push('canvas overflow');
        for (const el of document.querySelectorAll<HTMLElement>('[data-safe="true"]')) {
          const rect = el.getBoundingClientRect();
          if (rect.left < 69 || rect.right > innerWidth - 69) issues.push(`${el.dataset.slot}: horizontal safe-area overflow`);
          if (rect.top < 1 || rect.bottom > innerHeight - 1) issues.push(`${el.dataset.slot}: vertical canvas overflow`);
        }
        for (const slot of ['headline', 'benefit-1', 'benefit-2', 'cta', 'brand-footer']) {
          const el = document.querySelector<HTMLElement>(`[data-slot="${slot}"]`);
          if (el && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)) issues.push(`${slot}: text overflow`);
        }
        return issues;
      }, fixture.brand.fontHeading === 'serif' ? 'georgia' : 'arial');
      assert.deepEqual(diagnostics, [], `${format}: ${diagnostics.join('; ')}`);
      const png = Buffer.from(await page.screenshot({ type: 'png' }));
      const jpg = await sharp(png).jpeg({ quality: 92 }).toBuffer();
      const expectedHeight = format === 'square' ? 1080 : format === 'portrait' ? 1350 : 1920;
      for (const buffer of [png, jpg]) {
        const meta = await sharp(buffer).metadata();
        assert.equal(meta.width, 1080);
        assert.equal(meta.height, expectedHeight);
      }
      const pngPath = join(output, `${fixture.creativeId}-${format}.png`);
      const jpgPath = join(output, `${fixture.creativeId}-${format}.jpg`);
      await sharp(png).toFile(pngPath);
      await sharp(jpg).toFile(jpgPath);
      results.push({ format, png: pngPath, jpg: jpgPath });
    } finally { await page.close(); }
  }
} finally { await browser.close(); }
assert.equal(results.length, 6);
console.log(JSON.stringify({ kind: 'template smoke test; two synthetic assets; not application E2E', placementCount: results.length, encodingCount: results.length * 2, durationMs: Math.round(performance.now() - started), results }, null, 2));
