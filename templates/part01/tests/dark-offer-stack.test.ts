import test from 'node:test';
import assert from 'node:assert/strict';
import { darkOfferStackSchema, renderDarkOfferStackBody, type DarkOfferStackConfig, type ResolvedOfferAsset } from '../src/dark-offer-stack.js';

const shirtFact = '00000000-0000-4000-8000-000000000021';
const detailFact = '00000000-0000-4000-8000-000000000022';
const offerFact = '00000000-0000-4000-8000-000000000023';
const proofFact = '00000000-0000-4000-8000-000000000024';
const base: DarkOfferStackConfig = {
  schemaVersion: 1, templateId: 'dark-offer-stack', creativeId: 'synthetic-shirt-offer', language: 'nl',
  brand: { name: 'Synthetic Atelier', primary: '#335342', secondary: '#202326', accent: '#d1aa6a', fontHeadingId: 'fraunces', fontBodyId: 'inter' },
  product: { name: 'Synthetic shirt' }, headline: 'Two useful details, one shirt',
  benefits: [{ text: 'Cotton fabric', factIds: [shirtFact] }, { text: 'Crew neckline', factIds: [detailFact] }],
  assets: [{ assetId: 'shirt-front', role: 'product', allowCrop: false }, { assetId: 'shirt-detail', role: 'detail', allowCrop: true }],
  cta: 'Explore the shirt',
};
const assets: ResolvedOfferAsset[] = base.assets.map((asset) => ({ ...asset, mime: 'image/png', width: 600, height: 800, src: 'data:image/png;base64,AQIDBA==' }));
const facts = new Map([
  [shirtFact, { id: shirtFact, text: 'Cotton fabric' }],
  [detailFact, { id: detailFact, text: 'Crew neckline' }],
]);

test('non-promo configuration renders without an offer/proof placeholder, price or rating artwork', () => {
  assert.equal(darkOfferStackSchema.safeParse(base).success, true);
  const body = renderDarkOfferStackBody(base, assets, facts);
  assert.doesNotMatch(body, /verified-offer|verified-proof|Trustpilot|Klarna|EXTRA5|€|%\s*(off|korting)/i);
  assert.match(body, /Cotton fabric/);
});

test('offer/proof copy comes only from resolved facts, never from free config labels', () => {
  const config = { ...base, offerFactId: offerFact, proofFactId: proofFact };
  const resolvedFacts = new Map([...facts, [offerFact, { id: offerFact, text: 'TEST FIXTURE: offer slot' }], [proofFact, { id: proofFact, text: 'TEST FIXTURE: proof slot' }]]);
  const body = renderDarkOfferStackBody(config, assets, resolvedFacts);
  assert.match(body, /TEST FIXTURE: offer slot/);
  assert.match(body, /TEST FIXTURE: proof slot/);
  assert.doesNotMatch(body, /verifiedOffer|offerLabel/);
  assert.equal(darkOfferStackSchema.safeParse({ ...base, verifiedOffer: { label: 'unverified sale', factId: offerFact } }).success, false);
});

test('missing verified offer/proof/benefit facts fail closed', () => {
  assert.throws(() => renderDarkOfferStackBody({ ...base, offerFactId: offerFact }, assets, facts), /Missing verified fact/);
  assert.throws(() => renderDarkOfferStackBody(base, assets, new Map()), /Missing verified fact/);
});

test('single product photo is not duplicated; two slots follow role-based fit and crop permission', () => {
  const oneAssetConfig: DarkOfferStackConfig = { ...base, assets: [base.assets[0]!] };
  const oneBody = renderDarkOfferStackBody(oneAssetConfig, [assets[0]!], facts);
  assert.equal((oneBody.match(/<img\b/g) ?? []).length, 1);
  assert.match(oneBody, /data-image-fit="contain"/);
  const twoBody = renderDarkOfferStackBody(base, assets, facts);
  assert.equal((twoBody.match(/<img\b/g) ?? []).length, 2);
  assert.match(twoBody, /data-image-fit="contain"/);
  assert.match(twoBody, /data-image-fit="cover" data-allow-crop="true"/);
});

test('rejects external URLs, mismatched assets, malformed IDs and HTML injection', () => {
  assert.equal(darkOfferStackSchema.safeParse({ ...base, assets: [{ ...base.assets[0], assetId: '../outside' }] }).success, false);
  assert.throws(() => renderDarkOfferStackBody(base, [{ ...assets[0]!, src: 'https://example.invalid/image.png' }, assets[1]!], facts), /engine-resolved raster/);
  assert.throws(() => renderDarkOfferStackBody(base, [{ ...assets[0]!, role: 'lifestyle' }, assets[1]!], facts), /does not match/);
  const body = renderDarkOfferStackBody({ ...base, headline: '<script>alert(1)</script>' }, assets, facts);
  assert.doesNotMatch(body, /<script>/i);
  assert.match(body, /&lt;script&gt;/i);
});
