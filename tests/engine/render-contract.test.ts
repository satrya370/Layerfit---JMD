import assert from 'node:assert/strict';
import test from 'node:test';
import { CANONICAL_SLOTS, CONFIG_LIMITS, checkContentManifest, isCanonicalSlot, templateConfigSchema, type ContentManifest } from '../../src/shared/render-contract.js';

const base = (patch: { copy?: Record<string, unknown>; asset?: Record<string, unknown>; top?: Record<string, unknown> } = {}) => ({
  schemaVersion: 1, templateId: 'any',
  brand: { name: 'Terra Sample', primary: '#262626', secondary: '#f2f0ed', accent: '#28a745', fontHeadingId: 'inter', fontBodyId: 'inter' },
  copy: { headline: 'Schoon thuis', cta: 'Shop nu', benefits: [], ...patch.copy },
  assets: [{ assetId: 'photo-1', role: 'product', allowCrop: false, ...patch.asset }],
  ...patch.top,
});
const issues = (config: unknown) => {
  const result = templateConfigSchema.safeParse(config);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
};

test('config schema accepts the content-model fields when they are valid', () => {
  const config = base({
    copy: { eyebrow: 'Nieuw', body: 'Licht en zacht', bodyFactIds: ['fact-1', 'fact-2'] },
    asset: { kind: 'cutout' },
    top: { productName: 'Terra fles', heroFactId: 'fact-3', disclaimerFactId: 'fact-4' },
  });
  assert.deepEqual(issues(config), []);
  assert.deepEqual(issues(base({ asset: { kind: 'scene' }, top: { offerFactId: 'fact-1' } })), []);
});

test('config schema rejects bad content-model fields', () => {
  assert.deepEqual(issues(base({ copy: { eyebrow: 'x'.repeat(49) } })).map((i) => i.split(':')[0]), ['copy.eyebrow']);
  assert.deepEqual(issues(base({ asset: { kind: 'banner' } })).map((i) => i.split(':')[0]), ['assets.0.kind']);
  assert.deepEqual(issues(base({ top: { productName: 'x'.repeat(61) } })).map((i) => i.split(':')[0]), ['productName']);
  assert.deepEqual(issues(base({ top: { heroFactId: 'Not An Id' } })).map((i) => i.split(':')[0]), ['heroFactId']);
  assert.deepEqual(issues(base({ top: { disclaimerFactId: 'Not An Id' } })).map((i) => i.split(':')[0]), ['disclaimerFactId']);
  const body = { body: 'Licht en zacht' };
  assert.deepEqual(issues(base({ copy: { ...body, bodyFactIds: [] } })).map((i) => i.split(':')[0]), ['copy.bodyFactIds']);
  assert.deepEqual(issues(base({ copy: { ...body, bodyFactIds: ['a', 'b', 'c', 'd', 'e', 'f'] } })).map((i) => i.split(':')[0]), ['copy.bodyFactIds']);
  assert.deepEqual(issues(base({ top: { unknownField: 'x' } })).length, 1, 'the config stays strict');
});

test('config schema: fact ids without a description, and a hero fact next to an offer, are rejected', () => {
  assert.deepEqual(issues(base({ copy: { bodyFactIds: ['fact-1'] } })), ['copy.bodyFactIds: bodyFactIds without a description']);
  assert.deepEqual(issues(base({ top: { heroFactId: 'fact-1', offerFactId: 'fact-2' } })), ['heroFactId: use a hero fact only when there is no offer']);
});

test('config schema: a description without fact ids is still accepted until slot_normalization_plan.md Task 3.12', () => {
  // Switching this rule on earlier would fail every existing template fixture. Task 3.12 turns it on and replaces this test.
  assert.deepEqual(issues(base({ copy: { body: 'Licht en zacht' } })), []);
});

test('config schema limits are the numbers the plan and the templates rely on', () => {
  // Written out as literals on purpose: changing a limit must be a visible decision, not a side effect of editing the constant.
  assert.deepEqual({ ...CONFIG_LIMITS }, { headline: 90, eyebrow: 48, body: 240, cta: 32, benefitText: 240, benefits: 4, photos: 8 });
  const benefit = (text: string) => ({ text, factIds: ['fact-1'] });
  const photos = (count: number) => Array.from({ length: count }, (_, i) => ({ assetId: `photo-${i + 1}`, role: 'product', allowCrop: false }));
  const cases: Array<[string, (n: number) => unknown, number]> = [
    ['copy.headline', (n) => base({ copy: { headline: 'x'.repeat(n) } }), 90],
    ['copy.eyebrow', (n) => base({ copy: { eyebrow: 'x'.repeat(n) } }), 48],
    ['copy.body', (n) => base({ copy: { body: 'x'.repeat(n), bodyFactIds: ['fact-1'] } }), 240],
    ['copy.cta', (n) => base({ copy: { cta: 'x'.repeat(n) } }), 32],
    ['copy.benefits.0.text', (n) => base({ copy: { benefits: [benefit('x'.repeat(n))] } }), 240],
    ['copy.benefits', (n) => base({ copy: { benefits: Array.from({ length: n }, () => benefit('x')) } }), 4],
    ['assets', (n) => ({ ...base(), assets: photos(n) }), 8],
  ];
  for (const [path, make, limit] of cases) {
    assert.deepEqual(issues(make(limit)), [], `${path}: ${limit} is accepted`);
    assert.deepEqual(issues(make(limit + 1)).map((i) => i.split(':')[0]), [path], `${path}: ${limit + 1} is rejected`);
  }
});

test('isCanonicalSlot accepts the vocabulary and x- wrappers, rejects everything else', () => {
  // The vocabulary is written out here on purpose (slot_normalization_plan.md §3): adding or removing a name must be a visible decision.
  const vocabulary = [
    'brand', 'brand-name', 'product-name', 'eyebrow', 'headline', 'description', 'cta', 'offer', 'proof', 'disclaimer',
    'photo', 'photo-2', 'photo-3', 'benefits', 'benefit-1', 'benefit-2', 'benefit-3',
  ];
  assert.deepEqual([...CANONICAL_SLOTS], vocabulary);
  for (const name of vocabulary) assert.equal(isCanonicalSlot(name), true, name);
  assert.equal(isCanonicalSlot('x-footer'), true);
  assert.equal(isCanonicalSlot(`x-${'a'.repeat(62)}`), true, '62 characters after x- is the limit');
  for (const name of ['Photo', 'pill', 'photo-4', 'footer', 'x-', 'x-1a', 'x-A', 'x_footer', `x-${'a'.repeat(63)}`, '']) {
    assert.equal(isCanonicalSlot(name), false, name);
  }
});

test('checkContentManifest: supporting copy needs a body or benefits', () => {
  const manifest = (body: ContentManifest['body'], benefits: ContentManifest['benefits']): ContentManifest => ({
    headline: { max: 40 }, eyebrow: { use: 'none' }, body, cta: { max: 24 }, benefits,
    photos: { min: 1, max: 1, kind: 'any' }, offer: 'optional-or-hero', proof: 'none', disclaimer: 'none',
  });
  assert.deepEqual(checkContentManifest(manifest({ use: 'none' }, { min: 0, max: 0 })), ['template has no place for supporting copy']);
  assert.deepEqual(checkContentManifest(manifest({ use: 'none' }, { min: 0, max: 3 })), []);
  assert.deepEqual(checkContentManifest(manifest({ use: 'optional', max: 110 }, { min: 0, max: 0 })), []);
  assert.deepEqual(checkContentManifest(manifest({ use: 'optional', max: 110 }, { min: 0, max: 3 })), []);
});

test('checkContentManifest: budgets must fit inside the shared schema limits', () => {
  const manifest = (patch: Partial<ContentManifest> = {}): ContentManifest => ({
    headline: { max: CONFIG_LIMITS.headline }, eyebrow: { use: 'optional', max: CONFIG_LIMITS.eyebrow }, body: { use: 'optional', max: CONFIG_LIMITS.body },
    cta: { max: CONFIG_LIMITS.cta }, benefits: { min: 0, max: CONFIG_LIMITS.benefits, chars: CONFIG_LIMITS.benefitText },
    photos: { min: 1, max: CONFIG_LIMITS.photos, kind: 'any' }, offer: 'optional-or-hero', proof: 'none', disclaimer: 'none', ...patch,
  });
  assert.deepEqual(checkContentManifest(manifest()), [], 'exactly the limits is fine');
  assert.deepEqual(checkContentManifest(manifest({ headline: { max: 91 } })), ['headline budget 91 must be between 1 and the shared schema limit 90']);
  assert.deepEqual(checkContentManifest(manifest({ headline: { max: 0 } })), ['headline budget 0 must be between 1 and the shared schema limit 90']);
  assert.deepEqual(checkContentManifest(manifest({ eyebrow: { use: 'optional', max: 49 } })), ['eyebrow budget 49 must be between 1 and the shared schema limit 48']);
  assert.deepEqual(checkContentManifest(manifest({ eyebrow: { use: 'none', max: 999 } })), [], 'a budget for a field the template does not take is ignored');
  assert.deepEqual(checkContentManifest(manifest({ body: { use: 'optional', max: 241 } })), ['description budget 241 must be between 1 and the shared schema limit 240']);
  assert.deepEqual(checkContentManifest(manifest({ cta: { max: 33 } })), ['cta budget 33 must be between 1 and the shared schema limit 32']);
  assert.deepEqual(checkContentManifest(manifest({ benefits: { min: 0, max: 4, chars: 241 } })), ['benefit text budget 241 must be between 1 and the shared schema limit 240']);
  assert.deepEqual(checkContentManifest(manifest({ benefits: { min: 0, max: 5 } })), ['benefits max 5 is above the shared schema limit 4']);
  assert.deepEqual(checkContentManifest(manifest({ benefits: { min: 3, max: 2 } })), ['benefits min 3 is above benefits max 2']);
  assert.deepEqual(checkContentManifest(manifest({ photos: { min: 0, max: 1, kind: 'any' } })), ['a template needs at least one photo']);
  assert.deepEqual(checkContentManifest(manifest({ photos: { min: 1, max: 9, kind: 'any' } })), ['photos max 9 is above the shared schema limit 8']);
  assert.deepEqual(checkContentManifest(manifest({ photos: { min: 3, max: 2, kind: 'any' } })), ['photos min 3 is above photos max 2']);
});
