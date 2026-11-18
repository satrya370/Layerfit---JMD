import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { html } from '../../../../Layerfit-JMD-engine/src/shared/html.js';
import { idSchema, templateConfigSchema, type TemplateModule } from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';

const text = (max: number) => z.string().trim().min(1).max(max).refine((value) => !/\p{Cc}/u.test(value), 'control characters are not allowed');

/**
 * T12 — Immersive Image + Editorial Copy, ported from Template-example/LayerFit_T12.
 * One full-bleed hero photo with a centered eyebrow badge, then a colored editorial panel with a
 * serif headline and an optional description. No CTA, benefits, price or logo exist in this design.
 */
export const immersiveEditorialSchema = templateConfigSchema.safeExtend({
  templateId: z.literal('immersive-editorial'),
  t12: z.object({
    /** Brand label inside the dark badge on the photo. Optional; hidden when absent. */
    eyebrow: text(48).optional(),
    /** Deliberate line breaks. Config strings cannot carry newlines, so lines are explicit. */
    headlineLines: z.array(text(60)).min(1).max(3),
    /** Editorial body copy is a product claim: only a verified fact may render it. */
    descriptionFactId: idSchema.optional(),
    imageAlt: text(120),
  }).strict(),
}).superRefine((config, ctx) => {
  const issue = (path: Array<string | number>, message: string) => ctx.addIssue({ code: 'custom', path, message });
  if (config.assets.length !== 1) issue(['assets'], 'T12 requires exactly one hero asset');
  if (config.t12.headlineLines.join(' ') !== config.copy.headline) issue(['copy', 'headline'], 'headline and headlineLines must agree');
  if (config.copy.benefits.length) issue(['copy', 'benefits'], 'this template has no benefit chips');
  if (config.callouts?.length) issue(['callouts'], 'this template has no callouts');
  if (config.offerFactId !== undefined) issue(['offerFactId'], 'this template has no offer block');
  if (config.proofFactId !== undefined) issue(['proofFactId'], 'this template has no proof block');
  if (config.comparisonEvidenceId !== undefined) issue(['comparisonEvidenceId'], 'this template has no comparison block');
  if (config.brand.logoAssetId !== undefined) issue(['brand', 'logoAssetId'], 'this template renders no logo');
});

const css = readFileSync(new URL('./immersive-editorial.css', import.meta.url), 'utf8');

/** The source switches to compact headline sizing when the headline text exceeds 74 characters. */
const COMPACT_LIMIT = 74;

export const templateModule: TemplateModule = {
  id: 'immersive-editorial',
  version: '0.1.0',
  formats: ['square', 'portrait', 'vertical'],
  rootClass: 'lf-immersive-editorial',
  slots: [
    { name: 'scene', required: true },
    { name: 'eyebrow', required: false },
    { name: 'headline', required: true },
    { name: 'description', required: false },
  ],
  configSchema: immersiveEditorialSchema,
  render({ config: raw, photos, facts }) {
    const config = immersiveEditorialSchema.parse(raw);
    const hero = photos[0];
    if (!hero || config.assets[0]?.assetId !== hero.assetId) throw new Error('T12 hero asset missing or mismatched');

    const description = config.t12.descriptionFactId ? (() => {
      const fact = facts.get(config.t12.descriptionFactId!);
      if (!fact?.verified || fact.id !== config.t12.descriptionFactId) throw new Error(`T12 verified fact missing: ${config.t12.descriptionFactId}`);
      return fact.text;
    })() : undefined;

    // The photo is a deliberate full-bleed element: it is required, but never safe-box-checked.
    const image = hero.allowCrop
      ? html`<img class="t12-photo" src="${hero.src}" alt="${config.t12.imageAlt}" data-slot="scene" data-required="true" data-image-fit="cover" data-allow-crop="true"/>`
      : html`<img class="t12-photo" src="${hero.src}" alt="${config.t12.imageAlt}" data-slot="scene" data-required="true" data-image-fit="contain"/>`;

    return {
      css,
      body: html`
        <section class="t12-scene">${image}${config.t12.eyebrow ? html`<span class="t12-eyebrow" data-slot="eyebrow" data-safe="true" data-allow-overlap="scene" data-fit-group="eyebrow" data-fit-min="0.75">${config.t12.eyebrow}</span>` : ''}</section>
        <section class="t12-panel${config.t12.headlineLines.join('').length > COMPACT_LIMIT ? ' t12-compact' : ''}">
          <h1 class="t12-headline" data-slot="headline" data-required="true" data-safe="true" data-fit-group="headline" data-fit-min="0.55">${config.t12.headlineLines.map((line) => html`<span>${line}</span>`)}</h1>
          ${description ? html`<p class="t12-description" data-slot="description" data-safe="true" data-fit-group="description" data-fit-min="0.8">${description}</p>` : ''}
        </section>`,
    };
  },
};
