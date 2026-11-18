import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { html } from '../../../../Layerfit-JMD-engine/src/shared/html.js';
import { idSchema, templateConfigSchema, type TemplateModule } from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';

const text = (max: number) => z.string().trim().min(1).max(max).refine((value) => !/\p{Cc}/u.test(value), 'control characters are not allowed');

export const lifestyleBenefitEditorialSchema = templateConfigSchema.safeExtend({
  templateId: z.literal('lifestyle-benefit-editorial'),
  t15: z.object({
    eyebrow: text(48).optional(),
    note: text(48).optional(),
    descriptionFactId: idSchema.optional(),
    benefitFactIds: z.array(idSchema).max(2),
    imageAlt: text(120),
  }).strict(),
}).superRefine((config, ctx) => {
  const issue = (path: Array<string | number>, message: string) => ctx.addIssue({ code: 'custom', path, message });
  if (config.assets.length !== 1) issue(['assets'], 'T15 requires exactly one lifestyle/product photo');
  if (config.copy.benefits.length) issue(['copy', 'benefits'], 'use fact-bound t15.benefitFactIds');
  if (config.copy.body !== undefined) issue(['copy', 'body'], 'use t15.descriptionFactId for supporting copy');
  if (config.callouts?.length) issue(['callouts'], 'T15 does not support callouts');
  if (config.offerFactId !== undefined || config.proofFactId !== undefined || config.comparisonEvidenceId !== undefined) issue(['offerFactId'], 'T15 does not support offer, proof or comparison blocks');
});

const css = readFileSync(new URL('./lifestyle-benefit-editorial.css', import.meta.url), 'utf8');

export const templateModule: TemplateModule = {
  id: 'lifestyle-benefit-editorial', version: '0.1.0', formats: ['square', 'portrait', 'vertical'],
  rootClass: 'lf-lifestyle-benefit-editorial', configSchema: lifestyleBenefitEditorialSchema,
  slots: [
    { name: 'brand', required: true }, { name: 'eyebrow', required: false },
    { name: 'headline', required: true }, { name: 'photo', required: true },
    { name: 'note', required: false }, { name: 'description', required: false },
    { name: 'benefit-1', required: false }, { name: 'benefit-2', required: false }, { name: 'cta', required: true },
  ],
  render({ config: raw, photos, logo, facts }) {
    const config = lifestyleBenefitEditorialSchema.parse(raw);
    const photo = photos[0];
    if (!photo || photos.length !== 1 || photo.assetId !== config.assets[0]?.assetId) throw new Error('T15 requires one matching photo');
    const fact = (id: string, field: string) => {
      const value = facts.get(id);
      if (!value?.verified || value.id !== id) throw new Error(`T15 verified ${field} fact missing: ${id}`);
      return value.text;
    };
    const description = config.t15.descriptionFactId ? fact(config.t15.descriptionFactId, 'description') : undefined;
    const benefits = config.t15.benefitFactIds.map((id, index) => fact(id, `benefit-${index + 1}`));
    const image = photo.allowCrop
      ? html`<img src="${photo.src}" alt="${config.t15.imageAlt}" data-image-fit="cover" data-allow-crop="true"/>`
      : html`<img src="${photo.src}" alt="${config.t15.imageAlt}" data-image-fit="contain"/>`;
    const benefitMarkup = benefits.map((benefit, index) => html`<span class="t15-benefit" data-slot="benefit-${index + 1}" data-safe="true" data-fit-group="t15-copy" data-fit-min="0.82">${benefit}</span>`);
    return { css, body: html`
      ${logo ? html`<img class="t15-brand t15-logo" src="${logo.src}" alt="${config.brand.name}" data-slot="brand" data-required="true" data-safe="true" data-image-fit="contain"/>` : html`<div class="t15-brand" data-slot="brand" data-required="true" data-safe="true">${config.brand.name}</div>`}
      ${config.t15.eyebrow ? html`<div class="t15-eyebrow" data-slot="eyebrow" data-safe="true">${config.t15.eyebrow}</div>` : ''}
      <h1 class="t15-headline" data-slot="headline" data-required="true" data-safe="true" data-fit-group="t15-headline" data-fit-min="0.72">${config.copy.headline}</h1>
      <figure class="t15-photo" data-slot="photo" data-required="true" data-safe="true">${image}</figure>
      ${config.t15.note ? html`<aside class="t15-note" data-slot="note" data-safe="true"><span>${config.t15.note}</span></aside>` : ''}
      <section class="t15-copy">
        ${description ? html`<p class="t15-description" data-slot="description" data-safe="true" data-fit-group="t15-copy" data-fit-min="0.82">${description}</p>` : ''}
        ${benefitMarkup.length ? html`<div class="t15-benefits">${benefitMarkup}</div>` : ''}
        <div class="t15-cta" data-slot="cta" data-required="true" data-safe="true" data-fit-group="t15-copy" data-fit-min="0.82">${config.copy.cta}</div>
      </section>`,
    };
  },
};
