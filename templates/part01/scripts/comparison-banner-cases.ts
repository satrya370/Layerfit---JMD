import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ContractCase } from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';
import { comparisonBannerSchema } from '../src/comparison-banner.js';

/** User-requested local reference reproduction ONLY. Facts marked true below are fixture assertions
 * to exercise the renderer, NOT verification of competitor or LayerFit claims. Never enqueue as a campaign.
 */
export async function contractCases(): Promise<ContractCase[]> {
  const campaignId = '55555555-5555-4555-8555-555555555555';
  const names = ['rug-cleaner', 'sofa-cleaning', 'robot-vacuum'];
  const factTexts = ['Lastig met haren', 'Veel gesjouw', 'Altijd zelf doen', 'Pakt lange haren', 'Geen gesjouw', 'Automatisch schoon'];
  const config = comparisonBannerSchema.parse({
    schemaVersion: 1, templateId: 'dual-panel',
    brand: { name: 'Toni Homi', primary: '#ffffff', secondary: '#222222', accent: '#3da639', fontHeadingId: 'montserrat', fontBodyId: 'poppins' },
    copy: { headline: 'Snel schoon weinig moeite', cta: 'Bekijk', benefits: [] },
    assets: names.map((name) => ({ assetId: name, role: 'detail', allowCrop: true })),
    comparisonEvidenceId: 'reference-comparison',
    t02: { sloganLines: ['Snel schoon', 'weinig moeite'], leftLabel: 'Ander merk', badgeText: 'T', leftFactIds: ['reference-0', 'reference-1', 'reference-2'], rightFactIds: ['reference-3', 'reference-4', 'reference-5'] },
  });
  return [{
    name: 'reference-only-not-campaign', campaignId, config,
    facts: [
      { id: 'reference-comparison', text: 'REFERENCE REPRODUCTION ONLY; not substantiated campaign evidence', verified: true },
      ...factTexts.map((text, i) => ({ id: `reference-${i}`, text, verified: true as const })),
    ],
    assets: await Promise.all(names.map(async (name) => ({ campaignId, assetId: name, bytes: await readFile(resolve(`../../Template-example/comparison-banner/images/${name}.jpg`)) }))),
    rejects: [
      { name: 'comparison evidence missing', config: { ...config, comparisonEvidenceId: undefined } },
      { name: 'crop not approved', config: { ...config, assets: config.assets.map((asset, i) => i ? asset : { ...asset, allowCrop: false }) } },
      { name: 'unknown T02 key', config: { ...config, t02: { ...config.t02, extra: 'unexpected' } } },
    ],
  }];
}
