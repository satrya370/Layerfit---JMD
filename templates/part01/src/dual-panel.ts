import { z } from 'zod';
import { escapeHtml } from './schema.js';

const id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/);
const uuid = z.string().uuid();
const fact = z.object({ text: z.string().trim().min(1).max(42), factIds: z.array(uuid).min(1).max(5) }).strict();
const panel = z.object({
  label: z.string().trim().min(1).max(22),
  assetId: id.optional(),
  facts: z.array(fact).min(1).max(3),
}).strict();

/** Persisted configuration references owned assets; it never contains image bytes or URLs. */
export const dualPanelSchema = z.object({
  schemaVersion: z.literal(1),
  templateId: z.literal('dual-panel'),
  creativeId: id,
  language: z.enum(['nl', 'en', 'id']),
  mode: z.enum(['dual-benefit', 'verified-comparison']),
  brand: z.object({
    name: z.string().trim().min(1).max(64),
    primary: z.string().regex(/^#[0-9a-f]{6}$/i),
    secondary: z.string().regex(/^#[0-9a-f]{6}$/i),
    accent: z.string().regex(/^#[0-9a-f]{6}$/i),
    fontHeadingId: z.enum(['inter', 'fraunces']),
    fontBodyId: z.literal('inter'),
  }).strict(),
  product: z.object({ name: z.string().trim().min(1).max(100) }).strict(),
  headline: z.string().trim().min(1).max(90),
  panels: z.tuple([panel, panel]),
  assets: z.array(z.object({
    assetId: id,
    role: z.enum(['product', 'lifestyle', 'detail']),
    allowCrop: z.boolean(),
  }).strict()).min(1).max(2),
  comparisonEvidenceId: uuid.optional(),
  cta: z.string().trim().min(1).max(32),
}).strict().superRefine((config, context) => {
  const knownAssets = new Map(config.assets.map((asset) => [asset.assetId, asset]));
  if (knownAssets.size !== config.assets.length) {
    context.addIssue({ code: 'custom', path: ['assets'], message: 'Asset IDs must be unique' });
  }
  const panelAssetIds = config.panels.flatMap((item) => item.assetId ? [item.assetId] : []);
  if (new Set(panelAssetIds).size !== panelAssetIds.length) {
    context.addIssue({ code: 'custom', path: ['panels'], message: 'Do not reuse one photo as if it were two distinct views' });
  }
  for (const [index, panelAssetId] of config.panels.map((item) => item.assetId).entries()) {
    if (panelAssetId && !knownAssets.has(panelAssetId)) {
      context.addIssue({ code: 'custom', path: ['panels', index, 'assetId'], message: 'Panel references an undeclared asset' });
    }
  }
  if (panelAssetIds.length !== config.assets.length) {
    context.addIssue({ code: 'custom', path: ['assets'], message: 'Every declared image must be assigned to exactly one panel' });
  }
  if (config.assets.length === 1 && (config.panels[0].assetId === undefined || config.panels[1].assetId !== undefined)) {
    context.addIssue({ code: 'custom', path: ['panels'], message: 'Single-photo fallback assigns the one image to the left panel only' });
  }
  if (config.mode === 'verified-comparison' && !config.comparisonEvidenceId) {
    context.addIssue({ code: 'custom', path: ['comparisonEvidenceId'], message: 'Comparison mode requires evidence' });
  }
  if (config.mode === 'dual-benefit' && config.comparisonEvidenceId) {
    context.addIssue({ code: 'custom', path: ['comparisonEvidenceId'], message: 'Dual-benefit mode must not imply a competitor comparison' });
  }
});

export type DualPanelConfig = z.infer<typeof dualPanelSchema>;

export interface ResolvedDualPanelAsset {
  assetId: string;
  role: 'product' | 'lifestyle' | 'detail';
  allowCrop: boolean;
  mime: 'image/png' | 'image/jpeg' | 'image/webp';
  width: number;
  height: number;
  src: string;
}

const DATA_IMAGE = /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/]*={0,2}$/i;

function validateResolvedAsset(configAsset: DualPanelConfig['assets'][number], resolved: ResolvedDualPanelAsset | undefined): ResolvedDualPanelAsset {
  if (!resolved || resolved.assetId !== configAsset.assetId || resolved.role !== configAsset.role || resolved.allowCrop !== configAsset.allowCrop) {
    throw new Error(`Resolved asset does not match declared asset ${configAsset.assetId}`);
  }
  if (!Number.isInteger(resolved.width) || !Number.isInteger(resolved.height) || resolved.width < 1 || resolved.height < 1 || resolved.width > 25_000 || resolved.height > 25_000) {
    throw new Error(`Invalid dimensions for asset ${configAsset.assetId}`);
  }
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(resolved.mime) || !DATA_IMAGE.test(resolved.src) || resolved.src.length > 14_000_000 || !resolved.src.startsWith(`data:${resolved.mime};base64,`)) {
    throw new Error(`Asset ${configAsset.assetId} must use a bounded engine-resolved raster data URI`);
  }
  return resolved;
}

/**
 * Produces only the T02 body fragment. The engine owns the document shell, canvas, tokens,
 * asset ownership and normalization. This prototype accepts only resolver-issued data URIs.
 */
export function renderDualPanelBody(
  input: DualPanelConfig,
  resolvedAssets: readonly ResolvedDualPanelAsset[],
): string {
  const config = dualPanelSchema.parse(input);
  const resolvedById = new Map(resolvedAssets.map((asset) => [asset.assetId, asset]));
  if (resolvedById.size !== resolvedAssets.length || resolvedAssets.length !== config.assets.length) {
    throw new Error('Resolved assets must uniquely match the template asset manifest');
  }
  const safeAssets = new Map(config.assets.map((asset) => [asset.assetId, validateResolvedAsset(asset, resolvedById.get(asset.assetId))]));
  const heading = `<header class="lf-dual-headline" data-slot="headline" data-required="true" data-safe="true" data-fit-group="dual-headline" data-fit-min="0.8"><span class="lf-dual-brand" data-slot="brand-name">${escapeHtml(config.brand.name)}</span><h1>${escapeHtml(config.headline)}</h1></header>`;
  const panels = config.panels.map((item, index) => {
    const side = index === 0 ? 'left' : 'right';
    const asset = item.assetId ? safeAssets.get(item.assetId) : undefined;
    const fit = asset?.role === 'product' || (asset && !asset.allowCrop) ? 'contain' : 'cover';
    const image = asset
      ? `<img class="lf-dual-photo lf-dual-photo--${fit}" data-slot="panel-photo-${side}" data-image-fit="${fit}"${asset.allowCrop ? ' data-allow-crop="true"' : ''} alt="${escapeHtml(config.product.name)} — ${escapeHtml(item.label)}" src="${asset.src}"/>`
      : '';
    const infoOnly = asset ? '' : ' lf-dual-panel--information';
    const facts = item.facts.map((entry, factIndex) =>
      `<li class="lf-dual-fact" data-slot="${side}-fact-${factIndex + 1}" data-required="true" data-safe="true" data-fit-group="panel-copy" data-fit-min="0.8"><span class="lf-dual-fact-mark" aria-hidden="true">•</span><span>${escapeHtml(entry.text)}</span></li>`,
    ).join('');
    return `<article class="lf-dual-panel-card${infoOnly}" data-slot="panel-${side}" data-panel-mode="${config.mode}">${image}${asset ? `<div class="lf-dual-scrim" data-slot="panel-scrim-${side}" aria-hidden="true"></div>` : ''}<div class="lf-dual-panel-content" data-slot="panel-content-${side}" data-safe="true"${asset ? ` data-allow-overlap="panel-photo-${side} panel-scrim-${side}"` : ''}><h2 class="lf-dual-label" data-slot="panel-label-${side}" data-required="true" data-safe="true" data-fit-group="panel-label" data-fit-min="0.8">${escapeHtml(item.label)}</h2><ul class="lf-dual-facts" data-slot="panel-facts-${side}" data-required="true" data-safe="true">${facts}</ul></div></article>`;
  }).join('');
  const footer = `<footer class="lf-dual-footer" data-slot="footer" data-safe="true"><span class="lf-dual-cta" data-slot="cta" data-required="true" data-safe="true">${escapeHtml(config.cta)}</span></footer>`;
  return `${heading}<section class="lf-dual-panels" data-slot="panels" data-required="true">${panels}</section>${footer}`;
}
