import assert from 'node:assert/strict';
import test from 'node:test';
import { templateModule, immersiveEditorialSchema } from '../src/immersive-editorial.js';
import { contractCases } from '../scripts/immersive-editorial-cases.js';
import { checkTemplateContract } from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';
import { FORMAT_PROFILES } from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';
import type { ResolvedAsset } from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';

const cases = await contractCases();

const fakePhoto = (assetId: string, allowCrop: boolean): ResolvedAsset => ({
  assetId, role: 'lifestyle', mime: 'image/jpeg', width: 900, height: 700,
  sha256: 'fixture', src: 'data:image/jpeg;base64,fixture', allowCrop,
});

const renderInput = (index: number, factsOverwrite?: Map<string, never>) => {
  const item = cases[index]!;
  const config = immersiveEditorialSchema.parse(item.config);
  return {
    item, config,
    input: {
      format: 'portrait' as const, profile: FORMAT_PROFILES.portrait, config,
      photos: [fakePhoto(config.assets[0]!.assetId, config.assets[0]!.allowCrop)],
      facts: factsOverwrite ?? new Map(item.facts.map((fact) => [fact.id, fact])),
    },
  };
};

test('T12 passes the contract kit with zero failures (no browser needed)', async () => {
  const report = await checkTemplateContract(templateModule, cases, { strict: false });
  assert.equal(report.counts.fail, 0, JSON.stringify(report.checks.filter((check) => check.status !== 'pass')));
});

test('T12 schema rejects every explicitly listed invalid configuration', () => {
  for (const item of cases) {
    for (const rejected of item.rejects ?? []) {
      assert.equal(immersiveEditorialSchema.safeParse(rejected.config).success, false, `${item.name}: ${rejected.name}`);
    }
  }
});

test('T12 hides absent optional blocks and never invents CTA, price or benefit artwork', async () => {
  const { input } = renderInput(1);
  const body = templateModule.render(input).body.toString();
  assert.ok(!body.includes('t12-eyebrow'));
  assert.ok(!body.includes('t12-description'));
  assert.ok(!body.includes('data-slot="cta"'));
  assert.ok(body.includes('data-image-fit="contain"'));
  assert.ok(!body.includes('data-allow-crop'));
  const { input: reference } = renderInput(0);
  const referenceBody = templateModule.render(reference).body.toString();
  assert.ok(referenceBody.includes('t12-eyebrow'));
  assert.ok(referenceBody.includes('t12-description'));
  assert.ok(referenceBody.includes('data-image-fit="cover"'));
  assert.ok(referenceBody.includes('data-allow-crop="true"'));
});

test('T12 compact class activates only for long headlines', async () => {
  const { input: minimal } = renderInput(1);
  assert.ok(!templateModule.render(minimal).body.toString().includes('t12-compact'));
  const { input: compact } = renderInput(2);
  assert.ok(templateModule.render(compact).body.toString().includes('t12-compact'));
});

test('T12 escapes copy and fails closed on missing or unverified description facts', async () => {
  const { item, input } = renderInput(0);
  input.config.copy.headline = '<script>bad</script>';
  input.config.t12.headlineLines = ['<script>bad</script>'];
  assert.ok(templateModule.render(input).body.toString().includes('&lt;script&gt;bad&lt;/script&gt;'));
  assert.throws(() => templateModule.render({ ...input, facts: new Map() }), /verified fact missing/);
  for (const rejected of item.rejects ?? []) {
    assert.equal(immersiveEditorialSchema.safeParse(rejected.config).success, false, rejected.name);
  }
});
