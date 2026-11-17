import { z } from 'zod';
import { html } from '../../../../Layerfit-JMD-engine/src/shared/html.js';
import { templateConfigSchema, type TemplateModule } from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';
import { questionHookT09Css } from './question-hook-t09-css.js';

const text = (max: number) => z.string().trim().min(1).max(max).refine((value) => !/\p{Cc}/u.test(value), 'control characters are not allowed');
export const questionHookT09Schema = templateConfigSchema.safeExtend({
  templateId: z.literal('question-hook-t09'),
  t09: z.object({
    descriptionFactId: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
    featureFactIds: z.array(z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/)).max(3),
    imageAlt: text(120), imageMode: z.enum(['contain', 'cover']),
    headlineScale: z.enum(['xl', 'lg', 'md']),
  }).strict(),
}).refine((config) => config.assets.length === 1, 'T09 requires exactly one product image')
  .refine((config) => config.t09.imageMode !== 'cover' || config.assets[0]?.allowCrop === true, 'T09 cover mode requires explicit crop permission');

export const templateModule: TemplateModule = {
  id: 'question-hook-t09', version: '0.1.0', formats: ['square', 'portrait', 'vertical'],
  rootClass: 'lf-question-hook-t09', configSchema: questionHookT09Schema,
  slots: [
    { name: 'brandbar', required: true }, { name: 'headline', required: true },
    { name: 'product-image', required: true }, { name: 'description', required: true },
    { name: 'features', required: false }, { name: 'cta', required: false },
  ],
  render({ config: raw, photos, logo, facts }) {
    const config = questionHookT09Schema.parse(raw);
    const asset = photos[0];
    if (!asset || asset.assetId !== config.assets[0]?.assetId) throw new Error('T09 product asset missing or mismatched');
    if (config.t09.imageMode === 'cover' && !asset.allowCrop) throw new Error('T09 cover image lacks crop permission');
    const description = facts.get(config.t09.descriptionFactId);
    if (!description?.verified) throw new Error('T09 description fact missing or unverified');
    const featureText = config.t09.featureFactIds.map((id) => {
      const feature = facts.get(id);
      if (!feature?.verified) throw new Error(`T09 feature fact missing or unverified: ${id}`);
      return feature.text;
    });
    const headline = config.copy.headline.trim().replace(/\s+/g, ' ');
    const split = headline.lastIndexOf(' ');
    const main = split < 0 ? '' : headline.slice(0, split);
    const accent = split < 0 ? headline : headline.slice(split + 1);
    const picture = config.t09.imageMode === 'cover'
      ? html`<img class="hero__img" src="${asset.src}" alt="${config.t09.imageAlt}" data-slot="product-image" data-required="true" data-image-fit="cover" data-allow-crop="true" data-allow-overlap="description"/>`
      : html`<img class="hero__img" src="${asset.src}" alt="${config.t09.imageAlt}" data-slot="product-image" data-required="true" data-image-fit="contain" data-allow-overlap="description"/>`;
    return {
      css: questionHookT09Css,
      body: html`
        <div class="ad__bg" aria-hidden="true">
          <div class="ad__glow ad__glow--tr"></div><div class="ad__glow ad__glow--bl"></div><div class="ad__corner"></div>
        </div>
        <div class="ad__inner">
          <header class="brandbar" data-slot="brandbar" data-required="true">
            ${logo ? html`<img class="brandbar__logo" src="${logo.src}" alt="${config.brand.name}" data-image-fit="contain"/>` : ''}
            <span class="brandbar__name">${config.brand.name}</span>
          </header>
          <h1 class="question" data-slot="headline" data-required="true" data-headline="${config.t09.headlineScale}" data-fit-group="t09-headline" data-fit-min="0.65">
            ${main ? html`<span class="question__main">${main}</span>` : ''}<span class="question__accent">${accent}</span>
          </h1>
          <figure class="hero" data-image-mode="${config.t09.imageMode}">
            <div class="hero__ring" aria-hidden="true"></div>${picture}
          </figure>
          <p class="answer" data-slot="description" data-required="true" data-fit-group="t09-description" data-fit-min="0.75">${description.text}</p>
          ${featureText.length ? html`<ul class="features" data-slot="features">${featureText.map((feature) => html`
            <li class="feature"><svg class="feature__icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 5"/></svg><span class="feature__text">${feature}</span></li>`)}
          </ul>` : ''}
          ${config.copy.cta ? html`<div class="cta" data-slot="cta" data-required="true"><span class="cta__label">${config.copy.cta}</span><svg class="cta__arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></div>` : ''}
        </div>`,
    };
  },
};
