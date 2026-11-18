/**
 * Synthetic cases for the minimal-discount template (T17). Synthetic product image and invented offer text, for simulation
 * only. No owner, competitor or real product photos, and no real promotion.
 */
import type { ContractCase } from '../../../src/server/render/contract-kit.js';
import type { RenderSnapshot, ResolvedFact, TemplateConfig } from '../../../src/shared/render-contract.js';
import { BOTTLE, png } from '../synthetic-assets.js';

export const CAMPAIGN = 'e7e7e7e7-e7e7-47e7-87e7-e7e7e7e7e7e7';
const FACT = (n: number) => `ffffffff-ffff-4fff-8fff-ffffffffff${String(n).padStart(2, '0')}`;
// primary = ink (text and button), secondary = background, accent = product panel and benefit ticks.
const BRAND = { primary: '#1c1a17', secondary: '#f7f3ee', accent: '#f1bf98' } as const;

interface Spec {
  name: string;
  creativeId: string;
  headline: string;
  body?: string;
  cta: string;
  offer: string;
  benefits?: string[];
}

async function build(spec: Spec) {
  const facts: ResolvedFact[] = [];
  const fact = (text: string) => { const id = FACT(facts.length + 1); facts.push({ id, text, verified: true }); return id; };
  const offerFactId = fact(spec.offer);
  const benefits = (spec.benefits ?? []).map((text) => ({ text, factIds: [fact(`Verified source for: ${text}`)] }));
  const photoId = `${spec.name}-photo`; // unique per case: the harness stores assets by id within one campaign
  const config: TemplateConfig = {
    schemaVersion: 1,
    templateId: 'minimal-discount',
    brand: { name: 'Example Brand', ...BRAND, fontHeadingId: 'inter', fontBodyId: 'inter' },
    copy: { headline: spec.headline, ...(spec.body ? { body: spec.body } : {}), cta: spec.cta, benefits },
    assets: [{ assetId: photoId, role: 'product', allowCrop: false }],
    offerFactId,
  };
  return { name: spec.name, creativeId: spec.creativeId, config, facts, assets: [{ campaignId: CAMPAIGN, assetId: photoId, bytes: await png(BOTTLE) }] };
}

export type BuiltCase = Awaited<ReturnType<typeof build>>;

export const SPECS: Spec[] = [
  { name: 'full', creativeId: 'a1000000-0000-4000-8000-000000000001', headline: 'Alles voor je dagelijkse routine', body: 'Duurzame essentials die de hele dag meegaan. Alleen deze week.', cta: 'Shop de actie', offer: '25% korting', benefits: ['Gratis verzending vanaf €25', '30 dagen retour', 'Vaatwasserbestendig'] },
  { name: 'minimal', creativeId: 'a1000000-0000-4000-8000-000000000002', headline: 'Even sparen', cta: 'Shop nu', offer: '20% korting' },
  // Everything at or near its budget: every text has to wrap without touching the product panel or another block.
  { name: 'long', creativeId: 'a1000000-0000-4000-8000-000000000003', headline: 'Nieuwjaarsactie op je dagelijkse favorieten', body: 'Op geselecteerde producten, zolang de voorraad strekt. Voorwaarden staan op de website. Alleen online.', cta: 'Bekijk alle aanbiedingen', offer: '25% korting + gratis verzending', benefits: ['Gratis verzending vanaf €25', 'Dertig dagen gratis retour', 'Twee jaar garantie op alles'] },
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
        reject('brand name over budget (21)', (x) => ({ ...x, brand: { ...x.brand, name: 'x'.repeat(21) } })),
        reject('headline over budget (45)', (x) => ({ ...x, copy: { ...x.copy, headline: 'x'.repeat(45) } })),
        reject('supporting line over budget (111)', (x) => ({ ...x, copy: { ...x.copy, body: 'x'.repeat(111) } })),
        reject('button over budget (25)', (x) => ({ ...x, copy: { ...x.copy, cta: 'x'.repeat(25) } })),
        reject('four benefits', (x) => ({ ...x, copy: { ...x.copy, benefits: ['a', 'b', 'c', 'd'].map((text) => ({ text, factIds: [FACT(1)] })) } })),
        reject('benefit over budget (31)', (x) => ({ ...x, copy: { ...x.copy, benefits: [{ text: 'x'.repeat(31), factIds: [FACT(1)] }] } })),
        reject('ink too dark-on-dark on the panel', (x) => ({ ...x, brand: { ...x.brand, accent: '#4a4440' } })),
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
  return { schemaVersion: 1, campaignId: CAMPAIGN, creativeId: built.creativeId, revision: 1, templateId: 'minimal-discount', templateVersion, language: 'nl', config: built.config, facts: built.facts };
}
