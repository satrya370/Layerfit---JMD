import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FORMAT_PROFILES, type TemplateRenderInput } from '../../src/shared/render-contract.js';
import { checkTemplateContract, formatViolationReport } from '../../src/server/render/contract-kit.js';
import { TemplateRegistry } from '../../src/server/render/registry.js';
import { MemoryAssetSource, RenderAssetResolver } from '../../src/server/assets/resolve-render-assets.js';
import { discountOffer } from '../../src/templates/part02/discount-offer/index.js';
import { DISCOUNT_OFFER_BUDGETS, discountOfferSchema } from '../../src/templates/part02/discount-offer/schema.js';
import { CAMPAIGN, builtCases, contractCases, type BuiltCase } from '../../fixtures/templates/discount-offer/cases.js';

async function input(built: BuiltCase): Promise<TemplateRenderInput> {
  const source = new MemoryAssetSource();
  for (const record of built.assets) source.put(record);
  const resolved = await new RenderAssetResolver(source).resolve(CAMPAIGN, built.config);
  return { format: 'square', profile: FORMAT_PROFILES.square, config: built.config, photos: resolved.photos, facts: new Map(built.facts.map((f) => [f.id, f])) };
}
const byName = async (name: string) => (await builtCases()).find((c) => c.name === name)!;
const css = readFileSync(new URL('../../src/templates/part02/discount-offer/styles.css', import.meta.url), 'utf8');

test('the module is accepted by the engine registry', () => {
  const registry = new TemplateRegistry().register(discountOffer);
  assert.equal(registry.get('discount-offer', '0.1.0').rootClass, 'lf-discount-offer');
});

test('contract kit: every case passes with no failures and no warnings', async () => {
  const cases = await contractCases();
  const report = await checkTemplateContract(discountOffer, cases);
  assert.deepEqual(report.checks.filter((c) => c.status !== 'pass').map((c) => `${c.status} ${c.id} ${c.case ?? ''} ${c.format ?? ''}: ${c.detail}`), [], formatViolationReport(report));
  assert.equal(report.passed, true);
});

test('schema: headline budget is inclusive and one over is rejected', async () => {
  const full = await byName('full');
  const copy = (patch: Partial<typeof full.config.copy>) => ({ ...full.config, copy: { ...full.config.copy, ...patch } });
  assert.equal(discountOfferSchema.safeParse(copy({ headline: 'x'.repeat(DISCOUNT_OFFER_BUDGETS.headline) })).success, true);
  assert.equal(discountOfferSchema.safeParse(copy({ headline: 'x'.repeat(DISCOUNT_OFFER_BUDGETS.headline + 1) })).success, false);
});

test('markup: the offer comes from its fact, the button is always drawn, a missing supporting line leaves no element', async () => {
  const full = await byName('full');
  const body = discountOffer.render(await input(full)).body.toString();
  assert.match(body, /data-slot="offer"[^>]*>50% korting \+ gratis cadeau</);
  assert.match(body, /data-slot="cta"[^>]*>Shop nu</);
  assert.match(body, /data-slot="description"/);

  const minimal = discountOffer.render(await input(await byName('minimal'))).body.toString();
  assert.doesNotMatch(minimal, /data-slot="description"/, 'missing data renders no element');
  assert.match(minimal, /data-slot="cta"/);
});

test('a missing offer fact fails closed instead of inventing a discount', async () => {
  const full = await byName('full');
  const broken = { ...(await input(full)), facts: new Map() };
  assert.throws(() => discountOffer.render(broken), /not in the verified snapshot/);
});

test('design rules: no gradient besides the glow behind the product, no word-breaking', () => {
  assert.equal((css.match(/gradient\(/g) ?? []).length, 1);
  assert.doesNotMatch(css, /overflow-wrap:\s*anywhere|word-break:\s*break-all/);
});
