import type { Page } from 'puppeteer';
import { RenderError, withTimeout } from './errors.js';

export interface RequestedFace { family: string; weight: number }

interface ReadinessReport {
  fonts: Array<RequestedFace & { ok: boolean; detail: string }>;
  images: Array<{ slot: string; ok: boolean; external: boolean }>;
  cssReady: boolean;
}

/** tsx/esbuild may wrap nested functions in `__name(...)`; define a no-op in the page before evaluating trusted functions. */
export async function installEvaluateShim(page: Page): Promise<void> {
  await page.evaluate('globalThis.__name = globalThis.__name || ((fn) => fn)');
}

/**
 * Replaces the reference renderer's `document.fonts.ready` + fixed 300ms sleep. Each requested family/weight is
 * loaded explicitly and must report `loaded`; every <img> must decode with natural dimensions; the CSS marker
 * appended after template CSS must be computed (an unclosed rule in template CSS swallows it).
 */
export async function waitForReadiness(page: Page, faces: readonly RequestedFace[], timeoutMs: number): Promise<void> {
  const report = await withTimeout(page.evaluate(async (requested: RequestedFace[]): Promise<ReadinessReport> => {
    const fonts: ReadinessReport['fonts'] = [];
    for (const face of requested) {
      const descriptor = `${face.weight} 32px "${face.family}"`;
      let ok = false;
      let detail = 'load rejected';
      try {
        const loaded = await document.fonts.load(descriptor);
        const check = document.fonts.check(descriptor);
        detail = `matched=${loaded.length} status=${loaded.map((f) => f.status).join('/') || 'none'} check=${check}`;
        ok = loaded.length > 0 && loaded.every((f) => f.status === 'loaded') && check;
      } catch (cause) { detail = `load threw ${(cause as Error)?.name ?? 'error'}`; ok = false; }
      fonts.push({ ...face, ok, detail });
    }
    const images = await Promise.all(Array.from(document.images).map(async (img) => {
      try { await img.decode(); } catch { /* reported below */ }
      return {
        slot: img.closest('[data-slot]')?.getAttribute('data-slot') ?? 'image',
        ok: img.complete && img.naturalWidth > 0 && img.naturalHeight > 0,
        external: !img.getAttribute('src')?.startsWith('data:'),
      };
    }));
    const cssReady = getComputedStyle(document.documentElement).getPropertyValue('--lf-css-ready').trim() === '1';
    return { fonts, images, cssReady };
  }, [...faces]), timeoutMs, 'READINESS_TIMEOUT', 'readiness');

  const missingFonts = report.fonts.filter((f) => !f.ok);
  if (missingFonts.length) throw new RenderError('FONT_MISSING', 'readiness', `Requested font not loaded: ${missingFonts.map((f) => `${f.family} ${f.weight} (${f.detail})`).join('; ')}`);
  // A non-data image that does not decode was almost certainly stopped by CSP before any request was issued.
  // Classify it as blocked rather than as a bad asset, so the cause is not misreported.
  const external = report.images.filter((i) => !i.ok && i.external);
  if (external.length) throw new RenderError('NETWORK_BLOCKED', 'readiness', `External image blocked in slot: ${external.map((i) => i.slot).join(', ')}`);
  const badImages = report.images.filter((i) => !i.ok);
  if (badImages.length) throw new RenderError('ASSET_INVALID', 'readiness', `Image did not decode in slot: ${badImages.map((i) => i.slot).join(', ')}`);
  if (!report.cssReady) throw new RenderError('CSS_NOT_READY', 'readiness', 'Template CSS did not apply completely (marker missing)');
}

/** Layout must be identical on two consecutive measurements after readiness; no timed sleep. */
export async function waitForStableLayout(page: Page, attempts = 5): Promise<void> {
  const signature = () => page.evaluate(() => Array.from(document.querySelectorAll('[data-canvas], [data-slot]'))
    .map((el) => { const r = el.getBoundingClientRect(); return `${r.x},${r.y},${r.width},${r.height}`; }).join('|'));
  let previous = await signature();
  for (let i = 0; i < attempts; i += 1) {
    const current = await signature();
    if (current === previous) return;
    previous = current;
  }
  throw new RenderError('READINESS_TIMEOUT', 'readiness', 'Layout did not stabilise');
}
