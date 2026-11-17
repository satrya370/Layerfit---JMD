/**
 * ENGINE TEST FIXTURE — not a LayerFit template and not counted as an ad concept.
 * Exists so the rendering engine can be verified without waiting for Part 01 templates.
 * `hostileExternal` adds a deliberate external request to prove network isolation.
 */
import type { TemplateModule, TemplateRenderInput, TemplateRenderOutput, TemplateConfig } from '../../../src/shared/render-contract.js';
import { templateConfigSchema } from '../../../src/shared/render-contract.js';
import { html } from '../../../src/shared/html.js';

export interface FixtureOptions {
  version: string;
  /** Adds an <img> pointing at a non-allowed origin (network isolation test). */
  hostileExternal?: boolean;
  /** Adds a safe-flagged element positioned outside the safe box (layout test). */
  strayOutsideSafeArea?: boolean;
  /** Wraps the headline in a fixed-height box so long copy overflows (bounded fitting test). */
  tightHeadline?: boolean;
  /** Display-style leading (line-height 1.0): the glyph content area is taller than the line box, which is not an overflow. */
  tightLeading?: boolean;
}

const CSS = `
.eng-fixture{display:grid;grid-template-rows:auto auto minmax(0,1fr) auto auto;gap:28px;
  padding:var(--lf-safe-top) var(--lf-safe-right) var(--lf-safe-bottom) var(--lf-safe-left);
  background:var(--lf-brand-secondary);color:#1b1f1d}
.eng-fixture .eng-brand{font:700 24px/1.4 var(--lf-font-body);letter-spacing:.08em;text-transform:uppercase;margin:0}
.eng-fixture .eng-headline{margin:0;font:700 calc(74px * var(--lf-fit-headline,1))/1.2 var(--lf-font-heading);letter-spacing:-.02em;overflow-wrap:anywhere}
.eng-fixture .eng-product{margin:0;min-height:0;display:flex;align-items:center;justify-content:center;background:#ffffffb3;border-radius:32px;padding:24px;overflow:hidden}
.eng-fixture .eng-product img{display:block;width:100%;height:100%;object-fit:contain}
.eng-fixture .eng-benefits{margin:0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:12px;font:400 calc(28px * var(--lf-fit-benefits,1))/1.3 var(--lf-font-body)}
.eng-fixture .eng-benefits li{background:var(--lf-brand-primary);color:#fff;border-radius:999px;padding:12px 22px}
.eng-fixture .eng-cta{justify-self:start;background:var(--lf-brand-accent);color:#fff;border-radius:999px;padding:20px 34px;font:700 26px/1 var(--lf-font-body)}
.eng-fixture .eng-tight{height:90px;overflow:hidden;margin:0}
.eng-fixture .eng-leading{line-height:1}
`;

export function createFixtureTemplate({ version, hostileExternal = false, strayOutsideSafeArea = false, tightHeadline = false, tightLeading = false }: FixtureOptions): TemplateModule {
  return {
    id: 'fixture-hero',
    version,
    formats: ['square', 'portrait', 'vertical'],
    rootClass: 'eng-fixture',
    slots: [
      { name: 'brand', required: true },
      { name: 'headline', required: true },
      { name: 'product', required: true },
      { name: 'benefits', required: true },
      { name: 'cta', required: true },
    ],
    configSchema: templateConfigSchema as unknown as TemplateModule<TemplateConfig>['configSchema'],
    render({ config, photos }: TemplateRenderInput): TemplateRenderOutput {
      const photo = photos[0];
      if (!photo) throw new Error('fixture requires one photo');
      const benefits = config.copy.benefits.map((benefit) => html`<li>${benefit.text}</li>`);
      const headline = tightHeadline
        ? html`<div data-slot="headline" data-required="true" data-safe="true"><h1 data-fit-group="headline" data-fit-min="0.8" class="eng-headline eng-tight">${config.copy.headline}</h1></div>`
        : html`<h1 data-slot="headline" data-required="true" data-safe="true" data-fit-group="headline" data-fit-min="0.8" class="eng-headline ${tightLeading ? 'eng-leading' : ''}">${config.copy.headline}</h1>`;
      const body = html`<header data-slot="brand" data-required="true" data-safe="true" class="eng-brand">${config.brand.name}</header>
${headline}
<figure data-slot="product" data-required="true" data-safe="true" class="eng-product"><img data-image-fit="contain" alt="" src="${photo.src}"></figure>
<ul data-slot="benefits" data-required="true" data-safe="true" data-fit-group="benefits" data-fit-min="0.8" class="eng-benefits">${benefits}</ul>
<span data-slot="cta" data-required="true" data-safe="true" class="eng-cta">${config.copy.cta}</span>
${hostileExternal ? html`<img data-slot="hostile" data-image-fit="contain" alt="" src="http://127.0.0.1:9/external.png">` : ''}
${strayOutsideSafeArea ? html`<div data-slot="stray" data-safe="true" style="position:absolute;left:0;top:0;width:120px;height:120px;background:#000"></div>` : ''}`;
      return { body, css: CSS };
    },
  };
}
