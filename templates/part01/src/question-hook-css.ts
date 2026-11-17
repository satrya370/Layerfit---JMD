import { readFileSync } from 'node:fs';
import postcss from 'postcss';

/** Extract source T06 CSS, keeping its art direction. Engine shell replaces page/body sizing;
 * `.creative--story` maps to contract format `vertical`; colors and fonts consume engine tokens.
 */
const sourcePath = new URL('../../../Template-example/T06_Question_Hook/styles.css', import.meta.url);
const root = postcss.parse(readFileSync(sourcePath, 'utf8'));
root.walkRules((rule) => {
  if (rule.selector === 'html, body' || rule.selector === 'body') { rule.remove(); return; }
  if (rule.selector === ':root') {
    rule.selector = '.lf-question-hook[data-canvas]';
    rule.walkDecls('--paper', (decl) => { decl.value = 'var(--lf-brand-secondary)'; });
    rule.walkDecls('--ink', (decl) => { decl.value = 'var(--lf-brand-primary)'; });
    rule.walkDecls('--accent', (decl) => { decl.value = 'var(--lf-brand-accent)'; });
    return;
  }
  rule.selector = rule.selector
    .replace(/\.creative--portrait/g, '.lf-question-hook[data-format="portrait"]')
    .replace(/\.creative--story/g, '.lf-question-hook[data-format="vertical"]')
    .replace(/\.creative/g, '.lf-question-hook');
  rule.selector = rule.selector.split(',').map((part) => {
    let selector = part.trim();
    if (selector === '*') return '.lf-question-hook[data-canvas], .lf-question-hook[data-canvas] *';
    if (selector === '.lf-question-hook') selector = '.lf-question-hook[data-canvas]';
    else if (selector.startsWith('.lf-question-hook::')) selector = selector.replace('.lf-question-hook', '.lf-question-hook[data-canvas]');
    else if (!selector.startsWith('.lf-question-hook')) selector = `.lf-question-hook ${selector}`;
    return selector;
  }).join(', ');
  if (rule.selector === '.lf-question-hook[data-canvas]') {
    rule.walkDecls('width', (decl) => { decl.remove(); });
    rule.walkDecls('height', (decl) => { decl.remove(); });
    rule.walkDecls('margin', (decl) => { decl.remove(); });
    rule.walkDecls('background', (decl) => { if (decl.value === 'var(--paper)') decl.value = 'var(--lf-brand-secondary)'; });
    rule.walkDecls('color', (decl) => { if (decl.value === 'var(--ink)') decl.value = 'var(--lf-brand-primary)'; });
    rule.append({ prop: 'font-family', value: 'var(--lf-font-body)' });
  }
  if (rule.selector === '.lf-question-hook[data-format="portrait"]' || rule.selector === '.lf-question-hook[data-format="vertical"]') {
    rule.walkDecls('height', (decl) => { decl.remove(); });
  }
  if (rule.selector.endsWith(' .headline')) {
    rule.walkDecls('font-size', (decl) => {
      if (decl.value === '87px') decl.value = 'calc(87px * var(--lf-fit-question-headline, 1))';
      if (decl.value === '102px') decl.value = 'calc(102px * var(--lf-fit-question-headline, 1))';
      if (decl.value === '120px') decl.value = 'calc(120px * var(--lf-fit-question-headline, 1))';
    });
  }
  if (rule.selector.endsWith(' .description')) {
    rule.walkDecls('font-size', (decl) => {
      if (decl.value === '23px') decl.value = 'calc(23px * var(--lf-fit-question-description, 1))';
      if (decl.value === '26px') decl.value = 'calc(26px * var(--lf-fit-question-description, 1))';
      if (decl.value === '34px') decl.value = 'calc(34px * var(--lf-fit-question-description, 1))';
    });
  }
  rule.walkDecls('font-family', (decl) => { if (decl.value.includes('Arial')) decl.value = 'var(--lf-font-body)'; });
});
export const questionHookCss = root.toString();
