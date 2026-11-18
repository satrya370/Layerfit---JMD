/**
 * Contract cases derived from a template's content manifest (slot_normalization_plan.md Task 2.2). One valid base case
 * gives the brand colours, fonts and a photo; everything else is generated, so every template is exercised with the
 * fullest content it claims to take, the least it needs, no logo, and no offer, without hand-written fixtures.
 */
import type { ContentManifest, TemplateModule } from '../../shared/render-contract.js';
import type { AssetRecord } from '../assets/resolve-render-assets.js';
import type { ContractCase } from './contract-kit.js';

type Obj = Record<string, unknown>;
const isObj = (value: unknown): value is Obj => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Repeated Dutch words cut to exactly `length` characters. Never ends in a space, so a trimming schema keeps the full length. */
export function budgetText(length: number): string {
  const text = 'Duurzaam '.repeat(Math.ceil(length / 9) + 1).slice(0, Math.max(1, length));
  return text.endsWith(' ') ? `${text.slice(0, -1)}d` : text;
}

const LOGO_ID = 'manifest-logo';
/**
 * A 160x40 wordmark-shaped PNG with a transparent background. It must differ from the photo bytes: the kit tells the logo from
 * a photo by their image data, so a template that puts a photo in the brand slot is not mistaken for one that shows the logo.
 */
const LOGO_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAKAAAAAoCAYAAAB5LPGYAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAY0lEQVR42u3SQQ0AAAjEMEScf6uggsCjTeZgVQAAAAAAAMCFJK39nGZAAxrQgBjQgAY0IAY0oAENaEBzGNCABjSgDGhAAxpQBjSgAQ0oAxrQgAaUAQ1oQAPKgAAAAAAAAMAXA16nycYbgI9MAAAAAElFTkSuQmCC',
  'base64',
);

interface Shape {
  /** Every optional field the manifest allows, at its budget. Otherwise only what the manifest requires, kept short. */
  full: boolean;
  logo: boolean;
  /** `offer` = a verified offer, `hero` = a hero fact in its place, `none` = neither. */
  offer: 'offer' | 'hero' | 'none';
}

/** What is taken from the base case: its config (kept as the starting point), the brand and first asset inside it, and that asset's bytes. */
interface Base { source: ContractCase; config: Obj; brand: Obj; asset: Obj; bytes: Buffer }

function build(name: string, manifest: ContentManifest, base: Base, shape: Shape): ContractCase {
  const { source } = base;
  const facts: ContractCase['facts'] = [];
  const fact = (text: string) => {
    const id = `manifest-fact-${facts.length + 1}`;
    facts.push({ id, text, verified: true });
    return id;
  };
  const short = (max: number) => budgetText(Math.min(12, max));

  const copy: Obj = {
    headline: shape.full ? budgetText(manifest.headline.max) : short(manifest.headline.max),
    cta: shape.full ? budgetText(manifest.cta.max) : short(manifest.cta.max),
  };
  if (shape.full && manifest.eyebrow.use === 'optional') copy.eyebrow = budgetText(manifest.eyebrow.max ?? 48);
  if (shape.full && manifest.body.use === 'optional') {
    copy.body = budgetText(manifest.body.max ?? 240);
    copy.bodyFactIds = [fact('Verified source for the description')];
  }
  const benefitCount = shape.full ? manifest.benefits.max : manifest.benefits.min;
  copy.benefits = Array.from({ length: benefitCount }, (_, i) => ({
    text: budgetText(shape.full ? manifest.benefits.chars ?? 240 : Math.min(8, manifest.benefits.chars ?? 8)),
    factIds: [fact(`Verified source for benefit ${i + 1}`)],
  }));

  const photoCount = shape.full ? manifest.photos.max : manifest.photos.min;
  const assets: Obj[] = []; const records: AssetRecord[] = [];
  for (let i = 0; i < photoCount; i++) {
    const assetId = `manifest-photo-${i + 1}`;
    assets.push({ ...base.asset, assetId, ...(manifest.photos.kind === 'any' ? {} : { kind: manifest.photos.kind }) });
    records.push({ campaignId: source.campaignId, assetId, bytes: base.bytes });
  }

  const brand: Obj = { ...base.brand };
  delete brand.logoAssetId;
  if (shape.logo) { brand.logoAssetId = LOGO_ID; records.push({ campaignId: source.campaignId, assetId: LOGO_ID, bytes: LOGO_PNG }); }

  // Start from the base config so fields this generator does not know about (a template's own extension, the product name) carry over;
  // then drop what depends on the content being generated, and set the generated parts.
  const config = structuredClone(base.config);
  for (const key of ['offerFactId', 'heroFactId', 'proofFactId', 'disclaimerFactId', 'callouts']) delete config[key];
  Object.assign(config, { brand, copy, assets });
  if (shape.offer === 'offer') config.offerFactId = fact('25% korting');
  if (shape.offer === 'hero') config.heroFactId = fact('12 uur warm');
  if (shape.full && manifest.proof === 'optional') config.proofFactId = fact('Beoordeeld met 4,5 uit 5');
  if (shape.full && manifest.disclaimer === 'optional') config.disclaimerFactId = fact('Voorwaarden staan op de website');

  return { name, campaignId: source.campaignId, config, facts, assets: records, ...(source.formats ? { formats: source.formats } : {}) };
}

/**
 * The derived cases for a module that declares `content`:
 * - `max`: every allowed field at its budget, with logo and offer.
 * - `min`: required fields only (short text, no logo, an offer only when the manifest requires one).
 * - `no-logo`: as `max`, without the logo.
 * - `no-offer`: as `max`, with a hero fact instead of the offer. Not derived for `offer-only` templates, which cannot run without one.
 * Returns nothing for a module without `content`, for comparison designs (they need their own inputs) or an unusable base case;
 * the kit reports the last of these as a failing `cases.derived` check.
 */
export function manifestCases(module: TemplateModule, source: ContractCase): ContractCase[] {
  const manifest = module.content;
  const config = source.config;
  if (!manifest || manifest.comparison || !isObj(config) || !isObj(config.brand) || !Array.isArray(config.assets) || !isObj(config.assets[0])) return [];
  const asset = config.assets[0];
  const record = source.assets.find((candidate) => candidate.assetId === asset.assetId);
  if (!record) return [];
  const base: Base = { source, config, brand: config.brand, asset, bytes: record.bytes };
  const make = (suffix: string, shape: Shape) => build(`${source.name}:${suffix}`, manifest, base, shape);
  const offerRequired = manifest.offer !== 'optional-or-hero';
  return [
    make('max', { full: true, logo: true, offer: 'offer' }),
    make('min', { full: false, logo: false, offer: offerRequired ? 'offer' : 'none' }),
    make('no-logo', { full: true, logo: false, offer: 'offer' }),
    ...(manifest.offer === 'offer-only' ? [] : [make('no-offer', { full: true, logo: true, offer: 'hero' })]),
  ];
}
