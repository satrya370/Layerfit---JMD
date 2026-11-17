import test from 'node:test';
import assert from 'node:assert/strict';
import { FORMAT_PROFILES, type TemplateRenderInput } from '../../src/shared/render-contract.js';
import { checkTemplateContract, formatViolationReport } from '../../src/server/render/contract-kit.js';
import { TemplateRegistry } from '../../src/server/render/registry.js';
import { MemoryAssetSource, RenderAssetResolver } from '../../src/server/assets/resolve-render-assets.js';
import { darkOfferStack } from '../../src/templates/part01/dark-offer-stack/index.js';
import { DARK_OFFER_STACK_BUDGETS, contrastRatio, darkOfferStackSchema } from '../../src/templates/part01/dark-offer-stack/schema.js';
import { CAMPAIGN, builtCases, contractCases, type BuiltCase } from '../../fixtures/templates/dark-offer-stack/cases.js';

async function input(built: BuiltCase, format: 'square' | 'portrait' | 'vertical' = 'portrait'): Promise<TemplateRenderInput> {
  const source = new MemoryAssetSource();
  for (const record of built.assets) source.put(record);
  const resolved = await new RenderAssetResolver(source).resolve(CAMPAIGN, built.config);
  return { format, profile: FORMAT_PROFILES[format], config: built.config, photos: resolved.photos, ...(resolved.logo ? { logo: resolved.logo } : {}), facts: new Map(built.facts.map((f) => [f.id, f])) };
}
const bodyOf = async (built: BuiltCase, format?: 'square' | 'portrait' | 'vertical') => darkOfferStack.render(await input(built, format)).body.toString();
const byName = async (name: string) => (await builtCases()).find((c) => c.name === name)!;

test('the module is accepted by the engine registry', () => {
  const registry = new TemplateRegistry().register(darkOfferStack);
  assert.deepEqual(registry.list().map((t) => `${t.id}@${t.version}`), ['dark-offer-stack@0.1.0']);
  assert.equal(registry.get('dark-offer-stack', '0.1.0').rootClass, 'lf-dark-offer-stack');
});

test('contract kit: every case passes with no failures and no warnings', async () => {
  const cases = await contractCases();
  const report = await checkTemplateContract(darkOfferStack, cases);
  assert.deepEqual(report.checks.filter((c) => c.status !== 'pass').map((c) => `${c.status} ${c.id} ${c.case ?? ''} ${c.format ?? ''}: ${c.detail}`), [], formatViolationReport(report));
  assert.equal(report.passed, true);
  assert.equal(report.checks.filter((c) => c.id === 'render.output').length, cases.length * 3, 'every case in every format');
  const strict = report.checks.find((c) => c.id === 'schema.strict' && c.case === 'full-two-photos');
  assert.match(strict!.detail, /rejected/);
});

test('schema: budgets are inclusive and one over is rejected', async () => {
  const full = await byName('full-two-photos');
  const withHeadline = (headline: string) => ({ ...full.config, copy: { ...full.config.copy, headline, accentPhrase: undefined } });
  assert.equal(darkOfferStackSchema.safeParse(withHeadline('x'.repeat(DARK_OFFER_STACK_BUDGETS.headline))).success, true);
  assert.equal(darkOfferStackSchema.safeParse(withHeadline('x'.repeat(DARK_OFFER_STACK_BUDGETS.headline + 1))).success, false);
  const benefit = (n: number) => ({ ...full.config, copy: { ...full.config.copy, benefits: [{ text: 'y'.repeat(n), factIds: full.config.copy.benefits[0]!.factIds }] } });
  assert.equal(darkOfferStackSchema.safeParse(benefit(DARK_OFFER_STACK_BUDGETS.benefit)).success, true);
  assert.equal(darkOfferStackSchema.safeParse(benefit(DARK_OFFER_STACK_BUDGETS.benefit + 1)).success, false);
});

test('schema: contrast rules use WCAG ratios', () => {
  assert.ok(contrastRatio('#000000', '#ffffff') > 20.9 && contrastRatio('#000000', '#ffffff') < 21.1);
  assert.ok(Math.abs(contrastRatio('#ffffff', '#ffffff') - 1) < 1e-9);
  assert.ok(contrastRatio('#262626', '#ffffff') > 12, 'the owner design background is far above 4.5');
  assert.ok(contrastRatio('#28a745', '#ffffff') >= 3, 'the owner design check-mark green meets the 3:1 rule for graphics');
});

test('no claim from the original design is rendered by default', async () => {
  const body = await bodyOf(await byName('minimal-one-photo'));
  for (const claim of [/trustpilot/i, /klarna/i, /extra5/i, /5%/, /korting/i, /morgen in huis/i, /retour/i, /alleen vandaag/i, /achteraf/i, /★|☆/]) {
    assert.doesNotMatch(body, claim, String(claim));
  }
  assert.doesNotMatch(body, /data-slot="(offer|proof)"/, 'optional blocks are absent without facts');
});

test('offer and proof show the verified fact text and nothing else', async () => {
  const full = await byName('full-two-photos');
  const body = await bodyOf(full);
  assert.match(body, /data-slot="offer"[^>]*>Simulatie: gebruik de code TEST5 bij het afrekenen</);
  assert.match(body, /data-slot="proof"[^>]*>Simulatie: beoordeeld met 4,5 uit 5</);
});

test('fact text is escaped, and a referenced fact that is missing fails closed', async () => {
  const full = await byName('full-two-photos');
  const hostile = { ...full, facts: full.facts.map((f) => (f.id === full.config.offerFactId ? { ...f, text: '<script>alert(1)</script> & "x"' } : f)) };
  const body = await bodyOf(hostile);
  assert.doesNotMatch(body, /<script>/);
  assert.match(body, /&lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; &quot;x&quot;/);
  const missing = { ...full, facts: full.facts.filter((f) => f.id !== full.config.proofFactId) };
  await assert.rejects(async () => bodyOf(missing), /proof fact .* is not in the verified snapshot/);
});

test('photos: contain by default, cover only when the asset allows cropping; one or two apertures', async () => {
  const crop = await bodyOf(await byName('crop-lifestyle'));
  assert.match(crop, /dos-photos--2/);
  assert.equal((crop.match(/data-image-fit="contain"/g) ?? []).length, 1);
  assert.equal((crop.match(/data-image-fit="cover" data-allow-crop="true"/g) ?? []).length, 1);
  const single = await bodyOf(await byName('minimal-one-photo'));
  assert.match(single, /dos-photos--1/);
  assert.equal((single.match(/<figure/g) ?? []).length, 1, 'a single photo is never duplicated into a second aperture');
});

test('brand mark: logo image when provided, brand name text otherwise; accent phrase is a validated span', async () => {
  const full = await bodyOf(await byName('full-two-photos'));
  assert.match(full, /class="dos-logo"/);
  assert.match(full, /Schoon thuis, <span class="dos-accent">zonder gedoe<\/span>/);
  const plain = await bodyOf(await byName('minimal-one-photo'));
  assert.doesNotMatch(plain, /dos-logo/);
  assert.match(plain, /data-slot="brand"[^>]*>Terra Sample</);
});

test('the footer is an in-flow panel inside the safe box, not an edge-to-edge strip', async () => {
  const { default: fs } = await import('node:fs');
  const css = fs.readFileSync(new URL('../../src/templates/part01/dark-offer-stack/styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.dos-footer \{[^}]*border-radius/);
  assert.doesNotMatch(css, /position:\s*absolute|position:\s*fixed/, 'nothing is pinned to the canvas edge');
});
