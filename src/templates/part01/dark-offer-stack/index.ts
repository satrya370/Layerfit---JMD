import { readFileSync } from 'node:fs';
import type { TemplateModule } from '../../../shared/render-contract.js';
import { renderDarkOfferStack } from './render.js';
import { darkOfferStackSchema } from './schema.js';

/** CSS is a plain file next to this module so the design can be edited without touching TypeScript. Read once at load time. */
const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

/** T03 — Dark Offer Stack. Design: Template-example/promo-banner (owner-supplied), adapted to the engine contract v0.2. */
export const darkOfferStack: TemplateModule = {
  id: 'dark-offer-stack',
  version: '0.1.0',
  formats: ['square', 'portrait', 'vertical'],
  rootClass: 'lf-dark-offer-stack',
  slots: [
    { name: 'headline', required: true },
    { name: 'benefits', required: true },
    { name: 'photos', required: true },
    { name: 'footer', required: true },
    { name: 'cta', required: true },
    { name: 'brand', required: true },
    { name: 'offer', required: false },
    { name: 'proof', required: false },
  ],
  configSchema: darkOfferStackSchema,
  render: (input) => ({ ...renderDarkOfferStack(input), css }),
};

export const templateModule = darkOfferStack;
