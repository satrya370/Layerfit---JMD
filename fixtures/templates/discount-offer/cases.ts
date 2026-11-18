/**
 * Synthetic cases for the discount-offer template (T16). Synthetic product image and invented offer text, for simulation
 * only. No owner, competitor or real product photos, and no real promotion.
 */
import type { ContractCase } from '../../../src/server/render/contract-kit.js';
import type { RenderSnapshot, ResolvedFact, TemplateConfig } from '../../../src/shared/render-contract.js';
import { BOTTLE, png } from '../synthetic-assets.js';

export const CAMPAIGN = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const FACT = (n: number) => `ffffffff-ffff-4fff-8fff-ffffffffff${String(n).padStart(2, '0')}`;
// primary = ink (text and button), secondary = paper, accent = glow behind the product.
const BRAND = { primary: '#21182b', secondary: '#faf5f1', accent: '#d8eff7' } as const;

interface Spec {
  name: string;
  creativeId: string;
  headline: string;
  body?: string;
  cta: string;
  offer: string;
}

async function build(spec: Spec) {
  const facts: ResolvedFact[] = [];
  const fact = (text: string) => { const id = FACT(facts.length + 1); facts.push({ id, text, verified: true }); return id; };
  const offerFactId = fact(spec.offer);
  const photoId = `${spec.name}-photo`; // unique per case: the harness stores assets by id within one campaign
  const config: TemplateConfig = {
    schemaVersion: 1,
    templateId: 'discount-offer',
    brand: { name: 'Example Brand', ...BRAND, fontHeadingId: 'inter', fontBodyId: 'inter' },
    copy: { headline: spec.headline, ...(spec.body ? { body: spec.body } : {}), cta: spec.cta, benefits: [] },
    assets: [{ assetId: photoId, role: 'product', allowCrop: false }],
    offerFactId,
  };
  return { name: spec.name, creativeId: spec.creativeId, config, facts, assets: [{ campaignId: CAMPAIGN, assetId: photoId, bytes: await png(BOTTLE) }] };
}

export type BuiltCase = Awaited<ReturnType<typeof build>>;

export const SPECS: Spec[] = [
  { name: 'full', creativeId: 'a1000000-0000-4000-8000-000000000001', headline: 'Nieuwjaarsexclusief', body: 'Op geselecteerde producten. Voorwaarden gelden.', cta: 'Shop nu', offer: '50% korting + gratis cadeau' },
  { name: 'minimal', creativeId: 'a1000000-0000-4000-8000-000000000002', headline: 'Even sparen', cta: 'Bekijk de actie', offer: '20% korting' },
  // Everything at or near its budget: the tag, headline, supporting line and button all have to wrap without touching the product.
  { name: 'long', creativeId: 'a1000000-0000-4000-8000-000000000003', headline: 'Nieuwjaarsactie voor al onze trouwe fans', body: 'Op geselecteerde producten, zolang de voorraad strekt. Voorwaarden staan op de website.', cta: 'Bekijk alle aanbiedingen', offer: '50% korting + gratis cadeau bij elke bestelling boven 50 euro' },
];

export async function builtCases(): Promise<BuiltCase[]> { return Promise.all(SPECS.map(build)); }

/** Contract-kit cases, with extra configs the template schema must reject. */
export async function contractCases(): Promise<ContractCase[]> {
  const cases = await builtCases();
  const c = cases[0]!.config;
  const reject = (name: string, patch: (config: TemplateConfig) => unknown) => ({ name, config: patch(structuredClone(c)) });
  return cases.map((built, i) => ({
    name: built.name, campaignId: CAMPAIGN, config: built.config, facts: built.facts, assets: built.assets,
    ...(i === 0 ? {
      rejects: [
        reject('wrong template id', (x) => ({ ...x, templateId: 'photo-overlay' })),
        reject('no verified offer fact', (x) => ({ ...x, offerFactId: undefined })),
        reject('brand name over budget (25)', (x) => ({ ...x, brand: { ...x.brand, name: 'x'.repeat(25) } })),
        reject('headline over budget (41)', (x) => ({ ...x, copy: { ...x.copy, headline: 'x'.repeat(41) } })),
        reject('supporting line over budget (91)', (x) => ({ ...x, copy: { ...x.copy, body: 'x'.repeat(91) } })),
        reject('button over budget (25)', (x) => ({ ...x, copy: { ...x.copy, cta: 'x'.repeat(25) } })),
        reject('benefit list not supported', (x) => ({ ...x, copy: { ...x.copy, benefits: [{ text: 'a', factIds: [FACT(1)] }] } })),
        reject('accent marker not supported', (x) => ({ ...x, copy: { ...x.copy, accentPhrase: 'Nieuw' } })),
        reject('two photos', (x) => ({ ...x, assets: [...x.assets, { assetId: 'photo-2', role: 'product', allowCrop: false }] })),
        reject('proof not supported', (x) => ({ ...x, proofFactId: FACT(1) })),
        reject('ink too light on paper', (x) => ({ ...x, brand: { ...x.brand, primary: '#d0cccc' } })),
        reject('free-text discount instead of a fact id', (x) => ({ ...x, badge: '50% OFF' })),
      ],
    } : {}),
  }));
}

export function snapshotFor(built: BuiltCase, templateVersion = '0.1.0'): RenderSnapshot {
  return { schemaVersion: 1, campaignId: CAMPAIGN, creativeId: built.creativeId, revision: 1, templateId: 'discount-offer', templateVersion, language: 'nl', config: built.config, facts: built.facts };
}
