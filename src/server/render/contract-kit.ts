/**
 * Contract conformance kit (docs/contracts/render-template-contract.md §11, step 2). No browser.
 * Checks that a TemplateModule follows the shared contract: schema strictness, output shape, markup and CSS rules,
 * slot manifest, semantic attribute values, image fit and determinism. Run by the template owner before handing over a
 * commit and by the engine owner before integration. It does not prove layout: overflow, collisions and safe area are
 * measured by the renderer in a real browser.
 *
 * Markup is analysed with a small tag tokenizer, not a full HTML parser. It is a conformance linter, not a security
 * boundary: the page CSP, request interception and escaping by construction remain the real controls.
 */
import { SafeHtml } from '../../shared/html.js';
import {
  CONTRACT_VERSION, FORMAT_PROFILES, type Format, type ResolvedAsset, type ResolvedFact, type TemplateConfig, type TemplateModule,
} from '../../shared/render-contract.js';
import { MemoryAssetSource, RenderAssetResolver, type AssetRecord } from '../assets/resolve-render-assets.js';
import { validateTemplateCss } from './document.js';
import { RenderError } from './errors.js';
import { TemplateRegistry } from './registry.js';

export interface ContractCase {
  /** Short label used in reports, e.g. "shirt-two-benefits". */
  name: string;
  campaignId: string;
  /** A stored creative config the template must accept. */
  config: unknown;
  facts: ResolvedFact[];
  /** Owned asset bytes referenced by the config. */
  assets: AssetRecord[];
  /** Formats to render. Defaults to the module's declared formats. */
  formats?: readonly Format[];
  /** Extra configs the template must reject (beyond the generic mutations). */
  rejects?: Array<{ name: string; config: unknown }>;
}

export type CheckStatus = 'pass' | 'fail' | 'warn';
export interface CheckResult { id: string; status: CheckStatus; detail: string; case?: string; format?: Format; slot?: string }
export interface ContractReport {
  contractVersion: string;
  template: { id: string; version: string };
  passed: boolean;
  counts: { pass: number; fail: number; warn: number };
  checks: CheckResult[];
}

type Obj = Record<string, unknown>;
const isObj = (value: unknown): value is Obj => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Generic mutations every template schema must reject. A mutation is skipped when its target path does not exist. */
const MUTATIONS: ReadonlyArray<{ id: string; apply: (config: Obj) => boolean }> = [
  { id: 'unknown top-level key', apply: (c) => { c.outputPath = '/tmp/x'; return true; } },
  { id: 'unknown key inside brand', apply: (c) => { if (!isObj(c.brand)) return false; c.brand.cssText = 'x'; return true; } },
  { id: 'CSS injection in brand color', apply: (c) => { if (!isObj(c.brand) || typeof c.brand.primary !== 'string') return false; c.brand.primary = 'red;background:url(http://x)'; return true; } },
  { id: 'font outside the registry', apply: (c) => { if (!isObj(c.brand) || typeof c.brand.fontHeadingId !== 'string') return false; c.brand.fontHeadingId = 'comic-sans'; return true; } },
  { id: 'path traversal in asset id', apply: (c) => { const first = Array.isArray(c.assets) ? c.assets[0] : undefined; if (!isObj(first)) return false; first.assetId = '../../etc/passwd'; return true; } },
  { id: 'image bytes stored in config', apply: (c) => { const first = Array.isArray(c.assets) ? c.assets[0] : undefined; if (!isObj(first)) return false; first.bytes = 'AAAA'; return true; } },
  { id: 'oversized headline', apply: (c) => { if (!isObj(c.copy) || typeof c.copy.headline !== 'string') return false; c.copy.headline = 'x'.repeat(500); return true; } },
  { id: 'control character in CTA', apply: (c) => { if (!isObj(c.copy) || typeof c.copy.cta !== 'string') return false; c.copy.cta = 'a\u0007b'; return true; } },
  { id: 'missing CTA', apply: (c) => { if (!isObj(c.copy) || !('cta' in c.copy)) return false; delete c.copy.cta; return true; } },
  { id: 'markup in template id', apply: (c) => { if (typeof c.templateId !== 'string') return false; c.templateId = '<script>'; return true; } },
];

interface Tag { name: string; attrs: Map<string, string>; closing: boolean }

const UNESCAPES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#96;': '`' };
const unescapeHtml = (value: string) => value.replace(/&(amp|lt|gt|quot|#39|#96);/g, (m) => UNESCAPES[m] ?? m);

/** Minimal tokenizer: tag name plus attributes. Quoted values may contain anything except their quote. */
function tokenize(markup: string): Tag[] {
  const tags: Tag[] = [];
  const tagPattern = /<(\/?)([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
  const attrPattern = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of markup.matchAll(tagPattern)) {
    const attrs = new Map<string, string>();
    for (const attr of (match[3] ?? '').matchAll(attrPattern)) {
      attrs.set(attr[1]!.toLowerCase(), unescapeHtml(attr[2] ?? attr[3] ?? attr[4] ?? ''));
    }
    tags.push({ name: match[2]!.toLowerCase(), attrs, closing: match[1] === '/' });
  }
  return tags;
}

const FORBIDDEN_TAGS = new Set(['script', 'link', 'iframe', 'frame', 'frameset', 'object', 'embed', 'base', 'meta', 'form', 'style', 'video', 'audio', 'source', 'track', 'applet']);
const FORBIDDEN_ATTRS = new Set(['srcset', 'poster', 'action', 'formaction', 'background', 'ping', 'manifest']);
const URL_ATTRS = new Set(['src', 'href', 'xlink:href', 'data', 'cite', 'longdesc']);
const FLAG = /^(true|false)$/;
const GROUP = /^[a-z][a-z0-9-]{0,31}$/;
const SLOT = /^[a-z][a-z0-9-]{0,63}$/;

function selectorsAreScoped(css: string, rootClass: string, templateId: string): string[] {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const offenders: string[] = [];
  const scopeOk = (selector: string) => selector.includes(`.${rootClass}`) || selector.includes(`[data-template="${templateId}"]`) || selector.trim() === ':root';
  const walk = (text: string) => {
    let i = 0;
    while (i < text.length) {
      const open = text.indexOf('{', i);
      if (open === -1) break;
      const prelude = text.slice(i, open).trim();
      let depth = 1; let j = open + 1;
      while (j < text.length && depth > 0) { if (text[j] === '{') depth += 1; else if (text[j] === '}') depth -= 1; j += 1; }
      const inner = text.slice(open + 1, j - 1);
      if (prelude.startsWith('@')) {
        if (/^@(media|supports|layer|container)/i.test(prelude)) walk(inner);
      } else {
        for (const selector of prelude.split(',')) if (selector.trim() && !scopeOk(selector)) offenders.push(selector.trim().slice(0, 60));
      }
      i = j;
    }
  };
  walk(stripped);
  return offenders;
}

export interface KitOptions {
  /** Treat warnings as failures. Default false. */
  strict?: boolean;
}

export async function checkTemplateContract(module: TemplateModule, cases: readonly ContractCase[], options: KitOptions = {}): Promise<ContractReport> {
  const checks: CheckResult[] = [];
  const add = (id: string, status: CheckStatus, detail: string, extra: Pick<CheckResult, 'case' | 'format' | 'slot'> = {}) => checks.push({ id, status, detail, ...extra });

  // 1. Module metadata is accepted by the real registry.
  try { new TemplateRegistry().register(module); add('module.registry', 'pass', 'registry accepts id, version, formats, rootClass and slot manifest'); }
  catch (error) { add('module.registry', 'fail', (error as Error).message); }
  if (cases.length === 0) add('cases.present', 'fail', 'no contract cases supplied; at least one valid case is required');

  for (const testCase of cases) {
    const caseName = testCase.name;
    // 2. Schema accepts the case config and rejects every applicable generic mutation.
    const accepted = module.configSchema.safeParse(testCase.config);
    if (!accepted.success) { add('schema.accepts', 'fail', `config rejected: ${accepted.error.issues.slice(0, 3).map((i) => `${i.path.map(String).join('.')} ${i.message}`).join('; ')}`, { case: caseName }); continue; }
    add('schema.accepts', 'pass', 'config accepted', { case: caseName });

    const applied: string[] = []; const skipped: string[] = []; const notRejected: string[] = [];
    for (const mutation of MUTATIONS) {
      const clone = structuredClone(testCase.config);
      if (!isObj(clone) || !mutation.apply(clone)) { skipped.push(mutation.id); continue; }
      applied.push(mutation.id);
      if (module.configSchema.safeParse(clone).success) notRejected.push(mutation.id);
    }
    for (const extra of testCase.rejects ?? []) {
      applied.push(`case: ${extra.name}`);
      if (module.configSchema.safeParse(extra.config).success) notRejected.push(`case: ${extra.name}`);
    }
    if (notRejected.length) add('schema.strict', 'fail', `schema accepted input it must reject: ${notRejected.join('; ')}`, { case: caseName });
    else add('schema.strict', 'pass', `${applied.length} hostile or malformed variants rejected${skipped.length ? `; ${skipped.length} not applicable to this config shape` : ''}`, { case: caseName });

    // 3. Render every format with engine-resolved assets.
    const config = accepted.data as TemplateConfig;
    const source = new MemoryAssetSource(); for (const record of testCase.assets) source.put(record);
    let photos: ResolvedAsset[] = []; let logo: ResolvedAsset | undefined;
    try {
      const resolved = await new RenderAssetResolver(source).resolve(testCase.campaignId, config);
      photos = resolved.photos; logo = resolved.logo;
    } catch (error) {
      add('assets.resolve', 'fail', error instanceof RenderError ? error.message : 'asset resolution failed', { case: caseName });
      continue;
    }
    const allowedSrc = new Set([...photos, ...(logo ? [logo] : [])].map((asset) => asset.src));
    const cropAllowedBySrc = new Map([...photos, ...(logo ? [logo] : [])].map((asset) => [asset.src, asset.allowCrop]));
    const facts = new Map(testCase.facts.map((fact) => [fact.id, fact]));

    for (const format of testCase.formats ?? module.formats) {
      const where = { case: caseName, format };
      if (!module.formats.includes(format)) { add('render.format', 'fail', `format ${format} is not declared by the module`, where); continue; }
      const input = { format, profile: FORMAT_PROFILES[format], config, photos, ...(logo ? { logo } : {}), facts };
      let output: ReturnType<TemplateModule['render']>;
      try { output = module.render(input); }
      catch (error) { add('render.output', 'fail', `render() threw: ${(error as Error).message?.slice(0, 160)}`, where); continue; }
      if (!(output.body instanceof SafeHtml)) {
        add('render.output', 'fail', 'body is not SafeHtml. Build it with the shared html builder (import from the same module file the engine uses; a second copy of the module gives a different class)', where);
        continue;
      }
      if (typeof output.css !== 'string' || !output.css.trim()) { add('render.output', 'fail', 'css must be a non-empty string', where); continue; }
      add('render.output', 'pass', 'returns { body: SafeHtml, css: string }', where);

      const body = output.body.toString();
      const css = output.css;

      // Determinism: render() must be pure.
      let again: ReturnType<TemplateModule['render']> | undefined;
      try { again = module.render(input); } catch { again = undefined; }
      if (!again || again.body.toString() !== body || again.css !== css) add('render.deterministic', 'fail', 'two renders of identical input differ; render() must not use time, randomness, I/O or shared mutable state', where);
      else add('render.deterministic', 'pass', 'identical input gives identical body and css', where);

      // CSS rules.
      try { validateTemplateCss(css); add('css.rules', 'pass', 'no @import, no non-data url(), no markup or script-like constructs', where); }
      catch (error) { add('css.rules', 'fail', error instanceof RenderError ? error.message : 'invalid css', where); }
      const unscoped = selectorsAreScoped(css, module.rootClass, module.id);
      if (unscoped.length) add('css.scoped', 'warn', `${unscoped.length} selector(s) not scoped under .${module.rootClass} or [data-template="${module.id}"], e.g. ${unscoped.slice(0, 3).join(' | ')}`, where);
      else add('css.scoped', 'pass', 'all selectors are scoped to the template', where);
      if (/(?:^|[^\d])(1080|1350|1920)px/.test(css)) add('css.canvas', 'warn', 'css contains a literal canvas dimension; the engine owns canvas size and exposes --lf-canvas-w/--lf-canvas-h', where);
      if (!/--lf-safe-(top|right|bottom|left)/.test(css)) add('css.tokens', 'warn', 'css never reads --lf-safe-* tokens; safe insets would be duplicated instead of coming from the engine', where);
      else add('css.tokens', 'pass', 'css reads engine safe-area tokens', where);

      // Markup rules.
      const tags = tokenize(body).filter((tag) => !tag.closing);
      const markup: string[] = []; const assets: string[] = [];
      for (const tag of tags) {
        if (FORBIDDEN_TAGS.has(tag.name)) markup.push(`<${tag.name}> is not allowed`);
        for (const [name, value] of tag.attrs) {
          if (name.startsWith('on')) markup.push(`event handler attribute ${name}`);
          if (FORBIDDEN_ATTRS.has(name)) markup.push(`attribute ${name} is not allowed`);
          if (/javascript:/i.test(value)) markup.push(`javascript: URL in ${name}`);
          if ((name === 'href' || name === 'xlink:href') && !value.startsWith('#')) assets.push(`${tag.name} ${name} must be a "#fragment", got "${value.slice(0, 40)}"`);
          if (name !== 'src' && URL_ATTRS.has(name) && name !== 'href' && name !== 'xlink:href' && value) assets.push(`${tag.name} ${name} must not carry a URL`);
          if (!name.startsWith('xmlns') && name !== 'src' && /(?:^|[^a-z0-9])(?:https?:)?\/\/[a-z0-9]/i.test(value)) assets.push(`external URL in ${tag.name} ${name}`);
          if (name === 'style') {
            if (/@import|expression\s*\(/i.test(value)) markup.push('script-like construct in style attribute');
            for (const m of value.matchAll(/url\(\s*(['"]?)([^'")\s]*)/gi)) if (!m[2]!.startsWith('data:')) assets.push('non-data url() in style attribute');
          }
        }
        if (tag.name === 'img') {
          const src = tag.attrs.get('src') ?? '';
          if (!allowedSrc.has(src)) assets.push(`<img> src is not an engine-resolved asset (${src.slice(0, 40) || 'empty'}); use ResolvedAsset.src only`);
        }
      }
      if (markup.length) add('markup.forbidden', 'fail', [...new Set(markup)].join('; '), where); else add('markup.forbidden', 'pass', 'no scripts, handlers, forms, frames or style tags in the body', where);
      if (assets.length) add('markup.assets', 'fail', [...new Set(assets)].join('; '), where); else add('markup.assets', 'pass', 'only engine-resolved asset URLs; no external references', where);

      // Slots and semantic attributes.
      const slotTags = tags.filter((tag) => tag.attrs.has('data-slot'));
      const names = slotTags.map((tag) => tag.attrs.get('data-slot')!);
      const duplicates = [...new Set(names.filter((name, i) => names.indexOf(name) !== i))];
      const badNames = names.filter((name) => !SLOT.test(name));
      if (duplicates.length || badNames.length) add('slots.names', 'fail', `${duplicates.length ? `duplicate slot names: ${duplicates.join(', ')}. ` : ''}${badNames.length ? `invalid slot names: ${badNames.join(', ')}` : ''}`.trim(), where);
      else add('slots.names', 'pass', `${names.length} slot(s), unique and well-formed`, where);

      const applicable = module.slots.filter((slot) => !slot.formats || slot.formats.includes(format));
      const missing = applicable.filter((slot) => slot.required && !names.includes(slot.name)).map((slot) => slot.name);
      if (missing.length) add('slots.manifest', 'fail', `required slot(s) declared in the manifest are not in the markup: ${missing.join(', ')}`, { ...where, slot: missing[0]! });
      else add('slots.manifest', 'pass', 'every required manifest slot is present in the markup', where);
      const undeclared = names.filter((name) => !module.slots.some((slot) => slot.name === name));
      if (undeclared.length) add('slots.undeclared', 'warn', `slots in the markup but not in the manifest: ${[...new Set(undeclared)].join(', ')}`, where);
      const notFlagged = applicable.filter((slot) => slot.required).filter((slot) => slotTags.find((tag) => tag.attrs.get('data-slot') === slot.name)?.attrs.get('data-required') !== 'true').map((slot) => slot.name);
      if (notFlagged.length) add('slots.required-flag', 'warn', `manifest-required slot(s) lack data-required="true": ${notFlagged.join(', ')}. The renderer still checks them through the manifest, but diagnostics are clearer with the flag`, where);

      const attributeProblems: string[] = [];
      for (const tag of tags) {
        for (const attr of ['data-required', 'data-safe']) { const value = tag.attrs.get(attr); if (value !== undefined && !FLAG.test(value)) attributeProblems.push(`${attr}="${value}" must be "true" or "false"`); }
        const group = tag.attrs.get('data-fit-group'); if (group !== undefined && !GROUP.test(group)) attributeProblems.push(`data-fit-group="${group}" is not [a-z][a-z0-9-]{0,31}`);
        const min = tag.attrs.get('data-fit-min'); if (min !== undefined) { const n = Number(min); if (!Number.isFinite(n) || n < 0.5 || n > 1) attributeProblems.push(`data-fit-min="${min}" must be a number from 0.5 to 1`); }
        const fit = tag.attrs.get('data-image-fit'); if (fit !== undefined && fit !== 'contain' && fit !== 'cover') attributeProblems.push(`data-image-fit="${fit}" must be "contain" or "cover"`);
        const overlap = tag.attrs.get('data-allow-overlap');
        if (overlap !== undefined) for (const target of overlap.split(/\s+/).filter(Boolean)) if (target !== '*' && !names.includes(target) && !module.slots.some((slot) => slot.name === target)) attributeProblems.push(`data-allow-overlap names unknown slot "${target}"`);
      }
      if (attributeProblems.length) add('attributes.values', 'fail', [...new Set(attributeProblems)].join('; '), where); else add('attributes.values', 'pass', 'semantic data-* attributes are valid', where);

      // Fit groups must be read by the CSS or fitting has no effect.
      const groups = [...new Set(tags.map((tag) => tag.attrs.get('data-fit-group')).filter((g): g is string => !!g && GROUP.test(g)))];
      const unused = groups.filter((group) => !css.includes(`--lf-fit-${group}`));
      if (unused.length) add('fit.group.unused', 'warn', `fit group(s) declared but never read by the CSS (var(--lf-fit-<group>)): ${unused.join(', ')}; fitting cannot shrink them`, where);
      else if (groups.length) add('fit.group.unused', 'pass', `${groups.length} fit group(s) are read by the CSS`, where);

      // Image fit and crop.
      const imageProblems: string[] = [];
      for (const tag of tags.filter((t) => t.name === 'img')) {
        const fit = tag.attrs.get('data-image-fit');
        if (!fit) { imageProblems.push('an <img> has no data-image-fit'); continue; }
        if (fit === 'cover') {
          if (!tag.attrs.has('data-allow-crop')) imageProblems.push('cover image without data-allow-crop');
          if (cropAllowedBySrc.get(tag.attrs.get('src') ?? '') !== true) imageProblems.push('cover image uses an asset whose config allowCrop is false');
        }
      }
      if (imageProblems.length) add('image.fit', 'fail', [...new Set(imageProblems)].join('; '), where); else add('image.fit', 'pass', 'every <img> declares contain/cover and crops only with permission', where);
    }
  }

  const counts = { pass: checks.filter((c) => c.status === 'pass').length, fail: checks.filter((c) => c.status === 'fail').length, warn: checks.filter((c) => c.status === 'warn').length };
  return {
    contractVersion: CONTRACT_VERSION,
    template: { id: module.id, version: module.version },
    passed: counts.fail === 0 && !(options.strict && counts.warn > 0),
    counts,
    checks,
  };
}

/** Violation report in the shape required by contract §11: template id/version/commit, case, format, code, slot, detail, reproduction. */
export function formatViolationReport(report: ContractReport, meta: { commit?: string; reproduce?: string } = {}): string {
  const lines = [
    `Contract kit v${report.contractVersion} — ${report.template.id}@${report.template.version}${meta.commit ? ` — commit ${meta.commit}` : ''}`,
    `Result: ${report.passed ? 'PASS' : 'FAIL'} (${report.counts.pass} pass, ${report.counts.fail} fail, ${report.counts.warn} warn)`,
  ];
  const problems = report.checks.filter((c) => c.status !== 'pass');
  for (const c of problems) {
    lines.push(`- ${c.status.toUpperCase()} ${c.id}${c.case ? ` | case=${c.case}` : ''}${c.format ? ` | format=${c.format}` : ''}${c.slot ? ` | slot=${c.slot}` : ''}: ${c.detail}`);
  }
  if (problems.length && meta.reproduce) lines.push(`Reproduce: ${meta.reproduce}`);
  return lines.join('\n');
}
