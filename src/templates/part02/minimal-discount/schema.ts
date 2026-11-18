import { contrastRatio } from '../../../shared/contrast.js';
import { templateConfigSchema } from '../../../shared/render-contract.js';

/** Copy budgets. A two-line headline, a short supporting paragraph, up to three short benefits and a short button. */
export const MINIMAL_DISCOUNT_BUDGETS = { headline: 44, body: 110, benefit: 30, benefitsMax: 3, cta: 24, brandName: 20 } as const;

/** Fixed text colour on the button. The schema checks the brand colours against it and against the background. */
export const MINIMAL_DISCOUNT_INK = { onPrimary: '#ffffff' } as const;

/**
 * Narrows the shared config for T17. The offer is a verified fact (offerFactId), required and shown as the largest element:
 * the template is only for a verified discount, so a config without one is rejected. Brand colours: secondary = background,
 * primary = ink and button, accent = the product panel and benefit ticks (never text on the background). Proof, callouts,
 * comparison and an accent marker are not supported.
 */
export const minimalDiscountSchema = templateConfigSchema.superRefine((config, ctx) => {
  const issue = (path: Array<string | number>, message: string) => ctx.addIssue({ code: 'custom', path, message });
  const B = MINIMAL_DISCOUNT_BUDGETS;
  if (config.templateId !== 'minimal-discount') issue(['templateId'], 'must be "minimal-discount"');
  if (config.offerFactId === undefined) issue(['offerFactId'], 'a verified discount fact is required for this template');
  if (config.brand.name.length > B.brandName) issue(['brand', 'name'], `at most ${B.brandName} characters for this template`);
  if (config.copy.headline.length > B.headline) issue(['copy', 'headline'], `at most ${B.headline} characters for this template`);
  if (config.copy.body !== undefined && config.copy.body.length > B.body) issue(['copy', 'body'], `at most ${B.body} characters for this template`);
  if (config.copy.cta.length > B.cta) issue(['copy', 'cta'], `at most ${B.cta} characters for this template`);
  if (config.copy.accentPhrase !== undefined) issue(['copy', 'accentPhrase'], 'this template has no accent marker');
  if (config.copy.benefits.length > B.benefitsMax) issue(['copy', 'benefits'], `at most ${B.benefitsMax} benefits`);
  config.copy.benefits.forEach((benefit, i) => {
    if (benefit.text.length > B.benefit) issue(['copy', 'benefits', i, 'text'], `at most ${B.benefit} characters`);
  });
  if (config.assets.length !== 1) issue(['assets'], 'exactly one product photo');
  if (config.proofFactId !== undefined) issue(['proofFactId'], 'this template has no proof block');
  if (config.callouts?.length) issue(['callouts'], 'this template has no callouts');
  if (config.comparisonEvidenceId !== undefined) issue(['comparisonEvidenceId'], 'this template has no comparison block');
  if (contrastRatio(config.brand.primary, config.brand.secondary) < 4.5) issue(['brand', 'primary'], 'ink text on the background needs a contrast ratio of at least 4.5');
  if (contrastRatio(config.brand.primary, MINIMAL_DISCOUNT_INK.onPrimary) < 4.5) issue(['brand', 'primary'], 'white button text needs a contrast ratio of at least 4.5 on the primary colour');
  // The panel must read as a block against the background; in story the brand sits on it, and ticks are drawn on it in ink.
  if (contrastRatio(config.brand.accent, config.brand.secondary) < 1.15) issue(['brand', 'accent'], 'the product panel must differ visibly from the background colour');
  if (contrastRatio(config.brand.primary, config.brand.accent) < 4.5) issue(['brand', 'accent'], 'ink on the product panel needs a contrast ratio of at least 4.5');
});
