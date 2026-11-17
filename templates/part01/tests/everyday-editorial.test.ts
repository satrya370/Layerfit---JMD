import assert from 'node:assert/strict';
import test from 'node:test';
import { everydayEditorialSchema, templateModule } from '../src/everyday-editorial.js';
import { contractCases } from '../scripts/everyday-editorial-cases.js';
import { MemoryAssetSource, RenderAssetResolver } from '../../../../Layerfit-JMD-engine/src/server/assets/resolve-render-assets.js';
import { FORMAT_PROFILES } from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';

async function fixture() {
  const item = (await contractCases())[0]!;
  const config = everydayEditorialSchema.parse(item.config);
  const source = new MemoryAssetSource(); item.assets.forEach((asset) => source.put(asset));
  const resolved = await new RenderAssetResolver(source).resolve(item.campaignId, config);
  return { item, config, input: { format: 'square' as const, profile: FORMAT_PROFILES.square, config, ...resolved, facts: new Map(item.facts.map((fact) => [fact.id, fact])) } };
}

test('T07 v3 renders lifestyle-benefit structure and escapes text', async () => {
  const { input } = await fixture();
  input.config.copy.headline = '<script>bad</script>';
  input.config.t07.headlineLines = ['<script>bad</script>'];
  const body = templateModule.render(input).body.toString();
  assert.ok(body.includes('&lt;script&gt;bad&lt;/script&gt;'));
  assert.ok(body.includes('lifestyle'));
  assert.ok(body.includes('masthead'));
  assert.ok(body.includes('photo-caption'));
  assert.ok(body.includes('BEKIJK DE COMBINATIE'));
  assert.ok(!body.includes('<script>bad</script>'));
});

test('T07 v3 requires verified description/benefit facts and a resolved photo', async () => {
  const { input } = await fixture();
  const facts = new Map(input.facts); facts.delete(input.config.t07.descriptionFactId);
  assert.throws(() => templateModule.render({ ...input, facts }), /description fact missing/);
  const missingBenefit = new Map(input.facts); missingBenefit.delete(input.config.t07.featureFactIds[0]!);
  assert.throws(() => templateModule.render({ ...input, facts: missingBenefit }), /benefit fact missing/);
  assert.throws(() => templateModule.render({ ...input, photos: [] }), /photo missing or mismatched/);
});

test('T07 v3 rejects invalid extension values and renders each contract format', async () => {
  const { item, config, input } = await fixture();
  for (const rejected of item.rejects ?? []) assert.equal(everydayEditorialSchema.safeParse(rejected.config).success, false, rejected.name);
  for (const format of ['square', 'portrait', 'vertical'] as const) {
    const result = templateModule.render({ ...input, config, format, profile: FORMAT_PROFILES[format] });
    assert.ok(result.body.toString().includes('product-photo'));
    assert.ok(result.body.toString().includes('benefits'));
  }
});
