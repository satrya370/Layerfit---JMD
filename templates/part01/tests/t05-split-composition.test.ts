import assert from 'node:assert/strict';
import test from 'node:test';
import { splitComposition } from '../../../../Layerfit-JMD-engine/src/templates/part02/split-composition/index.js';
import { contractCases } from '../scripts/t05-split-composition-cases.js';
import { checkTemplateContract } from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';
import { FORMAT_PROFILES } from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';
import type { ResolvedAsset } from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';

const cases = await contractCases();

const fakePhoto = (assetId: string, allowCrop: boolean): ResolvedAsset => ({
  assetId, role: 'product', mime: 'image/png', width: 800, height: 800,
  sha256: 'fixture', src: 'data:image/png;base64,fixture', allowCrop,
});

test('T05 split-composition passes the contract kit with zero failures (no browser needed)', async () => {
  const report = await checkTemplateContract(splitComposition, cases, { strict: false });
  assert.equal(report.counts.fail, 0, JSON.stringify(report.checks.filter((check) => check.status !== 'pass')));
});

test('T05 schema rejects every explicitly listed invalid configuration', async () => {
  for (const item of cases) {
    for (const rejected of item.rejects ?? []) {
      assert.equal(splitComposition.configSchema.safeParse(rejected.config).success, false, `${item.name}: ${rejected.name}`);
    }
  }
});

test('T05 valid cases parse, keep one photo each and stay within template budgets', () => {
  for (const item of cases) {
    const config = splitComposition.configSchema.parse(item.config);
    assert.equal(config.assets.length, 1);
    assert.ok(config.copy.headline.length <= 50);
    assert.ok(config.copy.benefits.length <= 3);
    if (config.copy.accentPhrase) assert.ok(config.copy.headline.includes(config.copy.accentPhrase));
  }
});

test('T05 render marks cover only for crop-allowed assets and highlights the accent phrase', async () => {
  for (const item of cases) {
    const config = splitComposition.configSchema.parse(item.config);
    const output = splitComposition.render({
      format: 'portrait', profile: FORMAT_PROFILES.portrait, config,
      photos: [fakePhoto(config.assets[0]!.assetId, config.assets[0]!.allowCrop)],
      facts: new Map(item.facts.map((fact) => [fact.id, fact])),
    });
    const body = output.body.toString();
    const cropAllowed = config.assets[0]!.allowCrop;
    assert.equal(body.includes('data-allow-crop="true"'), cropAllowed);
    assert.equal(body.includes('data-image-fit="cover"'), cropAllowed);
    assert.ok(body.includes('spl-accent'));
    if (config.copy.benefits.length) assert.ok(body.includes('spl-pill'));
    if (config.offerFactId) assert.ok(body.includes('data-slot="offer"'));
  }
});

test('T05 render fails closed when a referenced fact is absent from the verified snapshot', async () => {
  const item = cases[1]!;
  const config = splitComposition.configSchema.parse(item.config);
  const input = {
    format: 'portrait' as const, profile: FORMAT_PROFILES.portrait, config,
    photos: [fakePhoto(config.assets[0]!.assetId, config.assets[0]!.allowCrop)],
  };
  assert.throws(() => splitComposition.render({ ...input, facts: new Map() }), /not in the verified snapshot/);
  const partial = new Map(item.facts.filter((fact) => fact.id !== config.offerFactId).map((fact) => [fact.id, fact]));
  assert.throws(() => splitComposition.render({ ...input, facts: partial }), /not in the verified snapshot/);
});
