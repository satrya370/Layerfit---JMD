import { readFileSync } from 'node:fs';
import postcss from 'postcss';

/** Extract supplied CSS, preserving declarations rather than hand-redesigning them.
 * Only remove page-preview chrome/breakpoint and scope to the engine canvas.
 */
const source = readFileSync(new URL('../../../Template-example/comparison-banner/t02.css', import.meta.url), 'utf8');
const root = postcss.parse(source);
root.walkAtRules((rule) => { if (rule.name === 'media') rule.remove(); });
root.walkRules((rule) => {
  if (rule.selector === 'body') { rule.remove(); return; }
  if (rule.selector === ':root') {
    rule.selector = '.lf-comparison-banner';
    rule.walkDecls('--font-head', (decl) => { decl.value = 'var(--lf-font-heading)'; });
    rule.walkDecls('--font-body', (decl) => { decl.value = 'var(--lf-font-body)'; });
  } else if (rule.selector === '*') {
    rule.selector = '.lf-comparison-banner, .lf-comparison-banner *';
  } else if (rule.selector === '.ad') {
    rule.selector = '.lf-comparison-banner[data-canvas]';
    rule.walkDecls('width', (decl) => { decl.value = '100%'; });
    rule.walkDecls('box-shadow', (decl) => { decl.value = 'none'; });
    rule.append({ prop: 'font-family', value: 'var(--font-body)' });
  } else {
    rule.selector = rule.selector.split(',').map((selector) => `.lf-comparison-banner ${selector.trim()}`).join(', ');
  }
});
export const comparisonBannerCss = root.toString();
