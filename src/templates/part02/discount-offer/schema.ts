import { contrastRatio } from '../../../shared/contrast.js';
import { templateConfigSchema } from '../../../shared/render-contract.js';

/** Copy budgets. A short headline, one supporting line and a short button. */
export const DISCOUNT_OFFER_BUDGETS = { headline: 40, body: 90, cta: 24, brandName: 24 } as const;

/** Fixed text colour on the button. The schema checks the brand colours against it and against the paper background. */
export const DISCOUNT_OFFER_INK = { onPrimary: '#ffffff' } as const;

/**
 * Narrows the shared config for T16. The offer tag is a verified fact (offerFactId) and is required: the template is only
 * for a verified discount, so a config without one is rejected. Brand colours: secondary = paper, primary = ink and button.
 * Accent is the glow behind the product. Proof, callouts, comparison and an accent marker are not supported.
 */
export const discountOfferSchema = templateConfigSchema.superRefine((config, ctx) => {
  const issue = (path: Array<string | number>, message: string) => ctx.addIssue({ code: 'custom', path, message });
  const B = DISCOUNT_OFFER_BUDGETS;
  if (config.templateId !== 'discount-offer') issue(['templateId'], 'must be "discount-offer"');
  if (config.offerFactId === undefined) issue(['offerFactId'], 'a verified discount fact is required for this template');
  if (config.brand.name.length > B.brandName) issue(['brand', 'name'], `at most ${B.brandName} characters for this template`);
  if (config.copy.headline.length > B.headline) issue(['copy', 'headline'], `at most ${B.headline} characters for this template`);
  if (config.copy.body !== undefined && config.copy.body.length > B.body) issue(['copy', 'body'], `at most ${B.body} characters for this template`);
  if (config.copy.cta.length > B.cta) issue(['copy', 'cta'], `at most ${B.cta} characters for this template`);
  if (config.copy.accentPhrase !== undefined) issue(['copy', 'accentPhrase'], 'this template has no accent marker');
  if (config.copy.benefits.length) issue(['copy', 'benefits'], 'this template has no benefit list; use the supporting line');
  if (config.assets.length !== 1) issue(['assets'], 'exactly one product photo');
  if (config.proofFactId !== undefined) issue(['proofFactId'], 'this template has no proof block');
  if (config.callouts?.length) issue(['callouts'], 'this template has no callouts');
  if (config.comparisonEvidenceId !== undefined) issue(['comparisonEvidenceId'], 'this template has no comparison block');
  if (contrastRatio(config.brand.primary, config.brand.secondary) < 4.5) issue(['brand', 'primary'], 'ink text on the paper background needs a contrast ratio of at least 4.5');
  if (contrastRatio(config.brand.primary, DISCOUNT_OFFER_INK.onPrimary) < 4.5) issue(['brand', 'primary'], 'white button text needs a contrast ratio of at least 4.5 on the primary colour');
});
