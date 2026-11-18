import { readFileSync } from 'node:fs';
import type { TemplateModule } from '../../../shared/render-contract.js';
import { renderMinimalDiscount } from './render.js';
import { minimalDiscountSchema } from './schema.js';

/** CSS is a plain file next to this module so the design can be edited without touching TypeScript. Read once at load time. */
const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

/** T17 — Minimal Discount. Standalone package: Template-example/LayerFit_T17_Minimal_Discount (older, fixed layout). */
export const minimalDiscount: TemplateModule = {
  id: 'minimal-discount',
  version: '0.1.0',
  formats: ['square', 'portrait', 'vertical'],
  rootClass: 'lf-minimal-discount',
  slots: [
    { name: 'photo', required: true },
    { name: 'brand', required: true },
    { name: 'offer', required: true },
    { name: 'headline', required: true },
    { name: 'cta', required: true },
    { name: 'description', required: false },
    { name: 'benefit-1', required: false },
    { name: 'benefit-2', required: false },
    { name: 'benefit-3', required: false },
  ],
  configSchema: minimalDiscountSchema,
  render: (input) => ({ ...renderMinimalDiscount(input), css }),
};

export const templateModule = minimalDiscount;
