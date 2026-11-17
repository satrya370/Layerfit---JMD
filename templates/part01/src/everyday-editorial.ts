import { z } from 'zod';
import { html } from '../../../../Layerfit-JMD-engine/src/shared/html.js';
import { templateConfigSchema, type TemplateModule } from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';
import { everydayEditorialCss } from './everyday-editorial-css.js';

const text = (max: number) => z.string().trim().min(1).max(max).refine((value) => !/\p{Cc}/u.test(value), 'control characters are not allowed');
export const everydayEditorialSchema = templateConfigSchema.safeExtend({
  templateId: z.literal('everyday-editorial'),
  t07: z.object({
    kicker: text(40), eyebrow: text(40), headlineLines: z.array(text(70)).min(1).max(3),
    descriptionFactId: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
    photoCaption: text(64), productLabel: text(48),
    featureFactIds: z.array(z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/)).max(3),
    imageAlt: text(120), imagePosition: z.enum(['50-48', '50-50', '45-50']),
  }).strict(),
}).superRefine((config, ctx) => {
  if (config.copy.headline !== config.t07.headlineLines.join(' ')) {
    ctx.addIssue({ code: 'custom', path: ['copy', 'headline'], message: 'copy.headline must match T07 headlineLines joined with spaces' });
  }
}).refine((config) => config.assets.length === 1, 'T07 requires exactly one lifestyle photograph');

export const templateModule: TemplateModule = {
  id: 'everyday-editorial', version: '0.2.0', formats: ['square', 'portrait', 'vertical'],
  rootClass: 'lf-everyday-editorial', configSchema: everydayEditorialSchema,
  slots: [
    { name: 'masthead', required: true }, { name: 'headline', required: true },
    { name: 'description', required: true }, { name: 'product-photo', required: true },
    { name: 'photo-caption', required: true }, { name: 'benefits', required: false },
    { name: 'product-label', required: true }, { name: 'cta', required: true },
  ],
  render({ config: raw, photos, logo, facts }) {
    const config = everydayEditorialSchema.parse(raw);
    const photo = photos[0];
    if (!photo || photo.assetId !== config.assets[0]?.assetId) throw new Error('T07 photo missing or mismatched');
    const description = facts.get(config.t07.descriptionFactId);
    if (!description?.verified) throw new Error('T07 description fact missing or unverified');
    const benefits = config.t07.featureFactIds.map((id) => {
      const fact = facts.get(id);
      if (!fact?.verified) throw new Error(`T07 benefit fact missing or unverified: ${id}`);
      return fact.text;
    });
    const photoMarkup = photo.allowCrop
      ? html`<img src="${photo.src}" alt="${config.t07.imageAlt}" data-slot="product-photo" data-required="true" data-image-fit="cover" data-allow-crop="true" data-allow-overlap="photo-caption" data-focal-position="${config.t07.imagePosition}"/>`
      : html`<img src="${photo.src}" alt="${config.t07.imageAlt}" data-slot="product-photo" data-required="true" data-image-fit="contain" data-allow-overlap="photo-caption" data-focal-position="${config.t07.imagePosition}"/>`;
    return {
      css: everydayEditorialCss,
      body: html`
        <header class="masthead" data-slot="masthead" data-required="true">
          <div class="brand">${logo
            ? html`<img id="brand-logo" src="${logo.src}" alt="${config.brand.name}" data-image-fit="contain"/>`
            : html`<span id="brand-name">${config.brand.name}</span>`}</div>
          <span class="edition">${config.t07.kicker}</span>
        </header>
        <section class="opening">
          <span class="overline">${config.t07.eyebrow}</span>
          <h1 data-slot="headline" data-required="true" data-fit-group="editorial-headline" data-fit-min="0.65">${config.t07.headlineLines.map((line, index) => html`${index ? html`<br/>` : ''}${line}`)}</h1>
          <p data-slot="description" data-required="true" data-fit-group="editorial-description" data-fit-min="0.75">${description.text}</p>
        </section>
        <figure class="lifestyle">
          ${photoMarkup}
          <figcaption data-slot="photo-caption" data-required="true">${config.t07.photoCaption}</figcaption>
        </figure>
        <footer class="conversion">
          ${benefits.length ? html`<div class="benefits" data-slot="benefits">${benefits.map((benefit) => html`<span class="benefit"><span class="bullet"></span><span>${benefit}</span></span>`)}</div>` : ''}
          <div class="footer-line">
            <span class="product-label" data-slot="product-label" data-required="true">${config.t07.productLabel}</span>
            <div class="cta" data-slot="cta" data-required="true"><span>${config.copy.cta}</span><span class="cta-arrow" aria-hidden="true">↗</span></div>
          </div>
        </footer>`,
    };
  },
};
