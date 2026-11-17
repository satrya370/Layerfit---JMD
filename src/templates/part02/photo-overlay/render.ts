import { html, type SafeHtml } from '../../../shared/html.js';
import type { TemplateRenderInput, TemplateRenderOutput } from '../../../shared/render-contract.js';

/** Static icons. No interpolation, so they carry no input. */
const TICK = html`<svg class="pov-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="square"/></svg>`;
const ARROW = html`<svg class="pov-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h16M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="square"/></svg>`;

function factText(facts: TemplateRenderInput['facts'], id: string): string {
  const fact = facts.get(id);
  // Fail closed: a referenced fact that is not in the verified snapshot is never replaced by invented text.
  if (!fact) throw new Error(`offer fact ${id} is not in the verified snapshot`);
  return fact.text;
}

/** The accent phrase is a validated substring of the headline. It gets a flat marker block behind it, as in hand-made ads. */
function headline(text: string, accentPhrase: string | undefined): SafeHtml {
  if (!accentPhrase) return html`${text}`;
  const at = text.indexOf(accentPhrase);
  return html`${text.slice(0, at)}<mark class="pov-mark">${accentPhrase}</mark>${text.slice(at + accentPhrase.length)}`;
}

/*
 * Photo first, headline second, one button. Three text levels: headline, one support line (description and/or a short
 * list), CTA. No cards, shadows, gradients as decoration, or numbered badges.
 * A photo that may be cropped (asset allowCrop) fills the canvas under a dark scrim. A photo that must stay whole sits
 * on a flat color field with a solid panel for the text instead.
 * The photo is a member of the `headline` fit group: it takes the height that is left, so when something falls outside the
 * safe box the fitter shrinks the headline (the largest text) instead of leaving the product tiny.
 */
export function renderPhotoOverlay({ config, photos, logo, facts }: TemplateRenderInput): TemplateRenderOutput {
  const photo = photos[0];
  if (!photo) throw new Error('photo-overlay needs one photo');
  const cover = photo.allowCrop;

  const offer = config.offerFactId
    ? html`<span class="pov-tag" data-slot="offer" data-safe="true" data-fit-group="tag" data-fit-min="0.8">${factText(facts, config.offerFactId)}</span>`
    : '';
  const description = config.copy.body
    ? html`<p class="pov-support" data-slot="description" data-safe="true" data-fit-group="support" data-fit-min="0.85">${config.copy.body}</p>`
    : '';
  const points = config.copy.benefits.length
    ? html`<ul class="pov-points" data-slot="benefits" data-safe="true" data-fit-group="support" data-fit-min="0.85">${config.copy.benefits.map((b, i) => html`<li>${TICK}<span data-slot="benefit-${i + 1}" data-safe="true">${b.text}</span></li>`)}</ul>`
    : '';
  const image = cover
    ? html`<img class="pov-img" data-image-fit="cover" data-allow-crop="true" alt="" src="${photo.src}">`
    : html`<img class="pov-img" data-image-fit="contain" alt="" src="${photo.src}">`;

  const brandMark = logo
    ? html`<img class="pov-logo" data-image-fit="contain" alt="" src="${logo.src}">`
    : html`${config.brand.name}`;

  const body = html`<div class="pov-photo ${cover ? 'pov-photo--cover' : 'pov-photo--contain'}" data-fit-group="headline" data-fit-min="0.6"><figure class="pov-figure" data-slot="photo" data-required="true" data-allow-overlap="*">${image}</figure></div>
<header class="pov-top"><span class="pov-brand" data-slot="brand" data-required="true" data-safe="true">${brandMark}</span></header>
<section class="pov-copy ${cover ? 'pov-copy--cover' : 'pov-copy--panel'}">
${offer}
<h1 class="pov-headline" data-slot="headline" data-required="true" data-safe="true" data-fit-group="headline" data-fit-min="0.6">${headline(config.copy.headline, config.copy.accentPhrase)}</h1>
${description}
${points}
<div class="pov-cta" data-slot="cta" data-required="true" data-safe="true" data-fit-group="cta" data-fit-min="0.8"><span>${config.copy.cta}</span><span class="pov-cta-icon">${ARROW}</span></div>
</section>`;
  return { body, css: '' }; // css is attached by the module entry point
}
