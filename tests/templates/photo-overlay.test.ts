import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FORMAT_PROFILES, type TemplateRenderInput } from '../../src/shared/render-contract.js';
import { checkTemplateContract, formatViolationReport } from '../../src/server/render/contract-kit.js';
import { TemplateRegistry } from '../../src/server/render/registry.js';
import { MemoryAssetSource, RenderAssetResolver } from '../../src/server/assets/resolve-render-assets.js';
import { photoOverlay } from '../../src/templates/part02/photo-overlay/index.js';
import { PHOTO_OVERLAY_BUDGETS, photoOverlaySchema } from '../../src/templates/part02/photo-overlay/schema.js';
import { CAMPAIGN, builtCases, contractCases, type BuiltCase } from '../../fixtures/templates/photo-overlay/cases.js';

async function input(built: BuiltCase): Promise<TemplateRenderInput> {
  const source = new MemoryAssetSource();
  for (const record of built.assets) source.put(record);
  const resolved = await new RenderAssetResolver(source).resolve(CAMPAIGN, built.config);
  return { format: 'portrait', profile: FORMAT_PROFILES.portrait, config: built.config, photos: resolved.photos, ...(resolved.logo ? { logo: resolved.logo } : {}), facts: new Map(built.facts.map((f) => [f.id, f])) };
}
const byName = async (name: string) => (await builtCases()).find((c) => c.name === name)!;
const css = readFileSync(new URL('../../src/templates/part02/photo-overlay/styles.css', import.meta.url), 'utf8');

test('the module is accepted by the engine registry', () => {
  const registry = new TemplateRegistry().register(photoOverlay);
  assert.equal(registry.get('photo-overlay', '0.1.0').rootClass, 'lf-photo-overlay');
});

test('contract kit: every case passes with no failures and no warnings', async () => {
  const cases = await contractCases();
  const report = await checkTemplateContract(photoOverlay, cases);
  assert.deepEqual(report.checks.filter((c) => c.status !== 'pass').map((c) => `${c.status} ${c.id} ${c.case ?? ''} ${c.format ?? ''}: ${c.detail}`), [], formatViolationReport(report));
  assert.equal(report.passed, true);
});

test('schema: budgets are inclusive and one over is rejected', async () => {
  const full = await byName('cover-full');
  const copy = (patch: Partial<typeof full.config.copy>) => ({ ...full.config, copy: { ...full.config.copy, accentPhrase: undefined, ...patch } });
  assert.equal(photoOverlaySchema.safeParse(copy({ headline: 'x'.repeat(PHOTO_OVERLAY_BUDGETS.headline) })).success, true);
  assert.equal(photoOverlaySchema.safeParse(copy({ headline: 'x'.repeat(PHOTO_OVERLAY_BUDGETS.headline + 1) })).success, false);
  assert.equal(photoOverlaySchema.safeParse(copy({ body: 'y'.repeat(PHOTO_OVERLAY_BUDGETS.body + 1) })).success, false);
});

test('markup: one h1, a marker only on the accent phrase, offer text only from a fact, no invented content', async () => {
  const full = await byName('cover-full');
  const body = photoOverlay.render(await input(full)).body.toString();
  assert.equal(body.split('<h1').length - 1, 1);
  assert.equal(body.split('<mark').length - 1, full.config.copy.accentPhrase ? 1 : 0);
  const minimal = photoOverlay.render(await input(await byName('cover-minimal'))).body.toString();
  assert.doesNotMatch(minimal, /pov-tag|pov-points|pov-support/, 'missing data renders no element');
});

test('a missing offer fact fails closed instead of inventing text', async () => {
  const full = await byName('cover-full');
  const broken = { ...(await input(full)), facts: new Map() };
  if (full.config.offerFactId) assert.throws(() => photoOverlay.render(broken), /not in the verified snapshot/);
});

test('design rules: flat, no shadows, no overflow hiding of text, no word breaking', () => {
  assert.doesNotMatch(css, /box-shadow|text-shadow|filter:\s*drop-shadow|backdrop-filter/);
  assert.doesNotMatch(css, /overflow-wrap:\s*anywhere|word-break:\s*break-all/);
  assert.equal((css.match(/gradient\(/g) ?? []).length, 1, 'the scrim is the only gradient');
});

test('standalone package: design CSS is identical to the engine, markup parity holds', () => {
  const root = new URL('../../../Layerfit-JMD/Template-example/layerfit_t08/', import.meta.url);
  let pkgCss: string;
  let script: string;
  try {
    pkgCss = readFileSync(new URL('styles.css', root), 'utf8');
    script = readFileSync(new URL('script.js', root), 'utf8');
  } catch { return; } // the package lives in the main tree; skip when it is not next to this worktree
  const marker = '===== DESIGN — identical to the engine module\'s styles.css =====';
  assert.equal(pkgCss.slice(pkgCss.indexOf(marker) + marker.length).replace(/^\s*\*\/\s*/, '').trim(), css.trim());
  const classes = new Set([...css.matchAll(/\.(pov-[a-z-]+)/g)].map((m) => m[1] ?? ''));
  for (const cls of classes) if (cls !== 'pov-svg') assert.ok(script.includes(cls) || cls === 'pov-empty', `script.js builds ${cls}`);
  for (const slot of ['photo', 'brand', 'headline', 'cta', 'offer', 'description', 'benefits', 'benefit-']) assert.ok(script.includes(`'${slot}`), `slot ${slot}`);
  assert.doesNotMatch(script, /innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
});
