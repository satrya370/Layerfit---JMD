/**
 * Synthetic cases for the dark-offer-stack template. Every product, fact, offer and rating here is invented for
 * simulation and labelled "simulatie" where it could be mistaken for a claim. No LayerFit, competitor or owner photos.
 */
import { BOTTLE, LOGO, SCENE, SHIRT, png } from '../synthetic-assets.js';
import type { ContractCase } from '../../../src/server/render/contract-kit.js';
import type { RenderSnapshot, ResolvedFact, TemplateConfig } from '../../../src/shared/render-contract.js';

export const CAMPAIGN = '66666666-6666-4666-8666-666666666666';
const FACT = (n: number) => `77777777-7777-4777-8777-7777777777${String(n).padStart(2, '0')}`;


const BRAND = { primary: '#262626', secondary: '#f2f0ed', accent: '#28a745' } as const;

interface Spec {
  name: string;
  creativeId: string;
  headline: string;
  accentPhrase?: string;
  benefits: string[];
  cta: string;
  fonts: [heading: 'montserrat' | 'inter' | 'fraunces' | 'poppins', body: 'poppins' | 'inter' | 'fraunces' | 'montserrat'];
  photos: Array<'bottle' | 'shirt' | 'scene'>;
  cropScene?: boolean;
  offer?: string;
  proof?: string;
  logo?: boolean;
  brandName?: string;
  brand?: { primary: string; secondary: string; accent: string };
}

const PHOTO_SVG = { bottle: BOTTLE, shirt: SHIRT, scene: SCENE } as const;

async function build(spec: Spec) {
  const facts: ResolvedFact[] = [];
  const fact = (text: string) => { const id = FACT(facts.length + 1); facts.push({ id, text, verified: true }); return id; };
  const benefits = spec.benefits.map((text) => ({ text, factIds: [fact(`Verified source for: ${text}`)] }));
  const offerFactId = spec.offer ? fact(spec.offer) : undefined;
  const proofFactId = spec.proof ? fact(spec.proof) : undefined;
  // Asset ids are unique per case: the test harness stores assets by id within one campaign.
  const assets = spec.photos.map((kind, i) => ({
    assetId: `${spec.name}-photo-${i + 1}`,
    role: kind === 'scene' ? ('lifestyle' as const) : ('product' as const),
    allowCrop: kind === 'scene' && spec.cropScene === true,
  }));
  const records = await Promise.all(spec.photos.map(async (kind, i) => ({ campaignId: CAMPAIGN, assetId: `${spec.name}-photo-${i + 1}`, bytes: await png(PHOTO_SVG[kind]) })));
  if (spec.logo) records.push({ campaignId: CAMPAIGN, assetId: `${spec.name}-logo`, bytes: await png(LOGO) });
  const config: TemplateConfig = {
    schemaVersion: 1,
    templateId: 'dark-offer-stack',
    brand: {
      name: spec.brandName ?? 'Terra Sample',
      ...(spec.logo ? { logoAssetId: `${spec.name}-logo` } : {}),
      ...(spec.brand ?? BRAND),
      fontHeadingId: spec.fonts[0],
      fontBodyId: spec.fonts[1],
    },
    copy: { headline: spec.headline, ...(spec.accentPhrase ? { accentPhrase: spec.accentPhrase } : {}), cta: spec.cta, benefits },
    assets,
    ...(offerFactId ? { offerFactId } : {}),
    ...(proofFactId ? { proofFactId } : {}),
  };
  return { name: spec.name, creativeId: spec.creativeId, config, facts, assets: records };
}

export type BuiltCase = Awaited<ReturnType<typeof build>>;

export const SPECS: Spec[] = [
  {
    name: 'full-two-photos', creativeId: 'a0000000-0000-4000-8000-000000000001',
    headline: 'Schoon thuis, zonder gedoe', accentPhrase: 'zonder gedoe',
    benefits: ['Licht en makkelijk te bewaren', 'Herbruikbaar filter', 'Twee jaar garantie (simulatie)'],
    cta: 'Bekijk het aanbod', fonts: ['montserrat', 'poppins'], photos: ['bottle', 'shirt'],
    offer: 'Simulatie: gebruik de code TEST5 bij het afrekenen', proof: 'Simulatie: beoordeeld met 4,5 uit 5', logo: true,
  },
  {
    name: 'minimal-one-photo', creativeId: 'a0000000-0000-4000-8000-000000000002',
    headline: 'Een fles voor dagelijks gebruik',
    benefits: ['Herbruikbaar', 'Roestvrij staal'],
    cta: 'Ontdek de fles', fonts: ['fraunces', 'inter'], photos: ['bottle'],
  },
  {
    name: 'crop-lifestyle', creativeId: 'a0000000-0000-4000-8000-000000000003',
    headline: 'Mooi in elke kamer',
    benefits: ['Past bij elk interieur'],
    cta: 'Bekijk de collectie', fonts: ['montserrat', 'poppins'], photos: ['bottle', 'scene'], cropScene: true,
    offer: 'Simulatie: tijdelijke actie, zie voorwaarden',
  },
  {
    name: 'long-dutch-copy', creativeId: 'a0000000-0000-4000-8000-000000000004',
    headline: 'Handig voor werkdagen en lange weekenden thuis',
    benefits: ['Verantwoordelijkheidsbewuste verpakking', 'Gemakkelijkheidshalve machinewasbaar', 'Zeventienhonderd gebruiksmomenten'],
    cta: 'Bestel nu je favoriete model', fonts: ['montserrat', 'poppins'], photos: ['shirt', 'bottle'],
    offer: 'Simulatie: gebruik actiecode WINTER bij het afrekenen', proof: 'Simulatie: klanten waarderen ons met een 4,5', logo: true,
  },
];

/**
 * A single headline word too wide for the square copy column even at the minimum fit scale. Words are never broken,
 * so this must fail in square with a layout error rather than render a broken word. Portrait and vertical are wider.
 */
SPECS.push({
  name: 'unbreakable-word', creativeId: 'a0000000-0000-4000-8000-000000000005',
  headline: 'Onweerstaanbaar goed', benefits: ['Herbruikbaar'], cta: 'Bekijk het aanbod', fonts: ['montserrat', 'poppins'], photos: ['bottle'],
});
/** Case name → formats where a layout failure is the expected, correct outcome. */
export const EXPECTED_FAILURES: Readonly<Record<string, readonly string[]>> = { 'unbreakable-word': ['square'] };

export async function builtCases(): Promise<BuiltCase[]> {
  return Promise.all(SPECS.map(build));
}

/** Contract-kit cases, with extra configs the template schema must reject. */
export async function contractCases(): Promise<ContractCase[]> {
  const cases = await builtCases();
  const full = cases[0]!;
  const c = full.config;
  const reject = (name: string, patch: (config: TemplateConfig) => unknown) => ({ name, config: patch(structuredClone(c)) });
  return cases.map((built, i) => ({
    name: built.name,
    campaignId: CAMPAIGN,
    config: built.config,
    facts: built.facts,
    assets: built.assets,
    ...(i === 0 ? {
      rejects: [
        reject('wrong template id', (x) => ({ ...x, templateId: 'dual-panel' })),
        reject('headline over budget (56)', (x) => ({ ...x, copy: { ...x.copy, headline: 'x'.repeat(56), accentPhrase: undefined } })),
        reject('benefit over budget (49)', (x) => ({ ...x, copy: { ...x.copy, benefits: [{ text: 'x'.repeat(49), factIds: [FACT(1)] }] } })),
        reject('four benefits', (x) => ({ ...x, copy: { ...x.copy, benefits: [...x.copy.benefits, ...x.copy.benefits] } })),
        reject('three photos', (x) => ({ ...x, assets: [...x.assets, { assetId: 'photo-3', role: 'product', allowCrop: false }] })),
        reject('body text not supported', (x) => ({ ...x, copy: { ...x.copy, body: 'extra' } })),
        reject('callouts not supported', (x) => ({ ...x, callouts: [{ benefitIndex: 0, anchor: { x: 0.5, y: 0.5 } }] })),
        reject('comparison block not supported', (x) => ({ ...x, comparisonEvidenceId: FACT(1) })),
        reject('primary too light for white text', (x) => ({ ...x, brand: { ...x.brand, primary: '#eeeeee' } })),
        reject('secondary too dark for footer text', (x) => ({ ...x, brand: { ...x.brand, secondary: '#222222' } })),
        reject('accent too light for the check mark', (x) => ({ ...x, brand: { ...x.brand, accent: '#f5f5f5' } })),
        reject('free-text offer label instead of a fact id', (x) => ({ ...x, offerLabel: '5% EXTRA KORTING' })),
      ],
    } : {}),
  }));
}

/** Render snapshot for a built case. */
export function snapshotFor(built: BuiltCase, templateVersion = '0.1.0'): RenderSnapshot {
  return {
    schemaVersion: 1, campaignId: CAMPAIGN, creativeId: built.creativeId, revision: 1,
    templateId: 'dark-offer-stack', templateVersion, language: 'nl', config: built.config, facts: built.facts,
  };
}
