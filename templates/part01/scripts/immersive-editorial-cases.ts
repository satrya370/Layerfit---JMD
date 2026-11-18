import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ContractCase } from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';
import { immersiveEditorialSchema } from '../src/immersive-editorial.js';
import { collectionAssets } from './product-collection-cases.js';

const referenceCampaign = 'c1277777-7777-4777-8777-777777777777';
const minimalCampaign = 'c1288888-8888-4888-8888-888888888888';
const compactCampaign = 'c1299999-9999-4999-9999-999999999999';

/**
 * The hero photo is the user-supplied composite crop shipped with Template-example/LayerFit_T12
 * (mountain scene with phone mockup cut from the user's reference screenshot). Fixture-only:
 * it is not a LayerFit asset and never leaves the local harness.
 */
async function referenceHero() {
  const bytes = await readFile(resolve('../../Template-example/LayerFit_T12/assets/reference-hero.jpg'));
  return { campaignId: referenceCampaign, assetId: 't12-reference-hero', bytes };
}

export async function contractCases(): Promise<ContractCase[]> {
  const syntheticAssets = await collectionAssets();
  const syntheticBottle = syntheticAssets[0]!;
  const syntheticTube = syntheticAssets[1]!;

  const referenceConfig = {
    schemaVersion: 1 as const,
    templateId: 'immersive-editorial',
    brand: { name: 'MOUNTAIN', primary: '#eca16f', secondary: '#0e0e0e', accent: '#eea47b', fontHeadingId: 'fraunces', fontBodyId: 'inter' },
    copy: {
      headline: 'Know exactly what you’re getting into.',
      cta: 'LEARN MORE',
      benefits: [],
    },
    assets: [{ assetId: 't12-reference-hero', role: 'lifestyle', allowCrop: true }],
    t12: {
      eyebrow: 'NEW FROM MOUNTAIN',
      headlineLines: ['Know exactly what', 'you’re getting into.'],
      descriptionFactId: 't12-demo-description',
      imageAlt: 'Mountain landscape with smartphone product interface',
    },
  };
  const reference: ContractCase = {
    name: 'reference-source-state',
    campaignId: referenceCampaign,
    config: immersiveEditorialSchema.parse(referenceConfig),
    assets: [await referenceHero()],
    facts: [{ id: 't12-demo-description', text: 'Our new grading system triple-checks every route using first ascent reports, local consensus, and verified tick data.', verified: true }],
    rejects: [
      { name: 'two hero assets', config: { ...referenceConfig, assets: [referenceConfig.assets[0], { assetId: 't12-second', role: 'product', allowCrop: false }] } },
      { name: 'headline lines disagree with headline', config: { ...referenceConfig, t12: { ...referenceConfig.t12, headlineLines: ['Different', 'headline.'] } } },
      { name: 'benefits unsupported', config: { ...referenceConfig, copy: { ...referenceConfig.copy, benefits: [{ text: 'Demo', factIds: ['t12-fact'] }] } } },
      { name: 'callouts unsupported', config: { ...referenceConfig, callouts: [{ benefitIndex: 0, anchor: { x: 0.5, y: 0.5 } }] } },
      { name: 'offer unsupported', config: { ...referenceConfig, offerFactId: 't12-offer' } },
      { name: 'proof unsupported', config: { ...referenceConfig, proofFactId: 't12-proof' } },
      { name: 'logo unsupported', config: { ...referenceConfig, brand: { ...referenceConfig.brand, logoAssetId: 't12-logo' } } },
      { name: 'eyebrow control character', config: { ...referenceConfig, t12: { ...referenceConfig.t12, eyebrow: 'NEW\u0000FROM' } } },
      { name: 'imageAlt missing', config: { ...referenceConfig, t12: { ...referenceConfig.t12, imageAlt: '' } } },
      { name: 'four headline lines', config: { ...referenceConfig, t12: { ...referenceConfig.t12, headlineLines: ['a', 'b', 'c', 'd'], }, copy: { ...referenceConfig.copy, headline: 'a b c d' } } },
    ],
  };

  const minimalConfig = {
    schemaVersion: 1 as const,
    templateId: 'immersive-editorial',
    brand: { name: 'STUDIO DEMO', primary: '#eca16f', secondary: '#0e0e0e', accent: '#eea47b', fontHeadingId: 'fraunces', fontBodyId: 'inter' },
    copy: { headline: 'Meet the new standard.', cta: 'LEARN MORE', benefits: [] },
    assets: [{ assetId: 't12-synthetic-product', role: 'product', allowCrop: false }],
    t12: { headlineLines: ['Meet the new standard.'], imageAlt: 'Synthetic demo product' },
  };
  const minimal: ContractCase = {
    name: 'minimal-optional-hidden',
    campaignId: minimalCampaign,
    config: immersiveEditorialSchema.parse(minimalConfig),
    assets: [{ campaignId: minimalCampaign, assetId: 't12-synthetic-product', bytes: syntheticBottle }],
    facts: [],
  };

  const compactConfig = {
    ...minimalConfig,
    brand: { ...minimalConfig.brand, name: 'TRAIL CO' },
    copy: { headline: 'A much longer editorial headline goes right here now to trigger compact sizing.', cta: 'LEARN MORE', benefits: [] },
    assets: [{ assetId: 't12-synthetic-second', role: 'lifestyle', allowCrop: true }],
    t12: { eyebrow: 'TRAIL REPORTS', headlineLines: ['A much longer editorial headline goes right here now to', 'trigger compact sizing.'], imageAlt: 'Synthetic trail scene' },
  };
  const compact: ContractCase = {
    name: 'compact-long-headline',
    campaignId: compactCampaign,
    config: immersiveEditorialSchema.parse(compactConfig),
    assets: [{ campaignId: compactCampaign, assetId: 't12-synthetic-second', bytes: syntheticTube }],
    facts: [],
  };

  return [reference, minimal, compact];
}
