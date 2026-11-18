import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FORMAT_PROFILES, type TemplateRenderInput } from '../../src/shared/render-contract.js';
import { checkTemplateContract, formatViolationReport } from '../../src/server/render/contract-kit.js';
import { TemplateRegistry } from '../../src/server/render/registry.js';
import { MemoryAssetSource, RenderAssetResolver } from '../../src/server/assets/resolve-render-assets.js';
import { outlinePoster } from '../../src/templates/part02/outline-poster/index.js';
import { OUTLINE_POSTER_BUDGETS, outlinePosterSchema } from '../../src/templates/part02/outline-poster/schema.js';
import { CAMPAIGN, builtCases, contractCases, type BuiltCase } from '../../fixtures/templates/outline-poster/cases.js';

async function input(built: BuiltCase): Promise<TemplateRenderInput> {
  const source = new MemoryAssetSource();
  for (const record of built.assets) source.put(record);
  const resolved = await new RenderAssetResolver(source).resolve(CAMPAIGN, built.config);
  return { format: 'vertical', profile: FORMAT_PROFILES.vertical, config: built.config, photos: resolved.photos, facts: new Map(built.facts.map((f) => [f.id, f])) };
}
const byName = async (name: string) => (await builtCases()).find((c) => c.name === name)!;
const css = readFileSync(new URL('../../src/templates/part02/outline-poster/styles.css', import.meta.url), 'utf8');

test('the module is accepted by the engine registry', () => {
  const registry = new TemplateRegistry().register(outlinePoster);
  assert.equal(registry.get('outline-poster', '0.1.0').rootClass, 'lf-outline-poster');
});

test('contract kit: every case passes with no failures and no warnings', async () => {
  const cases = await contractCases();
  const report = await checkTemplateContract(outlinePoster, cases);
  assert.deepEqual(report.checks.filter((c) => c.status !== 'pass').map((c) => `${c.status} ${c.id} ${c.case ?? ''} ${c.format ?? ''}: ${c.detail}`), [], formatViolationReport(report));
  assert.equal(report.passed, true);
});

test('schema: headline budget is inclusive and one over is rejected', async () => {
  const full = await byName('full');
  const copy = (patch: Partial<typeof full.config.copy>) => ({ ...full.config, copy: { ...full.config.copy, ...patch } });
  assert.equal(outlinePosterSchema.safeParse(copy({ headline: 'x'.repeat(OUTLINE_POSTER_BUDGETS.headline) })).success, true);
  assert.equal(outlinePosterSchema.safeParse(copy({ headline: 'x'.repeat(OUTLINE_POSTER_BUDGETS.headline + 1) })).success, false);
});

test('markup: top lines split on "|", bottom lines are slots, a missing offer or lines leave no element', async () => {
  const full = await byName('full');
  const body = outlinePoster.render(await input(full)).body.toString();
  assert.equal(body.split('<h1').length - 1, 0, 'the headline is a div, not a heading');
  assert.equal((body.match(/class="og-top"[\s\S]*?<\/div>/)![0].match(/<span>/g) ?? []).length, 3);
  assert.equal(body.split('data-slot="benefit-').length - 1, 3);
  assert.match(body, /data-slot="offer"/);

  const minimal = outlinePoster.render(await input(await byName('minimal'))).body.toString();
  assert.doesNotMatch(minimal, /data-slot="offer"|data-slot="topline"|data-slot="benefit-/, 'missing data renders no element');
});

test('a missing offer fact fails closed instead of inventing text', async () => {
  const full = await byName('full');
  const broken = { ...(await input(full)), facts: new Map() };
  assert.throws(() => outlinePoster.render(broken), /not in the verified snapshot/);
});

test('design rules: no shadows, no gradient other than the background vignette, no word-breaking', () => {
  assert.doesNotMatch(css, /box-shadow|text-shadow|drop-shadow/);
  assert.equal((css.match(/gradient\(/g) ?? []).length, 1, 'only the background vignette is a gradient');
  assert.doesNotMatch(css, /overflow-wrap:\s*anywhere|word-break:\s*break-all/);
});
