/** T04 verbatim port of the user-supplied Template-example/index.html + styles.css.
 * The supplied `setCreative()` data contract maps onto the engine config like this:
 *   headline/accent  -> config.copy.headline / accentPhrase
 *   subheadline      -> config.copy.body
 *   rating+count     -> verified proof fact, format "RATING SEP COUNT",
 *                       e.g. "4.8 gebaseerd op 500+ reviews" (stars derive from RATING)
 *   priceLabel:price -> verified offer fact, format "LABEL: VALUE" (colon split)
 *   imageUrl         -> config.assets[0] (engine-resolved); cover when allowCrop, else contain
 *   logoUrl          -> config.brand.logoAssetId (engine-resolved)
 * Review/price blocks render ONLY from verified facts; a config without those fact IDs renders
 * exactly like the source with reviewBlock/priceBanner hidden (the source's own fallback rule).
 * Set window.setCreative-style runtime DOM editing is not used: the engine renders from config.
 */
import { html } from '../../../../Layerfit-JMD-engine/src/shared/html.js';
import { templateConfigSchema, type TemplateModule } from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';
import { editorialCss } from './editorial-reframe-css.js';

/** "RATING SEP COUNT" -> bold rating, normal separator, bold count; falls back to plain text. */
const reviewParts = (text: string): { rating: string; separator: string; count: string } | undefined => {
  const match = /^([\d.,]+)\s+(\D*?)\s*([\d+][\s\S]*)$/.exec(text.trim());
  return match ? { rating: match[1]!, separator: match[2]!, count: match[3]! } : undefined;
};

export const templateModule: TemplateModule = {
  id: 'editorial-reframe',
  version: '0.2.0',
  formats: ['square'],
  rootClass: 'lf-editorial-reframe',
  slots: [
    { name: 'reviews', required: false },
    { name: 'headline', required: true },
    { name: 'subheadline', required: false },
    { name: 'photo', required: true },
    { name: 'offer', required: false },
    { name: 'cta', required: false },
    { name: 'brand-logo', required: false },
  ],
  configSchema: templateConfigSchema.refine(
    (config) => config.templateId === 'editorial-reframe' && config.assets.length === 1,
    'T04 requires its own template ID and exactly one photo',
  ),
  render({ config, photos, logo, facts }) {
    const photo = photos[0];
    if (!photo || photo.assetId !== config.assets[0]?.assetId) throw new Error('T04 photo missing or mismatched');
    const accent = config.copy.accentPhrase;
    const accentIndex = accent ? config.copy.headline.indexOf(accent) : -1;
    const before = accentIndex >= 0 ? config.copy.headline.slice(0, accentIndex) : config.copy.headline;
    const after = accentIndex >= 0 ? config.copy.headline.slice(accentIndex + accent!.length) : '';
    const proof = config.proofFactId ? facts.get(config.proofFactId) : undefined;
    const offer = config.offerFactId ? facts.get(config.offerFactId) : undefined;
    if (config.proofFactId && !proof?.verified) throw new Error('T04 proof fact unavailable');
    if (config.offerFactId && !offer?.verified) throw new Error('T04 offer fact unavailable');
    // Stars are derived from the fact's rating, never hardcoded, so the claim stays data-driven.
    const review = proof ? reviewParts(proof.text) : undefined;
    const filledStars = review ? Math.min(5, Math.max(1, Math.round(Number.parseFloat(review.rating)))) : 0;
    const colon = offer ? offer.text.indexOf(':') : -1;
    const allowCrop = photo.allowCrop;
    return {
      css: editorialCss,
      body: html`
        ${review && filledStars > 0 ? html`<div class="reviews" data-slot="reviews">
          <div class="stars" aria-label="${String(filledStars)} sterren">${Array.from({ length: filledStars }, () => html`<span class="star">★</span>`)}</div>
          <div class="reviews-copy"><strong>${review.rating}</strong> ${review.separator} <strong>${review.count}</strong></div>
        </div>` : proof ? html`<div class="reviews" data-slot="reviews"><div class="reviews-copy">${proof.text}</div></div>` : ''}
        <h1 class="headline" data-slot="headline" data-required="true" data-fit-group="editorial-headline" data-fit-min="0.8">${before}${accentIndex >= 0 ? html`<span class="accent">${accent}</span>${after}` : ''}</h1>
        ${config.copy.body ? html`<p class="subheadline" data-slot="subheadline" data-fit-group="editorial-subheadline" data-fit-min="0.8">${config.copy.body}</p>` : ''}
        <div class="photo-frame">
          ${allowCrop
            ? html`<img src="${photo.src}" alt="${config.brand.name}" data-slot="photo" data-required="true" data-image-fit="cover" data-allow-crop/>`
            : html`<img src="${photo.src}" alt="${config.brand.name}" data-slot="photo" data-required="true" data-image-fit="contain"/>`}
        </div>
        <div class="bottom-strip">
          ${offer
            ? html`<div class="price-banner" data-slot="offer">${colon >= 0
                ? html`<strong>${offer.text.slice(0, colon + 1)}</strong><strong class="price">${offer.text.slice(colon + 1).trim()}</strong>`
                : html`<strong>${offer.text}</strong>`}</div>`
            : html`<div class="price-banner" data-slot="cta"><strong>${config.copy.cta}</strong></div>`}
          ${logo ? html`<img class="brand-logo" src="${logo.src}" alt="${config.brand.name}" data-slot="brand-logo" data-image-fit="contain"/>` : ''}
        </div>
      `,
    };
  },
};
