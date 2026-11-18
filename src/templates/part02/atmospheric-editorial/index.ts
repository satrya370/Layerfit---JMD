import { readFileSync } from 'node:fs';
import type { TemplateModule } from '../../../shared/render-contract.js';
import { renderAtmosphericEditorial } from './render.js';
import { atmosphericEditorialSchema } from './schema.js';

/** CSS is a plain file next to this module so the design can be edited without touching TypeScript. Read once at load time. */
const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

/** T10 — Atmospheric Editorial. Standalone package: Template-example/T10_Atmospheric_Editorial. */
export const atmosphericEditorial: TemplateModule = {
  id: 'atmospheric-editorial',
  version: '0.1.0',
  formats: ['square', 'portrait', 'vertical'],
  rootClass: 'lf-atmospheric-editorial',
  slots: [
    { name: 'photo', required: true },
    { name: 'brand', required: true },
    { name: 'headline', required: true },
    { name: 'cta', required: true },
    { name: 'offer', required: false },
    { name: 'benefit-1', required: false },
    { name: 'benefit-2', required: false },
    { name: 'benefit-3', required: false },
  ],
  configSchema: atmosphericEditorialSchema,
  render: (input) => ({ ...renderAtmosphericEditorial(input), css }),
};

export const templateModule = atmosphericEditorial;
