import { createHash } from 'node:crypto';
import { SafeHtml } from '../../shared/html.js';
import type { FormatProfile, TemplateConfig, TemplateRenderOutput } from '../../shared/render-contract.js';
import { RenderError } from './errors.js';
import { fontFaceCss, type LoadedFont } from './fonts.js';

const MAX_CSS_BYTES = 512 * 1024;
export const CSP = "default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; script-src 'none'; base-uri 'none'; form-action 'none'";

/** Template CSS is trusted build output, but is still checked so remote resources or markup breakouts fail loudly. */
/** Resolves CSS escapes (`\69` / `\i`) so `@\69mport` and `\75rl(` cannot hide from the checks below. */
function decodeCssEscapes(css: string): string {
  return css
    .replace(/\\([0-9a-fA-F]{1,6})[ \t\r\n\f]?/g, (_match, hex: string) => {
      const codePoint = Number.parseInt(hex, 16);
      return codePoint > 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : '�';
    })
    .replace(/\\([^\n])/g, '$1');
}

export function validateTemplateCss(css: string): void {
  if (Buffer.byteLength(css) > MAX_CSS_BYTES) throw new RenderError('CSS_INVALID', 'template', 'Template CSS exceeds 512KB');
  // Checked on both the raw text and the escape-decoded text. Escaped class names (Tailwind `.md\:flex`) decode to harmless text.
  for (const text of [css, decodeCssEscapes(css)]) {
    if (/@import/i.test(text)) throw new RenderError('CSS_INVALID', 'template', 'Template CSS must not use @import');
    if (/<\/?(style|script)/i.test(text)) throw new RenderError('CSS_INVALID', 'template', 'Template CSS contains markup');
    if (/expression\s*\(|javascript:|behavior\s*:|-moz-binding/i.test(text)) throw new RenderError('CSS_INVALID', 'template', 'Template CSS contains script-like constructs');
    for (const match of text.matchAll(/url\(\s*(['"]?)([^'")\s]*)/gi)) {
      if (!match[2]!.startsWith('data:')) throw new RenderError('CSS_INVALID', 'template', 'Template CSS references a non-embedded url()');
    }
  }
}

export interface ComposeInput {
  templateId: string;
  templateVersion: string;
  rootClass: string;
  profile: FormatProfile;
  config: TemplateConfig;
  language: 'nl' | 'en' | 'id';
  fonts: { heading: LoadedFont; body: LoadedFont };
  output: TemplateRenderOutput;
}

const ROOT_CLASS = /^[a-z][a-z0-9-]{0,63}$/;

/**
 * Engine-owned document shell. Replaces the reference renderer's raw `replaceAll` placeholder injection:
 * content arrives as SafeHtml from the escaping `html` builder; tokens come only from validated config values.
 */
export function composeDocument({ templateId, templateVersion, rootClass, profile, config, language, fonts, output }: ComposeInput): { html: string; cssHash: string } {
  if (!ROOT_CLASS.test(rootClass)) throw new RenderError('TEMPLATE_FAILED', 'template', 'Template rootClass is invalid');
  if (!(output.body instanceof SafeHtml)) throw new RenderError('TEMPLATE_FAILED', 'template', 'Template body must be SafeHtml from html``');
  if (typeof output.css !== 'string') throw new RenderError('TEMPLATE_FAILED', 'template', 'Template CSS must be a string');
  validateTemplateCss(output.css);
  const { width, height, safe } = profile;
  const { brand } = config;
  const family = (font: LoadedFont) => `"${font.family}", ${font.fallback}`;
  const base = `*,*::before,*::after{box-sizing:border-box;animation:none!important;transition:none!important;caret-color:transparent!important}
html,body{margin:0;padding:0;width:${width}px;height:${height}px;overflow:hidden;background:#ffffff}
[data-canvas]{position:relative;display:block;width:${width}px;height:${height}px;overflow:hidden;
--lf-canvas-w:${width}px;--lf-canvas-h:${height}px;--lf-safe-top:${safe.top}px;--lf-safe-right:${safe.right}px;--lf-safe-bottom:${safe.bottom}px;--lf-safe-left:${safe.left}px;
--lf-brand-primary:${brand.primary};--lf-brand-secondary:${brand.secondary};--lf-brand-accent:${brand.accent};
--lf-font-heading:${family(fonts.heading)};--lf-font-body:${family(fonts.body)}}`;
  const templateCss = `${output.css}\n:root{--lf-css-ready:1}`;
  const cssHash = createHash('sha256').update(output.css).digest('hex');
  const html = `<!doctype html><html lang="${language}"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<style>${fontFaceCss([fonts.heading, fonts.body])}</style>
<style>${base}</style>
<style>${templateCss}</style>
</head><body><main data-canvas class="${rootClass}" data-format="${profile.format}" data-template="${templateId}" data-template-version="${templateVersion}">${output.body.toString()}</main></body></html>`;
  return { html, cssHash };
}
