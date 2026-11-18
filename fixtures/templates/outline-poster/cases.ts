/**
 * Synthetic cases for the outline-poster template (T14). One synthetic product image, two text lengths. Everything is
 * invented for simulation; the offer is labelled "Simulatie". No owner, competitor or real product photos.
 */
import type { ContractCase } from '../../../src/server/render/contract-kit.js';
import type { RenderSnapshot, ResolvedFact, TemplateConfig } from '../../../src/shared/render-contract.js';
import { BOTTLE, png } from '../synthetic-assets.js';

export const CAMPAIGN = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const FACT = (n: number) => `ffffffff-ffff-4fff-8fff-ffffffffff${String(n).padStart(2, '0')}`;
// primary = background, secondary = outline stroke, accent = offer text.
const BRAND = { primary: '#060606', secondary: '#cecece', accent: '#d8a179' } as const;

interface Spec {
  name: string;
  creativeId: string;
  headline: string;
  topLines?: string;
  bottomLines: string[];
  cta: string;
  offer?: string;
}

async function build(spec: Spec) {
  const facts: ResolvedFact[] = [];
  const fact = (text: string) => { const id = FACT(facts.length + 1); facts.push({ id, text, verified: true }); return id; };
  const benefits = spec.bottomLines.map((text) => ({ text, factIds: [fact(`Verified source for: ${text}`)] }));
  const offerFactId = spec.offer ? fact(spec.offer) : undefined;
  const photoId = `${spec.name}-photo`; // unique per case: the harness stores assets by id within one campaign
  const config: TemplateConfig = {
    schemaVersion: 1,
    templateId: 'outline-poster',
    brand: { name: 'Demo Brand', ...BRAND, fontHeadingId: 'inter', fontBodyId: 'inter' },
    copy: {
      headline: spec.headline,
      ...(spec.topLines ? { body: spec.topLines } : {}),
      cta: spec.cta,
      benefits,
    },
    assets: [{ assetId: photoId, role: 'product', allowCrop: false }],
    ...(offerFactId ? { offerFactId } : {}),
  };
  return { name: spec.name, creativeId: spec.creativeId, config, facts, assets: [{ campaignId: CAMPAIGN, assetId: photoId, bytes: await png(BOTTLE) }] };
}

export type BuiltCase = Awaited<ReturnType<typeof build>>;

export const SPECS: Spec[] = [
  { name: 'full', creativeId: 'f0000000-0000-4000-8000-000000000001', headline: 'ADD 3 INCHES', topLines: 'HEIGHT|BOOSTING|SHOES', bottomLines: ['WHERE IT', 'MATTERS', 'MOST'], cta: 'DOWN THERE 👇', offer: 'Simulatie' },
  { name: 'minimal', creativeId: 'f0000000-0000-4000-8000-000000000002', headline: 'ADD 3 INCHES', bottomLines: [], cta: 'DOWN THERE' },
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
        reject('headline over budget (25)', (x) => ({ ...x, copy: { ...x.copy, headline: 'x'.repeat(25) } })),
        reject('four top lines', (x) => ({ ...x, copy: { ...x.copy, body: 'A|B|C|D' } })),
        reject('top line over budget (17)', (x) => ({ ...x, copy: { ...x.copy, body: 'x'.repeat(17) } })),
        reject('four bottom lines', (x) => ({ ...x, copy: { ...x.copy, benefits: [benefit('a'), benefit('b'), benefit('c'), benefit('d')] } })),
        reject('bottom line over budget (17)', (x) => ({ ...x, copy: { ...x.copy, benefits: [benefit('x'.repeat(17))] } })),
        reject('accent marker not supported', (x) => ({ ...x, copy: { ...x.copy, accentPhrase: 'ADD' } })),
        reject('two photos', (x) => ({ ...x, assets: [...x.assets, { assetId: 'photo-2', role: 'product', allowCrop: false }] })),
        reject('proof not supported', (x) => ({ ...x, proofFactId: FACT(1) })),
        reject('background too light for white headline', (x) => ({ ...x, brand: { ...x.brand, primary: '#cccccc' } })),
        reject('stroke too close to background', (x) => ({ ...x, brand: { ...x.brand, secondary: '#101010' } })),
        reject('free-text badge instead of a fact id', (x) => ({ ...x, badge: 'NIEUW' })),
      ],
    } : {}),
  }));
}

export function snapshotFor(built: BuiltCase, templateVersion = '0.1.0'): RenderSnapshot {
  return { schemaVersion: 1, campaignId: CAMPAIGN, creativeId: built.creativeId, revision: 1, templateId: 'outline-poster', templateVersion, language: 'nl', config: built.config, facts: built.facts };
}
