import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { html } from '../../../../Layerfit-JMD-engine/src/shared/html.js';
import { idSchema, templateConfigSchema, type TemplateModule } from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';

const text = (max: number) => z.string().trim().min(1).max(max).refine((value) => !/\p{Cc}/u.test(value));
export const productCollectionSchema = templateConfigSchema.safeExtend({
  templateId: z.literal('product-collection-hero'),
  t11: z.object({
    tagline: text(60).optional(), headlineLines: z.array(text(45)).min(1).max(3),
    descriptionFactId: idSchema.optional(), benefitFactIds: z.array(idSchema).max(3),
    primaryCta: text(32).optional(), destinationLabel: text(60).optional(),
    website: z.string().max(120).regex(/^(?:www\.)?[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}(?:\/[a-z0-9/_-]*)?$/i).optional(),
    imageAlts: z.array(text(100)).min(1).max(3),
  }).strict(),
}).superRefine((config, ctx) => {
  if (config.assets.length > 3) ctx.addIssue({ code: 'custom', path: ['assets'], message: 'T11 supports one to three distinct product assets' });
  if (config.t11.imageAlts.length !== config.assets.length) ctx.addIssue({ code: 'custom', path: ['t11', 'imageAlts'], message: 'One alt per product asset is required' });
  if (config.t11.headlineLines.join(' ') !== config.copy.headline) ctx.addIssue({ code: 'custom', path: ['copy', 'headline'], message: 'Headline and lines must agree' });
});
const css = readFileSync(new URL('./product-collection-hero.css', import.meta.url), 'utf8');
const imageSlots = ['product-main', 'product-left', 'product-right'] as const;
export const templateModule: TemplateModule = {
  id: 'product-collection-hero', version: '0.1.0', formats: ['square', 'portrait', 'vertical'],
  rootClass: 'lf-product-collection-hero', configSchema: productCollectionSchema,
  slots: [
    { name: 'header', required: true }, { name: 'headline', required: true },
    { name: 'description', required: false }, { name: 'benefits', required: false },
    { name: 'primary-cta', required: false }, { name: 'product-main', required: true },
    { name: 'product-left', required: false }, { name: 'product-right', required: false },
    { name: 'offer', required: false }, { name: 'bottom-cta', required: true }, { name: 'destination', required: false },
  ],
  render({ config: raw, photos, logo, facts }) {
    const config = productCollectionSchema.parse(raw);
    const fact = (id: string) => {
      const value = facts.get(id);
      if (!value?.verified || value.id !== id) throw new Error(`T11 verified fact missing: ${id}`);
      return value.text;
    };
    const description = config.t11.descriptionFactId ? fact(config.t11.descriptionFactId) : undefined;
    const benefits = config.t11.benefitFactIds.map(fact);
    const offer = config.offerFactId ? fact(config.offerFactId) : undefined;
    const placement = ['main', 'left', 'right'];
    if (photos.length !== config.assets.length) throw new Error('T11 photo count mismatch');
    const productMarkup = config.assets.map((ref, index) => {
      const asset = photos[index];
      if (!asset || ref.assetId !== asset.assetId) throw new Error('T11 product asset missing or mismatched');
      return html`<img class="collection-product collection-product--${placement[index]}" src="${asset.src}" alt="${config.t11.imageAlts[index]}" data-slot="${imageSlots[index]}" data-required="true" data-safe="true" data-image-fit="contain" data-allow-overlap="product-main product-left product-right"/>`;
    });
    return { css, body: html`
      <header class="collection-header" data-slot="header" data-required="true" data-safe="true">
        ${logo ? html`<img class="collection-logo" src="${logo.src}" alt="${config.brand.name}" data-image-fit="contain"/>` : html`<span class="collection-brand">${config.brand.name}</span>`}
        ${config.t11.tagline ? html`<span class="collection-tagline">${config.t11.tagline}</span>` : ''}
      </header>
      <section class="collection-copy">
        <h1 class="collection-headline" data-slot="headline" data-required="true" data-safe="true" data-fit-group="collection-headline" data-fit-min="0.7">${config.t11.headlineLines.map((line) => html`<span>${line}</span>`)}</h1>
        ${description ? html`<p class="collection-description" data-slot="description" data-safe="true">${description}</p>` : ''}
        ${benefits.length ? html`<p class="collection-benefits" data-slot="benefits" data-safe="true">${benefits.join(' · ')}</p>` : ''}
        ${config.t11.primaryCta ? html`<div class="collection-primary" data-slot="primary-cta" data-safe="true">${config.t11.primaryCta}</div>` : ''}
      </section>
      <section class="collection-stage" data-count="${photos.length}" aria-label="Product collection">${productMarkup}</section>
      ${offer ? html`<div class="collection-offer" data-slot="offer" data-safe="true">${offer}</div>` : ''}
      <footer class="collection-footer">
        <span class="collection-bottom" data-slot="bottom-cta" data-required="true" data-safe="true">${config.copy.cta}</span>
        ${config.t11.website || config.t11.destinationLabel ? html`<span class="collection-destination" data-slot="destination" data-safe="true">${config.t11.website || config.t11.destinationLabel}</span>` : ''}
      </footer>` };
  },
};
