import { z } from 'zod';
import { html } from '../../../../Layerfit-JMD-engine/src/shared/html.js';
import { idSchema, templateConfigSchema, type TemplateModule } from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';
import { comparisonBannerCss } from './comparison-banner-css.js';

const text = (max: number) => z.string().trim().min(1).max(max).refine((value) => !/\p{Cc}/u.test(value));
export const comparisonBannerSchema = templateConfigSchema.safeExtend({
  templateId: z.literal('dual-panel'),
  comparisonEvidenceId: idSchema,
  t02: z.object({
    sloganLines: z.tuple([text(40), text(40)]),
    leftLabel: text(22), badgeText: text(3),
    leftFactIds: z.tuple([idSchema, idSchema, idSchema]),
    rightFactIds: z.tuple([idSchema, idSchema, idSchema]),
  }).strict(),
}).refine((config) => config.assets.length === 3 && config.assets.every((asset) => asset.allowCrop && asset.role !== 'product'), 'T02 requires three explicitly crop-approved lifestyle/detail assets');

export const templateModule: TemplateModule = {
  id: 'dual-panel', version: '0.3.0', rootClass: 'lf-comparison-banner', formats: ['square'],
  configSchema: comparisonBannerSchema,
  slots: [
    { name: 'left-photo', required: true }, { name: 'right-photo', required: true },
    { name: 'headline', required: true }, { name: 'left-points', required: true },
    { name: 'right-points', required: true }, { name: 'brand-badge', required: true },
    { name: 'detail-photo', required: true },
  ],
  render(input) {
    const config = comparisonBannerSchema.parse(input.config);
    const { t02 } = config;
    const fact = (id: string) => {
      const value = input.facts.get(id);
      if (!value?.verified || value.id !== id) throw new Error(`T02 missing verified comparison fact: ${id}`);
      return value.text;
    };
    fact(config.comparisonEvidenceId);
    const photos = config.assets.map((ref, index) => {
      const photo = input.photos[index];
      if (!photo || photo.assetId !== ref.assetId || !photo.allowCrop || photo.role === 'product') throw new Error('T02 crop-approved photo missing or mismatched');
      return photo;
    });
    const points = (ids: readonly string[], positive: boolean) => ids.map((id) => html`
      <li class="point ${positive ? 'point--pro' : 'point--con'}">
        <svg class="point__icon" viewBox="0 0 24 24" aria-hidden="true"><path class="point__glyph" d="${positive ? 'M4.5 12.5l5 5L19.5 7' : 'M5 5l14 14M19 5L5 19'}"/></svg>
        <span>${fact(id)}</span>
      </li>`);
    return {
      css: comparisonBannerCss,
      body: html`
        <section class="panel panel--competitor">
          <img class="panel__photo" src="${photos[0]!.src}" alt="${t02.leftLabel}" data-slot="left-photo" data-required="true" data-image-fit="cover" data-allow-crop="true" data-allow-overlap="headline left-points"/>
          <div class="panel__shade panel__shade--top" aria-hidden="true"></div>
          <div class="panel__shade panel__shade--bottom" aria-hidden="true"></div>
          <h1 class="slogan" data-slot="headline" data-required="true">
            <span class="slogan__line">${t02.sloganLines[0]}</span>
            <span class="slogan__line">${t02.sloganLines[1]}</span>
            <span class="slogan__line slogan__line--brand">${config.brand.name}</span>
          </h1>
          <div class="panel__bottom" data-slot="left-points" data-required="true">
            <span class="tag">${t02.leftLabel}</span>
            <ul class="points">${points(t02.leftFactIds, false)}</ul>
          </div>
        </section>
        <div class="ad__divider" aria-hidden="true"></div>
        <section class="panel panel--brand">
          <img class="panel__photo panel__photo--brand" src="${photos[1]!.src}" alt="${config.brand.name}" data-slot="right-photo" data-required="true" data-image-fit="cover" data-allow-crop="true" data-allow-overlap="brand-badge detail-photo right-points"/>
          <div class="panel__shade panel__shade--bottom" aria-hidden="true"></div>
          <span class="brand-badge" role="img" aria-label="${config.brand.name}" data-slot="brand-badge" data-required="true">${t02.badgeText}</span>
          <figure class="robot-callout" data-slot="detail-photo" data-required="true">
            <img src="${photos[2]!.src}" alt="${config.brand.name}" data-image-fit="cover" data-allow-crop="true"/>
          </figure>
          <div class="panel__bottom" data-slot="right-points" data-required="true">
            <span class="tag">${config.brand.name}</span>
            <ul class="points">${points(t02.rightFactIds, true)}</ul>
          </div>
        </section>`,
    };
  },
};
