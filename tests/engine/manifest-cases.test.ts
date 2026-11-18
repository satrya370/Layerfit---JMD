import assert from 'node:assert/strict';
import test from 'node:test';
import { html, type SafeHtml } from '../../src/shared/html.js';
import { templateConfigSchema, type ContentManifest, type TemplateConfig, type TemplateModule, type TemplateRenderInput, type TemplateRenderOutput } from '../../src/shared/render-contract.js';
import { checkTemplateContract, formatViolationReport, imageInSlot, type ContractCase, type ContractReport } from '../../src/server/render/contract-kit.js';
import { budgetText, manifestCases } from '../../src/server/render/manifest-cases.js';
import { brandMark, factText, offerOrHeroText } from '../../src/templates/shared/fill.js';
import { createFixtureTemplate } from '../../fixtures/engine/templates/fixture-hero.js';
import { contractCases } from '../../fixtures/engine/contract-cases.js';

const CSS = '.fixture-canon{padding:var(--lf-safe-top) var(--lf-safe-right) var(--lf-safe-bottom) var(--lf-safe-left)} .fixture-canon .fc-logo{height:48px}';

const CONTENT: ContentManifest = {
  headline: { max: 40 }, eyebrow: { use: 'optional', max: 30 }, body: { use: 'optional', max: 90 }, cta: { max: 24 },
  benefits: { min: 0, max: 3, chars: 30 }, photos: { min: 1, max: 1, kind: 'any' },
  offer: 'optional-or-hero', proof: 'optional', disclaimer: 'optional',
};

/** A small template that follows the slot vocabulary, built on the shared fill helpers. */
function render({ config, photos, logo, facts }: TemplateRenderInput): TemplateRenderOutput {
  const photo = photos[0];
  if (!photo) throw new Error('needs a photo');
  const offer = offerOrHeroText(config, facts);
  const body = html`<header data-slot="brand" data-required="true" data-safe="true">${brandMark(config, logo, 'fc-logo')}</header>
${config.copy.eyebrow ? html`<p data-slot="eyebrow" data-safe="true">${config.copy.eyebrow}</p>` : ''}
<h1 data-slot="headline" data-required="true" data-safe="true">${config.copy.headline}</h1>
${config.copy.body ? html`<p data-slot="description" data-safe="true">${config.copy.body}</p>` : ''}
<ul>${config.copy.benefits.map((benefit, i) => html`<li><span data-slot="benefit-${i + 1}" data-safe="true">${benefit.text}</span></li>`)}</ul>
<figure data-slot="photo" data-required="true" data-safe="true"><img data-image-fit="contain" alt="" src="${photo.src}"></figure>
${offer ? html`<p data-slot="offer" data-safe="true">${offer.text}</p>` : ''}
${config.proofFactId ? html`<p data-slot="proof" data-safe="true">${factText(facts, config.proofFactId, 'proof')}</p>` : ''}
${config.disclaimerFactId ? html`<p data-slot="disclaimer" data-safe="true">${factText(facts, config.disclaimerFactId, 'disclaimer')}</p>` : ''}
<span data-slot="cta" data-required="true" data-safe="true">${config.copy.cta}</span>`;
  return { body, css: CSS };
}

const canon: TemplateModule = {
  id: 'fixture-hero', version: '1.0.0', formats: ['square', 'portrait', 'vertical'], rootClass: 'fixture-canon',
  slots: [
    { name: 'brand', required: true }, { name: 'headline', required: true }, { name: 'photo', required: true }, { name: 'cta', required: true },
    { name: 'eyebrow', required: false }, { name: 'description', required: false }, { name: 'benefit-1', required: false }, { name: 'benefit-2', required: false },
    { name: 'benefit-3', required: false }, { name: 'offer', required: false }, { name: 'proof', required: false }, { name: 'disclaimer', required: false },
  ],
  content: CONTENT,
  configSchema: templateConfigSchema as unknown as TemplateModule<TemplateConfig>['configSchema'],
  render,
};

const staticHtml = (text: string): SafeHtml => html(Object.assign([text], { raw: [text] }) as unknown as TemplateStringsArray);
const variant = (edit: (body: string) => string, patch: Partial<TemplateModule> = {}): TemplateModule => ({
  ...canon, ...patch,
  render: (input) => { const output = canon.render(input); return { ...output, body: staticHtml(edit(output.body.toString())) }; },
});

const run = async (module: TemplateModule, cases?: ContractCase[]): Promise<ContractReport> => checkTemplateContract(module, cases ?? await contractCases());
const failing = (report: ContractReport) => [...new Set(report.checks.filter((c) => c.status === 'fail').map((c) => c.id))];
const warning = (report: ContractReport) => [...new Set(report.checks.filter((c) => c.status === 'warn').map((c) => c.id))];
const failedCases = (report: ContractReport, id: string) => [...new Set(report.checks.filter((c) => c.id === id && c.status === 'fail').map((c) => c.case))];

interface Cfg {
  brand: { logoAssetId?: string };
  copy: { headline: string; cta: string; eyebrow?: string; body?: string; bodyFactIds?: string[]; benefits: Array<{ text: string; factIds: string[] }> };
  assets: Array<{ assetId: string; kind?: string }>;
  offerFactId?: string; heroFactId?: string; proofFactId?: string; disclaimerFactId?: string;
}
const cfg = (testCase: ContractCase) => testCase.config as Cfg;
const derived = async (module: TemplateModule = canon) => { const [shirt] = await contractCases(); return manifestCases(module, shirt!); };
const byName = (cases: ContractCase[], suffix: string) => cases.find((c) => c.name.endsWith(`:${suffix}`))!;

test('a module that follows the vocabulary passes, and is also run against its four derived cases', async () => {
  const report = await run(canon);
  assert.deepEqual(failing(report), [], formatViolationReport(report));
  assert.deepEqual(warning(report), [], formatViolationReport(report));
  const cases = [...new Set(report.checks.map((c) => c.case).filter(Boolean))];
  assert.deepEqual(cases, ['shirt', 'bottle', 'shirt:max', 'shirt:min', 'shirt:no-logo', 'shirt:no-offer']);
  // Six cases × three formats, and each per-format check ran for every one of them.
  for (const id of ['render.output', 'slots.canonical', 'slots.core', 'content.logo']) {
    assert.equal(report.checks.filter((c) => c.id === id && c.status === 'pass').length, 18, id);
  }
  // Facts about the module itself are reported once, with no case or format.
  assert.deepEqual(report.checks.filter((c) => c.id === 'content.manifest').map((c) => [c.status, c.case, c.format]), [['pass', undefined, undefined]]);
  const derivedCheck = report.checks.filter((c) => c.id === 'cases.derived');
  assert.equal(derivedCheck.length, 1);
  assert.equal(derivedCheck[0]!.status, 'pass');
  assert.match(derivedCheck[0]!.detail, /4 case\(s\) derived from the manifest: max, min, no-logo, no-offer/);
});

test('modules without a content manifest are not held to the vocabulary yet', async () => {
  const report = await run(createFixtureTemplate({ version: '4.0.0' }));
  assert.deepEqual(failing(report), []);
  assert.equal(report.checks.filter((c) => ['slots.canonical', 'slots.core', 'content.manifest', 'content.logo', 'cases.derived'].includes(c.id)).length, 0);
  assert.equal(report.checks.filter((c) => c.id === 'render.output').length, 6, 'no derived cases either');
});

test('slots.canonical: a name outside the vocabulary fails, an x- wrapper does not', async () => {
  const renamed = await run(variant((body) => body.replace('data-slot="photo"', 'data-slot="photos"')));
  assert.ok(failing(renamed).includes('slots.canonical'));
  assert.match(renamed.checks.find((c) => c.id === 'slots.canonical' && c.status === 'fail')!.detail, /photos/);
  const wrapper = await run(variant((body) => `${body}<div data-slot="x-footer"></div>`));
  assert.equal(failing(wrapper).includes('slots.canonical'), false);
  const badWrapper = await run(variant((body) => `${body}<div data-slot="x-"></div>`));
  assert.ok(failing(badWrapper).includes('slots.canonical'), 'x- alone is not a wrapper name');
  assert.equal(failing(badWrapper).includes('slots.names'), false, 'it is a well-formed name, just not a canonical one');
});

test('slots.core: brand, headline, cta and photo must be in the markup', async () => {
  for (const slot of ['brand', 'headline', 'cta', 'photo']) {
    const report = await run(variant((body) => body.replace(`data-slot="${slot}"`, `data-x="${slot}"`)));
    const check = report.checks.find((c) => c.id === 'slots.core' && c.status === 'fail');
    assert.ok(check, slot);
    assert.match(check.detail, new RegExp(`no ${slot} slot`));
  }
});

test('slots.core: copy the manifest allows needs a slot, but only when the case has it', async () => {
  const noDescription = await run(variant((body) => body.replace('data-slot="description"', 'data-x="description"')));
  assert.ok(failedCases(noDescription, 'slots.core').includes('shirt:max'), 'a case with a description needs the slot');
  assert.equal(failedCases(noDescription, 'slots.core').includes('shirt:min'), false, 'the min case has no description');
  assert.match(noDescription.checks.find((c) => c.id === 'slots.core' && c.status === 'fail')!.detail, /description slot/);
  const noBenefit = await run(variant((body) => body.replace('data-slot="benefit-1"', 'data-x="benefit-1"')));
  assert.ok(failedCases(noBenefit, 'slots.core').includes('shirt:max'));
  assert.equal(failedCases(noBenefit, 'slots.core').includes('shirt:min'), false, 'the min case has no benefits');
  // A manifest that does not allow a body does not ask for a description slot.
  const noBody = await run(variant((body) => body.replace('data-slot="description"', 'data-x="description"'), { content: { ...CONTENT, body: { use: 'none' } } }));
  assert.equal(failing(noBody).includes('slots.core'), false);
});

test('content.manifest reports a manifest with no place for supporting copy, once', async () => {
  const report = await run({ ...canon, content: { ...CONTENT, body: { use: 'none' }, benefits: { min: 0, max: 0 } } });
  const failed = report.checks.filter((c) => c.id === 'content.manifest' && c.status === 'fail');
  assert.equal(failed.length, 1, 'once, not once per case and format');
  assert.equal(failed[0]!.case, undefined);
  assert.match(failed[0]!.detail, /template has no place for supporting copy/);
});

test('content.manifest: a budget the shared schema cannot take is named as the cause', async () => {
  const report = await run({ ...canon, content: { ...CONTENT, headline: { max: 91 }, cta: { max: 33 }, photos: { min: 0, max: 9, kind: 'any' } } });
  const detail = report.checks.find((c) => c.id === 'content.manifest' && c.status === 'fail')!.detail;
  assert.match(detail, /headline budget 91 must be between 1 and the shared schema limit 90/);
  assert.match(detail, /cta budget 33 must be between 1 and the shared schema limit 32/);
  assert.match(detail, /a template needs at least one photo/);
  assert.match(detail, /photos max 9 is above the shared schema limit 8/);
});

test('cases.derived: deriving nothing is a failure that says why, not silence', async () => {
  const [shirt] = await contractCases();
  const noBytes = await run(canon, [{ ...shirt!, assets: [] }]);
  const noBytesCheck = noBytes.checks.find((c) => c.id === 'cases.derived')!;
  assert.equal(noBytesCheck.status, 'fail');
  assert.match(noBytesCheck.detail, /no cases could be derived from the manifest/);
  const none = await run(canon, [{ ...shirt!, config: { ...(shirt!.config as object), outputPath: '/tmp/x' } }]);
  assert.match(none.checks.find((c) => c.id === 'cases.derived' && c.status === 'fail')!.detail, /no supplied case is accepted by the schema/);
  const comparison = await run({ ...canon, content: { ...CONTENT, comparison: 'opt-in' } });
  const comparisonCheck = comparison.checks.find((c) => c.id === 'cases.derived')!;
  assert.equal(comparisonCheck.status, 'pass');
  assert.match(comparisonCheck.detail, /comparison design/);
  const empty = await checkTemplateContract(canon, []);
  assert.deepEqual(failing(empty), ['cases.present'], 'with no cases at all only cases.present speaks');
});

test('content.manifest: a required offer must be a required slot', async () => {
  for (const offer of ['required-or-hero', 'offer-only'] as const) {
    const report = await run({ ...canon, content: { ...CONTENT, offer } });
    assert.match(report.checks.find((c) => c.id === 'content.manifest' && c.status === 'fail')!.detail, /does not require an offer slot/, offer);
  }
  // With the slot required and every case carrying an offer or a hero fact, the same manifest passes.
  const [shirt] = await contractCases();
  const withOffer: ContractCase = { ...shirt!, facts: [...shirt!.facts, { id: 'base-offer', text: '20% korting', verified: true }], config: { ...(shirt!.config as object), offerFactId: 'base-offer' } };
  const required = { ...canon, content: { ...CONTENT, offer: 'required-or-hero' as const }, slots: canon.slots.map((slot) => (slot.name === 'offer' ? { ...slot, required: true } : slot)) };
  const report = await run(required, [withOffer]);
  assert.deepEqual(failing(report), [], formatViolationReport(report));
});

test('content.manifest: a case with a logo must show the logo inside the brand slot', async () => {
  const report = await run(variant((body) => body.replace(/<img class="fc-logo"[^>]*>/, 'Logo')));
  const cases = failedCases(report, 'content.logo');
  assert.ok(cases.includes('shirt:max') && cases.includes('shirt:no-offer'), 'cases with a logo fail');
  assert.equal(cases.includes('shirt:no-logo'), false);
  assert.equal(cases.includes('shirt:min'), false);
  // A logo drawn outside the brand slot does not count.
  const outside = await run(variant((body) => body.replace(/(<header data-slot="brand"[^>]*>)(<img[^>]*>)(<\/header>)/, '$1Logo$3$2')));
  assert.ok(failedCases(outside, 'content.logo').includes('shirt:max'));
});

test('imageInSlot follows the markup structure', () => {
  const src = 'data:image/png;base64,LOGO';
  const inside: Array<[string, string]> = [
    ['the slot is the image itself', `<img data-slot="brand" src="${src}">`],
    ['image inside the slot', `<div data-slot="brand"><img src="${src}"></div>`],
    ['image with a closing slash', `<div data-slot="brand"><img src="${src}" /></div>`],
    ['a void tag before the image', `<div data-slot="brand"><br><img src="${src}"></div>`],
    ['image in a nested wrapper', `<div data-slot="brand"><span><img src="${src}"></span></div>`],
    ['an inner element of the same kind closes first', `<div data-slot="brand"><div></div><img src="${src}"></div>`],
    ['a self-closed svg child before the image', `<div data-slot="brand"><svg><path d="M0 0"/></svg><img src="${src}"></div>`],
    ['a stray closing tag before the slot', `</span><div data-slot="brand"><img src="${src}"></div>`],
    ['an unquoted value ending in a slash does not close the slot element', `<div data-slot="brand" title=x/><img src="${src}"></div>`],
  ];
  const outside: Array<[string, string]> = [
    ['image after the slot closed', `<div data-slot="brand"></div><img src="${src}">`],
    ['image after an inner element and the slot closed', `<div data-slot="brand"><div></div></div><img src="${src}">`],
    ['a self-closed slot with the image next to it', `<g data-slot="brand"/><img src="${src}">`],
    ['a self-closed slot with a space before the slash', `<g data-slot="brand" /><img src="${src}">`],
    ['another image inside the slot', '<div data-slot="brand"><img src="data:image/png;base64,OTHER"></div>'],
    ['the image is in another slot', `<div data-slot="headline"><img src="${src}"></div><div data-slot="brand"></div>`],
    ['no slot at all', `<img src="${src}">`],
  ];
  for (const [label, markup] of inside) assert.equal(imageInSlot(markup, 'brand', src), true, label);
  for (const [label, markup] of outside) assert.equal(imageInSlot(markup, 'brand', src), false, label);
});

test('content.manifest: the image in the brand slot must be the logo, not a photo', async () => {
  const report = await run(variant((body) => {
    const photoSrc = /<figure data-slot="photo"[^>]*><img [^>]*src="([^"]+)"/.exec(body)![1]!;
    return body.replace(/(<img class="fc-logo"[^>]*src=")[^"]+(")/, `$1${photoSrc}$2`);
  }));
  assert.ok(failedCases(report, 'content.logo').includes('shirt:max'), 'a photo in the brand slot is not the logo');
});

test('slots.core: a description slot is asked for only when the manifest allows a body', async () => {
  const [shirt] = await contractCases();
  const config = shirt!.config as { copy: object };
  const withBody: ContractCase = {
    ...shirt!, facts: [...shirt!.facts, { id: 'base-body', text: 'Licht en zacht', verified: true }],
    config: { ...config, copy: { ...config.copy, body: 'Licht en zacht', bodyFactIds: ['base-body'] } },
  };
  const noSlot = (patch: Partial<TemplateModule>) => variant((body) => body.replace('data-slot="description"', 'data-x="description"'), patch);
  assert.ok(failedCases(await run(noSlot({}), [withBody]), 'slots.core').includes('shirt'), 'allowed: the case has a description, so the slot is needed');
  assert.equal(failing(await run(noSlot({ content: { ...CONTENT, body: { use: 'none' } } }), [withBody])).includes('slots.core'), false, 'not allowed: no slot is needed');
});

test('slots.core: benefit slots are asked for only when the manifest allows benefits', async () => {
  const noSlot = (patch: Partial<TemplateModule>) => variant((body) => body.replace('data-slot="benefit-1"', 'data-x="benefit-1"'), patch);
  assert.ok(failedCases(await run(noSlot({})), 'slots.core').length > 0, 'allowed: cases with benefits need benefit-1');
  assert.equal(failing(await run(noSlot({ content: { ...CONTENT, benefits: { min: 0, max: 0 } } }))).includes('slots.core'), false, 'none allowed: no slot is needed');
});

test('derived cases come from the first supplied case that the schema accepts', async () => {
  const [shirt] = await contractCases();
  const broken: ContractCase = { ...shirt!, name: 'broken', config: { ...(shirt!.config as object), outputPath: '/tmp/x' } };
  const report = await run(canon, [broken, shirt!]);
  assert.ok(failing(report).includes('schema.accepts'), 'the broken case is still reported');
  const derivedNames = [...new Set(report.checks.map((c) => c.case))].filter((name) => name?.includes(':'));
  assert.deepEqual(derivedNames, ['shirt:max', 'shirt:min', 'shirt:no-logo', 'shirt:no-offer']);
});

test('budgetText gives exactly the requested length, from repeated Dutch words, never ending in a space', () => {
  for (const length of [1, 2, 8, 9, 10, 17, 18, 40, 90, 240]) {
    const text = budgetText(length);
    assert.equal(text.length, length, String(length));
    assert.equal(text, text.trim(), `${length} is already trimmed`);
  }
  assert.equal(budgetText(18), 'Duurzaam Duurzaamd', 'a cut that would end in a space ends in a letter instead');
  assert.equal(budgetText(0).length, 1, 'a budget below one character still gives one');
  assert.equal(budgetText(-5).length, 1);
  assert.match(budgetText(40), /^Duurzaam Duurzaam /);
});

test('manifestCases: max, min, no-logo and no-offer', async () => {
  const cases = await derived();
  assert.deepEqual(cases.map((c) => c.name), ['shirt:max', 'shirt:min', 'shirt:no-logo', 'shirt:no-offer']);

  const max = cfg(byName(cases, 'max'));
  assert.equal(max.copy.headline.length, 40);
  assert.equal(max.copy.cta.length, 24);
  assert.equal(max.copy.eyebrow?.length, 30);
  assert.equal(max.copy.body?.length, 90);
  assert.equal(max.copy.bodyFactIds?.length, 1);
  assert.deepEqual(max.copy.benefits.map((b) => b.text.length), [30, 30, 30]);
  assert.equal(max.brand.logoAssetId, 'manifest-logo');
  assert.ok(max.offerFactId && max.proofFactId && max.disclaimerFactId);
  assert.equal(max.heroFactId, undefined);

  const min = cfg(byName(cases, 'min'));
  assert.ok(min.copy.headline.length <= 12 && min.copy.cta.length <= 12, 'short text');
  assert.deepEqual([min.copy.eyebrow, min.copy.body, min.copy.bodyFactIds], [undefined, undefined, undefined]);
  assert.deepEqual(min.copy.benefits, []);
  assert.deepEqual([min.brand.logoAssetId, min.offerFactId, min.heroFactId, min.proofFactId, min.disclaimerFactId], [undefined, undefined, undefined, undefined, undefined]);

  const noLogo = cfg(byName(cases, 'no-logo'));
  assert.equal(noLogo.brand.logoAssetId, undefined);
  assert.ok(noLogo.offerFactId && noLogo.copy.body && noLogo.copy.benefits.length === 3);

  const noOffer = cfg(byName(cases, 'no-offer'));
  assert.ok(noOffer.heroFactId);
  assert.equal(noOffer.offerFactId, undefined);
  assert.equal(noOffer.brand.logoAssetId, 'manifest-logo');
});

test('manifestCases: every referenced fact and asset exists, and the config passes the shared schema', async () => {
  for (const testCase of await derived()) {
    const config = cfg(testCase);
    const ids = [...config.copy.benefits.flatMap((b) => b.factIds), ...(config.copy.bodyFactIds ?? []), config.offerFactId, config.heroFactId, config.proofFactId, config.disclaimerFactId].filter((id): id is string => !!id);
    for (const id of ids) assert.ok(testCase.facts.some((fact) => fact.id === id), `${testCase.name} fact ${id}`);
    const assetIds = [...config.assets.map((a) => a.assetId), ...(config.brand.logoAssetId ? [config.brand.logoAssetId] : [])];
    for (const id of assetIds) assert.ok(testCase.assets.some((record) => record.assetId === id && record.campaignId === testCase.campaignId), `${testCase.name} asset ${id}`);
    assert.equal(new Set(assetIds).size, assetIds.length, `${testCase.name}: ids are unique`);
    const parsed = templateConfigSchema.safeParse(testCase.config);
    assert.ok(parsed.success, `${testCase.name}: ${parsed.success ? '' : JSON.stringify(parsed.error.issues)}`);
  }
});

test('manifestCases follows the offer rule: an offer-only template has no no-offer case, a required one always has an offer', async () => {
  const offerOnly = await derived({ ...canon, content: { ...CONTENT, offer: 'offer-only' } });
  assert.deepEqual(offerOnly.map((c) => c.name), ['shirt:max', 'shirt:min', 'shirt:no-logo']);
  assert.ok(cfg(byName(offerOnly, 'min')).offerFactId);
  const requiredOrHero = await derived({ ...canon, content: { ...CONTENT, offer: 'required-or-hero' } });
  assert.ok(cfg(byName(requiredOrHero, 'min')).offerFactId);
  assert.ok(cfg(byName(requiredOrHero, 'no-offer')).heroFactId);
});

test('manifestCases follows the manifest for photos, optional fields and kinds', async () => {
  const cases = await derived({ ...canon, content: { ...CONTENT, photos: { min: 1, max: 3, kind: 'cutout' }, eyebrow: { use: 'none' }, body: { use: 'none' }, proof: 'none', disclaimer: 'none', benefits: { min: 2, max: 2 } } });
  const max = byName(cases, 'max'); const min = byName(cases, 'min');
  assert.deepEqual(cfg(max).assets.map((a) => [a.assetId, a.kind]), [['manifest-photo-1', 'cutout'], ['manifest-photo-2', 'cutout'], ['manifest-photo-3', 'cutout']]);
  assert.equal(max.assets.length, 4, 'three photos and the logo');
  assert.equal(cfg(min).assets.length, 1);
  for (const testCase of cases) {
    assert.deepEqual([cfg(testCase).copy.eyebrow, cfg(testCase).copy.body, cfg(testCase).proofFactId, cfg(testCase).disclaimerFactId], [undefined, undefined, undefined, undefined], testCase.name);
    assert.equal(cfg(testCase).copy.benefits.length, 2, 'min and max benefit counts are both 2');
  }
});

test('manifestCases: budgets the manifest leaves open fall back to the shared schema limits', async () => {
  const cases = await derived({ ...canon, content: { ...CONTENT, eyebrow: { use: 'optional' }, body: { use: 'optional' }, benefits: { min: 0, max: 1 } } });
  const max = cfg(byName(cases, 'max'));
  assert.equal(max.copy.eyebrow?.length, 48);
  assert.equal(max.copy.body?.length, 240);
  assert.equal(max.copy.benefits[0]!.text.length, 240);
  assert.ok(templateConfigSchema.safeParse(byName(cases, 'max').config).success, 'and the shared schema accepts them');
});

test('manifestCases: the base case only supplies colours, fonts, a photo and the formats; its logo and facts are not carried over', async () => {
  const [shirt] = await contractCases();
  const baseConfig = shirt!.config as { brand: Record<string, unknown> };
  const base: ContractCase = { ...shirt!, formats: ['square'], config: { ...baseConfig, brand: { ...baseConfig.brand, logoAssetId: 'base-logo' } } };
  const cases = manifestCases(canon, base);
  assert.equal(cfg(byName(cases, 'no-logo')).brand.logoAssetId, undefined, 'the base logo is not carried into the no-logo case');
  assert.equal(cfg(byName(cases, 'min')).brand.logoAssetId, undefined);
  assert.equal(cfg(byName(cases, 'max')).brand.logoAssetId, 'manifest-logo', 'the logo asset is always one the case supplies');
  for (const testCase of cases) {
    assert.deepEqual(testCase.formats, ['square'], `${testCase.name} keeps the base formats`);
    assert.equal(testCase.facts.every((fact) => fact.id.startsWith('manifest-fact-')), true, `${testCase.name} facts are generated`);
  }
  assert.equal((await derived()).every((testCase) => testCase.formats === undefined), true, 'no formats in the base means no formats in the derived cases');
});

test('manifestCases starts from the base config: unknown fields carry over, content-dependent ones do not', async () => {
  const [shirt] = await contractCases();
  const config = shirt!.config as { copy: object };
  const base: ContractCase = {
    ...shirt!,
    config: { ...config, productName: 'Terra fles', extension: { a: 1 }, offerFactId: 'base-offer', callouts: [], copy: { ...config.copy, accentPhrase: 'x' } },
  };
  const cases = manifestCases(canon, base);
  assert.equal(cases.length, 4);
  for (const testCase of cases) {
    const derivedConfig = testCase.config as Record<string, unknown> & { copy: Record<string, unknown> };
    assert.equal(derivedConfig.productName, 'Terra fles', `${testCase.name} keeps the product name`);
    assert.deepEqual(derivedConfig.extension, { a: 1 }, `${testCase.name} keeps a field it does not know`);
    assert.equal('callouts' in derivedConfig, false, `${testCase.name} drops callouts`);
    assert.notEqual(derivedConfig.offerFactId, 'base-offer', `${testCase.name} does not reuse the base offer fact`);
    assert.equal('accentPhrase' in derivedConfig.copy, false, `${testCase.name} drops the accent phrase`);
  }
  assert.equal((base.config as Record<string, unknown>).productName, 'Terra fles', 'the base case itself is not modified');
  assert.equal((base.config as Record<string, unknown>).offerFactId, 'base-offer');
});

test('manifestCases: kind any keeps the base asset kind, and the min benefit text is short', async () => {
  const [shirt] = await contractCases();
  const config = shirt!.config as { assets: object[] };
  const base: ContractCase = { ...shirt!, config: { ...config, assets: [{ ...config.assets[0], kind: 'scene' }] } };
  const cases = manifestCases({ ...canon, content: { ...CONTENT, benefits: { min: 2, max: 3 } } }, base);
  assert.deepEqual(cfg(byName(cases, 'max')).assets.map((a) => a.kind), ['scene']);
  assert.deepEqual(cfg(byName(cases, 'min')).copy.benefits.map((b) => b.text.length), [8, 8]);
  assert.deepEqual(cfg(byName(cases, 'max')).copy.benefits.map((b) => b.text.length), [240, 240, 240]);
});

test('manifestCases gives nothing without a manifest, for comparison designs, or without a usable base case', async () => {
  const [shirt] = await contractCases();
  const { content: _unused, ...withoutContent } = canon;
  void _unused;
  assert.deepEqual(manifestCases(withoutContent as TemplateModule, shirt!), []);
  assert.deepEqual(manifestCases({ ...canon, content: { ...CONTENT, comparison: 'opt-in' } }, shirt!), []);
  assert.deepEqual(manifestCases(canon, { ...shirt!, config: { brand: {} } }), []);
  assert.deepEqual(manifestCases(canon, { ...shirt!, assets: [] }), [], 'the base asset bytes are missing');
});
