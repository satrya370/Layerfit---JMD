import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FORMAT_PROFILES, type TemplateRenderInput } from '../../src/shared/render-contract.js';
import { checkTemplateContract, formatViolationReport } from '../../src/server/render/contract-kit.js';
import { TemplateRegistry } from '../../src/server/render/registry.js';
import { MemoryAssetSource, RenderAssetResolver } from '../../src/server/assets/resolve-render-assets.js';
import { minimalDiscount } from '../../src/templates/part02/minimal-discount/index.js';
import { MINIMAL_DISCOUNT_BUDGETS, minimalDiscountSchema } from '../../src/templates/part02/minimal-discount/schema.js';
import { CAMPAIGN, builtCases, contractCases, type BuiltCase } from '../../fixtures/templates/minimal-discount/cases.js';

async function input(built: BuiltCase): Promise<TemplateRenderInput> {
  const source = new MemoryAssetSource();
  for (const record of built.assets) source.put(record);
  const resolved = await new RenderAssetResolver(source).resolve(CAMPAIGN, built.config);
  return { format: 'square', profile: FORMAT_PROFILES.square, config: built.config, photos: resolved.photos, facts: new Map(built.facts.map((f) => [f.id, f])) };
}
const byName = async (name: string) => (await builtCases()).find((c) => c.name === name)!;
const css = readFileSync(new URL('../../src/templates/part02/minimal-discount/styles.css', import.meta.url), 'utf8');

test('the module is accepted by the engine registry', () => {
  const registry = new TemplateRegistry().register(minimalDiscount);
  assert.equal(registry.get('minimal-discount', '0.1.0').rootClass, 'lf-minimal-discount');
});

test('contract kit: every case passes with no failures and no warnings', async () => {
  const cases = await contractCases();
  const report = await checkTemplateContract(minimalDiscount, cases);
  assert.deepEqual(report.checks.filter((c) => c.status !== 'pass').map((c) => `${c.status} ${c.id} ${c.case ?? ''} ${c.format ?? ''}: ${c.detail}`), [], formatViolationReport(report));
  assert.equal(report.passed, true);
});

test('schema: headline budget is inclusive and one over is rejected', async () => {
  const full = await byName('full');
  const copy = (patch: Partial<typeof full.config.copy>) => ({ ...full.config, copy: { ...full.config.copy, ...patch } });
  assert.equal(minimalDiscountSchema.safeParse(copy({ headline: 'x'.repeat(MINIMAL_DISCOUNT_BUDGETS.headline) })).success, true);
  assert.equal(minimalDiscountSchema.safeParse(copy({ headline: 'x'.repeat(MINIMAL_DISCOUNT_BUDGETS.headline + 1) })).success, false);
});

test('markup: the offer comes from its fact, brand and button are always drawn, missing copy leaves no element', async () => {
  const full = await byName('full');
  const body = minimalDiscount.render(await input(full)).body.toString();
  assert.match(body, /data-slot="offer"[^>]*>25% korting</);
  assert.match(body, /data-slot="brand"[^>]*>Example Brand</);
  assert.match(body, /data-slot="cta"[^>]*><span class="md-cta-label">Shop de actie</);
  assert.match(body, /data-slot="description"/);
  assert.equal((body.match(/data-slot="benefit-\d"/g) ?? []).length, 3);

  const minimal = minimalDiscount.render(await input(await byName('minimal'))).body.toString();
  assert.doesNotMatch(minimal, /data-slot="description"|class="md-list"/, 'missing data renders no element');
  assert.match(minimal, /data-slot="cta"/);
});

test('a missing offer fact fails closed instead of inventing a discount', async () => {
  const full = await byName('full');
  const broken = { ...(await input(full)), facts: new Map() };
  assert.throws(() => minimalDiscount.render(broken), /not in the verified snapshot/);
});

test('design rules: no gradient at all (solid product panel), no word-breaking', () => {
  assert.equal((css.match(/gradient\(/g) ?? []).length, 0);
  assert.doesNotMatch(css, /overflow-wrap:\s*anywhere|word-break:\s*break-all/);
});
