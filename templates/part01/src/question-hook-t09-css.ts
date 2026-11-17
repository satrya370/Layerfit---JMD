import { readFileSync } from 'node:fs';
import postcss from 'postcss';

/** Extract T09 CSS, scope it to the engine canvas, and remove only the oversized ghost question-mark
 * decoration requested by the user. The question mark in the headline remains. */
const sourcePath = new URL('../../../Template-example/layerfit-t09-question-hook/styles.css', import.meta.url);
const root = postcss.parse(readFileSync(sourcePath, 'utf8'));
root.walkRules((rule) => {
  if (rule.selector.includes('.ad__ghostq')) { rule.remove(); return; }
  if (rule.selector === 'html, body' || rule.selector === 'body') { rule.remove(); return; }
  rule.selector = rule.selector
    .replace(/\.ad\[data-format="(square|portrait|story)"\]\[data-headline="(lg|md)"\] \.question/g, (_m, format: string, size: string) => `.lf-question-hook-t09[data-format="${format === 'story' ? 'vertical' : format}"] .question[data-headline="${size}"]`)
    .replace(/\.ad\[data-headline="(lg|md)"\] \.question/g, (_m, size: string) => `.question[data-headline="${size}"]`)
    .replace(/\.ad\[data-format="(square|portrait|story)"\]\[data-image-mode="(contain|cover)"\] \.hero__img/g, (_m, format: string, mode: string) => `.lf-question-hook-t09[data-format="${format === 'story' ? 'vertical' : format}"] .hero[data-image-mode="${mode}"] .hero__img`)
    .replace(/\.ad\[data-image-mode="(contain|cover)"\] (\.hero__(?:ring|img))/g, (_m, mode: string, child: string) => `.hero[data-image-mode="${mode}"] ${child}`)
    .replace(/\.ad\[data-format="(square|portrait|story)"\]/g, (_m, format: string) => `.lf-question-hook-t09[data-format="${format === 'story' ? 'vertical' : format}"]`)
    .replace(/\.ad(?=[\[\s:.,>]|$)/g, '.lf-question-hook-t09');
  rule.selector = rule.selector.split(',').map((part) => {
    let selector = part.trim();
    if (selector === '*') return '.lf-question-hook-t09[data-canvas], .lf-question-hook-t09[data-canvas] *';
    if (selector === '.lf-question-hook-t09') selector = '.lf-question-hook-t09[data-canvas]';
    else if (!selector.startsWith('.lf-question-hook-t09') && !selector.startsWith('.question[data-headline=') && !selector.startsWith('.hero[data-image-mode=')) selector = `.lf-question-hook-t09 ${selector}`;
    return selector;
  }).join(', ');
  if (rule.selector === '.lf-question-hook-t09[data-canvas]') {
    rule.walkDecls('width', (decl) => { decl.remove(); });
    rule.walkDecls('height', (decl) => { decl.remove(); });
    rule.walkDecls('--c-bg', (decl) => { decl.value = 'var(--lf-brand-primary)'; });
    rule.walkDecls('--c-surface', (decl) => { decl.value = 'var(--lf-brand-secondary)'; });
    rule.walkDecls('--c-accent', (decl) => { decl.value = 'var(--lf-brand-accent)'; });
    rule.walkDecls('--c-on-accent', (decl) => { decl.value = 'var(--lf-brand-primary)'; });
    rule.walkDecls('--font-head', (decl) => { decl.value = 'var(--lf-font-heading)'; });
    rule.walkDecls('--font-body', (decl) => { decl.value = 'var(--lf-font-body)'; });
    rule.walkDecls('background', (decl) => { if (decl.value === 'var(--c-bg)') decl.value = 'var(--lf-brand-primary)'; });
    rule.walkDecls('color', (decl) => { if (decl.value === 'var(--c-text)') decl.value = '#ffffff'; });
  }
  if (rule.selector === '.lf-question-hook-t09[data-format="portrait"]' || rule.selector === '.lf-question-hook-t09[data-format="vertical"]') {
    rule.walkDecls('height', (decl) => { decl.remove(); });
  }
  if (rule.selector.endsWith(' .question') || rule.selector.endsWith('.question[data-headline="lg"]') || rule.selector.endsWith('.question[data-headline="md"]')) {
    rule.walkDecls('font-size', (decl) => {
      if (decl.value === '96px') decl.value = 'calc(96px * var(--lf-fit-t09-headline, 1))';
      if (decl.value === '80px') decl.value = 'calc(80px * var(--lf-fit-t09-headline, 1))';
      if (decl.value === '66px') decl.value = 'calc(66px * var(--lf-fit-t09-headline, 1))';
      if (decl.value === '108px') decl.value = 'calc(108px * var(--lf-fit-t09-headline, 1))';
      if (decl.value === '90px') decl.value = 'calc(90px * var(--lf-fit-t09-headline, 1))';
      if (decl.value === '74px') decl.value = 'calc(74px * var(--lf-fit-t09-headline, 1))';
      if (decl.value === '92px') decl.value = 'calc(92px * var(--lf-fit-t09-headline, 1))';
      if (decl.value === '78px') decl.value = 'calc(78px * var(--lf-fit-t09-headline, 1))';
    });
  }
  if (rule.selector.endsWith(' .answer')) {
    rule.walkDecls('font-size', (decl) => {
      if (['24px', '27px', '29px'].includes(decl.value)) decl.value = `calc(${decl.value} * var(--lf-fit-t09-description, 1))`;
    });
  }
  rule.walkDecls('font-family', (decl) => {
    if (decl.value.includes('Space Grotesk')) decl.value = 'var(--lf-font-heading)';
    else if (decl.value.includes('Inter') || decl.value.includes('Arial') || decl.value.includes('Segoe UI')) decl.value = 'var(--lf-font-body)';
  });
});
root.append(postcss.parse('.lf-question-hook-t09 .brandbar__logo[data-image-fit="contain"]{object-fit:contain}'));
export const questionHookT09Css = root.toString();
