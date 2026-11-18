import { html } from '../../../shared/html.js';
import type { TemplateRenderInput, TemplateRenderOutput } from '../../../shared/render-contract.js';

/** Static icon. No interpolation, so it carries no input. */
const ARROW = html`<svg class="ae-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h16M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square"/></svg>`;

function factText(facts: TemplateRenderInput['facts'], id: string): string {
  const fact = facts.get(id);
  // Fail closed: a referenced fact that is not in the verified snapshot is never replaced by invented text.
  if (!fact) throw new Error(`offer fact ${id} is not in the verified snapshot`);
  return fact.text;
}

/*
 * Magazine-style layout: the photo bleeds across the top with no text on it; a paper band below holds a meta line (brand,
 * optional offer), a large serif headline, and a foot with up to three benefits and one button.
 * Nothing is drawn that has no data: a missing offer or missing benefits leave no element behind.
 */
export function renderAtmosphericEditorial({ config, photos, facts }: TemplateRenderInput): TemplateRenderOutput {
  const photo = photos[0];
  if (!photo) throw new Error('atmospheric-editorial needs one photo');

  const offer = config.offerFactId
    ? html`<span class="ae-offer" data-slot="offer" data-safe="true">${factText(facts, config.offerFactId)}</span>`
    : '';
  const list = config.copy.benefits.length
    ? html`<ul class="ae-list">${config.copy.benefits.map((b, i) => html`<li><span data-slot="benefit-${i + 1}" data-safe="true" data-fit-group="support" data-fit-min="0.85">${b.text}</span></li>`)}</ul>`
    : '';

  const body = html`<div class="ae-photo"><figure class="ae-figure" data-slot="photo" data-required="true" data-allow-overlap="*"><img class="ae-img" data-image-fit="cover" data-allow-crop="true" alt="" src="${photo.src}"></figure></div>
<section class="ae-band">
<header class="ae-meta"><span data-slot="brand" data-required="true" data-safe="true">${config.brand.name}</span>${offer}</header>
<h1 class="ae-headline" data-slot="headline" data-required="true" data-safe="true" data-fit-group="headline" data-fit-min="0.7">${config.copy.headline}</h1>
<footer class="ae-foot">${list}<div class="ae-cta" data-slot="cta" data-required="true" data-safe="true" data-fit-group="cta" data-fit-min="0.8"><span>${config.copy.cta}</span><span class="ae-cta-icon">${ARROW}</span></div></footer>
</section>`;
  return { body, css: '' }; // css is attached by the module entry point
}
