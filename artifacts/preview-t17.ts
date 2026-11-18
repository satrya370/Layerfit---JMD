// One-off preview with the T17 package demo tumbler (preview only, not a fixture). Output stays in ignored artifacts/.
import { readFile, rm } from 'node:fs/promises';
import sharp from 'sharp';
import { builtCases, snapshotFor } from '../fixtures/templates/minimal-discount/cases.js';
import { renderMatrix } from '../fixtures/templates/render-matrix.js';
import { minimalDiscount } from '../src/templates/part02/minimal-discount/index.js';

const svg = await readFile('C:/Users/Asus/Layerfit-JMD/Template-example/LayerFit_T17_Minimal_Discount/assets/demo-tumbler.svg');
const photo = await sharp(svg, { density: 200 }).resize({ height: 1400 }).png().toBuffer();
const base = (await builtCases())[0]!;
interface Copy { headline: string; body: string; cta: string; benefits: string[] }
const mk = (name: string, creativeId: string, copy: Copy, offer: string) => ({
  ...base, name, creativeId,
  config: { ...base.config, brand: { ...base.config.brand, name: 'Northwell' }, copy: { ...base.config.copy, ...copy, benefits: copy.benefits.map((text, i) => ({ ...base.config.copy.benefits[i]!, text })) } },
  facts: base.facts.map((f, i) => (i === 0 ? { ...f, text: offer } : f)),
  assets: base.assets.map((a) => ({ ...a, bytes: photo })),
});
await rm('artifacts/templates/minimal-discount-preview', { recursive: true, force: true });
await renderMatrix({ module: minimalDiscount, snapshotFor, outDir: 'artifacts/templates/minimal-discount-preview', cases: [
  mk('tumbler-short', 'b1000000-0000-4000-8000-000000000001', { headline: 'Keeps coffee hot for 12 hours', body: 'Double-wall steel tumbler that fits every cup holder. This week only.', cta: 'Shop the sale', benefits: ['Free shipping over $40', 'Leak-proof lid', 'Dishwasher safe'] }, '25% off'),
  mk('tumbler-long', 'b1000000-0000-4000-8000-000000000002', { headline: 'The everyday tumbler for coffee on the go', body: 'Double-wall steel that keeps drinks hot for 12 hours and cold for 24. Fits every cup holder.', cta: 'See all of our offers', benefits: ['Free shipping over $40', 'Leak-proof lid, tested daily', 'Two-year warranty'] }, '25% off + free shipping'),
] });
console.log('preview done');
