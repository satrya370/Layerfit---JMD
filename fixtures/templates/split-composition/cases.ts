/**
 * Synthetic cases for the split-composition template (T05). Every product, fact, offer and rating here is invented for
 * simulation and labelled "simulatie" where it could be mistaken for a claim. No LayerFit, competitor or owner photos.
 */
import type { ContractCase } from '../../../src/server/render/contract-kit.js';
import type { RenderSnapshot, ResolvedFact, TemplateConfig } from '../../../src/shared/render-contract.js';
import { BOTTLE, LOGO, SCENE, png } from '../synthetic-assets.js';

export const CAMPAIGN = '88888888-8888-4888-8888-888888888888';
const FACT = (n: number) => `99999999-9999-4999-8999-9999999999${String(n).padStart(2, '0')}`;

/** Palette taken from the owner's design: dark green panel, warm light panel, lime accent. */
const BRAND = { primary: '#173028', secondary: '#e9e8e0', accent: '#d5f86a' } as const;

interface Spec {
  name: string;
  creativeId: string;
  headline: string;
  accentPhrase?: string;
  body?: string;
  benefits: string[];
  cta: string;
  photo: 'bottle' | 'scene';
  cropScene?: boolean;
  offer?: string;
  proof?: string;
  logo?: boolean;
  brandName?: string;
}

async function build(spec: Spec) {
  const facts: ResolvedFact[] = [];
  const fact = (text: string) => { const id = FACT(facts.length + 1); facts.push({ id, text, verified: true }); return id; };
  const benefits = spec.benefits.map((text) => ({ text, factIds: [fact(`Verified source for: ${text}`)] }));
  const offerFactId = spec.offer ? fact(spec.offer) : undefined;
  const proofFactId = spec.proof ? fact(spec.proof) : undefined;
  // Asset ids are unique per case: the test harness stores assets by id within one campaign.
  const photoId = `${spec.name}-photo`;
  const records = [{ campaignId: CAMPAIGN, assetId: photoId, bytes: await png(spec.photo === 'scene' ? SCENE : BOTTLE) }];
  if (spec.logo) records.push({ campaignId: CAMPAIGN, assetId: `${spec.name}-logo`, bytes: await png(LOGO) });
  const config: TemplateConfig = {
    schemaVersion: 1,
    templateId: 'split-composition',
    brand: {
      name: spec.brandName ?? 'Terra Sample',
      ...(spec.logo ? { logoAssetId: `${spec.name}-logo` } : {}),
      ...BRAND,
      fontHeadingId: 'inter',
      fontBodyId: 'inter',
    },
    copy: {
      headline: spec.headline,
      ...(spec.accentPhrase ? { accentPhrase: spec.accentPhrase } : {}),
      ...(spec.body ? { body: spec.body } : {}),
      cta: spec.cta,
      benefits,
    },
    assets: [{ assetId: photoId, role: spec.photo === 'scene' ? 'lifestyle' : 'product', allowCrop: spec.photo === 'scene' && spec.cropScene === true }],
    ...(offerFactId ? { offerFactId } : {}),
    ...(proofFactId ? { proofFactId } : {}),
  };
  return { name: spec.name, creativeId: spec.creativeId, config, facts, assets: records };
}

export type BuiltCase = Awaited<ReturnType<typeof build>>;

export const SPECS: Spec[] = [
  {
    name: 'full', creativeId: 'b0000000-0000-4000-8000-000000000001',
    headline: 'Ontdek de nieuwe fles', accentPhrase: 'nieuwe fles',
    body: 'Bekijk het product, ontdek de details en vind wat bij jou past.',
    benefits: ['Herbruikbaar', 'Roestvrij staal', 'Past in elke tas'],
    cta: 'Bekijk product', photo: 'bottle', logo: true,
    offer: 'Simulatie: ontdek de collectie', proof: 'Simulatie: gemaakt om te ontdekken',
  },
  {
    name: 'minimal', creativeId: 'b0000000-0000-4000-8000-000000000002',
    headline: 'Een fles voor elke dag', benefits: [], cta: 'Ontdek de fles', photo: 'bottle',
  },
  {
    name: 'crop-lifestyle', creativeId: 'b0000000-0000-4000-8000-000000000003',
    headline: 'Mooi in elke kamer', accentPhrase: 'elke kamer',
    benefits: ['Past bij elk interieur'], cta: 'Bekijk de collectie', photo: 'scene', cropScene: true,
    offer: 'Simulatie: tijdelijke actie, zie voorwaarden',
  },
  {
    name: 'long-dutch-copy', creativeId: 'b0000000-0000-4000-8000-000000000004',
    headline: 'Handig voor werkdagen en lange weekenden thuis', accentPhrase: 'lange weekenden thuis',
    body: 'Een stevige fles voor onderweg, op kantoor en in de sportschool, met een dop die goed afsluit.',
    benefits: ['Verantwoordelijke verpakking', 'Gemakkelijk schoon te maken', 'Zeventienhonderd gebruiksmoment'],
    cta: 'Bestel nu je favoriete model', photo: 'bottle', logo: true,
    offer: 'Simulatie: gebruik actiecode WINTER bij het afrekenen', proof: 'Simulatie: klanten waarderen ons met een 4,5',
  },
  {
    name: 'unbreakable-word', creativeId: 'b0000000-0000-4000-8000-000000000005',
    headline: 'Verantwoordelijkheidsbewuste keuze', benefits: [], cta: 'Bekijk het aanbod', photo: 'bottle',
  },
];

/**
 * A headline word too wide for any format even at the minimum fit scale. Words are never broken, so every format must
 * fail with a layout error instead of rendering a broken word.
 */
export const EXPECTED_FAILURES: Readonly<Record<string, readonly string[]>> = { 'unbreakable-word': ['square', 'portrait', 'vertical'] };

export async function builtCases(): Promise<BuiltCase[]> {
  return Promise.all(SPECS.map(build));
}

/** Contract-kit cases, with extra configs the template schema must reject. */
export async function contractCases(): Promise<ContractCase[]> {
  const cases = await builtCases();
  const c = cases[0]!.config;
  const reject = (name: string, patch: (config: TemplateConfig) => unknown) => ({ name, config: patch(structuredClone(c)) });
  const benefit = (text: string) => ({ text, factIds: [FACT(1)] });
  return cases.map((built, i) => ({
    name: built.name,
    campaignId: CAMPAIGN,
    config: built.config,
    facts: built.facts,
    assets: built.assets,
    ...(i === 0 ? {
      rejects: [
        reject('wrong template id', (x) => ({ ...x, templateId: 'dark-offer-stack' })),
        reject('headline over budget (51)', (x) => ({ ...x, copy: { ...x.copy, headline: 'x'.repeat(51), accentPhrase: undefined } })),
        reject('body over budget (121)', (x) => ({ ...x, copy: { ...x.copy, body: 'x'.repeat(121) } })),
        reject('benefit over budget (33)', (x) => ({ ...x, copy: { ...x.copy, benefits: [benefit('x'.repeat(33))] } })),
        reject('four benefits', (x) => ({ ...x, copy: { ...x.copy, benefits: [benefit('a'), benefit('b'), benefit('c'), benefit('d')] } })),
        reject('two photos', (x) => ({ ...x, assets: [...x.assets, { assetId: 'photo-2', role: 'product', allowCrop: false }] })),
        reject('no photo', (x) => ({ ...x, assets: [] })),
        reject('callouts not supported', (x) => ({ ...x, callouts: [{ benefitIndex: 0, anchor: { x: 0.5, y: 0.5 } }] })),
        reject('comparison block not supported', (x) => ({ ...x, comparisonEvidenceId: FACT(1) })),
        reject('primary too light for light text', (x) => ({ ...x, brand: { ...x.brand, primary: '#dddddd' } })),
        reject('secondary too dark for dark text', (x) => ({ ...x, brand: { ...x.brand, secondary: '#222222' } })),
        reject('accent too dark for the button text', (x) => ({ ...x, brand: { ...x.brand, accent: '#204030' } })),
        reject('accent too close to the dark panel', (x) => ({ ...x, brand: { ...x.brand, primary: '#3a5a4a', accent: '#6c9a84' } })),
        reject('free-text eyebrow instead of a fact id', (x) => ({ ...x, eyebrow: 'PRODUCT SPOTLIGHT · 05/15' })),
      ],
    } : {}),
  }));
}

/** Render snapshot for a built case. */
export function snapshotFor(built: BuiltCase, templateVersion = '0.1.0'): RenderSnapshot {
  return {
    schemaVersion: 1, campaignId: CAMPAIGN, creativeId: built.creativeId, revision: 1,
    templateId: 'split-composition', templateVersion, language: 'nl', config: built.config, facts: built.facts,
  };
}
