import { html } from '../../../shared/html.js';
import type { TemplateRenderInput, TemplateRenderOutput } from '../../../shared/render-contract.js';

function factText(facts: TemplateRenderInput['facts'], id: string): string {
  const fact = facts.get(id);
  // Fail closed: the discount text comes only from a verified fact in the snapshot, never from free text.
  if (!fact) throw new Error(`offer fact ${id} is not in the verified snapshot`);
  return fact.text;
}

/*
 * Offer layout: the verified offer as an outlined tag, a headline, the product on a glow, a supporting line and one
 * button. The offer tag is required: this template exists only for a verified discount.
 * The blocks flow in a column, so long text wraps and pushes the others instead of overlapping them. The product is a
 * member of the `headline` fit group: it takes the height that is left, and when it would get too small the fitter shrinks
 * the headline.
 */
export function renderDiscountOffer({ config, photos, facts }: TemplateRenderInput): TemplateRenderOutput {
  const photo = photos[0];
  if (!photo) throw new Error('discount-offer needs one photo');
  if (!config.offerFactId) throw new Error('discount-offer needs a verified offer fact');

  const support = config.copy.body
    ? html`<p class="do-support" data-slot="description" data-safe="true" data-fit-group="support" data-fit-min="0.8">${config.copy.body}</p>`
    : '';

  const body = html`<div class="do-tag" data-slot="offer" data-required="true" data-safe="true" data-fit-group="tag" data-fit-min="0.8">${factText(facts, config.offerFactId)}</div>
<h1 class="do-headline" data-slot="headline" data-required="true" data-safe="true" data-fit-group="headline" data-fit-min="0.6">${config.copy.headline}</h1>
<div class="do-photo" data-fit-group="headline" data-fit-min="0.6"><figure class="do-figure" data-slot="photo" data-required="true"><img class="do-img" data-image-fit="contain" alt="" src="${photo.src}"></figure></div>
<div class="do-bottom">${support}<div class="do-cta" data-slot="cta" data-required="true" data-safe="true" data-fit-group="cta" data-fit-min="0.8">${config.copy.cta}</div></div>`;
  return { body, css: '' }; // css is attached by the module entry point
}
