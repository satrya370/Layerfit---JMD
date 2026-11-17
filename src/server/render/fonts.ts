import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { FONT_REGISTRY, type FontDefinition } from '../../shared/fonts.js';
import type { FontId } from '../../shared/render-contract.js';
import { RenderError } from './errors.js';

export interface LoadedFontFace { family: string; weight: number; style: string; src: string; sha256: string }
export interface LoadedFont { id: string; family: string; fallback: string; faces: LoadedFontFace[] }

const require = createRequire(import.meta.url);

/** Loads bundled WOFF2 files once and embeds them as data URIs. Missing or non-WOFF2 files fail with FONT_MISSING. */
export class FontLoader {
  readonly #cache = new Map<string, Promise<LoadedFont>>();
  constructor(private readonly registry: Readonly<Record<string, FontDefinition>> = FONT_REGISTRY,
    private readonly resolveModule: (specifier: string) => string = (s) => require.resolve(s)) {}

  load(id: FontId | string): Promise<LoadedFont> {
    let cached = this.#cache.get(id);
    if (!cached) {
      cached = this.#load(id);
      cached.catch(() => this.#cache.delete(id));
      this.#cache.set(id, cached);
    }
    return cached;
  }

  async #load(id: string): Promise<LoadedFont> {
    const definition = Object.hasOwn(this.registry, id) ? this.registry[id] : undefined;
    if (!definition) throw new RenderError('FONT_MISSING', 'fonts', `Font is not registered: ${id}`);
    const faces = await Promise.all(definition.faces.map(async (face) => {
      let bytes: Buffer;
      try { bytes = await readFile(this.resolveModule(face.module)); }
      catch (cause) { throw new RenderError('FONT_MISSING', 'fonts', `Font file unavailable: ${id} ${face.weight}`, { cause }); }
      if (bytes.subarray(0, 4).toString('latin1') !== 'wOF2') throw new RenderError('FONT_MISSING', 'fonts', `Font file is not WOFF2: ${id} ${face.weight}`);
      return { family: definition.family, weight: face.weight, style: face.style, src: `data:font/woff2;base64,${bytes.toString('base64')}`, sha256: createHash('sha256').update(bytes).digest('hex') };
    }));
    return { id, family: definition.family, fallback: definition.fallback, faces };
  }
}

export function fontFaceCss(fonts: readonly LoadedFont[]): string {
  return fonts.flatMap((font) => font.faces).map((face) =>
    `@font-face{font-family:"${face.family}";src:url(${face.src}) format("woff2");font-weight:${face.weight};font-style:${face.style};font-display:block}`).join('\n');
}
