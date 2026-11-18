/* Puppeteer adapter for the LayerFit IG-Content-Builder workflow.
   Run: npm install && npm run render
   Rendered output: 1080×1080, 1080×1350, 1080×1920. */
import puppeteer from 'puppeteer';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root = dirname(fileURLToPath(import.meta.url));
const [rawHTML, css, js, image] = await Promise.all([
  'index.html','styles.css','script.js','assets/boot-scene.png'
].map(p => readFile(resolve(root, p))));
const uri = `data:image/png;base64,${image.toString('base64')}`;
const inlinedJS = js.toString().replace("imageUrl:'assets/boot-scene.png'",`imageUrl:${JSON.stringify(uri)}`);
const documentHTML = rawHTML.toString()
  .replace('<link rel="stylesheet" href="styles.css" />', `<style>${css.toString()}</style>`)
  .replace('<script src="script.js" defer></script>', '')
  .replace('src="assets/boot-scene.png"', `src="${uri}"`)
  .replace('</body>', `<script>${inlinedJS}</script></body>`);
const formats = { square: [540,540], portrait:[540,675], story:[540,960] };
const browser = await puppeteer.launch({headless:true});
try {
  await mkdir(resolve(root, 'previews'), { recursive:true });
  for (const [format,[width,height]] of Object.entries(formats)) {
    const page = await browser.newPage();
    try {
      await page.setViewport({width,height,deviceScaleFactor:2});
      await page.setContent(documentHTML, {waitUntil:'load'});
      const result = await page.evaluate(async format => window.setCreative({format}), format);
      if (!result.imageLoaded) throw new Error('Product image did not load');
      await page.screenshot({ path: resolve(root,'previews',`t14-${format}.png`), type:'png' });
      console.log(`Rendered ${format}: ${width*2}x${height*2}`);
    } finally { await page.close(); }
  }
} finally { await browser.close(); }
