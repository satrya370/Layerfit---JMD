import { readFileSync } from 'node:fs';
import type { TemplateModule } from '../../../shared/render-contract.js';
import { renderDiscountOffer } from './render.js';
import { discountOfferSchema } from './schema.js';

/** CSS is a plain file next to this module so the design can be edited without touching TypeScript. Read once at load time. */
const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

/** T16 — Discount Offer. Standalone package: Template-example/LayerFit_T16_Discount_Offer. */
export const discountOffer: TemplateModule = {
  id: 'discount-offer',
  version: '0.1.0',
  formats: ['square', 'portrait', 'vertical'],
  rootClass: 'lf-discount-offer',
  slots: [
    { name: 'photo', required: true },
    { name: 'offer', required: true },
    { name: 'headline', required: true },
    { name: 'cta', required: true },
    { name: 'description', required: false },
  ],
  configSchema: discountOfferSchema,
  render: (input) => ({ ...renderDiscountOffer(input), css }),
};

export const templateModule = discountOffer;
