import sharp from 'sharp';
import type { ContractCase } from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';
import { productCollectionSchema } from '../src/product-collection-hero.js';

const campaignId = 'b1111111-1111-4111-8111-111111111111';
const facts = [
  { id: 't11-headline-fixture', text: 'Is Semaglutide Right for You?', verified: true as const },
  { id: 't11-subhead-fixture', text: 'Find out who should and should not take this medication.', verified: true as const },
  { id: 't11-disclaimer-fixture', text: 'Prescription required. Compounded drugs are not FDA-approved and are not reviewed by the FDA for safety or effectiveness. Results are not guaranteed and vary by individual. Review official safety information with a licensed clinician.', verified: true as const },
];

/** Synthetic vial for local tests only. It is visibly marked as a demo and contains no brand/drug claim. */
export async function collectionAssets(): Promise<Buffer[]> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="470" viewBox="0 0 300 470"><defs><linearGradient id="glass"><stop stop-color="#70402b"/><stop offset=".35" stop-color="#c68156"/><stop offset=".7" stop-color="#915335"/><stop offset="1" stop-color="#46291f"/></linearGradient></defs><rect x="100" y="15" width="100" height="86" rx="18" fill="#173f34"/><rect x="82" y="83" width="136" height="42" rx="7" fill="#e9eee5"/><rect x="51" y="116" width="198" height="330" rx="32" fill="url(#glass)" stroke="#33241d" stroke-width="8"/><rect x="66" y="176" width="168" height="220" rx="8" fill="#eff1e8"/><text x="150" y="260" text-anchor="middle" font-family="Arial" font-weight="700" font-size="29" fill="#1e493c">DEMO</text><text x="150" y="300" text-anchor="middle" font-family="Arial" font-size="17" fill="#355b4d">SYNTHETIC VIAL</text><text x="150" y="336" text-anchor="middle" font-family="Arial" font-size="14" fill="#355b4d">NOT FOR USE</text></svg>`;
  return [await sharp(Buffer.from(svg)).png().toBuffer()];
}

export async function contractCases(): Promise<ContractCase[]> {
  const assets = (await collectionAssets()).map((bytes) => ({ campaignId, assetId: 't11-synthetic-vial', bytes }));
  const config = productCollectionSchema.parse({
    schemaVersion: 1, templateId: 'semaglutide-banner',
    brand: { name: 'SAMPLE BRAND', primary: '#275549', secondary: '#183f35', accent: '#fafdcb', fontHeadingId: 'fraunces', fontBodyId: 'inter' },
    copy: { headline: facts[0]!.text, cta: 'LEARN MORE', benefits: [] },
    assets: [{ assetId: assets[0]!.assetId, role: 'product', allowCrop: false }],
    t11: {
      headlineFactId: facts[0]!.id, headlineLines: ['Is Semaglutide', 'Right for You?'], accentPhrase: 'Semaglutide',
      subheadFactId: facts[1]!.id, disclaimerFactId: facts[2]!.id,
      imageAlt: 'Synthetic demo vial, not a real medication product',
    },
  });
  return [{
    name: 'reference-composition-synthetic-vial', campaignId, config, assets, facts,
    rejects: [
      { name: 'multiple assets', config: { ...config, assets: [...config.assets, { assetId: 'second', role: 'product', allowCrop: false }] } },
      { name: 'crop is forbidden', config: { ...config, assets: [{ ...config.assets[0]!, allowCrop: true }] } },
      { name: 'headline mismatch', config: { ...config, t11: { ...config.t11, headlineLines: ['Different headline'] } } },
      { name: 'accent phrase absent', config: { ...config, t11: { ...config.t11, accentPhrase: 'not present' } } },
      { name: 'unsupported benefits', config: { ...config, copy: { ...config.copy, benefits: [{ text: 'Claim', factIds: [facts[1]!.id] }] } } },
      { name: 'empty CTA', config: { ...config, copy: { ...config.copy, cta: '' } } },
      { name: 'logo unsupported', config: { ...config, brand: { ...config.brand, logoAssetId: 'unsupported-logo' } } },
    ],
  }];
}
