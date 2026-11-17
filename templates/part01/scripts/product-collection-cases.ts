import sharp from 'sharp';
import type { ContractCase } from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';
import { simulatedBriefs } from '../../../../Layerfit-JMD-engine/fixtures/engine/briefs.js';
import { productCollectionSchema } from '../src/product-collection-hero.js';

/** Original synthetic raster assets. No screenshot crop, original brand asset, product claim or hand. */
export async function collectionAssets(): Promise<Buffer[]> {
  const glass = `<defs><linearGradient id="red"><stop stop-color="#8c091c"/><stop offset=".24" stop-color="#f13c53"/><stop offset=".46" stop-color="#b5122c"/><stop offset=".86" stop-color="#9c1023"/><stop offset="1" stop-color="#5e0713"/></linearGradient><linearGradient id="cap"><stop stop-color="#e8bbc0"/><stop offset=".3" stop-color="#fff1ec"/><stop offset=".7" stop-color="#edb6bb"/><stop offset="1" stop-color="#c58c96"/></linearGradient></defs>`;
  const label = (title: string, number: string) => `<g fill="#ffe9e9" text-anchor="middle" font-family="Arial,sans-serif"><text x="150" y="289" font-size="17" letter-spacing="3">COLLECTION</text><text x="150" y="329" font-size="30">${title}</text><text x="150" y="372" font-size="14" letter-spacing="2">${number} / DEMO ASSET</text></g>`;
  const main = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="570" viewBox="0 0 300 570">${glass}<rect x="120" y="15" width="60" height="125" rx="29" fill="url(#cap)"/><rect x="90" y="117" width="120" height="76" rx="10" fill="url(#cap)"/><rect x="47" y="180" width="206" height="352" rx="24" fill="url(#red)" stroke="#7e1020" stroke-width="5"/><rect x="60" y="194" width="180" height="325" rx="17" fill="none" stroke="#fb7988" stroke-opacity=".55" stroke-width="3"/><path d="M69 215v265" stroke="#ffbac2" stroke-opacity=".6" stroke-width="7"/>${label('ESSENTIAL', '02')}</svg>`;
  const left = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="650" viewBox="0 0 300 650">${glass}<path d="M38 20H262L249 514Q150 550 51 514Z" fill="url(#red)"/><path d="M42 22H258" stroke="#7d1422" stroke-width="15"/><rect x="57" y="514" width="186" height="106" rx="12" fill="#372c2e"/><rect x="69" y="527" width="162" height="70" rx="7" fill="#5d4447"/><path d="M63 53L75 480" stroke="#ffb0ba" stroke-width="9" opacity=".3"/>${label('DAILY', '01')}</svg>`;
  const right = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="640" viewBox="0 0 300 640">${glass}<rect x="84" y="24" width="132" height="168" rx="14" fill="url(#cap)"/><rect x="53" y="180" width="194" height="420" rx="24" fill="url(#red)" stroke="#7c1020" stroke-width="4"/><path d="M70 213v335" stroke="#ffc4cb" opacity=".45" stroke-width="7"/>${label('COMPANION', '03')}</svg>`;
  return Promise.all([main, left, right].map((svg) => sharp(Buffer.from(svg)).png().toBuffer()));
}

export async function contractCases(): Promise<ContractCase[]> {
  const campaignId = 'b1111111-1111-4111-8111-111111111111';
  const assets = (await collectionAssets()).map((bytes, index) => ({ campaignId, assetId: `t11-product-${index}`, bytes }));
  const config = productCollectionSchema.parse({
    schemaVersion: 1, templateId: 'product-collection-hero',
    brand: { name: 'LAYERFIT', primary: '#31151b', secondary: '#fbd7dd', accent: '#ef233c', fontHeadingId: 'inter', fontBodyId: 'inter' },
    copy: { headline: 'Your Complete Glow Routine', cta: 'SHOP THE COLLECTION', benefits: [] },
    assets: assets.map(({ assetId }) => ({ assetId, role: 'product', allowCrop: false })),
    t11: { tagline: 'YOUR EVERYDAY COLLECTION', headlineLines: ['Your Complete', 'Glow Routine'], descriptionFactId: 't11-demo-description', benefitFactIds: [], primaryCta: 'Build your routine', destinationLabel: 'EXPLORE THE RANGE', imageAlts: ['Synthetic red dropper bottle', 'Synthetic red tube', 'Synthetic red bottle'] },
  });
  const reference: ContractCase = {
    name: 'three-product-reference-composition', campaignId, config, assets,
    facts: [{ id: 't11-demo-description', text: 'Discover the collection. Find your daily essentials.', verified: true }],
    rejects: [
      { name: 'duplicate asset ID', config: { ...config, assets: [config.assets[0], config.assets[0]] } },
      { name: 'website CSS injection', config: { ...config, t11: { ...config.t11, website: 'javascript:alert(1)' } } },
      { name: 'four product assets', config: { ...config, assets: [...config.assets, { assetId: 'fourth-product', role: 'product', allowCrop: false }] } },
    ],
  };
  const { shirt, bottle } = await simulatedBriefs();
  return [reference, ...[shirt, bottle].map((brief, index): ContractCase => {
    const count = index === 0 ? 1 : 2;
    const syntheticConfig = productCollectionSchema.parse({
      ...config,
      brand: { ...config.brand, name: 'STUDIO DEMO' },
      copy: { headline: index === 0 ? 'Your Everyday Essential' : 'A Considered Collection', cta: 'EXPLORE THE PRODUCT', benefits: [] },
      assets: count === 1 ? brief.snapshot.config.assets : config.assets.filter((_asset, i) => i !== 1),
      t11: { headlineLines: index === 0 ? ['Your Everyday', 'Essential'] : ['A Considered', 'Collection'], benefitFactIds: [], imageAlts: Array.from({ length: count }, () => 'Synthetic test product') },
    });
    return { name: count === 1 ? 'one-product-shirt' : 'two-distinct-products', campaignId: count === 1 ? brief.snapshot.campaignId : campaignId, config: syntheticConfig, assets: count === 1 ? brief.assets : assets.filter((_asset, i) => i !== 1), facts: [] };
  })];
}
