import { html, type SafeHtml } from '../../../shared/html.js';
import type { ResolvedAsset, TemplateRenderInput, TemplateRenderOutput } from '../../../shared/render-contract.js';
import { DARK_OFFER_STACK_BUDGETS } from './schema.js';

/** Static icons. No interpolation, so they carry no input. Colors come from engine tokens through CSS. */
const CHECK_ICON = html`<svg class="dos-check" viewBox="0 0 26 26" aria-hidden="true"><circle cx="13" cy="13" r="13"/><path d="M7.6 13.6l3.3 3.3 7.4-8" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ARROW_ICON = html`<svg class="dos-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 11h11.2l-4.6-4.6L13 5l7 7-7 7-1.4-1.4 4.6-4.6H5z"/></svg>`;

function factText(facts: TemplateRenderInput['facts'], id: string, what: string): string {
  const fact = facts.get(id);
  // Fail closed: a referenced fact that is not in the verified snapshot is never replaced by invented text.
  if (!fact) throw new Error(`${what} fact ${id} is not in the verified snapshot`);
  return fact.text;
}

function headline(text: string, accentPhrase: string | undefined): SafeHtml {
  if (!accentPhrase) return html`${text}`;
  const at = text.indexOf(accentPhrase); // the shared schema guarantees the phrase is a substring
  return html`${text.slice(0, at)}<span class="dos-accent">${accentPhrase}</span>${text.slice(at + accentPhrase.length)}`;
}

function photo(asset: ResolvedAsset): SafeHtml {
  // Product photos stay whole (contain, on a neutral disc). Cover is used only when the asset's config allows cropping.
  return asset.allowCrop
    ? html`<figure class="dos-photo dos-photo--cover"><img class="dos-img" data-image-fit="cover" data-allow-crop="true" alt="" src="${asset.src}"></figure>`
    : html`<figure class="dos-photo dos-photo--contain"><img class="dos-img" data-image-fit="contain" alt="" src="${asset.src}"></figure>`;
}

export function renderDarkOfferStack({ config, photos, logo, facts }: TemplateRenderInput): TemplateRenderOutput {
  const shown = photos.slice(0, DARK_OFFER_STACK_BUDGETS.photosMax);
  if (shown.length === 0) throw new Error('dark-offer-stack needs at least one photo');

  const proof = config.proofFactId
    ? html`<div class="dos-proof" data-slot="proof" data-safe="true" data-fit-group="proof" data-fit-min="0.8">${factText(facts, config.proofFactId, 'proof')}</div>`
    : '';
  const offer = config.offerFactId
    ? html`<p class="dos-offer" data-slot="offer" data-safe="true" data-fit-group="offer" data-fit-min="0.8">${factText(facts, config.offerFactId, 'offer')}</p>`
    : '';
  const benefits = config.copy.benefits.map((benefit) => html`<li>${CHECK_ICON}<span>${benefit.text}</span></li>`);
  const brandMark = logo
    ? html`<img class="dos-logo" data-image-fit="contain" alt="" src="${logo.src}">`
    : html`${config.brand.name}`;

  const body = html`<header class="dos-top">${proof}</header>
<div class="dos-main">
<h1 class="dos-headline" data-slot="headline" data-required="true" data-safe="true" data-fit-group="headline" data-fit-min="0.75">${headline(config.copy.headline, config.copy.accentPhrase)}</h1>
${offer}
<ul class="dos-benefits" data-slot="benefits" data-required="true" data-safe="true" data-fit-group="benefits" data-fit-min="0.8">${benefits}</ul>
</div>
<div class="dos-photos dos-photos--${shown.length}" data-slot="photos" data-required="true" data-safe="true">${shown.map(photo)}</div>
<footer class="dos-footer" data-slot="footer" data-required="true" data-safe="true">
<div class="dos-footer__seg">${ARROW_ICON}<span class="dos-cta" data-slot="cta" data-required="true" data-safe="true" data-fit-group="footer" data-fit-min="0.8">${config.copy.cta}</span></div>
<div class="dos-footer__divider" aria-hidden="true"></div>
<div class="dos-footer__seg"><span class="dos-brand" data-slot="brand" data-required="true" data-safe="true">${brandMark}</span></div>
</footer>`;
  return { body, css: '' }; // css is attached by the module entry point
}
