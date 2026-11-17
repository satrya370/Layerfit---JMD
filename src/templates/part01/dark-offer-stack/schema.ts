import { contrastRatio } from '../../../shared/contrast.js';
import { templateConfigSchema } from '../../../shared/render-contract.js';

export { contrastRatio };

/** Copy budgets for this template (template_part01_plan.md: headline 55, benefit 48). Budgets are a first limit, not a guarantee of fit. */
export const DARK_OFFER_STACK_BUDGETS = { headline: 55, benefit: 48, benefitsMax: 3, photosMax: 2 } as const;

/** Fixed text colors used by the CSS. The schema checks the brand colors against them, so text can never become unreadable. */
export const DARK_OFFER_STACK_INK = { onPrimary: '#ffffff', onSecondary: '#1a1a1a', onAccent: '#ffffff' } as const;

/**
 * Narrows the shared config for this template. It cannot add fields (the base schema is strict); it only removes
 * options the template does not support and adds limits. Offer and proof are ID-only fields from the base contract.
 */
export const darkOfferStackSchema = templateConfigSchema.superRefine((config, ctx) => {
  const issue = (path: Array<string | number>, message: string) => ctx.addIssue({ code: 'custom', path, message });
  if (config.templateId !== 'dark-offer-stack') issue(['templateId'], 'must be "dark-offer-stack"');
  if (config.copy.headline.length > DARK_OFFER_STACK_BUDGETS.headline) issue(['copy', 'headline'], `at most ${DARK_OFFER_STACK_BUDGETS.headline} characters for this template`);
  if (config.copy.benefits.length < 1 || config.copy.benefits.length > DARK_OFFER_STACK_BUDGETS.benefitsMax) issue(['copy', 'benefits'], `1 to ${DARK_OFFER_STACK_BUDGETS.benefitsMax} benefits`);
  config.copy.benefits.forEach((benefit, i) => {
    if (benefit.text.length > DARK_OFFER_STACK_BUDGETS.benefit) issue(['copy', 'benefits', i, 'text'], `at most ${DARK_OFFER_STACK_BUDGETS.benefit} characters`);
  });
  if (config.assets.length > DARK_OFFER_STACK_BUDGETS.photosMax) issue(['assets'], `at most ${DARK_OFFER_STACK_BUDGETS.photosMax} photos`);
  if (config.copy.body !== undefined) issue(['copy', 'body'], 'this template has no body text slot');
  if (config.callouts?.length) issue(['callouts'], 'this template has no callouts');
  if (config.comparisonEvidenceId !== undefined) issue(['comparisonEvidenceId'], 'this template has no comparison block');
  if (contrastRatio(config.brand.primary, DARK_OFFER_STACK_INK.onPrimary) < 4.5) issue(['brand', 'primary'], 'too light: white text on it needs a contrast ratio of at least 4.5');
  if (contrastRatio(config.brand.secondary, DARK_OFFER_STACK_INK.onSecondary) < 4.5) issue(['brand', 'secondary'], 'too dark: dark footer text on it needs a contrast ratio of at least 4.5');
  if (contrastRatio(config.brand.accent, DARK_OFFER_STACK_INK.onAccent) < 3) issue(['brand', 'accent'], 'too light: the white check mark on it needs a contrast ratio of at least 3');
});
