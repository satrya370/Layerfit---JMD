import { html } from '../../../shared/html.js';
import type { TemplateRenderInput, TemplateRenderOutput } from '../../../shared/render-contract.js';

function factText(facts: TemplateRenderInput['facts'], id: string): string {
  const fact = facts.get(id);
  // Fail closed: a referenced fact that is not in the verified snapshot is never replaced by invented text.
  if (!fact) throw new Error(`offer fact ${id} is not in the verified snapshot`);
  return fact.text;
}

/*
 * Outlined poster: stretched outline lines above and below the product, a white headline over the lower part of the
 * product, a teaser line and a spaced brand mark. The product photo is always kept whole (contain).
 * Nothing is drawn that has no data: a missing offer or missing lines leave no element behind.
 */
export function renderOutlinePoster({ config, photos, facts }: TemplateRenderInput): TemplateRenderOutput {
  const photo = photos[0];
  if (!photo) throw new Error('outline-poster needs one photo');

  const offer = config.offerFactId
    ? html`<div class="og-offer" data-slot="offer" data-safe="true">${factText(facts, config.offerFactId)}</div>`
    : '';
  const topLines = (config.copy.body ?? '').split('|').map((line) => line.trim()).filter(Boolean).slice(0, 3);
  const top = topLines.length
    ? html`<div class="og-top" data-slot="topline" data-safe="true" data-fit-group="top" data-fit-min="0.85">${topLines.map((line) => html`<span>${line}</span>`)}</div>`
    : '';
  const bottom = config.copy.benefits.length
    ? html`<div class="og-bottom">${config.copy.benefits.map((b, i) => html`<span data-slot="benefit-${i + 1}" data-safe="true" data-fit-group="support" data-fit-min="0.85">${b.text}</span>`)}</div>`
    : '';
  const brand = config.brand.name.toUpperCase().split('').join(' ');

  const body = html`${offer}
${top}
<figure class="og-scene" data-slot="photo" data-required="true" data-allow-overlap="*"><img class="og-img" data-image-fit="contain" alt="" src="${photo.src}"></figure>
<div class="og-headline" data-slot="headline" data-required="true" data-safe="true" data-fit-group="headline" data-fit-min="0.7">${config.copy.headline}</div>
${bottom}
<div class="og-teaser" data-slot="cta" data-required="true" data-safe="true" data-fit-group="cta" data-fit-min="0.8">${config.copy.cta}</div>
<div class="og-brand" data-slot="brand" data-required="true" data-safe="true">${brand}</div>`;
  return { body, css: '' }; // css is attached by the module entry point
}
