import { contrastRatio } from '../../../shared/contrast.js';
import { templateConfigSchema } from '../../../shared/render-contract.js';

/** Copy budgets. A short serif headline (two lines), short benefits, a short button. */
export const ATMOSPHERIC_EDITORIAL_BUDGETS = { headline: 42, benefit: 24, benefitsMax: 3, brandName: 24, cta: 20 } as const;

/** Fixed text colours used by the CSS. The schema checks the brand colours against them. */
export const ATMOSPHERIC_EDITORIAL_INK = { onBand: '#1b2220', onPrimary: '#ffffff' } as const;

/**
 * Narrows the shared config for T10. secondary = band (ink text on it), primary = button (white text on it), accent =
 * offer text and benefit markers on the band. Body text, an accent marker, proof, callouts and comparison are not
 * supported by this layout.
 */
export const atmosphericEditorialSchema = templateConfigSchema.superRefine((config, ctx) => {
  const issue = (path: Array<string | number>, message: string) => ctx.addIssue({ code: 'custom', path, message });
  const B = ATMOSPHERIC_EDITORIAL_BUDGETS;
  if (config.templateId !== 'atmospheric-editorial') issue(['templateId'], 'must be "atmospheric-editorial"');
  if (config.brand.name.length > B.brandName) issue(['brand', 'name'], `at most ${B.brandName} characters for this template`);
  if (config.copy.headline.length > B.headline) issue(['copy', 'headline'], `at most ${B.headline} characters for this template`);
  if (config.copy.cta.length > B.cta) issue(['copy', 'cta'], `at most ${B.cta} characters for this template`);
  if (config.copy.body !== undefined) issue(['copy', 'body'], 'this template has no body text');
  if (config.copy.accentPhrase !== undefined) issue(['copy', 'accentPhrase'], 'this template has no accent marker');
  if (config.copy.benefits.length > B.benefitsMax) issue(['copy', 'benefits'], `at most ${B.benefitsMax} benefits`);
  config.copy.benefits.forEach((benefit, i) => {
    if (benefit.text.length > B.benefit) issue(['copy', 'benefits', i, 'text'], `at most ${B.benefit} characters`);
  });
  if (config.assets.length !== 1) issue(['assets'], 'exactly one photo');
  if (config.assets[0] && !config.assets[0].allowCrop) issue(['assets', 0, 'allowCrop'], 'the photo fills a full-width frame, so it must allow cropping');
  if (config.proofFactId !== undefined) issue(['proofFactId'], 'this template has no proof block');
  if (config.callouts?.length) issue(['callouts'], 'this template has no callouts');
  if (config.comparisonEvidenceId !== undefined) issue(['comparisonEvidenceId'], 'this template has no comparison block');
  if (contrastRatio(config.brand.secondary, ATMOSPHERIC_EDITORIAL_INK.onBand) < 4.5) issue(['brand', 'secondary'], 'too dark: ink text on the band needs a contrast ratio of at least 4.5');
  if (contrastRatio(config.brand.primary, ATMOSPHERIC_EDITORIAL_INK.onPrimary) < 4.5) issue(['brand', 'primary'], 'too light: white button text needs a contrast ratio of at least 4.5');
  if (contrastRatio(config.brand.accent, config.brand.secondary) < 4.5) issue(['brand', 'accent'], 'offer text in the accent colour on the band needs a contrast ratio of at least 4.5');
});
