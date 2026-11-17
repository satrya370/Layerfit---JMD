import test from 'node:test';
import assert from 'node:assert/strict';
import { FORMAT_PROFILES, type TemplateRenderInput } from '../../src/shared/render-contract.js';
import { checkTemplateContract, formatViolationReport } from '../../src/server/render/contract-kit.js';
import { TemplateRegistry } from '../../src/server/render/registry.js';
import { MemoryAssetSource, RenderAssetResolver } from '../../src/server/assets/resolve-render-assets.js';
import { splitComposition } from '../../src/templates/part02/split-composition/index.js';
import { SPLIT_COMPOSITION_BUDGETS, splitCompositionSchema } from '../../src/templates/part02/split-composition/schema.js';
import { CAMPAIGN, builtCases, contractCases, type BuiltCase } from '../../fixtures/templates/split-composition/cases.js';

async function input(built: BuiltCase, format: 'square' | 'portrait' | 'vertical' = 'portrait'): Promise<TemplateRenderInput> {
  const source = new MemoryAssetSource();
  for (const record of built.assets) source.put(record);
  const resolved = await new RenderAssetResolver(source).resolve(CAMPAIGN, built.config);
  return { format, profile: FORMAT_PROFILES[format], config: built.config, photos: resolved.photos, ...(resolved.logo ? { logo: resolved.logo } : {}), facts: new Map(built.facts.map((f) => [f.id, f])) };
}
const bodyOf = async (built: BuiltCase) => splitComposition.render(await input(built)).body.toString();
const byName = async (name: string) => (await builtCases()).find((c) => c.name === name)!;
const occurrences = (text: string, needle: string) => text.split(needle).length - 1;

test('the module is accepted by the engine registry', () => {
  const registry = new TemplateRegistry().register(splitComposition);
  assert.deepEqual(registry.list().map((t) => `${t.id}@${t.version}`), ['split-composition@0.1.0']);
  assert.equal(registry.get('split-composition', '0.1.0').rootClass, 'lf-split-composition');
});

test('contract kit: every case passes with no failures and no warnings', async () => {
  const cases = await contractCases();
  const report = await checkTemplateContract(splitComposition, cases);
  assert.deepEqual(report.checks.filter((c) => c.status !== 'pass').map((c) => `${c.status} ${c.id} ${c.case ?? ''} ${c.format ?? ''}: ${c.detail}`), [], formatViolationReport(report));
  assert.equal(report.passed, true);
  assert.equal(report.checks.filter((c) => c.id === 'render.output').length, cases.length * 3, 'every case in every format');
  assert.match(report.checks.find((c) => c.id === 'schema.strict' && c.case === 'full')!.detail, /rejected/);
});

test('schema: budgets are inclusive and one over is rejected', async () => {
  const full = await byName('full');
  const copy = (patch: Partial<typeof full.config.copy>) => ({ ...full.config, copy: { ...full.config.copy, accentPhrase: undefined, ...patch } });
  assert.equal(splitCompositionSchema.safeParse(copy({ headline: 'x'.repeat(SPLIT_COMPOSITION_BUDGETS.headline) })).success, true);
  assert.equal(splitCompositionSchema.safeParse(copy({ headline: 'x'.repeat(SPLIT_COMPOSITION_BUDGETS.headline + 1) })).success, false);
  assert.equal(splitCompositionSchema.safeParse(copy({ body: 'y'.repeat(SPLIT_COMPOSITION_BUDGETS.body) })).success, true);
  assert.equal(splitCompositionSchema.safeParse(copy({ body: 'y'.repeat(SPLIT_COMPOSITION_BUDGETS.body + 1) })).success, false);
  const factIds = full.config.copy.benefits[0]!.factIds;
  assert.equal(splitCompositionSchema.safeParse(copy({ benefits: [{ text: 'z'.repeat(SPLIT_COMPOSITION_BUDGETS.benefit), factIds }] })).success, true);
  assert.equal(splitCompositionSchema.safeParse(copy({ benefits: [{ text: 'z'.repeat(SPLIT_COMPOSITION_BUDGETS.benefit + 1), factIds }] })).success, false);
});

test('the owner design palette passes the contrast rules', async () => {
  const full = await byName('full');
  assert.equal(splitCompositionSchema.safeParse(full.config).success, true, 'primary #173028, secondary #e9e8e0, accent #d5f86a are accepted');
});

test('scaffold text from the original design is not rendered, with or without optional facts', async () => {
  for (const name of ['minimal', 'full']) {
    const body = await bodyOf(await byName(name));
    for (const scaffold of [/05\/15/, /T \/ 05/, /01 \/ 01/, /JOUW PRODUCT/i, /CREATIVE STUDIO/i, /PRODUCT SPOTLIGHT/i, /BEKIJK DE DETAILS/i, /GEMAAKT OM TE ONTDEKKEN(?!<)/i]) {
      if (name === 'full' && String(scaffold).includes('GEMAAKT')) continue; // the full case uses it as simulated proof text, from a fact
      assert.doesNotMatch(body, scaffold, `${name}: ${scaffold}`);
    }
  }
});

test('optional blocks appear only when their source exists, and show fact or copy text exactly', async () => {
  const minimal = await bodyOf(await byName('minimal'));
  for (const slot of ['offer', 'proof', 'description', 'benefits', 'pill']) assert.doesNotMatch(minimal, new RegExp(`data-slot="${slot}"`), slot);
  const full = await bodyOf(await byName('full'));
  assert.match(full, /data-slot="offer"[^>]*><span class="spl-dot"><\/span><span>Simulatie: ontdek de collectie</);
  assert.match(full, /data-slot="proof"[^>]*>Simulatie: gemaakt om te ontdekken</);
  assert.match(full, /data-slot="description"[^>]*>Bekijk het product, ontdek de details en vind wat bij jou past\.</);
});

test('the first benefit is the floating pill and the others are chips; no benefit is shown twice', async () => {
  const full = await bodyOf(await byName('full'));
  assert.match(full, /data-slot="pill"[^>]*>.*<span>Herbruikbaar<\/span>/);
  assert.equal(occurrences(full, 'Herbruikbaar'), 1);
  assert.equal(occurrences(full, 'class="spl-benefit"'), 2);
  assert.match(full, /Roestvrij staal/);
  assert.match(full, /Past in elke tas/);
  const crop = await bodyOf(await byName('crop-lifestyle'));
  assert.match(crop, /data-slot="pill"/);
  assert.doesNotMatch(crop, /data-slot="benefits"/, 'one benefit becomes only the pill; there are no chips');
});

test('photo: contain by default, cover only when the asset allows cropping', async () => {
  const contain = await bodyOf(await byName('full'));
  assert.match(contain, /data-image-fit="contain" alt="" src="data:image/);
  assert.doesNotMatch(contain, /data-image-fit="cover"/);
  const cover = await bodyOf(await byName('crop-lifestyle'));
  assert.match(cover, /data-image-fit="cover" data-allow-crop="true"/);
});

test('brand mark: logo when provided, name otherwise; the brand line always shows the name; accent phrase is its own line', async () => {
  const full = await bodyOf(await byName('full'));
  assert.match(full, /class="spl-logo"/);
  assert.match(full, /data-slot="brand-sub"[^>]*>Terra Sample</);
  assert.match(full, /Ontdek de <span class="spl-accent">nieuwe fles<\/span>/);
  const minimal = await bodyOf(await byName('minimal'));
  assert.doesNotMatch(minimal, /spl-logo/);
  assert.match(minimal, /data-slot="brand"[^>]*>Terra Sample</);
});

test('fact text is escaped, and a referenced fact that is missing fails closed', async () => {
  const full = await byName('full');
  const hostile = { ...full, facts: full.facts.map((f) => (f.id === full.config.offerFactId ? { ...f, text: '<script>alert(1)</script> & "x"' } : f)) };
  const body = await bodyOf(hostile);
  assert.doesNotMatch(body, /<script>/);
  assert.match(body, /&lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; &quot;x&quot;/);
  const missing = { ...full, facts: full.facts.filter((f) => f.id !== full.config.proofFactId) };
  await assert.rejects(async () => bodyOf(missing), /proof fact .* is not in the verified snapshot/);
});

test('panels bleed to the canvas edge with negative margins while content stays on engine safe tokens', async () => {
  const { default: fs } = await import('node:fs');
  const css = fs.readFileSync(new URL('../../src/templates/part02/split-composition/styles.css', import.meta.url), 'utf8');
  assert.match(css, /margin: calc\(-1 \* var\(--lf-safe-top\)\)/);
  assert.match(css, /padding: var\(--lf-safe-top\)/);
  assert.doesNotMatch(css, /position:\s*fixed/);
  assert.doesNotMatch(css, /overflow-wrap:\s*anywhere/, 'words are never broken to hide overflow');
});
