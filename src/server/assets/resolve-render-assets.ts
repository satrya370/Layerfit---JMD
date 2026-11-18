import { createHash } from 'node:crypto';
import type { ResolvedAsset, TemplateConfig } from '../../shared/render-contract.js';
import { RenderError } from '../render/errors.js';
import { normalizeImage, type NormalizedImage } from './normalize-image.js';

/** Campaign-owned asset bytes. Implemented by the asset service (DB/storage) or by fixtures; never by URL fetch. */
export interface AssetRecord { campaignId: string; assetId: string; bytes: Buffer }
export interface AssetSource { get(campaignId: string, assetId: string): Promise<AssetRecord | undefined> }

export class MemoryAssetSource implements AssetSource {
  readonly #records = new Map<string, AssetRecord>();
  put(record: AssetRecord): this { this.#records.set(record.assetId, record); return this; }
  async get(_campaignId: string, assetId: string) { return this.#records.get(assetId); }
}

export interface ResolvedRenderAssets { photos: ResolvedAsset[]; logo?: ResolvedAsset; hashes: string[] }

/**
 * Resolves config asset IDs to normalized data URIs. Normalization is cached by source hash so the
 * three formats of one creative decode each photo once. Cache is bounded (LRU by insertion order).
 */
export class RenderAssetResolver {
  readonly #cache = new Map<string, Promise<NormalizedImage>>();
  constructor(private readonly source: AssetSource, private readonly options: { cacheEntries?: number; maxEdge?: number } = {}) {}

  async resolve(campaignId: string, config: TemplateConfig): Promise<ResolvedRenderAssets> {
    const photos = await Promise.all(config.assets.map(async (ref) => ({
      ...(await this.#resolveOne(campaignId, ref.assetId)), role: ref.role, allowCrop: ref.allowCrop,
      ...(ref.kind ? { kind: ref.kind } : {}),
      ...(ref.focalPoint ? { focalPoint: ref.focalPoint } : {}),
    }) satisfies ResolvedAsset));
    const logoId = config.brand.logoAssetId;
    const logo = logoId ? { ...(await this.#resolveOne(campaignId, logoId)), role: 'logo' as const, allowCrop: false } : undefined;
    return { photos, ...(logo ? { logo } : {}), hashes: [...photos, ...(logo ? [logo] : [])].map((a) => a.sha256) };
  }

  async #resolveOne(campaignId: string, assetId: string) {
    const record = await this.source.get(campaignId, assetId);
    // Same error for "missing" and "other campaign" so asset existence is not disclosed.
    if (!record || record.campaignId !== campaignId || record.assetId !== assetId) {
      throw new RenderError('ASSET_FORBIDDEN', 'assets', `Asset not available to this campaign: ${assetId}`);
    }
    const maxEdge = this.options.maxEdge ?? 2400;
    const key = `${maxEdge}:${createHash('sha256').update(record.bytes).digest('hex')}`;
    let normalized = this.#cache.get(key);
    if (!normalized) {
      normalized = normalizeImage(record.bytes, maxEdge);
      normalized.catch(() => this.#cache.delete(key));
      this.#cache.set(key, normalized);
      while (this.#cache.size > (this.options.cacheEntries ?? 32)) this.#cache.delete(this.#cache.keys().next().value!);
    }
    const image = await normalized;
    return { assetId, mime: image.mime, width: image.width, height: image.height, sha256: image.sha256, src: `data:${image.mime};base64,${image.bytes.toString('base64')}` };
  }
}
