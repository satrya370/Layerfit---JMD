// One-off preview with the reference product photo (preview only, not a fixture). Output stays in ignored artifacts/.
import { readFile } from 'node:fs/promises';
import { builtCases, snapshotFor } from '../fixtures/templates/discount-offer/cases.js';
import { renderMatrix } from '../fixtures/templates/render-matrix.js';
import { discountOffer } from '../src/templates/part02/discount-offer/index.js';

const photo = await readFile('C:/Users/Asus/Layerfit-JMD/Template-example/LayerFit_T16_Discount_Offer/assets/demo-products.png');
const base = (await builtCases())[0]!;
const mk = (name: string, copy: Record<string, string>, offer?: string) => ({ ...base, name, config: { ...base.config, copy: { ...base.config.copy, ...copy } }, facts: offer ? base.facts.map((f, i) => (i === 0 ? { ...f, text: offer } : f)) : base.facts, assets: base.assets.map((a) => ({ ...a, bytes: photo })) });
const short = mk('prose-short', { headline: 'New year exclusive', body: 'On selected products. Terms apply.', cta: 'Shop now' });
const long = mk('prose-long', { headline: 'A little extra, just for our loyal fans', body: 'On selected products while stocks last. Terms and conditions apply, see the website.', cta: 'See all of our offers' }, '50% off + a free gift with every order over 50 euro');
await renderMatrix({ module: discountOffer, cases: [short, long], snapshotFor, outDir: 'artifacts/templates/discount-offer-preview' });
console.log('preview done');
