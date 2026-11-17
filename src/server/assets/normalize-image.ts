/**
 * Raster normalization, carried over from the tested LayerFit prototype (src/server/assets/normalize.ts)
 * and extended with hashes, intrinsic dimensions, alpha-aware encoding and a configurable max edge.
 */
import { createHash } from 'node:crypto';
import sharp, { type Metadata } from 'sharp';
import { RenderError } from '../render/errors.js';

export const IMAGE_LIMITS = { maxBytes: 10 * 1024 * 1024, maxPixels: 25_000_000 } as const;

export interface NormalizedImage {
  bytes: Buffer;
  mime: 'image/png' | 'image/jpeg';
  width: number;
  height: number;
  sourceSha256: string;
  sha256: string;
}

/** Decode actual bytes (not name/extension/MIME), apply EXIF orientation, strip metadata, re-encode. SVG/animated/corrupt input is rejected. */
export async function normalizeImage(bytes: Buffer, maxEdge = 2400): Promise<NormalizedImage> {
  if (!bytes.length || bytes.length > IMAGE_LIMITS.maxBytes) throw new RenderError('ASSET_INVALID', 'assets', 'Image must be 1 byte to 10MB');
  let metadata: Metadata;
  try { metadata = await sharp(bytes, { limitInputPixels: IMAGE_LIMITS.maxPixels, failOn: 'error' }).metadata(); }
  catch (cause) { throw new RenderError('ASSET_INVALID', 'assets', 'Image could not be decoded', { cause }); }
  if (!['png', 'jpeg', 'webp'].includes(metadata.format ?? '') || (metadata.pages ?? 1) > 1) {
    throw new RenderError('ASSET_INVALID', 'assets', 'Only static PNG, JPEG and WebP images are supported');
  }
  try {
    const pipeline = sharp(bytes, { limitInputPixels: IMAGE_LIMITS.maxPixels, failOn: 'error' })
      .rotate()
      .resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true });
    const alpha = metadata.hasAlpha === true;
    const { data, info } = await (alpha ? pipeline.png() : pipeline.jpeg({ quality: 92 })).toBuffer({ resolveWithObject: true });
    return {
      bytes: data, mime: alpha ? 'image/png' : 'image/jpeg', width: info.width, height: info.height,
      sourceSha256: createHash('sha256').update(bytes).digest('hex'), sha256: createHash('sha256').update(data).digest('hex'),
    };
  } catch (cause) {
    throw new RenderError('ASSET_INVALID', 'assets', 'Image could not be normalized', { cause });
  }
}
