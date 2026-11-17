/**
 * T05 standalone Meta Ads export. Uses inline CSS/JS + embedded demo asset
 * so headless Chromium can render even when file:// navigation is restricted.
 * For real campaign data, call window.setCreative() with verified data.
 */
import puppeteer from 'puppeteer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, mkdirSync } from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const chromiumExecutable = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
const formats = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  story: [1080, 1920],
};

const css = readFileSync(path.join(here, 'styles.css'), 'utf8');
const js = readFileSync(path.join(here, 'script.js'), 'utf8');
const imageData = 'data:image/png;base64,' + readFileSync(path.join(here, 'assets', 'demo-product.png')).toString('base64');
let html = readFileSync(path.join(here, 'index.html'), 'utf8');
html = html.replace('<link rel="stylesheet" href="./styles.css" />', `<style>${css}</style>`);
html = html.replace('<script src="./script.js"></script>',
  `<script>window.T05_DEFAULT_IMAGE = ${JSON.stringify(imageData)};</script><script>${js}</script>`);

mkdirSync(path.join(here, 'previews'), { recursive: true });
const browser = await puppeteer.launch({
  executablePath: chromiumExecutable,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  for (const [format, [width, height]] of Object.entries(formats)) {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(async (format) => {
      window.setCreative({ format });
      await document.fonts.ready;
      await document.querySelector('#product-image').decode();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const canvas = document.getElementById('creative');
      const rect = canvas.getBoundingClientRect();
      if (Math.round(rect.width) !== 1080 || Math.round(rect.height) !== ({square:1080,portrait:1350,story:1920}[format])) {
        throw new Error(`Wrong artboard size: ${rect.width} x ${rect.height}`);
      }
      if (canvas.scrollWidth > 1080) throw new Error(`Horizontal content overflow: ${canvas.scrollWidth}px`);
      if (!document.querySelector('#headline').innerText.trim()) throw new Error('Missing headline');
    }, format);
    await page.screenshot({
      path: path.join(here, 'previews', `t05-${format}.png`),
      type: 'png',
    });
    await page.close();
    console.log(`Rendered T05 ${format}: ${width}x${height}`);
  }
} finally {
  await browser.close();
}
