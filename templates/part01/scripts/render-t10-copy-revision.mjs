// Standalone design preview only, not an engine-contract or JMD gate.
// Lifecycle follows the audited IG Content Builder renderer: one browser, isolated pages,
// await fonts/images, screenshot; add network isolation, bounds checks and finally cleanup.
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import puppeteer from 'puppeteer';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const source = join(root, 'Template-example/T10_Atmospheric_Editorial');
const out = join(root, 'templates/part01/artifacts/t10-copy-revision');
await mkdir(out, { recursive: true });
const config = JSON.parse(await readFile(join(source, 'creative.example.json'), 'utf8'));
const image = `data:image/png;base64,${(await readFile(join(source, 'assets/demo-spa-photo.png'))).toString('base64')}`;
const css = await readFile(join(source, 'styles.css'), 'utf8');
const js = (await readFile(join(source, 'script.js'), 'utf8')).replace("imageUrl:'assets/demo-spa-photo.png'", `imageUrl:${JSON.stringify(image)}`);
const document = (await readFile(join(source, 'index.html'), 'utf8'))
  .replace('<link rel="stylesheet" href="styles.css" />', `<style>${css}</style>`)
  .replace('<script src="script.js" defer></script>', '')
  .replace('src="assets/demo-spa-photo.png"', `src="${image}"`);
const browser = await puppeteer.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const results = [];
try {
  for (const [format, height] of [['square', 1080], ['portrait', 1350], ['story', 1920]]) {
    const page = await browser.newPage();
    try {
      await page.setViewport({ width: 1080, height, deviceScaleFactor: 1 });
      await page.setRequestInterception(true);
      page.on('request', request => /^(data:|about:)/.test(request.url()) ? request.continue() : request.abort());
      await page.setContent(document, { waitUntil: 'load' });
      await page.addScriptTag({ content: js });
      await page.evaluate(() => window.__creativeReady);
      const cfg = { ...config, imageUrl: image, format };
      await page.evaluate(data => window.setCreative(data), cfg);
      const bounds = await page.evaluate(() => {
        const ids = ['headline', 'description', 'cta', 'features'];
        return ids.map(id => {
          const el = document.getElementById(id), r = el.getBoundingClientRect();
          // Serif glyphs can extend below a tight editorial line box; this is not clipping
          // unless overflow is hidden. Check horizontal overflow and actual text-range bounds.
          const range = document.createRange(); range.selectNodeContents(el);
          const text = range.getBoundingClientRect();
          return { id, x: r.x, y: r.y, right: Math.max(r.right, text.right), bottom: Math.max(r.bottom, text.bottom), overflow: el.scrollWidth > el.clientWidth + 1 };
        });
      });
      for (const box of bounds) {
        assert.ok(!box.overflow && box.x >= 0 && box.y >= 0 && box.right <= 1081 && box.bottom <= height, `${format}: ${JSON.stringify(box)}`);
      }
      assert.ok(bounds[1].y >= bounds[0].bottom && bounds[2].y >= bounds[1].bottom && bounds[3].y >= bounds[2].bottom, `${format}: copy blocks overlap`);
      for (const encoding of ['png', 'jpeg']) {
        const path = join(out, `T10-${format}.${encoding === 'jpeg' ? 'jpg' : 'png'}`);
        await page.screenshot({ path, type: encoding });
        const meta = await sharp(path).metadata();
        assert.equal(meta.width, 1080); assert.equal(meta.height, height);
        await sharp(path).raw().toBuffer();
      }
      await writeFile(join(out, `T10-${format}.html`), await page.content());
      // Optional hiding, HTML escaping, missing/unverified facts and remote-image rejection.
      await page.evaluate(data => window.setCreative({ ...data, descriptionFactId: null, cta: '' }), cfg);
      assert.ok(await page.evaluate(() => document.getElementById('description').hidden && document.getElementById('cta').hidden && document.getElementById('creative').dataset.copy === 'false'));
      await page.evaluate(data => window.setCreative({ ...data, cta: '<img onerror=alert(1)>' }), cfg);
      assert.ok(await page.evaluate(() => !document.getElementById('cta').querySelector('img')));
      await assert.rejects(page.evaluate(data => window.setCreative({ ...data, facts: [] }), cfg), /verified fact/);
      await assert.rejects(page.evaluate(data => window.setCreative({ ...data, facts: data.facts.map(f => ({ ...f, verified: false })) }), cfg), /verified fact/);
      await assert.rejects(page.evaluate(data => window.setCreative({ ...data, imageUrl: 'https://example.com/photo.png' }), cfg), /package-local/);
      results.push({ format, status: 'success', dimensions: `1080x${height}`, bounds, bindingTests: 'passed' });
    } catch (error) {
      results.push({ format, status: 'failed', error: String(error) });
    } finally { await page.close(); }
    await writeFile(join(out, 'report.json'), JSON.stringify({ scope: 'Standalone preview; not engine gate. Source crop is fixture-only; verified flag is test data.', results }, null, 2));
  }
} finally { await browser.close(); }
assert.ok(results.every(r => r.status === 'success'), JSON.stringify(results));
const tiles = await Promise.all(['square', 'portrait', 'story'].map(async (f, i) => ({ input: await sharp(join(out, `T10-${f}.png`)).resize(360, 640, { fit: 'contain', background: '#ffffff' }).png().toBuffer(), left: i * 372, top: 0 })));
await sharp({ create: { width: 1104, height: 640, channels: 3, background: '#ffffff' } }).composite(tiles).png().toFile(join(out, 'T10-all-formats.png'));
console.log(JSON.stringify({ out, results }, null, 2));
