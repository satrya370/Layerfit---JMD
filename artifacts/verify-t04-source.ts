// Re-renders the T04 supplied-source HTML on its own and compares it with the saved source PNG and with the left half of T04-source-vs-engine.png. Scratch output only.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer';
import sharp from 'sharp';

const T04 = 'C:/Users/Asus/Layerfit-JMD/templates/part01/artifacts/t04-engine-port';
const SCRATCH = resolve('artifacts/verify-scratch/t04');

async function rawOf(buf: Buffer) {
  const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

async function compare(label: string, a: Buffer, b: Buffer) {
  const x = await rawOf(a);
  const y = await rawOf(b);
  if (x.width !== y.width || x.height !== y.height) return `${label}: SIZE MISMATCH ${x.width}x${x.height} vs ${y.width}x${y.height}`;
  let differing = 0; let max = 0;
  for (let i = 0; i < x.data.length; i++) { const d = Math.abs(x.data[i]! - y.data[i]!); if (d) { differing++; if (d > max) max = d; } }
  return `${label}: ${differing} differing channel values, max delta ${max}`;
}

await mkdir(SCRATCH, { recursive: true });
const html = await readFile(`${T04}/T04-supplied-source.html`, 'utf8');
const browser = await puppeteer.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((image) => image.decode())); });
  const shot = Buffer.from(await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1080 }, captureBeyondViewport: false }));
  await writeFile(resolve(SCRATCH, 'T04-supplied-source.png'), shot);
  console.log(await compare('T04 supplied html vs T04-supplied-source.png', shot, await readFile(`${T04}/T04-supplied-source.png`)));
  const sheet = await readFile(`${T04}/T04-source-vs-engine.png`);
  const left = await sharp(sheet).extract({ left: 0, top: 0, width: 1080, height: 1080 }).png().toBuffer();
  console.log(await compare('T04 supplied html vs left half of T04-source-vs-engine.png', shot, left));
} finally {
  await browser.close();
}
