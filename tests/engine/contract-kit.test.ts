import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { html, type SafeHtml } from '../../src/shared/html.js';
import type { TemplateConfig, TemplateModule, TemplateRenderInput, TemplateRenderOutput } from '../../src/shared/render-contract.js';
import { checkTemplateContract, formatViolationReport, type ContractReport } from '../../src/server/render/contract-kit.js';
import { createFixtureTemplate } from '../../fixtures/engine/templates/fixture-hero.js';
import { contractCases } from '../../fixtures/engine/contract-cases.js';

const base = createFixtureTemplate({ version: '2.0.0' });

/** Static markup as a template author would write it: allowed through html`` only because it has no interpolation. */
const staticHtml = (text: string): SafeHtml => html(Object.assign([text], { raw: [text] }) as unknown as TemplateStringsArray);

function variant(transform: (output: TemplateRenderOutput, input: TemplateRenderInput) => unknown, patch: Partial<TemplateModule> = {}): TemplateModule {
  return { ...base, ...patch, render: (input) => transform(base.render(input), input) as TemplateRenderOutput };
}
const withBody = (edit: (body: string) => string) => variant((output) => ({ ...output, body: staticHtml(edit(output.body.toString())) }));
const withCss = (edit: (css: string) => string) => variant((output) => ({ ...output, css: edit(output.css) }));

async function run(module: TemplateModule): Promise<ContractReport> {
  return checkTemplateContract(module, await contractCases());
}
const failing = (report: ContractReport) => [...new Set(report.checks.filter((c) => c.status === 'fail').map((c) => c.id))];
const warning = (report: ContractReport) => [...new Set(report.checks.filter((c) => c.status === 'warn').map((c) => c.id))];

test('the engine fixture passes the contract kit with no failures and no warnings', async () => {
  const report = await run(base);
  assert.deepEqual(failing(report), [], formatViolationReport(report));
  assert.deepEqual(warning(report), [], formatViolationReport(report));
  assert.equal(report.passed, true);
  assert.equal(report.contractVersion, '0.2');
  // Two cases × three formats are rendered; every format-level check ran for each.
  assert.equal(report.checks.filter((c) => c.id === 'render.output').length, 6);
  assert.ok(report.checks.some((c) => c.id === 'schema.strict' && /rejected/.test(c.detail)));
});

test('kit fails when no valid case is supplied', async () => {
  const report = await checkTemplateContract(base, []);
  assert.deepEqual(failing(report), ['cases.present']);
});

test('body that is a plain string instead of SafeHtml is a failure', async () => {
  const report = await run(variant((output) => ({ ...output, body: output.body.toString() })));
  assert.ok(failing(report).includes('render.output'));
});

test('forbidden markup: script, handlers, forms, style tags', async () => {
  for (const injected of ['<script>alert(1)</script>', '<div onclick="x()"></div>', '<form action="/x"></form>', '<style>.a{}</style>', '<iframe src="about:blank"></iframe>']) {
    const report = await run(withBody((body) => `${body}${injected}`));
    assert.ok(failing(report).includes('markup.forbidden'), injected);
  }
});

test('images and URLs: external src, non-asset data URI, non-fragment href, external style url are failures', async () => {
  const cases: Array<[string, string]> = [
    ['external img', '<img data-image-fit="contain" alt="" src="https://example.com/x.png">'],
    ['foreign data uri', '<img data-image-fit="contain" alt="" src="data:image/png;base64,AAAA">'],
    ['external link', '<a href="https://example.com">x</a>'],
    ['external style url', '<div style="background:url(https://example.com/x.png)"></div>'],
    ['srcset', '<img data-image-fit="contain" alt="" srcset="x.png 1x" src="data:image/png;base64,AAAA">'],
  ];
  for (const [label, injected] of cases) {
    const report = await run(withBody((body) => `${body}${injected}`));
    assert.ok(failing(report).includes('markup.assets') || failing(report).includes('markup.forbidden'), label);
  }
  // An in-document fragment link and an svg namespace are legitimate.
  const ok = await run(withBody((body) => `${body}<svg xmlns="http://www.w3.org/2000/svg"><use href="#a"/></svg>`));
  assert.deepEqual(failing(ok), []);
});

test('missing required slot is reported with its name', async () => {
  const report = await run(withBody((body) => body.replace('data-slot="cta"', 'data-x="cta"')));
  const check = report.checks.find((c) => c.id === 'slots.manifest' && c.status === 'fail');
  assert.ok(check, 'slots.manifest failed');
  assert.equal(check.slot, 'cta');
});

test('duplicate slot names and invalid attribute values are failures', async () => {
  const dup = await run(withBody((body) => `${body}<span data-slot="cta"></span>`));
  assert.ok(failing(dup).includes('slots.names'));
  const bad = await run(withBody((body) => body.replace('data-fit-group="headline"', 'data-fit-group="Bad Group"').replace('data-required="true"', 'data-required="yes"')));
  assert.ok(failing(bad).includes('attributes.values'));
  const range = await run(withBody((body) => body.replace('data-fit-min="0.8"', 'data-fit-min="0.1"')));
  assert.ok(failing(range).includes('attributes.values'));
  const overlap = await run(withBody((body) => `${body}<i data-slot="x1" data-allow-overlap="ghost"></i>`));
  assert.ok(failing(overlap).includes('attributes.values'));
});

test('cover image needs data-allow-crop and an asset that allows crop; img needs data-image-fit', async () => {
  const noFit = await run(withBody((body) => body.replace(' data-image-fit="contain"', '')));
  assert.ok(failing(noFit).includes('image.fit'));
  const cover = await run(withBody((body) => body.replace('data-image-fit="contain"', 'data-image-fit="cover" data-allow-crop="true"')));
  assert.ok(failing(cover).includes('image.fit'), 'asset allowCrop is false in the fixture config, so cover must be refused');
});

test('render must be deterministic', async () => {
  let n = 0;
  const report = await run(withBody((body) => `${body}<i data-slot="tick-${n++ % 2}"></i>`));
  assert.ok(failing(report).includes('render.deterministic'));
});

test('render that throws is a failure and does not stop the kit', async () => {
  const report = await run(variant(() => { throw new Error('boom'); }));
  assert.ok(failing(report).includes('render.output'));
  assert.ok(report.checks.some((c) => c.id === 'schema.strict'), 'schema checks still ran');
});

test('css rules: @import and external url() are failures', async () => {
  assert.ok(failing(await run(withCss((css) => `@import url(x.css);${css}`))).includes('css.rules'));
  assert.ok(failing(await run(withCss((css) => `${css}.x{background:url(https://example.com/a.png)}`))).includes('css.rules'));
});

test('css advisories are warnings, not failures: unscoped selectors, literal canvas size, unread fit group, no safe tokens', async () => {
  const unscoped = await run(withCss((css) => `${css}.stray{color:red}`));
  assert.ok(warning(unscoped).includes('css.scoped'));
  assert.equal(unscoped.passed, true, 'warnings alone do not fail the kit');
  const sized = await run(withCss((css) => `${css}.eng-fixture .a{width:1080px}`));
  assert.ok(warning(sized).includes('css.canvas'));
  const unused = await run(withCss((css) => css.replaceAll('--lf-fit-headline', '--lf-other')));
  assert.ok(warning(unused).includes('fit.group.unused'));
  const noTokens = await run(withCss((css) => css.replaceAll('--lf-safe-', '--x-safe-')));
  assert.ok(warning(noTokens).includes('css.tokens'));
  const strict = await checkTemplateContract(withCss((css) => `${css}.stray{color:red}`), await contractCases(), { strict: true });
  assert.equal(strict.passed, false, 'strict mode turns warnings into failures');
});

test('a schema that accepts hostile input is a failure that names the accepted variants', async () => {
  const lax = { ...base, configSchema: z.any() as unknown as z.ZodType<TemplateConfig> };
  const report = await run(lax);
  const check = report.checks.find((c) => c.id === 'schema.strict' && c.status === 'fail');
  assert.ok(check);
  assert.match(check.detail, /unknown top-level key/);
  assert.match(check.detail, /path traversal in asset id/);
});

test('a schema that rejects the valid case is reported and that case is not rendered', async () => {
  const strictNothing = { ...base, configSchema: z.never() as unknown as z.ZodType<TemplateConfig> };
  const report = await run(strictNothing);
  assert.ok(failing(report).includes('schema.accepts'));
  assert.equal(report.checks.filter((c) => c.id === 'render.output').length, 0);
});

test('invalid module metadata is reported through the real registry rules', async () => {
  const report = await run({ ...base, rootClass: 'Not A Class' });
  assert.ok(failing(report).includes('module.registry'));
});

test('hostile fixture (external image) fails the kit; layout-only defects do not, because the browser measures those', async () => {
  const hostile = await run(createFixtureTemplate({ version: '3.0.0', hostileExternal: true }));
  assert.ok(failing(hostile).includes('markup.assets'));
  const stray = await run(createFixtureTemplate({ version: '3.0.1', strayOutsideSafeArea: true }));
  assert.deepEqual(failing(stray), [], 'a safe-area defect is a renderer finding (SAFE_AREA_VIOLATION), not a kit finding');
});

test('violation report carries template, commit, case, format, slot, detail and a reproduce line', async () => {
  const report = await run(withBody((body) => body.replace('data-slot="cta"', 'data-x="cta"')));
  const text = formatViolationReport(report, { commit: 'abc1234', reproduce: 'npm.cmd run check:template -- --module <path> --cases <path>' });
  assert.match(text, /fixture-hero@2\.0\.0/);
  assert.match(text, /commit abc1234/);
  assert.match(text, /FAIL slots\.manifest \| case=shirt \| format=square \| slot=cta/);
  assert.match(text, /Reproduce: npm\.cmd run check:template/);
  const clean = formatViolationReport(await run(base), { commit: 'abc1234', reproduce: 'x' });
  assert.doesNotMatch(clean, /Reproduce:/, 'no reproduce line when everything passes');
});
