import { html } from '../../../shared/html.js';
import type { TemplateRenderInput, TemplateRenderOutput } from '../../../shared/render-contract.js';

function factText(facts: TemplateRenderInput['facts'], id: string): string {
  const fact = facts.get(id);
  // Fail closed: the discount text comes only from a verified fact in the snapshot, never from free text.
  if (!fact) throw new Error(`offer fact ${id} is not in the verified snapshot`);
  return fact.text;
}

/*
 * Split offer layout: the product on a bleeding colour panel, and a left-aligned copy column with the brand wordmark in
 * the corner, the verified offer as the largest text, a headline, an optional supporting line, up to three benefits and
 * one button. The offer is required: this template exists only for a verified discount. Nothing is drawn that has no
 * data: a missing supporting line or missing benefits leave no element behind.
 */
export function renderMinimalDiscount({ config, photos, facts }: TemplateRenderInput): TemplateRenderOutput {
  const photo = photos[0];
  if (!photo) throw new Error('minimal-discount needs one photo');
  if (!config.offerFactId) throw new Error('minimal-discount needs a verified offer fact');

  const support = config.copy.body
    ? html`<p class="md-support" data-slot="description" data-safe="true" data-fit-group="support" data-fit-min="0.8">${config.copy.body}</p>`
    : '';
  const list = config.copy.benefits.length
    ? html`<ul class="md-list">${config.copy.benefits.map((b, i) => html`<li><span class="md-tick" aria-hidden="true"></span><span data-slot="benefit-${i + 1}" data-safe="true" data-fit-group="list" data-fit-min="0.8">${b.text}</span></li>`)}</ul>`
    : '';

  const body = html`<div class="md-brand" data-slot="brand" data-required="true" data-safe="true">${config.brand.name}</div>
<div class="md-photo"><figure class="md-figure" data-slot="photo" data-required="true"><img class="md-img" data-image-fit="contain" alt="" src="${photo.src}"></figure></div>
<div class="md-copy">
<p class="md-offer" data-slot="offer" data-required="true" data-safe="true" data-fit-group="offer" data-fit-min="0.6">${factText(facts, config.offerFactId)}</p>
<h1 class="md-headline" data-slot="headline" data-required="true" data-safe="true" data-fit-group="headline" data-fit-min="0.75">${config.copy.headline}</h1>
${support}${list}<div class="md-cta" data-slot="cta" data-required="true" data-safe="true" data-fit-group="cta" data-fit-min="0.85"><span class="md-cta-label">${config.copy.cta}</span></div>
</div>`;
  return { body, css: '' }; // css is attached by the module entry point
}
