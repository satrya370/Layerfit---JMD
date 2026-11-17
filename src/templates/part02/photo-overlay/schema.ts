import { contrastRatio } from '../../../shared/contrast.js';
import { templateConfigSchema } from '../../../shared/render-contract.js';

/** Copy budgets. Three text levels only (headline, one support line or short list, CTA), so the limits are tight. */
export const PHOTO_OVERLAY_BUDGETS = { headline: 56, body: 90, benefit: 28, benefitsMax: 3, brandName: 24 } as const;

/** Fixed text colors used by the CSS. The schema checks brand colors against them. */
export const PHOTO_OVERLAY_INK = { onPrimary: '#ffffff', onAccent: '#14171a' } as const;

/**
 * Narrows the shared config. Offer is an ID-only field (text from a verified fact). Proof, callouts and comparison are not
 * supported: this layout has one message and no room for more.
 */
export const photoOverlaySchema = templateConfigSchema.superRefine((config, ctx) => {
  const issue = (path: Array<string | number>, message: string) => ctx.addIssue({ code: 'custom', path, message });
  if (config.templateId !== 'photo-overlay') issue(['templateId'], 'must be "photo-overlay"');
  if (config.brand.name.length > PHOTO_OVERLAY_BUDGETS.brandName) issue(['brand', 'name'], `at most ${PHOTO_OVERLAY_BUDGETS.brandName} characters for this template`);
  if (config.copy.headline.length > PHOTO_OVERLAY_BUDGETS.headline) issue(['copy', 'headline'], `at most ${PHOTO_OVERLAY_BUDGETS.headline} characters for this template`);
  if (config.copy.body !== undefined && config.copy.body.length > PHOTO_OVERLAY_BUDGETS.body) issue(['copy', 'body'], `at most ${PHOTO_OVERLAY_BUDGETS.body} characters for this template`);
  if (config.copy.benefits.length > PHOTO_OVERLAY_BUDGETS.benefitsMax) issue(['copy', 'benefits'], `at most ${PHOTO_OVERLAY_BUDGETS.benefitsMax} benefits`);
  config.copy.benefits.forEach((benefit, i) => {
    if (benefit.text.length > PHOTO_OVERLAY_BUDGETS.benefit) issue(['copy', 'benefits', i, 'text'], `at most ${PHOTO_OVERLAY_BUDGETS.benefit} characters`);
  });
  if (config.assets.length !== 1) issue(['assets'], 'exactly one photo');
  if (config.proofFactId !== undefined) issue(['proofFactId'], 'this template has no proof block');
  if (config.callouts?.length) issue(['callouts'], 'this template has no callouts');
  if (config.comparisonEvidenceId !== undefined) issue(['comparisonEvidenceId'], 'this template has no comparison block');
  if (contrastRatio(config.brand.primary, PHOTO_OVERLAY_INK.onPrimary) < 4.5) issue(['brand', 'primary'], 'too light: white text on it needs a contrast ratio of at least 4.5');
  if (contrastRatio(config.brand.accent, PHOTO_OVERLAY_INK.onAccent) < 4.5) issue(['brand', 'accent'], 'too dark: dark text on it needs a contrast ratio of at least 4.5');
});
