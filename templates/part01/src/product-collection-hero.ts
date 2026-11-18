import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { html } from '../../../../Layerfit-JMD-engine/src/shared/html.js';
import { idSchema, templateConfigSchema, type TemplateModule } from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';

const text = (max: number) => z.string().trim().min(1).max(max).refine((value) => !/\p{Cc}/u.test(value), 'control characters are not allowed');

/** T11 now uses the user-supplied Semaglutide question-banner composition. All medical copy is fact-bound. */
export const productCollectionSchema = templateConfigSchema.safeExtend({
  templateId: z.literal('semaglutide-banner'),
  t11: z.object({
    headlineFactId: idSchema,
    headlineLines: z.array(text(40)).min(1).max(2),
    accentPhrase: text(30),
    subheadFactId: idSchema,
    disclaimerFactId: idSchema,
    imageAlt: text(120),
  }).strict(),
}).superRefine((config, ctx) => {
  const issue = (path: Array<string | number>, message: string) => ctx.addIssue({ code: 'custom', path, message });
  if (config.assets.length !== 1) issue(['assets'], 'T11 requires exactly one vial/product image');
  if (config.assets[0]?.allowCrop) issue(['assets', 0, 'allowCrop'], 'the vial must remain uncropped');
  if (config.t11.headlineLines.join(' ') !== config.copy.headline) issue(['copy', 'headline'], 'headline and headlineLines must agree');
  if (!config.copy.headline.includes(config.t11.accentPhrase)) issue(['t11', 'accentPhrase'], 'accent phrase must appear in the headline');
  if (config.copy.benefits.length) issue(['copy', 'benefits'], 'T11 has no separate benefit chips');
  if (config.copy.body !== undefined) issue(['copy', 'body'], 'use the fact-backed T11 subhead slot');
  if (config.callouts?.length) issue(['callouts'], 'T11 has no callouts');
  if (config.offerFactId !== undefined || config.proofFactId !== undefined || config.comparisonEvidenceId !== undefined) issue(['offerFactId'], 'T11 does not support offer, proof or comparison blocks');
  if (config.brand.logoAssetId !== undefined) issue(['brand', 'logoAssetId'], 'use the source-style brand wordmark text');
});

const css = readFileSync(new URL('./product-collection-hero.css', import.meta.url), 'utf8');

export const templateModule: TemplateModule = {
  id: 'semaglutide-banner', version: '0.2.1', formats: ['square', 'portrait', 'vertical'],
  rootClass: 'lf-product-collection-hero', configSchema: productCollectionSchema,
  slots: [
    { name: 'headline', required: true }, { name: 'product-main', required: true },
    { name: 'subhead', required: true }, { name: 'brand', required: true },
    { name: 'disclaimer', required: true }, { name: 'cta', required: true },
  ],
  render({ config: raw, photos, facts }) {
    const config = productCollectionSchema.parse(raw);
    if (photos.length !== 1 || photos[0]?.assetId !== config.assets[0]?.assetId) throw new Error('T11 requires one matching vial image');
    const fact = (id: string, field: string) => {
      const value = facts.get(id);
      if (!value?.verified || value.id !== id) throw new Error(`T11 verified ${field} fact missing: ${id}`);
      return value.text;
    };
    const headline = fact(config.t11.headlineFactId, 'headline');
    const subhead = fact(config.t11.subheadFactId, 'subhead');
    const disclaimer = fact(config.t11.disclaimerFactId, 'disclaimer');
    if (headline !== config.copy.headline) throw new Error('T11 headline must exactly match its verified fact');
    const phrase = config.t11.accentPhrase;
    const headlineLines = config.t11.headlineLines.map((line) => {
      const at = line.indexOf(phrase);
      return at < 0 ? html`<span class="collection-line">${line}</span>` : html`<span class="collection-line">${line.slice(0, at)}<em>${phrase}</em>${line.slice(at + phrase.length)}</span>`;
    });
    return { css, body: html`
      <main class="semaglutide-layout">
        <h1 class="collection-headline" data-slot="headline" data-required="true" data-safe="true" data-fit-group="headline" data-fit-min="0.72">${headlineLines}</h1>
        <figure class="collection-stage" data-slot="product-main" data-required="true" data-safe="true"><img class="collection-product" src="${photos[0]!.src}" alt="${config.t11.imageAlt}" data-image-fit="contain"/></figure>
        <p class="collection-subhead" data-slot="subhead" data-required="true" data-safe="true" data-fit-group="subhead" data-fit-min="0.78">${subhead}</p>
        <p class="collection-brand" data-slot="brand" data-required="true" data-safe="true">${config.brand.name}</p>
        <p class="collection-disclaimer" data-slot="disclaimer" data-required="true" data-safe="true" data-fit-group="disclaimer" data-fit-min="0.8">${disclaimer}</p>
        <div class="collection-cta" data-slot="cta" data-required="true" data-safe="true" data-fit-group="cta" data-fit-min="0.8">${config.copy.cta}</div>
      </main>` };
  },
};
