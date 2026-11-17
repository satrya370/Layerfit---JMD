import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { simulatedBriefs } from '../../../../Layerfit-JMD-engine/fixtures/engine/briefs.js';
import type { ContractCase } from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';
import type { AssetRecord } from '../../../../Layerfit-JMD-engine/src/server/assets/resolve-render-assets.js';
import type { RenderSnapshot, TemplateConfig } from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';

const REFERENCE_CAMPAIGN = '44444444-4444-4444-8444-444444444444';
const REFERENCE_CREATIVE = 'd1111111-1111-4111-8111-111111111111';

/** Third case: the user-supplied reference example itself (Template-example/, 17 Nov 2026).
 * rating/review count/price/logo/photo come from the user's own reference files and are used ONLY for
 * this local fidelity study. They are NOT verified LayerFit claims and must not be published as ads.
 */
async function referenceExample(): Promise<ContractCase> {
  const assetsDir = resolve('../../Template-example/assets');
  const assets: AssetRecord[] = [
    { campaignId: REFERENCE_CAMPAIGN, assetId: 'reference-scene', bytes: await readFile(join(assetsDir, 'product-scene.jpg')) },
    { campaignId: REFERENCE_CAMPAIGN, assetId: 'reference-logo', bytes: await readFile(join(assetsDir, 'brand-logo.png')) },
  ];
  const config: TemplateConfig = {
    schemaVersion: 1,
    templateId: 'editorial-reframe',
    brand: {
      name: 'Referentie voorbeeld',
      logoAssetId: 'reference-logo',
      primary: '#333132',
      secondary: '#eae6e7',
      accent: '#cf403a',
      fontHeadingId: 'inter',
      fontBodyId: 'inter',
    },
    copy: {
      headline: 'Robotstofzuigers zijn zo duur... oh wacht.',
      accentPhrase: 'oh wacht.',
      body: 'Robotstofzuiger + Steelstofzuiger Combideal',
      cta: 'Bekijk de aanbieding',
      benefits: [],
    },
    assets: [{ assetId: 'reference-scene', role: 'lifestyle', allowCrop: true }],
    offerFactId: 'reference-offer',
    proofFactId: 'reference-rating',
  };
  const facts: RenderSnapshot['facts'] = [
    { id: 'reference-rating', text: '4.8 gebaseerd op 500+ reviews', verified: true },
    { id: 'reference-offer', text: 'Black Friday prijs: €299', verified: true },
  ];
  return { name: 'reference-example', campaignId: REFERENCE_CAMPAIGN, config, facts, assets };
}

/** creativeId per case, for scripts that drive the real renderOutput pipeline. */
export const caseCreativeIds: Record<string, string> = { 'reference-example': REFERENCE_CREATIVE };

export async function contractCases(): Promise<ContractCase[]> {
  const briefs = await simulatedBriefs();
  const synthetic = Object.values(briefs).map((brief, index) => ({
    name: index === 0 ? 'shirt-no-price-no-review' : 'bottle-no-price-no-review',
    campaignId: brief.snapshot.campaignId,
    config: {
      ...brief.snapshot.config,
      templateId: 'editorial-reframe',
      brand: { ...brief.snapshot.config.brand, secondary: '#eae6e7', accent: '#cf403a', fontHeadingId: 'inter', fontBodyId: 'inter' },
      copy: {
        ...brief.snapshot.config.copy,
        accentPhrase: 'dagelijks',
        body: index === 0 ? 'Katoen + ronde hals' : 'Herbruikbare fles van roestvrij staal',
      },
    },
    facts: brief.snapshot.facts,
    assets: brief.assets,
  }));
  return [...synthetic, await referenceExample()];
}
