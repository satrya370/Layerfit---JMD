/**
 * Synthetic cases for the atmospheric-editorial template (T10). One photo, two text lengths. Everything is invented for
 * simulation; the offer is labelled "SIMULATIE". No owner, competitor or real business photos.
 */
import type { ContractCase } from '../../../src/server/render/contract-kit.js';
import type { RenderSnapshot, ResolvedFact, TemplateConfig } from '../../../src/shared/render-contract.js';
import { SCENE, png } from '../synthetic-assets.js';

export const CAMPAIGN = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const FACT = (n: number) => `ffffffff-ffff-4fff-8fff-ffffffffff${String(n).padStart(2, '0')}`;
// secondary = paper band, primary = button, accent = offer text and benefit markers.
const BRAND = { primary: '#1f3a33', secondary: '#f3eee6', accent: '#9a4628' } as const;

interface Spec {
  name: string;
  creativeId: string;
  headline: string;
  benefits: string[];
  offer?: string;
}

async function build(spec: Spec) {
  const facts: ResolvedFact[] = [];
  const fact = (text: string) => { const id = FACT(facts.length + 1); facts.push({ id, text, verified: true }); return id; };
  const benefits = spec.benefits.map((text) => ({ text, factIds: [fact(`Verified source for: ${text}`)] }));
  const offerFactId = spec.offer ? fact(spec.offer) : undefined;
  const photoId = `${spec.name}-photo`; // unique per case: the harness stores assets by id within one campaign
  const config: TemplateConfig = {
    schemaVersion: 1,
    templateId: 'atmospheric-editorial',
    brand: { name: 'Terra', ...BRAND, fontHeadingId: 'fraunces', fontBodyId: 'inter' },
    copy: { headline: spec.headline, cta: 'Boek je moment', benefits },
    assets: [{ assetId: photoId, role: 'lifestyle', allowCrop: true }],
    ...(offerFactId ? { offerFactId } : {}),
  };
  return { name: spec.name, creativeId: spec.creativeId, config, facts, assets: [{ campaignId: CAMPAIGN, assetId: photoId, bytes: await png(SCENE) }] };
}

export type BuiltCase = Awaited<ReturnType<typeof build>>;

export const SPECS: Spec[] = [
  { name: 'full', creativeId: 'e0000000-0000-4000-8000-000000000001', headline: 'Laat de week even los', benefits: ['Sauna & koud bad', 'Gezichtsbehandeling', 'Massage'], offer: 'Simulatie' },
  { name: 'minimal', creativeId: 'e0000000-0000-4000-8000-000000000002', headline: 'Even helemaal niets', benefits: [] },
];

export async function builtCases(): Promise<BuiltCase[]> { return Promise.all(SPECS.map(build)); }

/** Contract-kit cases, with extra configs the template schema must reject. */
export async function contractCases(): Promise<ContractCase[]> {
  const cases = await builtCases();
  const c = cases[0]!.config;
  const reject = (name: string, patch: (config: TemplateConfig) => unknown) => ({ name, config: patch(structuredClone(c)) });
  const benefit = (text: string) => ({ text, factIds: [FACT(1)] });
  return cases.map((built, i) => ({
    name: built.name, campaignId: CAMPAIGN, config: built.config, facts: built.facts, assets: built.assets,
    ...(i === 0 ? {
      rejects: [
        reject('wrong template id', (x) => ({ ...x, templateId: 'photo-overlay' })),
        reject('brand name over budget (25)', (x) => ({ ...x, brand: { ...x.brand, name: 'x'.repeat(25) } })),
        reject('headline over budget (43)', (x) => ({ ...x, copy: { ...x.copy, headline: 'x'.repeat(43) } })),
        reject('cta over budget (21)', (x) => ({ ...x, copy: { ...x.copy, cta: 'x'.repeat(21) } })),
        reject('body text not supported', (x) => ({ ...x, copy: { ...x.copy, body: 'tekst' } })),
        reject('accent marker not supported', (x) => ({ ...x, copy: { ...x.copy, headline: 'Ableton Springs', accentPhrase: 'Springs' } })),
        reject('benefit over budget (25)', (x) => ({ ...x, copy: { ...x.copy, benefits: [benefit('x'.repeat(25))] } })),
        reject('four benefits', (x) => ({ ...x, copy: { ...x.copy, benefits: [benefit('a'), benefit('b'), benefit('c'), benefit('d')] } })),
        reject('photo must allow crop', (x) => ({ ...x, assets: [{ ...x.assets[0]!, allowCrop: false }] })),
        reject('two photos', (x) => ({ ...x, assets: [...x.assets, { assetId: 'photo-2', role: 'product', allowCrop: true }] })),
        reject('proof not supported', (x) => ({ ...x, proofFactId: FACT(1) })),
        reject('primary too light for white button text', (x) => ({ ...x, brand: { ...x.brand, primary: '#9fb5ae' } })),
        reject('band too dark for ink text', (x) => ({ ...x, brand: { ...x.brand, secondary: '#4a4a4a' } })),
        reject('accent too light on the band', (x) => ({ ...x, brand: { ...x.brand, accent: '#e0b090' } })),
        reject('free-text badge instead of a fact id', (x) => ({ ...x, badge: 'NIEUW' })),
      ],
    } : {}),
  }));
}

export function snapshotFor(built: BuiltCase, templateVersion = '0.1.0'): RenderSnapshot {
  return { schemaVersion: 1, campaignId: CAMPAIGN, creativeId: built.creativeId, revision: 1, templateId: 'atmospheric-editorial', templateVersion, language: 'nl', config: built.config, facts: built.facts };
}
