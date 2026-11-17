import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import puppeteer from 'puppeteer';
import sharp from 'sharp';
import { formats, type CreativeFormat } from '../src/schema.js';
import { renderDarkOfferStackBody, type DarkOfferStackConfig, type ResolvedOfferAsset, type VerifiedFact } from '../src/dark-offer-stack.js';

// Synthetic-only art and explicit test-fixture fact labels. These are not publishable ad claims.
const css = await readFile(new URL('../dist/template.css', import.meta.url), 'utf8');
const shirtFront = await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="700" height="900"><rect width="700" height="900" fill="#37434a"/><path d="M220 70L90 170 20 360 160 420 210 320 180 840 520 840 490 320 540 420 680 360 610 170 480 70 390 120 310 120Z" fill="#365846"/><path d="M310 120Q350 220 390 120" fill="none" stroke="#e8dfcc" stroke-width="20"/></svg>')).png().toBuffer();
const shirtDetail = await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="700" height="900"><rect width="700" height="900" fill="#d4d0c4"/><path d="M0 570Q180 430 350 570T700 570V900H0Z" fill="#365846"/><path d="M90 140H610M90 205H610M90 270H610M90 335H610" stroke="#a8b9a8" stroke-width="26" opacity=".65"/></svg>')).png().toBuffer();
const bottleImage = await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="700" height="900"><rect width="700" height="900" fill="#283238"/><rect x="270" y="80" width="160" height="105" rx="20" fill="#d9d9d2"/><rect x="185" y="160" width="330" height="650" rx="90" fill="#d9824d"/><rect x="220" y="330" width="260" height="180" rx="18" fill="#fff0df"/></svg>')).png().toBuffer();

const shirtBenefit = '00000000-0000-4000-8000-000000000031';
const shirtDetailFact = '00000000-0000-4000-8000-000000000032';
const bottleBenefit = '00000000-0000-4000-8000-000000000033';
const offerFactId = '00000000-0000-4000-8000-000000000034';
const proofFactId = '00000000-0000-4000-8000-000000000035';

const shirtConfig: DarkOfferStackConfig = {
  schemaVersion: 1, templateId: 'dark-offer-stack', creativeId: 'synthetic-shirt-stack', language: 'nl',
  brand: { name: 'Atelier Sample', primary: '#365846', secondary: '#202326', accent: '#d1aa6a', fontHeadingId: 'fraunces', fontBodyId: 'inter' },
  product: { name: 'Synthetic shirt' }, headline: 'Twee details van één ontwerp',
  benefits: [{ text: 'Cotton fabric', factIds: [shirtBenefit] }, { text: 'Crew neckline', factIds: [shirtDetailFact] }],
  assets: [
    { assetId: 'shirt-front', role: 'product', allowCrop: false },
    { assetId: 'shirt-detail', role: 'detail', allowCrop: true },
  ],
  cta: 'Bekijk het shirt',
};
const bottleConfig: DarkOfferStackConfig = {
  schemaVersion: 1, templateId: 'dark-offer-stack', creativeId: 'synthetic-bottle-stack', language: 'nl',
  brand: { name: 'Terra Sample', primary: '#a85832', secondary: '#202326', accent: '#e3aa6c', fontHeadingId: 'inter', fontBodyId: 'inter' },
  product: { name: 'Synthetic reusable bottle' }, headline: 'Een fles voor dagelijks gebruik',
  benefits: [{ text: 'Reusable bottle', factIds: [bottleBenefit] }],
  assets: [{ assetId: 'bottle-front', role: 'product', allowCrop: false }],
  offerFactId, proofFactId, cta: 'Bekijk de fles',
};
const fixtureFacts = new Map<string, ReadonlyMap<string, VerifiedFact>>([
  [shirtConfig.creativeId, new Map([
    [shirtBenefit, { id: shirtBenefit, text: 'Synthetic test fact: cotton fabric' }],
    [shirtDetailFact, { id: shirtDetailFact, text: 'Synthetic test fact: crew neckline' }],
  ])],
  [bottleConfig.creativeId, new Map([
    [bottleBenefit, { id: bottleBenefit, text: 'Synthetic test fact: reusable bottle' }],
    [offerFactId, { id: offerFactId, text: 'TEST FIXTURE ONLY — offer fact slot' }],
    [proofFactId, { id: proofFactId, text: 'TEST FIXTURE ONLY — proof fact slot' }],
  ])],
]);
const fixtureBytes = new Map<string, Buffer>([
  ['shirt-front', shirtFront], ['shirt-detail', shirtDetail], ['bottle-front', bottleImage],
]);
const configs = [shirtConfig, bottleConfig];
const outDir = resolve('artifacts/template-part01');
await mkdir(outDir, { recursive: true });
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined, timeout: 30_000, protocolTimeout: 30_000 });
const results: Array<{ creativeId: string; format: string; png: string; jpg: string }> = [];
const started = performance.now();
try {
  for (const config of configs) for (const format of ['square', 'portrait', 'vertical'] as CreativeFormat[]) {
    const profile = formats[format];
    const assets: ResolvedOfferAsset[] = config.assets.map((declaration) => {
      const bytes = fixtureBytes.get(declaration.assetId);
      assert.ok(bytes, `missing fixture bytes for ${declaration.assetId}`);
      return { ...declaration, mime: 'image/png', width: 700, height: 900, src: `data:image/png;base64,${bytes.toString('base64')}` };
    });
    const facts = fixtureFacts.get(config.creativeId)!;
    const body = renderDarkOfferStackBody(config, assets, facts);
    assert.equal((body.match(/<img\b/g) ?? []).length, config.assets.length);
    assert.doesNotMatch(body, /Trustpilot|Klarna|EXTRA5|BLACK FRIDAY|5%\s*EXTRA/i);
    if (!config.offerFactId) assert.doesNotMatch(body, /data-slot="verified-offer"/);
    else assert.match(body, /TEST FIXTURE ONLY — offer fact slot/);
    if (!config.proofFactId) assert.doesNotMatch(body, /data-slot="verified-proof"/);
    else assert.match(body, /TEST FIXTURE ONLY — proof fact slot/);

    // Test-only shell supplies engine-owned tokens; this is not the production render path.
    const headingFont = config.brand.fontHeadingId === 'fraunces' ? 'Georgia, serif' : 'Arial, sans-serif';
    const html = `<!doctype html><html lang="${config.language}"><head><meta charset="utf-8"><style>${css}</style></head><body><main class="lf-dark-offer" data-format="${format}" data-template="dark-offer-stack" data-canvas-width="${profile.width}" data-canvas-height="${profile.height}" style="width:${profile.width}px;height:${profile.height}px;position:relative;overflow:hidden;--lf-brand-primary:${config.brand.primary};--lf-brand-secondary:${config.brand.secondary};--lf-brand-accent:${config.brand.accent};--lf-font-heading:${headingFont};--lf-font-body:Arial,sans-serif;--lf-safe-top:${profile.safeTop}px;--lf-safe-right:70px;--lf-safe-bottom:${profile.safeBottom}px;--lf-safe-left:70px">${body}</main></body></html>`;
    const page = await browser.newPage();
    try {
      await page.setJavaScriptEnabled(false);
      await page.setRequestInterception(true);
      page.on('request', (request) => void (request.url().startsWith('data:') ? request.continue() : request.abort()));
      await page.setViewport({ width: profile.width, height: profile.height, deviceScaleFactor: 1 });
      await page.setContent(html, { waitUntil: 'load', timeout: 15_000 });
      await page.waitForFunction(() => document.fonts.status === 'loaded' && [...document.images].every((image) => image.complete && image.naturalWidth > 0), { timeout: 15_000 });
      const issues = await page.evaluate(() => {
        const root = document.querySelector<HTMLElement>('.lf-dark-offer')!;
        const errors: string[] = [];
        if (root.scrollWidth !== root.clientWidth || root.scrollHeight !== root.clientHeight) errors.push('canvas overflow');
        for (const node of document.querySelectorAll<HTMLElement>('[data-safe="true"]')) {
          const rect = node.getBoundingClientRect();
          if (rect.left < 69 || rect.right > innerWidth - 69) errors.push(`${node.dataset.slot}: horizontal safe-area violation`);
          if (rect.top < 1 || rect.bottom > innerHeight - 1) errors.push(`${node.dataset.slot}: canvas overflow`);
          if (node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1) errors.push(`${node.dataset.slot}: text/layout overflow ${node.scrollWidth}x${node.scrollHeight}/${node.clientWidth}x${node.clientHeight}`);
        }
        const footer = document.querySelector<HTMLElement>('[data-slot="footer"]')!;
        const footerBottomInset = innerHeight - footer.getBoundingClientRect().bottom;
        const configuredBottomInset = Number.parseFloat(getComputedStyle(root).getPropertyValue('--lf-safe-bottom'));
        if (Math.abs(footerBottomInset - configuredBottomInset) > 2) errors.push(`footer bottom inset ${footerBottomInset} does not match safe inset ${configuredBottomInset}`);
        for (const image of document.querySelectorAll<HTMLImageElement>('[data-image-fit]')) {
          if (getComputedStyle(image).objectFit !== image.dataset.imageFit) errors.push(`${image.dataset.slot}: object-fit mismatch`);
        }
        return errors;
      });
      assert.deepEqual(issues, [], `${config.creativeId}/${format}: ${issues.join('; ')}`);
      const png = Buffer.from(await page.screenshot({ type: 'png' }));
      const jpg = await sharp(png).jpeg({ quality: 92 }).toBuffer();
      const pngPath = join(outDir, `dark-offer-${config.creativeId}-${format}.png`);
      const jpgPath = join(outDir, `dark-offer-${config.creativeId}-${format}.jpg`);
      for (const [buffer, path] of [[png, pngPath], [jpg, jpgPath]] as const) {
        const metadata = await sharp(buffer).metadata();
        assert.equal(metadata.width, profile.width);
        assert.equal(metadata.height, profile.height);
        await sharp(buffer).toFile(path);
      }
      results.push({ creativeId: config.creativeId, format, png: pngPath, jpg: jpgPath });
    } finally { await page.close(); }
  }
} finally { await browser.close(); }
assert.equal(results.length, 6);
console.log(JSON.stringify({ kind: 'T03 template smoke; 2 synthetic briefs; test-only offer/proof labels; not application E2E', placementCount: results.length, imageFileCount: results.length * 2, durationMs: Math.round(performance.now() - started), results }, null, 2));
