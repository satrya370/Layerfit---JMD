import { readFile, mkdir } from 'node:fs/promises';
import { dirname, resolve, relative, extname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const root = dirname(fileURLToPath(import.meta.url));
const sizes = { square: [1080, 1080], portrait: [1080, 1350], story: [1080, 1920] };
const config = JSON.parse(await readFile(resolve(root,'creative.example.json'), 'utf8'));
const [htmlSource, css, jsSource] = await Promise.all(
  ['index.html','styles.css','script.js'].map(name => readFile(resolve(root,name),'utf8'))
);
async function assetDataUrl(asset) {
  if (asset.startsWith('data:image/')) return asset;
  const full = resolve(root,asset);
  const rel = relative(root,full);
  if (rel.startsWith('..') || isAbsolute(rel)) throw Error('Asset path outside project');
  const mime = { '.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp' }[extname(full).toLowerCase()];
  if (!mime) throw Error('Unsupported image');
  return `data:${mime};base64,${(await readFile(full)).toString('base64')}`;
}
const hero = await assetDataUrl(config.heroImageUrl);
const html = htmlSource
  .replace('<link rel="stylesheet" href="styles.css">', `<style>${css}</style>`)
  .replace('<script src="script.js" defer></script>', '')
  .replace('src="assets/reference-hero.jpg"', `src="${hero}"`)
  .replace('</body>', `<script>${jsSource.replace("heroImageUrl: 'assets/reference-hero.jpg'",`heroImageUrl: ${JSON.stringify(hero)}`)}</script></body>`);
await mkdir(resolve(root,'previews'),{recursive:true});
const browser = await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']});
try {
  for (const [format,[width,height]] of Object.entries(sizes)) {
    const page = await browser.newPage();
    try {
      await page.setViewport({width,height,deviceScaleFactor:1});
      await page.setContent(html,{waitUntil:'load'});
      const output = await page.evaluate(async data => await window.setCreative(data), {...config,format,heroImageUrl:hero});
      if (!output.ok) throw Error(`Image did not load for ${format}`);
      await page.screenshot({path:resolve(root,'previews',`t12-${format}.png`),type:'png'});
      console.log(`Created ${format} ${width}x${height}`);
    } finally {await page.close();}
  }
} finally {await browser.close();}
