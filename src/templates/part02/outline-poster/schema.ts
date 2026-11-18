import { contrastRatio } from '../../../shared/contrast.js';
import { templateConfigSchema } from '../../../shared/render-contract.js';

/**
 * Copy budgets. The top and bottom lines are short, stretched display type: one word group per line.
 * Top lines travel in `copy.body`, separated by "|"; bottom lines are `copy.benefits` (each needs a fact).
 */
export const OUTLINE_POSTER_BUDGETS = { headline: 24, topLine: 16, topLinesMax: 3, bottomLine: 16, bottomLinesMax: 3, cta: 32, brandName: 24 } as const;

/** Fixed text colours. The brand colours are the background (primary), outline (secondary) and offer text (accent). */
export const OUTLINE_POSTER_INK = { headline: '#ffffff' } as const;

export const outlinePosterSchema = templateConfigSchema.superRefine((config, ctx) => {
  const issue = (path: Array<string | number>, message: string) => ctx.addIssue({ code: 'custom', path, message });
  const B = OUTLINE_POSTER_BUDGETS;
  if (config.templateId !== 'outline-poster') issue(['templateId'], 'must be "outline-poster"');
  if (config.brand.name.length > B.brandName) issue(['brand', 'name'], `at most ${B.brandName} characters for this template`);
  if (config.copy.headline.length > B.headline) issue(['copy', 'headline'], `at most ${B.headline} characters for this template`);
  if (config.copy.cta.length > B.cta) issue(['copy', 'cta'], `at most ${B.cta} characters for this template`);
  if (config.copy.accentPhrase !== undefined) issue(['copy', 'accentPhrase'], 'this template has no accent marker');
  const topLines = (config.copy.body ?? '').split('|').map((line) => line.trim()).filter(Boolean);
  if (topLines.length > B.topLinesMax) issue(['copy', 'body'], `at most ${B.topLinesMax} top lines, separated by "|"`);
  topLines.forEach((line) => { if (line.length > B.topLine) issue(['copy', 'body'], `each top line at most ${B.topLine} characters`); });
  if (config.copy.benefits.length > B.bottomLinesMax) issue(['copy', 'benefits'], `at most ${B.bottomLinesMax} bottom lines`);
  config.copy.benefits.forEach((line, i) => {
    if (line.text.length > B.bottomLine) issue(['copy', 'benefits', i, 'text'], `at most ${B.bottomLine} characters`);
  });
  if (config.assets.length !== 1) issue(['assets'], 'exactly one product photo');
  if (config.proofFactId !== undefined) issue(['proofFactId'], 'this template has no proof block');
  if (config.callouts?.length) issue(['callouts'], 'this template has no callouts');
  if (config.comparisonEvidenceId !== undefined) issue(['comparisonEvidenceId'], 'this template has no comparison block');
  if (contrastRatio(config.brand.primary, OUTLINE_POSTER_INK.headline) < 4.5) issue(['brand', 'primary'], 'the background is too light for the white headline (contrast below 4.5)');
  if (contrastRatio(config.brand.accent, config.brand.primary) < 4.5) issue(['brand', 'accent'], 'offer text in the accent colour on the background needs a contrast ratio of at least 4.5');
  if (contrastRatio(config.brand.secondary, config.brand.primary) < 3) issue(['brand', 'secondary'], 'the outline stroke needs a contrast ratio of at least 3 against the background');
});
