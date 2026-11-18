// Re-renders the saved HTML files on their own (no engine, no fixtures) and compares the screenshots with the saved renders. Scratch output only.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import puppeteer from 'puppeteer';
import sharp from 'sharp';

const MAIN = 'C:/Users/Asus/Layerfit-JMD/templates/part01/artifacts';
const SCRATCH = resolve('artifacts/verify-scratch/saved-html');
const SIZE: Record<string, [number, number]> = { square: [1080, 1080], portrait: [1080, 1350], vertical: [1080, 1920] };

async function rawOf(buf: Buffer) {
  const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

// Same launch as the engine's browser manager (no extra flags), so rasterisation matches the saved renders.
const browser = await puppeteer.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, headless: true });
try {
  // Each job: the saved HTML per format, and the PNG it must reproduce (saved render or this session's engine output).
  const jobs: Array<{ dir: string; prefix: string; htmlName: (f: string) => string; ref: (f: string) => string }> = [
    { dir: 't03-dark-offer-stack', prefix: 'T03-full-two-photos', htmlName: (f) => `T03-full-two-photos_${f}.html`, ref: (f) => join(MAIN, 't03-dark-offer-stack', `T03_full-two-photos_${f}.png`) },
    { dir: 't16-discount-offer', prefix: 'T16-prose-long', htmlName: (f) => `T16-prose-long_${f}.html`, ref: (f) => resolve('artifacts/verify-scratch/t16', `${f}.png`) },
  ];
  await mkdir(SCRATCH, { recursive: true });
  for (const job of jobs) {
    for (const format of Object.keys(SIZE)) {
      const [w, h] = SIZE[format]!;
      const html = await readFile(join(MAIN, job.dir, job.htmlName(format)), 'utf8');
      const page = await browser.newPage();
      await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
      await page.setRequestInterception(true);
      page.on('request', (r) => (r.url().startsWith('data:') || r.url().startsWith('about:') ? r.continue() : r.abort()));
      await page.setContent(html, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const shot = Buffer.from(await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: w, height: h }, captureBeyondViewport: false }));
      await page.close();
      await writeFile(join(SCRATCH, `${job.prefix}_${format}.png`), shot);
      const a = await rawOf(shot);
      const b = await rawOf(await readFile(job.ref(format)));
      let diff = 0; let max = 0;
      if (a.width !== b.width || a.height !== b.height) { console.log(`${format}: size mismatch`); continue; }
      for (let i = 0; i < a.data.length; i++) { const d = Math.abs(a.data[i]! - b.data[i]!); if (d) { diff++; if (d > max) max = d; } }
      console.log(`${job.prefix} saved html ${format}: ${diff} differing channel values, max delta ${max}`);
    }
  }
} finally {
  await browser.close();
}
