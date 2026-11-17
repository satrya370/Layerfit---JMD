import { readFileSync } from 'node:fs';
import type { TemplateModule } from '../../../shared/render-contract.js';
import { renderSplitComposition } from './render.js';
import { splitCompositionSchema } from './schema.js';

/** CSS is a plain file next to this module so the design can be edited without touching TypeScript. Read once at load time. */
const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

/** T05 — Split Composition. Design: Template-example/layerfit_t05 (owner-supplied), adapted to the engine contract v0.2. */
export const splitComposition: TemplateModule = {
  id: 'split-composition',
  version: '0.1.0',
  formats: ['square', 'portrait', 'vertical'],
  rootClass: 'lf-split-composition',
  slots: [
    { name: 'brand', required: true },
    { name: 'headline', required: true },
    { name: 'cta', required: true },
    { name: 'photo', required: true },
    { name: 'offer', required: false },
    { name: 'description', required: false },
    { name: 'benefits', required: false },
    { name: 'proof', required: false },
    { name: 'pill', required: false },
    { name: 'brand-sub', required: false },
  ],
  configSchema: splitCompositionSchema,
  render: (input) => ({ ...renderSplitComposition(input), css }),
};

export const templateModule = splitComposition;
