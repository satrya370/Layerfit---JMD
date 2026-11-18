#!/usr/bin/env node
/* ============================================================
   LAYERFIT T19 — render.mjs
   ------------------------------------------------------------
   Ekspor template HTML ke PNG untuk ketiga ukuran Meta Ads
   menggunakan Puppeteer (puppeteer / puppeteer-core).

   Pemakaian:
     node render.mjs                              # contoh default -> previews/
     node render.mjs --data creative.example.json --out previews
     node render.mjs --data creative.example-alt.json --out /tmp/test
     node render.mjs --formats square,story

   Browser: pakai paket `puppeteer` bila terpasang (Chromium bawaan);
   jika tidak, `puppeteer-core` + deteksi Chrome/Chromium sistem
   (Chrome terpasang Playwright, dsb.). Override via CHROME_PATH=...
   ============================================================ */

import { readFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ---------- argumen CLI ---------- */

function parseArgs(argv) {
  const args = { data: 'creative.example.json', out: 'previews', formats: ['square', 'portrait', 'story'] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--data') args.data = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--formats') args.formats = argv[++i].split(',').map(s => s.trim());
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node render.mjs [--data file.json] [--out dir] [--formats square,portrait,story]');
      process.exit(0);
    }
  }
  return args;
}

/* ---------- ukuran Meta Ads ---------- */

const SIZES = {
  square:   { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
  story:    { width: 1080, height: 1920 }
};

/* ---------- deteksi executable Chrome ---------- */

function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const candidates = [];
  // cache Playwright (Linux)
  const pwDir = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (existsSync(pwDir)) {
    for (const entry of readdirSync(pwDir)) {
      if (!entry.startsWith('chromium')) continue;
      candidates.push(path.join(pwDir, entry, 'chrome-linux64', 'chrome'));
      candidates.push(path.join(pwDir, entry, 'chrome-linux', 'chrome'));
    }
  }
  candidates.push(
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  );
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

/* ---------- launcher ---------- */

async function launchBrowser() {
  // 1) paket `puppeteer` penuh (Chromium bawaan) bila tersedia
  try {
    const puppeteer = await import('puppeteer');
    return await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--force-color-profile=srgb', '--hide-scrollbars']
    });
  } catch (_) { /* lanjut ke puppeteer-core */ }

  // 2) puppeteer-core + Chrome sistem/Playwright
  const puppeteerCore = await import('puppeteer-core');
  const exe = findChrome();
  if (!exe) {
    console.error(
      'Chrome tidak ditemukan.\n' +
      'Pasang salah satu:\n' +
      '  npm install puppeteer           (mengunduh Chromium bawaan)\n' +
      '  CHROME_PATH=/path/ke/chrome node render.mjs'
    );
    process.exit(1);
  }
  return await puppeteerCore.default.launch({
    headless: true,
    executablePath: exe,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--force-color-profile=srgb', '--hide-scrollbars']
  });
}

/* ---------- pipeline utama ---------- */

async function main() {
  const args = parseArgs(process.argv);

  const dataPath = path.resolve(args.data);
  const data = JSON.parse(readFileSync(dataPath, 'utf8'));
  const outDir = path.resolve(args.out);
  mkdirSync(outDir, { recursive: true });

  const indexUrl = pathToFileURL(path.join(__dirname, 'index.html')).href;
  const templateId = data.templateId || 't19';

  const browser = await launchBrowser();
  const results = [];

  try {
    for (const format of args.formats) {
      const size = SIZES[format];
      if (!size) {
        console.warn(`[skip] format tidak dikenal: ${format}`);
        continue;
      }

      const page = await browser.newPage();
      await page.setViewport({ width: size.width, height: size.height, deviceScaleFactor: 1 });
      await page.goto(indexUrl, { waitUntil: 'networkidle0', timeout: 60000 });

      // injeksi creative — setCreative menunggu fonts + gambar
      const status = await page.evaluate(async (creative) => {
        const r = await window.setCreative(creative);
        return r;
      }, { ...data, format });

      await page.waitForFunction(() => window.__layerfit && window.__layerfit.ready === true, { timeout: 30000 });
      await new Promise(r => setTimeout(r, 250)); // settle layout & font swap

      const file = path.join(outDir, `${templateId}-${format}.png`);
      await page.screenshot({ path: file, clip: { x: 0, y: 0, width: size.width, height: size.height } });

      results.push({ format, file, imageStatus: status.imageStatus, expected: `${size.width}x${size.height}` });
      console.log(`[ok] ${format.padEnd(8)} -> ${file} (${status.imageStatus})`);
      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log('\nRender selesai:');
  for (const r of results) console.log(`  - ${r.format}: ${r.file} (ekspektasi ${r.expected})`);
}

main().catch(err => {
  console.error('Render gagal:', err);
  process.exit(1);
});
