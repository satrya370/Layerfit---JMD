import { readFileSync } from 'node:fs';
import postcss from 'postcss';

/** Extract the latest user-supplied T07 Lifestyle Benefit v3 stylesheet. Preserve its grid/format
 * art direction; replace only the engine-owned document canvas, tokens, selector scope and story name.
 */
const sourcePath = new URL('../../../Template-example/layerfit_t07_lifestyle_benefit_v3/styles.css', import.meta.url);
const root = postcss.parse(readFileSync(sourcePath, 'utf8'));
root.walkRules((rule) => {
  if (rule.selector === ':root' || rule.selector === 'html,body' || rule.selector === 'body') { rule.remove(); return; }
  rule.selector = rule.selector
    .replace(/\.creative\[data-format="story"\]/g, '.lf-everyday-editorial[data-format="vertical"]')
    .replace(/\.creative(?=[\[\s:.,>]|$)/g, '.lf-everyday-editorial');
  rule.selector = rule.selector.split(',').map((part) => {
    let selector = part.trim();
    if (selector === '*') return '.lf-everyday-editorial[data-canvas], .lf-everyday-editorial[data-canvas] *';
    if (selector === '.lf-everyday-editorial') selector = '.lf-everyday-editorial[data-canvas]';
    else if (!selector.startsWith('.lf-everyday-editorial')) selector = `.lf-everyday-editorial ${selector}`;
    return selector;
  }).join(', ');
  if (rule.selector === '.lf-everyday-editorial[data-canvas]') {
    rule.walkDecls('width', (decl) => { decl.remove(); });
    rule.walkDecls('height', (decl) => { decl.remove(); });
    rule.walkDecls('--paper', (decl) => { decl.value = 'var(--lf-brand-secondary)'; });
    rule.walkDecls('--ink', (decl) => { decl.value = 'var(--lf-brand-primary)'; });
    rule.walkDecls('--accent', (decl) => { decl.value = 'var(--lf-brand-accent)'; });
    rule.walkDecls('background', (decl) => { if (decl.value === 'var(--paper)') decl.value = 'var(--lf-brand-secondary)'; });
    rule.walkDecls('color', (decl) => { if (decl.value === 'var(--ink)') decl.value = 'var(--lf-brand-primary)'; });
    rule.append({ prop: 'font-family', value: 'var(--lf-font-body)' });
  }
  if (rule.selector === '.lf-everyday-editorial[data-format="portrait"]' || rule.selector === '.lf-everyday-editorial[data-format="vertical"]') {
    rule.walkDecls('height', (decl) => { decl.remove(); });
  }
  if (rule.selector.endsWith(' h1')) {
    rule.walkDecls('font-size', (decl) => {
      if (['75px', '83px', '100px'].includes(decl.value)) decl.value = `calc(${decl.value} * var(--lf-fit-editorial-headline, 1))`;
    });
  }
  if (rule.selector.endsWith(' .opening p')) {
    rule.walkDecls('font-size', (decl) => {
      if (['23px', '24px', '26px'].includes(decl.value)) decl.value = `calc(${decl.value} * var(--lf-fit-editorial-description, 1))`;
    });
  }
  rule.walkDecls('font-family', (decl) => { if (decl.value.includes('Arial')) decl.value = 'var(--lf-font-body)'; });
});
root.append(postcss.parse(`
.lf-everyday-editorial .lifestyle img[data-focal-position="50-48"]{object-position:50% 48%}
.lf-everyday-editorial .lifestyle img[data-focal-position="50-50"]{object-position:50% 50%}
.lf-everyday-editorial .lifestyle img[data-focal-position="45-50"]{object-position:45% 50%}
`));
export const everydayEditorialCss = root.toString();
