/**
 * Renders T08 to PNG in square, portrait and story, and checks every result.
 *
 *   npm install                     (set PUPPETEER_SKIP_DOWNLOAD=1 if you use an installed Chrome)
 *   node render.mjs                 the bundled example -> previews/
 *   node render.mjs my-data.json    your own data (one or more files)    -> previews/custom/
 *
 * Chrome: set PUPPETEER_EXECUTABLE_PATH (or CHROMIUM_EXECUTABLE_PATH) to an installed Chrome/Chromium, or let Puppeteer
 * use its own download. The browser is launched with its sandbox on, in a temporary profile.
 *
 * Pipeline adapted from IG-Content-Builder (ig-templates-demo/scripts/build-and-render-demo.mjs, commit 9ce0097):
 * one browser, one page per output, setViewport + setContent + wait for fonts + screenshot, errors isolated per output.
 * Changes: CSS, JS, fonts and images are inlined so nothing is fetched (all other requests are blocked), the fixed 300 ms
 * sleep is replaced by font and image readiness, and the layout is measured before the screenshot is taken.
 * The layout rules below are a compact copy of the engine's validate-layout.ts; the engine is the reference.
 * Exit code: 0 when every output passes, 1 otherwise.
 */
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FORMATS = { square: { width: 1080, height: 1080 }, portrait: { width: 1080, height: 1350 }, story: { width: 1080, height: 1920 } };
const DEMOS = [
  { file: 'creative.example.json', dir: 'previews', prefix: 't08' },
];
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };

const dataUri = async (file) => `data:${MIME[path.extname(file).toLowerCase()]};base64,${(await readFile(file)).toString('base64')}`;

/** One self-contained HTML string: no file:// or network access is needed while rendering. */
async function buildHtml() {
  let css = await readFile(path.join(ROOT, 'styles.css'), 'utf8');
  for (const match of [...css.matchAll(/url\("(assets\/fonts\/[^"]+\.woff2)"\)/g)]) {
    css = css.replace(match[0], `url("${await dataUri(path.join(ROOT, match[1]))}")`);
  }
  const js = await readFile(path.join(ROOT, 'script.js'), 'utf8');
  const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'">`;
  return (await readFile(path.join(ROOT, 'index.html'), 'utf8'))
    .replace('<head>', `<head>\n${csp}`)
    .replace('<link rel="stylesheet" href="./styles.css" />', () => `<style>${css}</style>`)
    .replace('<script src="./script.js"></script>', () => `<script>${js}</script>`);
}

/** Local image paths in the data become data URIs; anything else is left for script.js to accept or refuse. */
async function resolveData(file) {
  const data = JSON.parse(await readFile(file, 'utf8'));
  for (const key of ['imageUrl', 'logoUrl']) {
    const value = data[key];
    if (typeof value === 'string' && value && !/^[a-z][a-z0-9+.-]*:/i.test(value)) {
      const local = path.resolve(path.dirname(file), value);
      if (!existsSync(local)) throw new Error(`${path.basename(file)}: ${key} points to a missing file (${value})`);
      data[key] = await dataUri(local);
    }
  }
  return data;
}

/* ---- layout rules, run inside the page ---- */
function inspectLayout({ width, height }) {
  const violations = [];
  const warnings = [];
  const groupMins = {};
  const add = (code, slot, detail, groups = []) => violations.push({ code, slot, detail, groups });
  const tol = 0.5;
  const inside = (r, b) => r.left >= b.left - tol && r.top >= b.top - tol && r.right <= b.right + tol && r.bottom <= b.bottom + tol;
  const canvas = document.getElementById('creative');
  const cs = getComputedStyle(canvas);
  const px = (name) => Number.parseFloat(cs.getPropertyValue(name));
  const c = canvas.getBoundingClientRect();
  if (Math.abs(c.width - width) > tol || Math.abs(c.height - height) > tol || Math.abs(c.left) > tol || Math.abs(c.top) > tol) {
    add('CANVAS_INVALID', '-', `canvas is ${c.width}x${c.height} at ${c.left},${c.top}; expected ${width}x${height} at 0,0`);
  }
  const safe = { left: px('--lf-safe-left'), top: px('--lf-safe-top'), right: width - px('--lf-safe-right'), bottom: height - px('--lf-safe-bottom') };
  const groupsOf = (node) => {
    const set = new Set();
    for (let a = node; a && a !== canvas.parentElement; a = a.parentElement) { const g = a.getAttribute('data-fit-group'); if (g) set.add(g); }
    node.querySelectorAll('[data-fit-group]').forEach((d) => set.add(d.getAttribute('data-fit-group')));
    return [...set];
  };
  canvas.querySelectorAll('[data-fit-group]').forEach((node) => {
    const group = node.getAttribute('data-fit-group');
    const min = Number(node.getAttribute('data-fit-min') ?? '0.8');
    groupMins[group] = Math.max(groupMins[group] ?? 0, Number.isFinite(min) ? Math.min(Math.max(min, 0.5), 1) : 0.8);
  });
  const clipAncestors = (node) => {
    const list = [];
    for (let a = node.parentElement; a && a !== canvas; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (s.overflowX !== 'visible' || s.overflowY !== 'visible') list.push(a.getBoundingClientRect());
    }
    return list;
  };

  const seen = new Set();
  const visible = [];
  for (const node of canvas.querySelectorAll('[data-slot]')) {
    const name = node.getAttribute('data-slot');
    if (seen.has(name)) add('CANVAS_INVALID', name, 'duplicate slot name');
    seen.add(name);
    const r = node.getBoundingClientRect();
    const s = getComputedStyle(node);
    const shown = r.width >= 1 && r.height >= 1 && s.visibility !== 'hidden' && s.display !== 'none';
    if (!shown) { if (node.getAttribute('data-required') === 'true') add('SLOT_MISSING', name, 'required slot is not visible'); continue; }
    visible.push({ node, name, r });
    const groups = groupsOf(node);
    const slackY = Math.max(1, (Number.parseFloat(s.fontSize) || 0) * 0.2); // a font's content area can hang below a tight line box
    if (s.display !== 'inline' && (node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + slackY)) {
      add('LAYOUT_OVERFLOW', name, `content ${node.scrollWidth}x${node.scrollHeight} exceeds box ${node.clientWidth}x${node.clientHeight}`, groups);
    }
    if (node.textContent && node.textContent.trim()) {
      const range = document.createRange();
      range.selectNodeContents(node);
      const t = range.getBoundingClientRect();
      const slack = Math.max(2, (Number.parseFloat(s.fontSize) || 0) * 0.25);
      const loose = { left: r.left - slack, top: r.top - slack, right: r.right + slack, bottom: r.bottom + slack };
      if (t.width > 0 && !inside(t, loose)) add('LAYOUT_OVERFLOW', name, 'text extends outside its box', groups);
    }
    for (const clip of clipAncestors(node)) { if (!inside(r, clip)) { add('LAYOUT_CLIPPED', name, 'clipped by an ancestor', groups); break; } }
    if (!inside(r, c)) add('OUT_OF_CANVAS', name, 'extends outside the canvas', groups);
    if (node.getAttribute('data-safe') === 'true' && !inside(r, safe)) add('SAFE_AREA_VIOLATION', name, 'outside the safe box', groups);
  }
  for (const node of canvas.querySelectorAll('*')) {
    const ownsText = [...node.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== '');
    if (!ownsText) continue;
    const family = getComputedStyle(node).fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '');
    if (!family.startsWith('LF ')) add('FONT_MISSING', node.closest('[data-slot]')?.getAttribute('data-slot') ?? node.tagName.toLowerCase(), `text uses "${family}", not a bundled font`);
  }
  for (let i = 0; i < visible.length; i += 1) {
    for (let j = i + 1; j < visible.length; j += 1) {
      const a = visible[i]; const b = visible[j];
      if (a.node.contains(b.node) || b.node.contains(a.node)) continue;
      const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
      const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (w <= 1 || h <= 1) continue;
      const allow = `${a.node.getAttribute('data-allow-overlap') ?? ''} ${b.node.getAttribute('data-allow-overlap') ?? ''}`.split(/\s+/);
      if (allow.includes('*') || allow.includes(a.name) || allow.includes(b.name)) continue;
      add('SLOT_COLLISION', a.name, `overlaps ${b.name} by ${Math.round(w)}x${Math.round(h)}px`, [...new Set([...groupsOf(a.node), ...groupsOf(b.node)])]);
    }
  }
  for (const img of canvas.querySelectorAll('img')) {
    const slot = img.closest('[data-slot]')?.getAttribute('data-slot') ?? 'image';
    if (!img.complete || !img.naturalWidth) { add('IMAGE_NOT_LOADED', slot, 'image did not load or decode'); continue; }
    const fit = img.getAttribute('data-image-fit');
    if (fit !== 'contain' && fit !== 'cover') { add('IMAGE_CROP_INVALID', slot, 'image has no data-image-fit'); continue; }
    if (getComputedStyle(img).objectFit !== fit) add('IMAGE_CROP_INVALID', slot, `declared ${fit} but computed ${getComputedStyle(img).objectFit}`);
    if (fit === 'cover' && !img.hasAttribute('data-allow-crop')) add('IMAGE_CROP_INVALID', slot, 'cover without allowCrop');
    const scale = Math.min(img.clientWidth / img.naturalWidth, img.clientHeight / img.naturalHeight);
    if (fit === 'contain' && scale > 1.05) warnings.push(`${slot}: photo is enlarged ${scale.toFixed(2)}x (source ${img.naturalWidth}x${img.naturalHeight}); use a larger photo`);
  }
  return { violations, warnings, groupMins };
}

const FITTABLE = new Set(['LAYOUT_OVERFLOW', 'LAYOUT_CLIPPED', 'SLOT_COLLISION', 'SAFE_AREA_VIOLATION', 'OUT_OF_CANVAS']);

/** Bounded fitting: shrink only the fit groups named by a violation, 5 % at a time, never below their minimum. */
async function fitAndInspect(page, size, maxSteps = 8) {
  const scales = {};
  for (let step = 0; ; step += 1) {
    const result = await page.evaluate(inspectLayout, size);
    const fittable = result.violations.filter((v) => FITTABLE.has(v.code) && v.groups.length);
    if (!result.violations.length || step >= maxSteps || !fittable.length) return { ...result, steps: step, scales };
    const next = {};
    for (const group of new Set(fittable.flatMap((v) => v.groups))) {
      const reduced = Math.round(((scales[group] ?? 1) - 0.05) * 100) / 100;
      if (/^[a-z][a-z0-9-]{0,31}$/.test(group) && reduced >= (result.groupMins[group] ?? 0.8) - 1e-9) next[group] = reduced;
    }
    if (!Object.keys(next).length) return { ...result, steps: step, scales };
    Object.assign(scales, next);
    await page.evaluate((values) => { for (const [g, v] of Object.entries(values)) document.getElementById('creative').style.setProperty(`--lf-fit-${g}`, String(v)); }, next);
  }
}

function pngSize(buffer) {
  if (buffer.length < 24 || buffer.readUInt32BE(0) !== 0x89504e47) throw new Error('output is not a PNG');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

async function renderOne(browser, html, data, formatName, outFile) {
  const size = FORMATS[formatName];
  const started = performance.now();
  const page = await browser.newPage();
  const blocked = [];
  const problems = [];
  try {
    await page.setViewport({ ...size, deviceScaleFactor: 1 });
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.url().startsWith('data:') || request.url() === 'about:blank') { void request.continue(); return; }
      blocked.push(request.url().slice(0, 80));
      void request.abort('blockedbyclient');
    });
    page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
    await page.setContent(html, { waitUntil: 'load', timeout: 20_000 });
    const applied = await page.evaluate(async (d) => { const r = window.setCreative(d); await window.creativeReady; return r; }, { ...data, format: formatName });
    await page.evaluate(() => Promise.all([...document.fonts].map((face) => face.load().catch(() => null))));
    const fonts = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'error').map((f) => f.family));
    if (fonts.length) problems.push(`font failed to load: ${[...new Set(fonts)].join(', ')}`);
    if (applied.warnings.length) problems.push(...applied.warnings.map((w) => `data: ${w}`));

    const fit = await fitAndInspect(page, size);
    for (const v of fit.violations) problems.push(`${v.code} ${v.slot}: ${v.detail}`);
    if (blocked.length) problems.push(`blocked external request: ${[...new Set(blocked)].slice(0, 3).join(', ')}`);
    for (const required of ['headline', 'cta', 'photo']) {
      const visible = await page.evaluate((name) => { const n = document.querySelector(`[data-slot="${name}"]`); return !!n && n.getBoundingClientRect().width > 0; }, required);
      if (!visible) problems.push(`required element not visible: ${required}`);
    }
    if (problems.length) return { format: formatName, status: 'failed', problems, steps: fit.steps, warnings: fit.warnings, ms: Math.round(performance.now() - started) };

    const png = Buffer.from(await page.screenshot({ type: 'png', clip: { x: 0, y: 0, ...size } }));
    const dims = pngSize(png);
    if (dims.width !== size.width || dims.height !== size.height) throw new Error(`output is ${dims.width}x${dims.height}, expected ${size.width}x${size.height}`);
    if (png.length < 25_000) throw new Error(`output is only ${png.length} bytes: the image is probably blank`);
    await mkdir(path.dirname(outFile), { recursive: true });
    await writeFile(outFile, png);
    return { format: formatName, status: 'ok', file: path.relative(ROOT, outFile), bytes: png.length, ...dims, steps: fit.steps, scales: fit.scales, warnings: fit.warnings, ms: Math.round(performance.now() - started) };
  } catch (error) {
    return { format: formatName, status: 'failed', problems: [error instanceof Error ? error.message : String(error)], ms: Math.round(performance.now() - started) };
  } finally {
    await page.close().catch(() => undefined);
  }
}

const args = process.argv.slice(2);
const jobs = args.length
  ? args.map((file) => ({ file: path.resolve(file), dir: 'previews/custom', prefix: path.basename(file, '.json') }))
  : DEMOS.map((demo) => ({ ...demo, file: path.join(ROOT, demo.file) }));

const html = await buildHtml();
const browser = await puppeteer.launch({
  headless: true,
  timeout: 30_000,
  protocolTimeout: 30_000,
  ...(process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROMIUM_EXECUTABLE_PATH } : {}),
});
const report = { createdAt: new Date().toISOString(), browser: await browser.version(), results: [] };
try {
  for (const job of jobs) {
    let data;
    try { data = await resolveData(job.file); } catch (error) { report.results.push({ dataset: job.prefix, status: 'failed', problems: [error.message] }); continue; }
    for (const formatName of Object.keys(FORMATS)) {
      const result = await renderOne(browser, html, data, formatName, path.join(ROOT, job.dir, `${job.prefix}-${formatName}.png`));
      report.results.push({ dataset: job.prefix, ...result });
      const mark = result.status === 'ok' ? 'OK  ' : 'FAIL';
      console.log(`${mark} ${job.prefix}/${formatName}${result.status === 'ok' ? ` ${result.width}x${result.height} ${Math.round(result.bytes / 1024)}KB fit=${result.steps}` : ` ${result.problems.join('; ')}`}`);
      for (const note of result.warnings ?? []) console.log(`     note: ${note}`);
    }
  }
} finally {
  await browser.close();
}
// A run with your own data writes its report next to its own outputs, so it never overwrites the demo report.
const reportFile = args.length ? path.join('previews', 'custom', 'render-report.json') : path.join('previews', 'render-report.json');
await mkdir(path.dirname(path.join(ROOT, reportFile)), { recursive: true });
await writeFile(path.join(ROOT, reportFile), JSON.stringify(report, null, 2));
const failed = report.results.filter((r) => r.status !== 'ok');
console.log(`${report.results.length - failed.length} of ${report.results.length} outputs passed. Report: ${reportFile.replaceAll('\\', '/')}`);
process.exitCode = failed.length ? 1 : 0;
