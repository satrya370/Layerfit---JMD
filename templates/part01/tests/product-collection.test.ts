import assert from 'node:assert/strict';
import test from 'node:test';
import { productCollectionSchema, templateModule } from '../src/product-collection-hero.js';
import { contractCases } from '../scripts/product-collection-cases.js';
import { MemoryAssetSource, RenderAssetResolver } from '../../../../Layerfit-JMD-engine/src/server/assets/resolve-render-assets.js';
import { FORMAT_PROFILES } from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';
import { checkTemplateContract } from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';

async function fixture() {
  const [item] = await contractCases();
  assert.ok(item);
  const config = productCollectionSchema.parse(item.config);
  const source = new MemoryAssetSource(); item.assets.forEach((asset) => source.put(asset));
  return { item, config, input: { format: 'square' as const, profile: FORMAT_PROFILES.square, config, ...await new RenderAssetResolver(source).resolve(item.campaignId, config), facts: new Map(item.facts.map((fact) => [fact.id, fact])) } };
}

test('replacement T11 passes strict contract kit with zero warnings/failures', async () => {
  const report = await checkTemplateContract(templateModule, await contractCases(), { strict: true });
  assert.equal(report.counts.fail, 0, JSON.stringify(report.checks.filter(c => c.status === 'fail')));
  assert.equal(report.counts.warn, 0, JSON.stringify(report.checks.filter(c => c.status === 'warn')));
});

test('replacement T11 uses one uncropped vial and source-style composition + CTA', async () => {
  const { input } = await fixture();
  const body = templateModule.render(input).body.toString();
  assert.equal((body.match(/class="collection-product"/g) ?? []).length, 1);
  assert.ok(body.includes('data-image-fit="contain"'));
  assert.ok(body.includes('data-slot="headline"') && body.includes('data-slot="subhead"'));
  assert.ok(body.includes('data-slot="disclaimer"') && body.includes('data-slot="cta"'));
  assert.ok(body.includes('LEARN MORE') && body.includes('SAMPLE BRAND'));
  assert.ok(!body.includes('collection-offer') && !body.includes('collection-benefits'));
});

test('medical headline, subhead and disclaimer fail closed without verified facts; all copy is escaped', async () => {
  const { item, input } = await fixture();
  assert.throws(() => templateModule.render({ ...input, facts: new Map() }), /verified headline fact missing/);
  const unverified = new Map(item.facts.map(f => [f.id, { ...f, verified: false as const }]));
  // @ts-expect-error deliberately pass an invalid snapshot to exercise the runtime guard
  assert.throws(() => templateModule.render({ ...input, facts: unverified }), /verified headline fact missing/);
  input.config.copy.cta = '<script>bad</script>';
  assert.ok(templateModule.render(input).body.toString().includes('&lt;script&gt;bad&lt;/script&gt;'));
  for (const rejected of item.rejects ?? []) assert.equal(productCollectionSchema.safeParse(rejected.config).success, false, rejected.name);
  assert.throws(() => templateModule.render({ ...input, photos: [] }), /matching vial/);
});
