/**
 * Synthetic cases for the photo-overlay template (T08). One picture, two modes (may be cropped / must stay whole), a few
 * text lengths. Everything is invented for simulation; the offer is labelled "simulatie". No LayerFit, competitor or owner photos.
 */
import type { ContractCase } from '../../../src/server/render/contract-kit.js';
import type { RenderSnapshot, ResolvedFact, TemplateConfig } from '../../../src/shared/render-contract.js';
import { SCENE, png } from '../synthetic-assets.js';

export const CAMPAIGN = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const FACT = (n: number) => `ffffffff-ffff-4fff-8fff-ffffffffff${String(n).padStart(2, '0')}`;
const BRAND = { primary: '#17332f', secondary: '#efe9de', accent: '#f2b134' } as const;

interface Spec {
  name: string;
  creativeId: string;
  headline: string;
  accentPhrase?: string;
  body?: string;
  benefits: string[];
  cta: string;
  crop: boolean;
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
    templateId: 'photo-overlay',
    brand: { name: 'Terra', ...BRAND, fontHeadingId: 'inter', fontBodyId: 'inter' },
    copy: {
      headline: spec.headline,
      ...(spec.accentPhrase ? { accentPhrase: spec.accentPhrase } : {}),
      ...(spec.body ? { body: spec.body } : {}),
      cta: spec.cta,
      benefits,
    },
    assets: [{ assetId: photoId, role: 'lifestyle', allowCrop: spec.crop }],
    ...(offerFactId ? { offerFactId } : {}),
  };
  return { name: spec.name, creativeId: spec.creativeId, config, facts, assets: [{ campaignId: CAMPAIGN, assetId: photoId, bytes: await png(SCENE) }] };
}

export type BuiltCase = Awaited<ReturnType<typeof build>>;

export const SPECS: Spec[] = [
  {
    name: 'cover-full', creativeId: 'd0000000-0000-4000-8000-000000000001',
    headline: 'Water mee, waar je ook gaat', accentPhrase: 'waar je ook gaat',
    body: 'Een herbruikbare fles voor onderweg en thuis.',
    benefits: ['Herbruikbaar', 'Roestvrij staal', 'Past in elke tas'],
    cta: 'Bekijk de fles', crop: true, offer: 'Simulatie: gratis verzending boven 50',
  },
  {
    name: 'contain-full', creativeId: 'd0000000-0000-4000-8000-000000000002',
    headline: 'Water mee, waar je ook gaat', accentPhrase: 'waar je ook gaat',
    body: 'Een herbruikbare fles voor onderweg en thuis.',
    benefits: ['Herbruikbaar', 'Roestvrij staal', 'Past in elke tas'],
    cta: 'Bekijk de fles', crop: false, offer: 'Simulatie: gratis verzending boven 50',
  },
  {
    name: 'cover-minimal', creativeId: 'd0000000-0000-4000-8000-000000000003',
    headline: 'Een fles voor elke dag', benefits: [], cta: 'Ontdek de fles', crop: true,
  },
  {
    name: 'cover-long', creativeId: 'd0000000-0000-4000-8000-000000000004',
    headline: 'Handig voor werkdagen en lange weekenden thuis', accentPhrase: 'lange weekenden',
    body: 'Een stevige fles voor onderweg, op kantoor en in de sportschool.',
    benefits: ['Verantwoorde verpakking', 'Makkelijk schoon te maken', 'Past in bekerhouders'],
    cta: 'Bestel nu je favoriete model', crop: true, offer: 'Simulatie: gebruik actiecode WINTER',
  },
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
        reject('wrong template id', (x) => ({ ...x, templateId: 'split-composition' })),
        reject('brand name over budget (25)', (x) => ({ ...x, brand: { ...x.brand, name: 'x'.repeat(25) } })),
        reject('headline over budget (57)', (x) => ({ ...x, copy: { ...x.copy, headline: 'x'.repeat(57), accentPhrase: undefined } })),
        reject('body over budget (91)', (x) => ({ ...x, copy: { ...x.copy, body: 'x'.repeat(91) } })),
        reject('benefit over budget (29)', (x) => ({ ...x, copy: { ...x.copy, benefits: [benefit('x'.repeat(29))] } })),
        reject('four benefits', (x) => ({ ...x, copy: { ...x.copy, benefits: [benefit('a'), benefit('b'), benefit('c'), benefit('d')] } })),
        reject('two photos', (x) => ({ ...x, assets: [...x.assets, { assetId: 'photo-2', role: 'product', allowCrop: false }] })),
        reject('proof not supported', (x) => ({ ...x, proofFactId: FACT(1) })),
        reject('callouts not supported', (x) => ({ ...x, callouts: [{ benefitIndex: 0, anchor: { x: 0.5, y: 0.5 } }] })),
        reject('comparison not supported', (x) => ({ ...x, comparisonEvidenceId: FACT(1) })),
        reject('primary too light for white text', (x) => ({ ...x, brand: { ...x.brand, primary: '#dddddd' } })),
        reject('accent too dark for dark text', (x) => ({ ...x, brand: { ...x.brand, accent: '#204030' } })),
        reject('free-text badge instead of a fact id', (x) => ({ ...x, badge: 'NIEUW' })),
      ],
    } : {}),
  }));
}

export function snapshotFor(built: BuiltCase, templateVersion = '0.1.0'): RenderSnapshot {
  return { schemaVersion: 1, campaignId: CAMPAIGN, creativeId: built.creativeId, revision: 1, templateId: 'photo-overlay', templateVersion, language: 'nl', config: built.config, facts: built.facts };
}
