// Verification: re-render the T03 full-two-photos case and the T16 prose-long case through the real engine, save the HTML each format was rendered from, and compare pixels with the renders already in the main repo's part01 artifacts. Output HTML goes to the main repo artifact folders; scratch stores stay in artifacts/verify-scratch (ignored).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { createHarness } from '../fixtures/engine/harness.js';
import { builtCases as t03Built, snapshotFor as t03Snapshot } from '../fixtures/templates/dark-offer-stack/cases.js';
import { builtCases as t16Built, snapshotFor as t16Snapshot } from '../fixtures/templates/discount-offer/cases.js';
import { darkOfferStack } from '../src/templates/part01/dark-offer-stack/index.js';
import { discountOffer } from '../src/templates/part02/discount-offer/index.js';
import { renderOutput } from '../src/server/render/render-output.js';
import type { Format } from '../src/shared/render-contract.js';

const MAIN = 'C:/Users/Asus/Layerfit-JMD/templates/part01/artifacts';
const SCRATCH = resolve('artifacts/verify-scratch');
const FORMATS: Format[] = ['square', 'portrait', 'vertical'];
const SIZE: Record<Format, [number, number]> = { square: [1080, 1080], portrait: [1080, 1350], vertical: [1080, 1920] };

let taskNo = 0;

// One case in all formats: returns the PNG bytes and the DOM each format was rendered from (captured before fitting).
async function renderCase(template: unknown, snapshot: unknown, assets: any[], storeName: string) {
  const harness = await createHarness({ templates: [template as any], assets, outputRoot: join(SCRATCH, storeName) });
  const out: Record<string, { png: Buffer; html: string; warnings: string[]; fittingSteps: number }> = {};
  try {
    for (const format of FORMATS) {
      let html = '';
      harness.engine.hooks = { afterContent: async (page) => { html = await page.content(); } };
      const result = await renderOutput({
        taskId: `${String(++taskNo).padStart(8, '0')}-0000-4000-8000-000000000000`, jobId: '44444444-4444-4444-8444-444444444444', attempt: 1,
        format, encodings: ['png'], snapshot,
      } as any, harness.engine);
      if (result.status !== 'success') throw new Error(`${storeName}/${format}: ${result.status} ${result.error?.code} ${result.error?.message}`);
      const png = await harness.engine.store.read(result.artifacts.find((a) => a.encoding === 'png')!.storageKey);
      out[format] = { png: Buffer.from(png), html, warnings: result.diagnostics.warnings, fittingSteps: result.diagnostics.fittingSteps };
    }
  } finally {
    await harness.close();
  }
  await mkdir(join(SCRATCH, storeName), { recursive: true });
  for (const format of FORMATS) await writeFile(join(SCRATCH, storeName, `${format}.png`), out[format]!.png);
  return out;
}

async function rawOf(buf: Buffer) {
  const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

async function compare(label: string, a: Buffer, b: Buffer) {
  const x = await rawOf(a);
  const y = await rawOf(b);
  if (x.width !== y.width || x.height !== y.height) return `${label}: SIZE MISMATCH ${x.width}x${x.height} vs ${y.width}x${y.height}`;
  let differing = 0; let max = 0;
  for (let i = 0; i < x.data.length; i++) {
    const d = Math.abs(x.data[i]! - y.data[i]!);
    if (d) { differing++; if (d > max) max = d; }
  }
  return `${label}: ${differing} differing channel values, max delta ${max}`;
}

// Same tile layout as fixtures/templates/render-matrix.ts, so the sheet can be compared against the saved sheet.
async function sheet(out: Record<string, { png: Buffer }>) {
  const tiles: Array<{ input: Buffer; width: number }> = [];
  for (const format of FORMATS) {
    const height = 760;
    const width = Math.round((SIZE[format][0] / SIZE[format][1]) * height);
    tiles.push({ input: await sharp(out[format]!.png).resize(width, height).png().toBuffer(), width });
  }
  let left = 20;
  const composite = tiles.map((tile) => { const item = { input: tile.input, left, top: 20 }; left += tile.width + 20; return item; });
  return sharp({ create: { width: left, height: 800, channels: 3, background: '#dddddd' } }).composite(composite).png().toBuffer();
}

// ---- T03: full-two-photos, compared format by format with the saved T03_full-two-photos_<format>.png files.
{
  const built = (await t03Built()).find((c) => c.name === 'full-two-photos')!;
  const out = await renderCase(darkOfferStack, t03Snapshot(built), built.assets, 't03');
  for (const format of FORMATS) {
    const ref = await readFile(join(MAIN, 't03-dark-offer-stack', `T03_full-two-photos_${format}.png`));
    console.log(await compare(`T03 full-two-photos ${format}`, out[format]!.png, ref));
    console.log(`  fittingSteps=${out[format]!.fittingSteps} warnings=${out[format]!.warnings.join(' | ') || 'none'}`);
    await writeFile(join(MAIN, 't03-dark-offer-stack', `T03-full-two-photos_${format}.html`), out[format]!.html);
  }
}

// ---- T16: the prose-long preview (same copy and offer as preview-t16.ts), compared with the saved sheet.
{
  const photo = await readFile('C:/Users/Asus/Layerfit-JMD/Template-example/LayerFit_T16_Discount_Offer/assets/demo-products.png');
  const base = (await t16Built())[0]!;
  const longCase = {
    ...base,
    name: 'prose-long',
    creativeId: 'a1000000-0000-4000-8000-00000000f016',
    config: { ...base.config, copy: { ...base.config.copy, headline: 'A little extra, just for our loyal fans', body: 'On selected products while stocks last. Terms and conditions apply, see the website.', cta: 'See all of our offers' } },
    facts: base.facts.map((f, i) => (i === 0 ? { ...f, text: '50% off + a free gift with every order over 50 euro' } : f)),
    assets: base.assets.map((a) => ({ ...a, bytes: photo })),
  };
  const out = await renderCase(discountOffer, t16Snapshot(longCase), longCase.assets, 't16');
  const saved = await readFile(join(MAIN, 't16-discount-offer', 'T16-preview-prose-long.png'));
  console.log(await compare('T16 prose-long sheet', await sheet(out), saved));
  for (const format of FORMATS) {
    console.log(`  T16 ${format}: fittingSteps=${out[format]!.fittingSteps} warnings=${out[format]!.warnings.join(' | ') || 'none'}`);
    await writeFile(join(MAIN, 't16-discount-offer', `T16-prose-long_${format}.html`), out[format]!.html);
  }
}
console.log('verify done');
