import assert from 'node:assert/strict';
import { test } from 'node:test';
import { templateConfigSchema, type ResolvedAsset, type ResolvedFact } from '../../src/shared/render-contract.js';
import { brandMark, factText, headlineWithAccent, offerOrHeroText } from '../../src/templates/shared/fill.js';

const config = (extra: Record<string, unknown> = {}, name = 'Terra Sample') => templateConfigSchema.parse({
  schemaVersion: 1, templateId: 'any',
  brand: { name, primary: '#262626', secondary: '#f2f0ed', accent: '#28a745', fontHeadingId: 'inter', fontBodyId: 'inter' },
  copy: { headline: 'Schoon thuis, zonder gedoe', cta: 'Shop nu', benefits: [] },
  assets: [{ assetId: 'photo-1', role: 'product', allowCrop: false }],
  ...extra,
});
const facts = (...items: Array<[string, string]>) => new Map<string, ResolvedFact>(items.map(([id, text]) => [id, { id, text, verified: true }]));
const logo: ResolvedAsset = { assetId: 'logo-1', role: 'logo', mime: 'image/png', width: 10, height: 10, sha256: 'x', src: 'data:image/png;base64,AAAA', allowCrop: false };

test('factText returns the verified text and fails closed on a missing fact', () => {
  assert.equal(factText(facts(['f1', '25% korting']), 'f1', 'offer'), '25% korting');
  assert.throws(() => factText(facts(), 'f1', 'offer'), /offer fact f1 is not in the verified snapshot/);
});

test('offerOrHeroText: the offer wins, the hero fact fills in when there is no offer, nothing otherwise', () => {
  const known = facts(['f1', '25% korting'], ['f2', '12 uur warm']);
  // The shared schema rejects both together; the helper still has a defined priority for configs built by other code.
  assert.deepEqual(offerOrHeroText({ ...config({ offerFactId: 'f1' }), heroFactId: 'f2' }, known), { text: '25% korting', source: 'offer' });
  assert.deepEqual(offerOrHeroText(config({ heroFactId: 'f2' }), known), { text: '12 uur warm', source: 'hero' });
  assert.equal(offerOrHeroText(config(), known), undefined);
  assert.throws(() => offerOrHeroText(config({ heroFactId: 'f3' }), known), /hero fact f3 is not in the verified snapshot/);
});

test('brandMark: logo image when there is a logo, otherwise the escaped brand name', () => {
  const withLogo = brandMark(config(), logo, 'x-logo').toString();
  assert.match(withLogo, /<img class="x-logo" data-image-fit="contain" alt="" src="data:image\/png;base64,AAAA">/);
  assert.equal(brandMark(config(), undefined, 'x-logo').toString(), 'Terra Sample');
  assert.doesNotMatch(brandMark(config({}, 'Tom <b>'), undefined, 'x-logo').toString(), /<b>/);
});

test('headlineWithAccent wraps only the accent phrase and escapes the text', () => {
  assert.equal(headlineWithAccent('Schoon thuis, zonder gedoe', 'zonder gedoe', 'acc').toString(), 'Schoon thuis, <span class="acc">zonder gedoe</span>');
  assert.equal(headlineWithAccent('Schoon thuis', undefined, 'acc').toString(), 'Schoon thuis');
  assert.doesNotMatch(headlineWithAccent('A <i>b</i> c', 'b', 'acc').toString(), /<i>/);
});
