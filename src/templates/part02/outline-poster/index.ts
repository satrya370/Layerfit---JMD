import { readFileSync } from 'node:fs';
import type { TemplateModule } from '../../../shared/render-contract.js';
import { renderOutlinePoster } from './render.js';
import { outlinePosterSchema } from './schema.js';

/** CSS is a plain file next to this module so the design can be edited without touching TypeScript. Read once at load time. */
const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

/** T14 — Outline Poster. Standalone package: Template-example/LayerFit_T14_Conzuri_Outline_Ad. */
export const outlinePoster: TemplateModule = {
  id: 'outline-poster',
  version: '0.1.0',
  formats: ['square', 'portrait', 'vertical'],
  rootClass: 'lf-outline-poster',
  slots: [
    { name: 'photo', required: true },
    { name: 'brand', required: true },
    { name: 'headline', required: true },
    { name: 'cta', required: true },
    { name: 'offer', required: false },
    { name: 'topline', required: false },
    { name: 'benefit-1', required: false },
    { name: 'benefit-2', required: false },
    { name: 'benefit-3', required: false },
  ],
  configSchema: outlinePosterSchema,
  render: (input) => ({ ...renderOutlinePoster(input), css }),
};

export const templateModule = outlinePoster;
