import { z } from 'zod';
import { escapeHtml } from './schema.js';

const id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/);
const uuid = z.string().uuid();
const factLine = z.object({ text: z.string().trim().min(1).max(48), factIds: z.array(uuid).min(1).max(5) }).strict();

/** Persisted config holds asset/fact IDs only; resolved bytes/text arrive from the engine snapshot. */
export const darkOfferStackSchema = z.object({
  schemaVersion: z.literal(1),
  templateId: z.literal('dark-offer-stack'),
  creativeId: id,
  language: z.enum(['nl', 'en', 'id']),
  brand: z.object({
    name: z.string().trim().min(1).max(100),
    primary: z.string().regex(/^#[0-9a-f]{6}$/i),
    secondary: z.string().regex(/^#[0-9a-f]{6}$/i),
    accent: z.string().regex(/^#[0-9a-f]{6}$/i),
    fontHeadingId: z.enum(['inter', 'fraunces']),
    fontBodyId: z.literal('inter'),
  }).strict(),
  product: z.object({ name: z.string().trim().min(1).max(100) }).strict(),
  headline: z.string().trim().min(1).max(90),
  benefits: z.array(factLine).min(1).max(3),
  assets: z.array(z.object({ assetId: id, role: z.enum(['product', 'lifestyle', 'detail']), allowCrop: z.boolean() }).strict()).min(1).max(2),
  offerFactId: uuid.optional(),
  proofFactId: uuid.optional(),
  cta: z.string().trim().min(1).max(32),
}).strict().superRefine((config, context) => {
  const ids = config.assets.map((asset) => asset.assetId);
  if (new Set(ids).size !== ids.length) context.addIssue({ code: 'custom', path: ['assets'], message: 'Asset IDs must be unique' });
});

export type DarkOfferStackConfig = z.infer<typeof darkOfferStackSchema>;

export interface ResolvedOfferAsset {
  assetId: string;
  role: 'product' | 'lifestyle' | 'detail';
  allowCrop: boolean;
  mime: 'image/png' | 'image/jpeg' | 'image/webp';
  width: number;
  height: number;
  src: string;
}

export interface VerifiedFact { id: string; text: string }

const RASTER_DATA_URI = /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/]*={0,2}$/i;

function resolveAsset(
  declaration: DarkOfferStackConfig['assets'][number],
  asset: ResolvedOfferAsset | undefined,
): ResolvedOfferAsset {
  if (!asset || asset.assetId !== declaration.assetId || asset.role !== declaration.role || asset.allowCrop !== declaration.allowCrop) {
    throw new Error(`Resolved asset does not match declared asset ${declaration.assetId}`);
  }
  if (!Number.isInteger(asset.width) || !Number.isInteger(asset.height) || asset.width < 1 || asset.height < 1 || asset.width > 25_000 || asset.height > 25_000) {
    throw new Error(`Invalid dimensions for asset ${declaration.assetId}`);
  }
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(asset.mime) || !RASTER_DATA_URI.test(asset.src) || asset.src.length > 14_000_000 || !asset.src.startsWith(`data:${asset.mime};base64,`)) {
    throw new Error(`Asset ${declaration.assetId} must be a bounded, engine-resolved raster`);
  }
  return asset;
}

function getFact(facts: ReadonlyMap<string, VerifiedFact>, factId: string, field: string): VerifiedFact {
  const fact = facts.get(factId);
  if (!fact || fact.id !== factId || !fact.text.trim()) throw new Error(`Missing verified fact ${factId} for ${field}`);
  return fact;
}

/** Returns the T03 body fragment only. Engine owns shell, canvas, safe/font/theme tokens and storage. */
export function renderDarkOfferStackBody(
  input: DarkOfferStackConfig,
  assets: readonly ResolvedOfferAsset[],
  facts: ReadonlyMap<string, VerifiedFact>,
): string {
  const config = darkOfferStackSchema.parse(input);
  const assetsById = new Map(assets.map((asset) => [asset.assetId, asset]));
  if (assetsById.size !== assets.length || assets.length !== config.assets.length) throw new Error('Resolved assets must uniquely match the creative manifest');
  const resolvedAssets = config.assets.map((asset) => resolveAsset(asset, assetsById.get(asset.assetId)));

  for (const [index, benefit] of config.benefits.entries()) {
    for (const factId of benefit.factIds) getFact(facts, factId, `benefits[${index}]`);
  }
  const offer = config.offerFactId ? getFact(facts, config.offerFactId, 'offerFactId') : undefined;
  const proof = config.proofFactId ? getFact(facts, config.proofFactId, 'proofFactId') : undefined;

  const benefits = config.benefits.map((benefit, index) =>
    `<li class="lf-offer-benefit" data-slot="benefit-${index + 1}" data-required="true" data-safe="true" data-fit-group="offer-copy" data-fit-min="0.8"><span class="lf-offer-mark" aria-hidden="true">•</span><span>${escapeHtml(benefit.text)}</span></li>`,
  ).join('');
  const offerBlock = offer
    ? `<div class="lf-offer-deal" data-slot="verified-offer" data-required="true" data-safe="true" data-fit-group="offer-copy" data-fit-min="0.8"><span class="lf-offer-deal-kicker">${escapeHtml(offer.text)}</span></div>`
    : '';
  const proofBlock = proof
    ? `<p class="lf-offer-proof" data-slot="verified-proof" data-required="true" data-safe="true" data-fit-group="offer-copy" data-fit-min="0.8">${escapeHtml(proof.text)}</p>`
    : '';
  const photos = resolvedAssets.map((asset, index) => {
    const fit = asset.role === 'product' || !asset.allowCrop ? 'contain' : 'cover';
    const shape = fit === 'contain' ? 'lf-offer-aperture--product' : 'lf-offer-aperture--scene';
    return `<figure class="lf-offer-aperture ${shape}" data-slot="offer-photo-${index + 1}" data-safe="true"><img class="lf-offer-photo lf-offer-photo--${fit}" data-slot="offer-image-${index + 1}" data-image-fit="${fit}"${asset.allowCrop ? ' data-allow-crop="true"' : ''} alt="${escapeHtml(config.product.name)}" src="${asset.src}"/></figure>`;
  }).join('');
  const photoGridClass = resolvedAssets.length === 1 ? 'lf-offer-photo-grid lf-offer-photo-grid--single' : 'lf-offer-photo-grid';

  return `<div class="lf-dark-offer-body" data-slot="dark-offer-body">
    <header class="lf-offer-header" data-slot="header" data-required="true" data-safe="true" data-fit-group="offer-headline" data-fit-min="0.8">
      <span class="lf-offer-brand" data-slot="brand-name">${escapeHtml(config.brand.name)}</span>
      <h1 class="lf-offer-headline">${escapeHtml(config.headline)}</h1>
    </header>
    ${offerBlock}
    ${proofBlock}
    <ul class="lf-offer-benefits" data-slot="benefits" data-required="true" data-safe="true">${benefits}</ul>
    <section class="${photoGridClass}" data-slot="product-gallery" data-required="true" data-safe="true">${photos}</section>
    <footer class="lf-offer-footer" data-slot="footer" data-safe="true"><span class="lf-offer-cta" data-slot="cta" data-required="true" data-safe="true">${escapeHtml(config.cta)}</span></footer>
  </div>`;
}
