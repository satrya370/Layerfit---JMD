import { html, type SafeHtml } from '../../../shared/html.js';
import type { TemplateRenderInput, TemplateRenderOutput } from '../../../shared/render-contract.js';

/** Static icons. No interpolation, so they carry no input. Colors come from CSS. */
const STAR = html`<svg class="spl-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9L4.9 19.1" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`;
const ARROW = html`<svg class="spl-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M8.5 7H17v8.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function factText(facts: TemplateRenderInput['facts'], id: string, what: string): string {
  const fact = facts.get(id);
  // Fail closed: a referenced fact that is not in the verified snapshot is never replaced by invented text.
  if (!fact) throw new Error(`${what} fact ${id} is not in the verified snapshot`);
  return fact.text;
}

/** The accent phrase sits on its own line, as in the design ("ONTDEK" / "PRODUCT A."). The shared schema guarantees it is a substring. */
function headline(text: string, accentPhrase: string | undefined): SafeHtml {
  if (!accentPhrase) return html`${text}`;
  const at = text.indexOf(accentPhrase);
  return html`${text.slice(0, at)}<span class="spl-accent">${accentPhrase}</span>${text.slice(at + accentPhrase.length)}`;
}

/*
 * In the vertical layout the two panels are stacked, so a tall copy block on the left squeezes the photo panel below it.
 * The right panel is therefore a member of the `headline` fit group: when something in it falls outside the safe box,
 * the fitter shrinks the headline (the largest text above it) instead of leaving the photo tiny. The panel itself is
 * not scaled; only the CSS that reads --lf-fit-headline reacts.
 */
export function renderSplitComposition({ config, photos, logo, facts }: TemplateRenderInput): TemplateRenderOutput {
  const photo = photos[0];
  if (!photo) throw new Error('split-composition needs one photo');

  const offer = config.offerFactId
    ? html`<div class="spl-overline" data-slot="offer" data-safe="true" data-fit-group="offer" data-fit-min="0.8"><span class="spl-dot"></span><span>${factText(facts, config.offerFactId, 'offer')}</span></div>`
    : '';
  const proof = config.proofFactId
    ? html`<span class="spl-proof" data-slot="proof" data-safe="true" data-fit-group="proof" data-fit-min="0.8">${factText(facts, config.proofFactId, 'proof')}</span>`
    : '';
  const description = config.copy.body
    ? html`<p class="spl-description" data-slot="description" data-safe="true" data-fit-group="description" data-fit-min="0.85">${config.copy.body}</p>`
    : '';

  // The first benefit is the floating pill on the photo; the others are chips. No benefit is shown twice.
  const [pillBenefit, ...chipBenefits] = config.copy.benefits;
  const pill = pillBenefit
    ? html`<div class="spl-pill" data-slot="pill" data-safe="true" data-allow-overlap="photo" data-fit-group="pill" data-fit-min="0.8"><span class="spl-pill-star">${STAR}</span><span>${pillBenefit.text}</span></div>`
    : '';
  const chips = chipBenefits.length
    ? html`<div class="spl-benefits" data-slot="benefits" data-safe="true" data-fit-group="benefits" data-fit-min="0.8">${chipBenefits.map((b) => html`<span class="spl-benefit">${b.text}</span>`)}</div>`
    : '';

  const brandMark = logo
    ? html`<img class="spl-logo" data-image-fit="contain" alt="" src="${logo.src}">`
    : html`${config.brand.name}`;
  // A product photo stays whole (contain) unless the asset's config allows cropping.
  const image = photo.allowCrop
    ? html`<img class="spl-img" data-image-fit="cover" data-allow-crop="true" alt="" src="${photo.src}">`
    : html`<img class="spl-img" data-image-fit="contain" alt="" src="${photo.src}">`;

  const body = html`<section class="spl-left">
<header class="spl-masthead"><span class="spl-brand" data-slot="brand" data-required="true" data-safe="true">${brandMark}</span><span class="spl-star">${STAR}</span></header>
<div class="spl-copy">
${offer}
<h1 class="spl-headline" data-slot="headline" data-required="true" data-safe="true" data-fit-group="headline" data-fit-min="0.6">${headline(config.copy.headline, config.copy.accentPhrase)}</h1>
${description}
${chips}
</div>
<footer class="spl-foot"><div class="spl-cta" data-slot="cta" data-required="true" data-safe="true" data-fit-group="cta" data-fit-min="0.8"><span>${config.copy.cta}</span><span class="spl-cta-icon">${ARROW}</span></div></footer>
</section>
<section class="spl-right" data-fit-group="headline" data-fit-min="0.6">
<div class="spl-visual-top">${proof}<span class="spl-dots" aria-hidden="true"><i></i><i></i><i></i></span></div>
<div class="spl-stage">
<div class="spl-arch" aria-hidden="true"></div>
<figure class="spl-card" data-slot="photo" data-required="true" data-safe="true">${image}</figure>
<span class="spl-badge" aria-hidden="true">${STAR}</span>
${pill}
</div>
<div class="spl-visual-bottom"><span class="spl-brand-sub" data-slot="brand-sub" data-safe="true">${config.brand.name}</span></div>
</section>`;
  return { body, css: '' }; // css is attached by the module entry point
}
