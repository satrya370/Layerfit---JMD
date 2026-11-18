import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ContractCase } from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';
import { splitComposition } from '../../../../Layerfit-JMD-engine/src/templates/part02/split-composition/index.js';
import { collectionAssets } from './product-collection-cases.js';

const referenceCampaign = 'c0555555-5555-4555-8555-555555555555';
const fixtureCampaign = 'c0566666-6666-4666-8666-666666666666';

/**
 * The demo photo is the user-supplied crop shipped with Template-example/layerfit_t05.
 * Fixture-only: it is not a LayerFit product image and never leaves the local harness.
 */
async function referenceAsset() {
  const bytes = await readFile(resolve('../../Template-example/layerfit_t05/assets/demo-product.png'));
  return { campaignId: referenceCampaign, assetId: 't05-demo-product', bytes };
}

export async function contractCases(): Promise<ContractCase[]> {
  const config = {
    schemaVersion: 1 as const,
    templateId: 'split-composition',
    brand: { name: 'LAYERFIT', primary: '#173028', secondary: '#e9e8e0', accent: '#d5f86a', fontHeadingId: 'inter', fontBodyId: 'inter' },
    copy: {
      headline: 'MAAK KENNIS MET PRODUCT A.',
      accentPhrase: 'PRODUCT A.',
      body: 'Bekijk het product, ontdek de details en vind wat bij jou past.',
      cta: 'BEKIJK PRODUCT',
      benefits: [],
    },
    assets: [{ assetId: 't05-demo-product', role: 'product', allowCrop: true }],
  };
  const reference: ContractCase = {
    name: 'reference-source-state',
    campaignId: referenceCampaign,
    config: splitComposition.configSchema.parse(config),
    assets: [await referenceAsset()],
    facts: [],
    rejects: [
      { name: 'two photos', config: { ...config, assets: [config.assets[0], { assetId: 't05-second', role: 'product', allowCrop: false }] } },
      { name: 'callouts unsupported', config: { ...config, callouts: [{ benefitIndex: 0, anchor: { x: 0.5, y: 0.5 } }] } },
      { name: 'comparison unsupported', config: { ...config, comparisonEvidenceId: 't05-evidence' } },
      { name: 'accent phrase not in headline', config: { ...config, copy: { ...config.copy, accentPhrase: 'BESTE DEAL' } } },
      { name: 'headline over template budget', config: { ...config, copy: { ...config.copy, headline: 'M'.repeat(51) } } },
      { name: 'benefit text over template budget', config: { ...config, copy: { ...config.copy, benefits: [{ text: 'DIT IS EEN VEEL TE LANG BENEFIT LABEL X', factIds: ['t05-fact'] }] } } },
      { name: 'accent too dark for dark ink', config: { ...config, brand: { ...config.brand, accent: '#182820' } } },
      { name: 'secondary too dark for dark ink', config: { ...config, brand: { ...config.brand, secondary: '#173028' } } },
      { name: 'unknown font id', config: { ...config, brand: { ...config.brand, fontHeadingId: 'arial' } } },
    ],
  };

  const syntheticAssets = await collectionAssets();
  const synthetic = syntheticAssets[0]!;
  const populatedConfig = {
    schemaVersion: 1 as const,
    templateId: 'split-composition',
    brand: { name: 'STUDIO DEMO', primary: '#26332c', secondary: '#e9e8e0', accent: '#d5f86a', fontHeadingId: 'inter', fontBodyId: 'inter' },
    copy: {
      headline: 'ONTDEK DE NIEUWE COLLECTIE',
      accentPhrase: 'NIEUWE COLLECTIE',
      body: 'Synthetic fixture description. Demo only, never a real product claim.',
      cta: 'BEKIJK COLLECTIE',
      benefits: [
        { text: 'DEMO PILL LABEL', factIds: ['t05-fixture-pill'] },
        { text: 'DEMO CHIP EEN', factIds: ['t05-fixture-chip-1'] },
        { text: 'DEMO CHIP TWEE', factIds: ['t05-fixture-chip-2'] },
      ],
    },
    assets: [{ assetId: 't05-synthetic-product', role: 'product', allowCrop: false }],
    offerFactId: 't05-fixture-offer',
    proofFactId: 't05-fixture-proof',
  };
  const populated: ContractCase = {
    name: 'populated-fixture-state',
    campaignId: fixtureCampaign,
    config: splitComposition.configSchema.parse(populatedConfig),
    assets: [{ campaignId: fixtureCampaign, assetId: 't05-synthetic-product', bytes: synthetic }],
    // verified flags are test assertions for this local fixture, not campaign substantiation.
    facts: [
      { id: 't05-fixture-pill', text: 'FIXTURE PILL — DEMO ONLY', verified: true },
      { id: 't05-fixture-chip-1', text: 'FIXTURE CHIP EEN', verified: true },
      { id: 't05-fixture-chip-2', text: 'FIXTURE CHIP TWEE', verified: true },
      { id: 't05-fixture-offer', text: 'FIXTURE OFFER — DEMO ONLY', verified: true },
      { id: 't05-fixture-proof', text: 'FIXTURE PROOF — DEMO ONLY', verified: true },
    ],
    rejects: [
      { name: 'fourth benefit', config: { ...populatedConfig, copy: { ...populatedConfig.copy, benefits: [...populatedConfig.copy.benefits, { text: 'DEMO CHIP DRIE', factIds: ['t05-fixture-chip-3'] }] } } },
    ],
  };

  return [reference, populated];
}
