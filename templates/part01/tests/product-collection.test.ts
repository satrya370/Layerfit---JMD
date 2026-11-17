import assert from 'node:assert/strict';
import test from 'node:test';
import { productCollectionSchema, templateModule } from '../src/product-collection-hero.js';
import { contractCases } from '../scripts/product-collection-cases.js';
import { MemoryAssetSource, RenderAssetResolver } from '../../../../Layerfit-JMD-engine/src/server/assets/resolve-render-assets.js';
import { FORMAT_PROFILES } from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';

async function fixture(index = 0) {
  const item = (await contractCases())[index]!;
  const config = productCollectionSchema.parse(item.config);
  const source = new MemoryAssetSource(); item.assets.forEach((asset) => source.put(asset));
  return { item, config, input: { format: 'portrait' as const, profile: FORMAT_PROFILES.portrait, config, ...await new RenderAssetResolver(source).resolve(item.campaignId, config), facts: new Map(item.facts.map((fact) => [fact.id, fact])) } };
}

test('T11 renders exactly the supplied 1/2/3 distinct images, all contain fit', async () => {
  for (const [index, count] of [[0, 3], [1, 1], [2, 2]]) {
    const { input } = await fixture(index);
    const body = templateModule.render(input).body.toString();
    assert.equal((body.match(/class="collection-product collection-product--/g) ?? []).length, count);
    assert.equal((body.match(/data-image-fit="contain"/g) ?? []).length, count);
    assert.equal(new Set(input.photos.map((photo) => photo.sha256)).size, count);
  }
});

test('T11 no optional facts means no fabricated price, URL, benefit or fake placeholder', async () => {
  const { input } = await fixture(1);
  const body = templateModule.render(input).body.toString();
  assert.ok(!body.includes('collection-offer'));
  assert.ok(!body.includes('collection-description'));
  assert.ok(!body.includes('collection-destination'));
  assert.ok(!body.includes('collection-primary'));
  assert.ok(!body.includes('€') && !body.includes('www.'));
});

test('T11 escapes copy, rejects invalid schemas, missing/mismatched photos and missing facts', async () => {
  const { item, input } = await fixture();
  input.config.copy.headline = '<script>bad</script>';
  input.config.t11.headlineLines = ['<script>bad</script>'];
  assert.ok(templateModule.render(input).body.toString().includes('&lt;script&gt;bad&lt;/script&gt;'));
  for (const rejected of item.rejects ?? []) assert.equal(productCollectionSchema.safeParse(rejected.config).success, false, rejected.name);
  assert.throws(() => templateModule.render({ ...input, photos: [] }), /photo count/);
  assert.throws(() => templateModule.render({ ...input, facts: new Map() }), /verified fact missing/);
  const priceConfig = productCollectionSchema.parse({ ...input.config, offerFactId: 'unavailable-offer' });
  assert.throws(() => templateModule.render({ ...input, config: priceConfig }), /verified fact missing/);
});
