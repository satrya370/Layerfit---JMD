import { createHash } from 'node:crypto';
import sharp, { type Metadata } from 'sharp';
import type { Encoding } from '../../shared/render-contract.js';
import { RenderError } from './errors.js';

export interface EncodedArtifact { encoding: Encoding; bytes: Buffer; width: number; height: number; sha256: string }

const MAGIC: Record<Encoding, Buffer> = { png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), jpg: Buffer.from([0xff, 0xd8, 0xff]) };
const SHARP_FORMAT: Record<Encoding, string> = { png: 'png', jpg: 'jpeg' };

/** Verify magic bytes, container format, exact dimensions and a full pixel decode. Never trust extension or screenshot API return. */
export async function verifyImage(bytes: Buffer, encoding: Encoding, width: number, height: number): Promise<EncodedArtifact> {
  if (!bytes.subarray(0, MAGIC[encoding].length).equals(MAGIC[encoding])) throw new RenderError('OUTPUT_INVALID', 'encode', `${encoding} magic bytes missing`);
  let meta: Metadata;
  try {
    meta = await sharp(bytes, { failOn: 'error' }).metadata();
    await sharp(bytes, { failOn: 'error' }).raw().toBuffer();
  } catch (cause) {
    throw new RenderError('OUTPUT_INVALID', 'encode', `${encoding} output does not decode`, { cause });
  }
  if (meta.format !== SHARP_FORMAT[encoding]) throw new RenderError('OUTPUT_INVALID', 'encode', `expected ${encoding}, decoded ${meta.format}`);
  if (meta.width !== width || meta.height !== height) throw new RenderError('OUTPUT_INVALID', 'encode', `${encoding} is ${meta.width}x${meta.height}, expected ${width}x${height}`);
  return { encoding, bytes, width, height, sha256: createHash('sha256').update(bytes).digest('hex') };
}

/** PNG master from the screenshot; JPEG derived from the same buffer with explicit alpha flattening. */
export async function encodeArtifacts(png: Buffer, encodings: readonly Encoding[], width: number, height: number, background = '#ffffff'): Promise<EncodedArtifact[]> {
  const master = await verifyImage(png, 'png', width, height);
  const out: EncodedArtifact[] = [];
  for (const encoding of encodings) {
    if (encoding === 'png') { out.push(master); continue; }
    let jpg: Buffer;
    try { jpg = await sharp(png).flatten({ background }).jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toBuffer(); }
    catch (cause) { throw new RenderError('ENCODE_FAILED', 'encode', 'JPEG encoding failed', { cause }); }
    out.push(await verifyImage(jpg, 'jpg', width, height));
  }
  return out;
}
