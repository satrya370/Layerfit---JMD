import { z } from 'zod';
import { html } from '../../../../Layerfit-JMD-engine/src/shared/html.js';
import { idSchema, templateConfigSchema, type TemplateModule } from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';
import { questionHookCss } from './question-hook-css.js';

const copy = (max: number) => z.string().trim().min(1).max(max).refine((value) => !/\p{Cc}/u.test(value), 'control characters are not allowed');
export const questionHookSchema = templateConfigSchema.safeExtend({
  templateId: z.literal('question-hook'),
  t06: z.object({
    brandRight: copy(40), eyebrow: copy(40), headlineLead: copy(50), headlineAccent: copy(50),
    photoCaption: copy(64), footerNote: copy(64), descriptionFactId: idSchema,
    featureFactIds: z.array(idSchema).max(2), imageAlt: copy(100),
  }).strict(),
}).refine((config) => config.assets.length === 1, 'T06 requires exactly one product photo');

export const templateModule: TemplateModule = {
  id: 'question-hook', version: '0.1.0', formats: ['square', 'portrait', 'vertical'],
  rootClass: 'lf-question-hook', configSchema: questionHookSchema,
  slots: [
    { name: 'brand-lockup', required: true },
    { name: 'headline', required: true, formats: ['square', 'portrait', 'vertical'] },
    { name: 'description', required: true }, { name: 'product-photo', required: true },
    { name: 'photo-caption', required: true }, { name: 'cta', required: true },
  ],
  render({ format, config: raw, photos, logo, facts }) {
    const config = questionHookSchema.parse(raw);
    const asset = photos[0];
    if (!asset || asset.assetId !== config.assets[0]?.assetId) throw new Error('T06 product asset missing or mismatched');
    const description = facts.get(config.t06.descriptionFactId);
    if (!description?.verified) throw new Error('T06 description fact missing or unverified');
    const features = config.t06.featureFactIds.map((id) => {
      const fact = facts.get(id);
      if (!fact?.verified) throw new Error(`T06 feature fact missing or unverified: ${id}`);
      return fact.text;
    });
    const headline = html`${config.t06.headlineLead}<br/><em>${config.t06.headlineAccent}</em>`;
    const image = asset.allowCrop
      ? html`<img src="${asset.src}" alt="${config.t06.imageAlt}" data-slot="product-photo" data-required="true" data-image-fit="cover" data-allow-crop="true" data-allow-overlap="photo-caption"/>`
      : html`<img src="${asset.src}" alt="${config.t06.imageAlt}" data-slot="product-photo" data-required="true" data-image-fit="contain" data-allow-overlap="photo-caption"/>`;
    return {
      css: questionHookCss,
      body: html`
        <header class="masthead" data-slot="brand-lockup" data-required="true">
          <div class="brand-lockup">${logo
            ? html`<img class="brand-logo" src="${logo.src}" alt="${config.brand.name}" data-image-fit="contain"/>`
            : html`<div class="brand">${config.brand.name}</div>`}</div>
          <div class="brand-right"><span class="live-dot" aria-hidden="true"></span><span>${config.t06.brandRight}</span></div>
        </header>
        <section class="hero-copy">
          <div class="eyebrow"><span class="eyebrow-line"></span><span>${config.t06.eyebrow}</span></div>
          <h1 class="headline" data-slot="headline" data-required="true" data-fit-group="question-headline" data-fit-min="0.65">${headline}</h1>
          <div class="intro-row">
            <p class="description" data-slot="description" data-required="true" data-fit-group="question-description" data-fit-min="0.75">${description.text}</p>
            <span class="question-sticker" aria-hidden="true">?</span>
          </div>
        </section>
        <section class="visual-zone" aria-label="Product visual">
          <div class="stage-shadow" aria-hidden="true"></div>
          <figure class="product-photo">
            ${image}
            <figcaption class="photo-caption" data-slot="photo-caption" data-required="true"><span class="caption-icon" aria-hidden="true">↗</span><span>${config.t06.photoCaption}</span></figcaption>
          </figure>
          <div class="side-stamp" aria-hidden="true"><span>ONTDEK</span><span>?</span></div>
          ${features.length ? html`<div class="features">${features.map((feature) => html`<span>${feature}</span>`)}</div>` : ''}
        </section>
        <footer class="ad-footer">
          <span class="footer-text">${config.t06.footerNote}</span>
          <div class="cta" data-slot="cta" data-required="true"><span>${config.copy.cta}</span><span class="cta-arrow" aria-hidden="true">↗</span></div>
        </footer>`,
    };
  },
};
