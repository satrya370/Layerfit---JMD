// One-off visual preview of the module markup with the user's boot photo. Not a validated render: layout checks are skipped here.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer';
import { builtCases, SPECS } from '../fixtures/templates/outline-poster/cases.js';
import { outlinePoster } from '../src/templates/part02/outline-poster/index.js';
import { FORMAT_PROFILES, type TemplateRenderInput } from '../src/shared/render-contract.js';
import { MemoryAssetSource, RenderAssetResolver } from '../src/server/assets/resolve-render-assets.js';

const photoBytes = await readFile('C:/Users/Asus/Layerfit-JMD/Template-example/LayerFit_T14_Conzuri_Outline_Ad/assets/boot-scene.png');
const outDir = 'artifacts/templates/outline-poster-preview';
await mkdir(outDir, { recursive: true });
const SAFE: Record<string, [number, number, number, number]> = { square: [60, 70, 60, 70], portrait: [70, 70, 70, 70], vertical: [250, 70, 350, 70] };
const SIZE: Record<string, [number, number]> = { square: [1080, 1080], portrait: [1080, 1350], vertical: [1080, 1920] };
const css = (await import('node:fs')).readFileSync('src/templates/part02/outline-poster/styles.css', 'utf8');
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH });
try {
  for (const spec of SPECS.filter((s) => s.name === 'full')) {
    const built = (await builtCases()).find((c) => c.name === spec.name)!;
    const config = { ...built.config, brand: { ...built.config.brand, name: 'Conzuri' } };
    const source = new MemoryAssetSource();
    for (const a of built.assets) source.put({ ...a, bytes: photoBytes });
    const resolved = await new RenderAssetResolver(source).resolve(built.assets[0]!.campaignId, config);
    for (const format of ['square', 'portrait', 'vertical'] as const) {
      const input: TemplateRenderInput = { format, profile: FORMAT_PROFILES[format], config, photos: resolved.photos, facts: new Map(built.facts.map((f) => [f.id, f])) };
      const { body } = outlinePoster.render(input) as { body: { toString(): string } };
      const [w, h] = SIZE[format]!;
      const [t, r, b, l] = SAFE[format]!;
      const tokens = `--lf-brand-primary:#060606;--lf-brand-secondary:#cecece;--lf-brand-accent:#d8a179;--lf-font-body:Inter,Arial,sans-serif;--lf-font-heading:Inter,Arial,sans-serif;--lf-safe-top:${t}px;--lf-safe-right:${r}px;--lf-safe-bottom:${b}px;--lf-safe-left:${l}px;`;
      const doc = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0}${css}</style></head><body><main class="lf-outline-poster" data-format="${format}" style="position:relative;overflow:hidden;width:${w}px;height:${h}px;${tokens}">${body.toString()}</main></body></html>`;
      const page = await browser.newPage();
      await page.setViewport({ width: w, height: h });
      await page.setContent(doc, { waitUntil: 'load' });
      await page.evaluateHandle('document.fonts.ready');
      const path = `${outDir}/t14-${format}.png`;
      await page.screenshot({ path, type: 'png' });
      await page.close();
      console.log(path);
    }
  }
} finally { await browser.close(); }
