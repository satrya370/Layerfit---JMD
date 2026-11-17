import { annotatedHeroSchema, escapeHtml, formats, type AnnotatedHeroConfig, type CreativeFormat } from './schema.js';

// Keep these trusted static CSS tokens quote-free because they are embedded in an HTML attribute.
const fontMap = { serif: 'Georgia, serif', sans: 'Arial, sans-serif' } as const;

/**
 * Template adapter: validated LayerFit config + locally compiled CSS + owned raster bytes → HTML.
 * It does not resolve asset IDs, call AI, read filesystem paths, or fetch network resources.
 * The application/renderer must verify campaign ownership and decode image bytes before calling.
 */
export function renderAnnotatedHeroHtml(input: AnnotatedHeroConfig, format: CreativeFormat, compiledCss: string): string {
  const config = annotatedHeroSchema.parse(input);
  if (!compiledCss.trim()) throw new Error('Compiled local Tailwind CSS is required');
  const { width, height, safeTop, safeBottom } = formats[format];
  const imageUrl = `data:${config.image.mime};base64,${config.image.bytes.toString('base64')}`;
  const headingFont = fontMap[config.brand.fontHeading];
  const bodyFont = fontMap[config.brand.fontBody];
  const benefits = config.copy.benefits.map((benefit, index) =>
    `<div class="lf-benefit lf-callout shadow-lg" data-slot="benefit-${index + 1}" data-required="true" data-safe="true">${escapeHtml(benefit.text)}</div>`,
  ).join('');

  const connectors = (config.callouts ?? []).map((callout) => {
    const startX = Math.round(callout.anchor.x * 1000);
    const startY = Math.round(callout.anchor.y * 1000);
    const endX = 730;
    const endY = Math.round((0.5 + (callout.benefitIndex - (config.copy.benefits.length - 1) / 2) * 0.114) * 1000);
    const controlX1 = Math.round(startX + (endX - startX) * 0.35);
    const controlX2 = Math.round(endX - (endX - startX) * 0.35);
    const path = `M ${startX} ${startY} C ${controlX1} ${startY}, ${controlX2} ${endY}, ${endX} ${endY}`;
    return `<path data-connector-for="benefit-${callout.benefitIndex + 1}" d="${path}" fill="none" stroke="${config.brand.primary}" stroke-width="3" stroke-linecap="round" opacity=".72" vector-effect="non-scaling-stroke"/><circle cx="${startX}" cy="${startY}" r="7" fill="${config.brand.primary}" data-anchor-for="benefit-${callout.benefitIndex + 1}"/>`;
  }).join('');

  const offer = config.verifiedOffer
    ? `<span class="lf-footnote" data-slot="verified-offer" data-required="false" data-safe="true">${escapeHtml(config.verifiedOffer.label)}</span>`
    : `<span class="lf-footnote" data-slot="brand-footer" data-required="false" data-safe="true">${escapeHtml(config.brand.name)}</span>`;

  return `<!doctype html><html lang="${config.language}"><head><meta charset="utf-8"><meta name="viewport" content="width=${width}, initial-scale=1"><style>${compiledCss}</style>
    <style>:root{--brand:${config.brand.primary};--paper:${config.brand.background};--ink:${config.brand.text};--font-heading:${headingFont};--font-body:${bodyFont};--safe-top:${safeTop}px;--safe-bottom:${safeBottom}px}</style>
  </head><body><main class="lf-canvas" data-template="annotated-hero" data-template-version="0.1.0" data-format="${format}" data-creative-id="${config.creativeId}" data-canvas-width="${width}" data-canvas-height="${height}" data-safe-top="${safeTop}" data-safe-bottom="${safeBottom}" data-safe-sides="70" style="--brand:${config.brand.primary};--paper:${config.brand.background};--ink:${config.brand.text};--font-heading:${headingFont};--font-body:${bodyFont};--safe-top:${safeTop}px;--safe-bottom:${safeBottom}px">
    <header class="lf-header" data-slot="header" data-required="true" data-safe="true"><div class="lf-brand" data-slot="brand-name">${escapeHtml(config.brand.name)}</div><h1 class="lf-headline" style="font-family:${headingFont}" data-slot="headline" data-required="true" data-safe="true">${escapeHtml(config.copy.headline)}</h1></header>
    <section class="lf-stage" data-slot="product-stage" data-required="true" data-safe="true">
      <figure class="lf-photo-frame shadow-product" data-slot="product-image-frame" data-required="true" data-safe="true"><img class="lf-photo" data-slot="product-image" data-image-fit="contain" alt="${escapeHtml(config.product.name)}" src="${imageUrl}"/></figure>
      <aside class="lf-benefits" data-slot="benefits" data-required="true" data-safe="true">${benefits}</aside>
      ${connectors ? `<svg class="lf-connector" data-slot="callout-connectors" aria-hidden="true" viewBox="0 0 1000 1000" preserveAspectRatio="none">${connectors}</svg>` : ''}
    </section>
    <footer class="lf-footer" data-slot="footer" data-required="true" data-safe="true"><span class="lf-cta" data-slot="cta" data-required="true" data-safe="true">${escapeHtml(config.copy.cta)}</span>${offer}</footer>
    </main></body></html>`;
}
