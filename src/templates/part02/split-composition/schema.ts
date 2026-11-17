import { contrastRatio } from '../../../shared/contrast.js';
import { templateConfigSchema } from '../../../shared/render-contract.js';

/** Copy budgets for this template. A first limit on length, not a guarantee that the text fits (the renderer measures that). */
export const SPLIT_COMPOSITION_BUDGETS = { headline: 50, body: 120, benefit: 32, benefitsMax: 3 } as const;

/** Fixed text colors used by the CSS. The schema checks brand colors against them so text can never become unreadable. */
export const SPLIT_COMPOSITION_INK = { onPrimary: '#f5f5eb', onSecondary: '#182820', onAccent: '#182820' } as const;

/**
 * Narrows the shared config for this template. It only removes unsupported options and adds limits; the base schema is strict.
 * Offer and proof are ID-only fields: their text always comes from the verified fact snapshot.
 */
export const splitCompositionSchema = templateConfigSchema.superRefine((config, ctx) => {
  const issue = (path: Array<string | number>, message: string) => ctx.addIssue({ code: 'custom', path, message });
  if (config.templateId !== 'split-composition') issue(['templateId'], 'must be "split-composition"');
  if (config.copy.headline.length > SPLIT_COMPOSITION_BUDGETS.headline) issue(['copy', 'headline'], `at most ${SPLIT_COMPOSITION_BUDGETS.headline} characters for this template`);
  if (config.copy.body !== undefined && config.copy.body.length > SPLIT_COMPOSITION_BUDGETS.body) issue(['copy', 'body'], `at most ${SPLIT_COMPOSITION_BUDGETS.body} characters for this template`);
  if (config.copy.benefits.length > SPLIT_COMPOSITION_BUDGETS.benefitsMax) issue(['copy', 'benefits'], `at most ${SPLIT_COMPOSITION_BUDGETS.benefitsMax} benefits`);
  config.copy.benefits.forEach((benefit, i) => {
    if (benefit.text.length > SPLIT_COMPOSITION_BUDGETS.benefit) issue(['copy', 'benefits', i, 'text'], `at most ${SPLIT_COMPOSITION_BUDGETS.benefit} characters`);
  });
  if (config.assets.length !== 1) issue(['assets'], 'exactly one photo');
  if (config.callouts?.length) issue(['callouts'], 'this template has no callouts');
  if (config.comparisonEvidenceId !== undefined) issue(['comparisonEvidenceId'], 'this template has no comparison block');
  if (contrastRatio(config.brand.primary, SPLIT_COMPOSITION_INK.onPrimary) < 4.5) issue(['brand', 'primary'], 'too light: light text on it needs a contrast ratio of at least 4.5');
  if (contrastRatio(config.brand.secondary, SPLIT_COMPOSITION_INK.onSecondary) < 4.5) issue(['brand', 'secondary'], 'too dark: dark text on it needs a contrast ratio of at least 4.5');
  if (contrastRatio(config.brand.accent, SPLIT_COMPOSITION_INK.onAccent) < 4.5) issue(['brand', 'accent'], 'too dark: dark button text on it needs a contrast ratio of at least 4.5');
  if (contrastRatio(config.brand.accent, config.brand.primary) < 4.5) issue(['brand', 'accent'], 'too close to brand.primary: accent text on the dark panel needs a contrast ratio of at least 4.5');
});
