import { readFileSync } from 'node:fs';
import type { TemplateModule } from '../../../shared/render-contract.js';
import { renderPhotoOverlay } from './render.js';
import { photoOverlaySchema } from './schema.js';

/** CSS is a plain file next to this module so the design can be edited without touching TypeScript. Read once at load time. */
const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

/** T08 — Photo Overlay. Standalone package: Template-example/layerfit_t08. */
export const photoOverlay: TemplateModule = {
  id: 'photo-overlay',
  version: '0.1.0',
  formats: ['square', 'portrait', 'vertical'],
  rootClass: 'lf-photo-overlay',
  slots: [
    { name: 'photo', required: true },
    { name: 'brand', required: true },
    { name: 'headline', required: true },
    { name: 'cta', required: true },
    { name: 'offer', required: false },
    { name: 'description', required: false },
    { name: 'benefits', required: false },
    // Each benefit's text is its own slot, so text that spills out is measured instead of being hidden.
    { name: 'benefit-1', required: false },
    { name: 'benefit-2', required: false },
    { name: 'benefit-3', required: false },
  ],
  configSchema: photoOverlaySchema,
  render: (input) => ({ ...renderPhotoOverlay(input), css }),
};

export const templateModule = photoOverlay;
