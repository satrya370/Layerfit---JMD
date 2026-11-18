import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FORMAT_PROFILES, type TemplateRenderInput } from '../../src/shared/render-contract.js';
import { checkTemplateContract, formatViolationReport } from '../../src/server/render/contract-kit.js';
import { TemplateRegistry } from '../../src/server/render/registry.js';
import { MemoryAssetSource, RenderAssetResolver } from '../../src/server/assets/resolve-render-assets.js';
import { atmosphericEditorial } from '../../src/templates/part02/atmospheric-editorial/index.js';
import { ATMOSPHERIC_EDITORIAL_BUDGETS, atmosphericEditorialSchema } from '../../src/templates/part02/atmospheric-editorial/schema.js';
import { CAMPAIGN, builtCases, contractCases, type BuiltCase } from '../../fixtures/templates/atmospheric-editorial/cases.js';

async function input(built: BuiltCase): Promise<TemplateRenderInput> {
  const source = new MemoryAssetSource();
  for (const record of built.assets) source.put(record);
  const resolved = await new RenderAssetResolver(source).resolve(CAMPAIGN, built.config);
  return { format: 'square', profile: FORMAT_PROFILES.square, config: built.config, photos: resolved.photos, facts: new Map(built.facts.map((f) => [f.id, f])) };
}
const byName = async (name: string) => (await builtCases()).find((c) => c.name === name)!;
const css = readFileSync(new URL('../../src/templates/part02/atmospheric-editorial/styles.css', import.meta.url), 'utf8');

test('the module is accepted by the engine registry', () => {
  const registry = new TemplateRegistry().register(atmosphericEditorial);
  assert.equal(registry.get('atmospheric-editorial', '0.1.0').rootClass, 'lf-atmospheric-editorial');
});

test('contract kit: every case passes with no failures and no warnings', async () => {
  const cases = await contractCases();
  const report = await checkTemplateContract(atmosphericEditorial, cases);
  assert.deepEqual(report.checks.filter((c) => c.status !== 'pass').map((c) => `${c.status} ${c.id} ${c.case ?? ''} ${c.format ?? ''}: ${c.detail}`), [], formatViolationReport(report));
  assert.equal(report.passed, true);
});

test('schema: budgets are inclusive and one over is rejected', async () => {
  const full = await byName('full');
  const copy = (patch: Partial<typeof full.config.copy>) => ({ ...full.config, copy: { ...full.config.copy, ...patch } });
  assert.equal(atmosphericEditorialSchema.safeParse(copy({ headline: 'x'.repeat(ATMOSPHERIC_EDITORIAL_BUDGETS.headline) })).success, true);
  assert.equal(atmosphericEditorialSchema.safeParse(copy({ headline: 'x'.repeat(ATMOSPHERIC_EDITORIAL_BUDGETS.headline + 1) })).success, false);
});

test('markup: brand, headline and CTA are present, a missing offer or benefits leave no element', async () => {
  const full = await byName('full');
  const body = atmosphericEditorial.render(await input(full)).body.toString();
  assert.equal(body.split('<h1').length - 1, 1);
  assert.match(body, /data-slot="offer"/);
  assert.equal(body.split('data-slot="benefit-').length - 1, 3);
  assert.match(body, /data-slot="cta"[^>]*><span>Boek je moment<\/span>/);

  const minimal = atmosphericEditorial.render(await input(await byName('minimal'))).body.toString();
  assert.doesNotMatch(minimal, /data-slot="offer"|data-slot="benefit-/, 'missing data renders no element');
});

test('a missing offer fact fails closed instead of inventing text', async () => {
  const full = await byName('full');
  const broken = { ...(await input(full)), facts: new Map() };
  assert.throws(() => atmosphericEditorial.render(broken), /not in the verified snapshot/);
});

test('design rules: flat (no gradients, no shadows), no overflow-wrap or word-break that would split words', () => {
  assert.doesNotMatch(css, /gradient\(/);
  assert.doesNotMatch(css, /box-shadow|text-shadow|drop-shadow/);
  assert.doesNotMatch(css, /overflow-wrap:\s*anywhere|word-break:\s*break-all|overflow:\s*hidden[^;]*;[^}]*ae-(headline|micro|benefit)/);
});
