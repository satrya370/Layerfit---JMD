import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { html, SafeHtml, escapeHtml } from '../../src/shared/html.js';
import { renderSnapshotSchema, templateConfigSchema, renderRequestSchema, FORMAT_PROFILES } from '../../src/shared/render-contract.js';
import { TemplateRegistry } from '../../src/server/render/registry.js';
import { RenderError, toRenderError } from '../../src/server/render/errors.js';
import { validateTemplateCss } from '../../src/server/render/document.js';
import { FontLoader } from '../../src/server/render/fonts.js';
import { FONT_REGISTRY } from '../../src/shared/fonts.js';
import { normalizeImage, CUTOUT_ALPHA_MAX } from '../../src/server/assets/normalize-image.js';
import { MemoryAssetSource, RenderAssetResolver } from '../../src/server/assets/resolve-render-assets.js';
import { OutputStore } from '../../src/server/storage/output-store.js';
import { renderBatch } from '../../src/server/render/batch.js';
import { renderOutput, type RenderEngine } from '../../src/server/render/render-output.js';
import { simulatedBriefs, SIM } from '../../fixtures/engine/briefs.js';
import { createFixtureTemplate } from '../../fixtures/engine/templates/fixture-hero.js';

const CAMPAIGN = SIM.shirt.campaignId;
const ASSET = SIM.shirt.photoAssetId;

async function expectCode(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error: unknown) => error instanceof RenderError && error.code === code, `expected ${code}`);
}

test('html builder escapes interpolations and refuses forged SafeHtml', () => {
  assert.equal(escapeHtml(`<a href="x">'&\`</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#96;&lt;/a&gt;');
  const safe = html`<p>${'<script>alert(1)</script>'}</p>`;
  assert.equal(safe.toString(), '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  assert.throws(() => new SafeHtml('<p>raw</p>', Symbol('forged')), TypeError);
  assert.throws(() => html`<p>${Number.NaN}</p>`, TypeError);
});

test('snapshot schema is strict: no path, URL or raw HTML fields', async () => {
  const { shirt } = await simulatedBriefs();
  assert.equal(renderSnapshotSchema.safeParse(shirt.snapshot).success, true);
  assert.equal(renderSnapshotSchema.safeParse({ ...shirt.snapshot, outputPath: '/tmp/x' }).success, false);
  assert.equal(renderSnapshotSchema.safeParse({ ...shirt.snapshot, creativeId: '../../escape' }).success, false);
  assert.equal(renderSnapshotSchema.safeParse({ ...shirt.snapshot, language: 'de' }).success, false);
});

test('config schema rejects path-like IDs, CSS injection and ungrounded or mismatched copy', async () => {
  const { shirt } = await simulatedBriefs();
  const good = shirt.snapshot.config;
  assert.equal(templateConfigSchema.safeParse(good).success, true);
  assert.equal(templateConfigSchema.safeParse({ ...good, brand: { ...good.brand, primary: 'red;background:url(http://x)' } }).success, false);
  assert.equal(templateConfigSchema.safeParse({ ...good, brand: { ...good.brand, fontHeadingId: 'comic-sans' } }).success, false);
  assert.equal(templateConfigSchema.safeParse({ ...good, assets: [{ ...good.assets[0]!, assetId: '../../etc/passwd' }] }).success, false);
  assert.equal(templateConfigSchema.safeParse({ ...good, copy: { ...good.copy, benefits: [{ text: 'Geen bron', factIds: [] }] } }).success, false);
  assert.equal(templateConfigSchema.safeParse({ ...good, copy: { ...good.copy, headline: 'x'.repeat(91) } }).success, false);
  assert.equal(templateConfigSchema.safeParse({ ...good, copy: { ...good.copy, headline: 'Kop', accentPhrase: 'niet in kop' } }).success, false);
  assert.equal(templateConfigSchema.safeParse({ ...good, callouts: [{ benefitIndex: 5, anchor: { x: 0.5, y: 0.5 } }] }).success, false);
  assert.equal(templateConfigSchema.safeParse({ ...good, assets: [...good.assets, ...good.assets] }).success, false);
});

test('request schema requires unique encodings and rejects unknown keys', async () => {
  const { shirt } = await simulatedBriefs();
  const base = { snapshot: shirt.snapshot, format: 'square', encodings: ['png'], jobId: '44444444-4444-4444-8444-444444444444', taskId: '55555555-5555-4555-8555-555555555555', attempt: 1 };
  assert.equal(renderRequestSchema.safeParse(base).success, true);
  assert.equal(renderRequestSchema.safeParse({ ...base, encodings: ['png', 'png'] }).success, false);
  assert.equal(renderRequestSchema.safeParse({ ...base, format: 'story' }).success, false);
  assert.equal(renderRequestSchema.safeParse({ ...base, path: '/tmp' }).success, false);
});

test('format profiles: vertical follows the spec baseline', () => {
  assert.deepEqual(FORMAT_PROFILES.vertical, { format: 'vertical', width: 1080, height: 1920, safe: { top: 250, right: 70, bottom: 350, left: 70 } });
  assert.equal(FORMAT_PROFILES.square.height, 1080);
  assert.equal(FORMAT_PROFILES.portrait.height, 1350);
});

test('registry: unknown template is TEMPLATE_UNKNOWN; invalid registrations throw', () => {
  const registry = new TemplateRegistry().register(createFixtureTemplate({ version: '0.1.0' }));
  assert.throws(() => registry.get('../evil', '0.1.0'), (e: unknown) => e instanceof RenderError && e.code === 'TEMPLATE_UNKNOWN');
  assert.throws(() => registry.get('fixture-hero', '9.9.9'), (e: unknown) => e instanceof RenderError && e.code === 'TEMPLATE_UNKNOWN');
  assert.throws(() => registry.register(createFixtureTemplate({ version: '0.1.0' })), TypeError);
  assert.throws(() => registry.register({ ...createFixtureTemplate({ version: '0.2.0' }), rootClass: 'Bad Class' }), TypeError);
  assert.throws(() => registry.register({ ...createFixtureTemplate({ version: '0.3.0' }), slots: [] }), TypeError);
});

test('CSS validation rejects imports, remote urls, markup breakouts and script-like constructs', () => {
  validateTemplateCss('.a{color:red}.b{background:url(data:image/png;base64,AAAA)}');
  for (const css of ['@import url(x.css);', '.a{background:url(https://example.com/x.png)}', '</style><script>', '.a{behavior:url(x)}', '.a{x:expression(alert(1))}']) {
    assert.throws(() => validateTemplateCss(css), (e: unknown) => e instanceof RenderError && e.code === 'CSS_INVALID', css);
  }
});

test('error mapping keeps stable codes and does not leak raw provider text', () => {
  assert.equal(toRenderError(new Error('Target crashed'), 'page').code, 'PAGE_CRASH');
  assert.equal(toRenderError(new Error('Connection closed'), 'browser').code, 'BROWSER_DISCONNECTED');
  assert.equal(toRenderError(Object.assign(new Error('x'), { name: 'TimeoutError' }), 'readiness').code, 'READINESS_TIMEOUT');
  const unknown = toRenderError(new Error('something odd with /secret/path'), 'encode');
  assert.equal(unknown.code, 'ENCODE_FAILED');
  assert.equal(unknown.retryable, false);
});

test('font loader embeds real WOFF2 files and fails closed on missing or wrong files', async () => {
  const loaded = await new FontLoader().load('inter');
  assert.equal(loaded.family, 'LF Inter');
  assert.deepEqual(loaded.faces.map((f) => f.weight), [400, 700, 800, 900]);
  for (const face of loaded.faces) assert.match(face.src, /^data:font\/woff2;base64,/);

  await assert.rejects(new FontLoader(FONT_REGISTRY, () => '/does/not/exist.woff2').load('inter'), (e: unknown) => e instanceof RenderError && e.code === 'FONT_MISSING');
  await expectCode(new FontLoader().load('comic-sans'), 'FONT_MISSING');

  const dir = await mkdtemp(join(tmpdir(), 'lf-font-'));
  const fake = join(dir, 'fake.woff2');
  await writeFile(fake, 'not a font');
  await assert.rejects(new FontLoader(FONT_REGISTRY, () => fake).load('inter'), (e: unknown) => e instanceof RenderError && e.code === 'FONT_MISSING');
});

test('image normalization: raster bytes only, SVG and text rejected, alpha kept as PNG', async () => {
  await expectCode(normalizeImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>')), 'ASSET_INVALID');
  await expectCode(normalizeImage(Buffer.from('not an image')), 'ASSET_INVALID');
  await expectCode(normalizeImage(Buffer.alloc(0)), 'ASSET_INVALID');
  const opaque = await sharp({ create: { width: 40, height: 20, channels: 3, background: '#abcdef' } }).png().toBuffer();
  const normalized = await normalizeImage(opaque);
  assert.equal(normalized.mime, 'image/jpeg');
  assert.equal(normalized.width, 40);
  const alpha = await sharp({ create: { width: 10, height: 10, channels: 4, background: '#00000000' } }).png().toBuffer();
  assert.equal((await normalizeImage(alpha)).mime, 'image/png');
});

test('image normalization: kind is detected from the pixels (scene vs cutout)', async () => {
  const jpeg = await sharp({ create: { width: 40, height: 40, channels: 3, background: '#abcdef' } }).jpeg().toBuffer();
  assert.equal((await normalizeImage(jpeg)).kind, 'scene');
  const opaquePng = await sharp({ create: { width: 40, height: 40, channels: 3, background: '#abcdef' } }).png().toBuffer();
  assert.equal((await normalizeImage(opaquePng)).kind, 'scene');
  // PNG with an alpha channel but every pixel opaque is still a scene.
  const opaqueAlpha = await sharp({ create: { width: 40, height: 40, channels: 4, background: '#abcdefff' } }).png().toBuffer();
  assert.equal((await normalizeImage(opaqueAlpha)).kind, 'scene');
  // Opaque square on a transparent border: 40x40 canvas, 28x28 opaque centre = 49% opaque, 51% transparent.
  const centre = await sharp({ create: { width: 28, height: 28, channels: 4, background: '#cc3322ff' } }).png().toBuffer();
  const cutout = await sharp({ create: { width: 40, height: 40, channels: 4, background: '#00000000' } })
    .composite([{ input: centre, left: 6, top: 6 }]).png().toBuffer();
  assert.equal((await normalizeImage(cutout)).kind, 'cutout');
  // The thresholds themselves. Images are built from raw RGBA so the number of transparent pixels is exact
  // (compositing a transparent layer over an opaque one changes nothing, so it cannot be used here).
  const rgba = (width: number, height: number, alphaOf: (pixel: number) => number) => {
    const raw = Buffer.alloc(width * height * 4);
    for (let i = 0; i < width * height; i++) { raw[i * 4] = 204; raw[i * 4 + 1] = 51; raw[i * 4 + 2] = 34; raw[i * 4 + 3] = alphaOf(i); }
    return sharp(raw, { raw: { width, height, channels: 4 } }).png().toBuffer();
  };
  // 40x40 = 1600 pixels, so 5% is exactly 80 transparent pixels.
  const transparentPixels = (count: number) => rgba(40, 40, (pixel) => (pixel < count ? 0 : 255));
  assert.equal((await normalizeImage(await transparentPixels(80))).kind, 'cutout', '80 of 1600 pixels is exactly 5%');
  assert.equal((await normalizeImage(await transparentPixels(79))).kind, 'scene', '79 of 1600 pixels is just under 5%');
  assert.equal((await normalizeImage(await rgba(40, 40, () => CUTOUT_ALPHA_MAX - 1))).kind, 'cutout', 'alpha just under the limit is transparent');
  assert.equal((await normalizeImage(await rgba(40, 40, () => CUTOUT_ALPHA_MAX))).kind, 'scene', 'alpha at the limit is not transparent');
});

test('asset resolution: other campaign and missing asset give the same error', async () => {
  const { shirt } = await simulatedBriefs();
  const source = new MemoryAssetSource().put(shirt.assets[0]!);
  const resolver = new RenderAssetResolver(source);
  const config = shirt.snapshot.config;
  await expectCode(resolver.resolve(SIM.bottle.campaignId, config), 'ASSET_FORBIDDEN');
  await expectCode(resolver.resolve(CAMPAIGN, { ...config, assets: [{ assetId: 'missing-photo', role: 'product', allowCrop: false }] }), 'ASSET_FORBIDDEN');
  const resolved = await resolver.resolve(CAMPAIGN, config);
  assert.equal(resolved.photos[0]!.assetId, ASSET);
  assert.match(resolved.photos[0]!.src, /^data:image\/(png|jpeg);base64,/);
  assert.equal('kind' in resolved.photos[0]!, false, 'no kind in the config means no kind on the resolved photo');
  const withKind = await resolver.resolve(CAMPAIGN, { ...config, assets: config.assets.map((asset) => ({ ...asset, kind: 'cutout' as const })) });
  assert.equal(withKind.photos[0]!.kind, 'cutout', 'the kind from the config is copied to the resolved photo');
});

test('output store: server-generated keys only, no traversal, publish is conflict-safe', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lf-store-'));
  const store = new OutputStore(root);
  const parts = { campaignId: CAMPAIGN, creativeId: SIM.shirt.creativeId, revision: 2, fingerprint: 'abcdef0123456789', format: 'square' as const };
  const key = store.key(parts, 'png');
  assert.equal(key, `campaigns/${CAMPAIGN}/creatives/${SIM.shirt.creativeId}/r2/abcdef0123456789/square.png`);
  assert.throws(() => store.key({ ...parts, campaignId: '../x' }, 'png'), RenderError);
  assert.throws(() => store.key({ ...parts, revision: 0 }, 'png'), RenderError);
  assert.throws(() => store.pathFor(`${key}/../../../escape`), RenderError);
  assert.throws(() => store.pathFor('/etc/passwd'), RenderError);

  const bytes = Buffer.from('first');
  const sha256 = (await import('node:crypto')).createHash('sha256').update(bytes).digest('hex');
  await store.publish('66666666-6666-4666-8666-666666666666', [{ key, bytes, sha256 }], () => true);
  assert.equal((await readFile(store.pathFor(key))).toString(), 'first');

  // Referenced key + different bytes (e.g. ±1 pixel-level re-render): the stored file is kept and its real hash is reported.
  const other = Buffer.from('second');
  const otherSha = (await import('node:crypto')).createHash('sha256').update(other).digest('hex');
  const kept = await store.publish('77777777-7777-4777-8777-777777777777', [{ key, bytes: other, sha256: otherSha }], () => true);
  assert.deepEqual(kept, [{ key, sha256, bytes: 5, kept: true }]);
  assert.equal((await readFile(store.pathFor(key))).toString(), 'first', 'referenced output must not be overwritten');

  // Hash that does not match its bytes must never reach disk.
  await expectCode(store.publish('88888888-8888-4888-8888-888888888888', [{ key, bytes: other, sha256 }], () => true), 'OUTPUT_INVALID');
  assert.equal((await readFile(store.pathFor(key))).toString(), 'first', 'hash mismatch must not publish');

  // An unreferenced file left by an interrupted attempt may be replaced by verified bytes.
  const replaced = await store.publish('99999999-9999-4999-8999-999999999991', [{ key, bytes: other, sha256: otherSha }], () => false);
  assert.equal(replaced[0]!.kept, false);
  assert.equal((await readFile(store.pathFor(key))).toString(), 'second');
});

test('batch envelope is validated before any browser work', async () => {
  const engine = { browsers: { get version() { return undefined; } } } as unknown as RenderEngine;
  await expectCode(renderBatch({ tasks: [] }, engine), 'REQUEST_INVALID');
  await expectCode(renderBatch({ tasks: 'nope' }, engine), 'REQUEST_INVALID');
  await expectCode(renderBatch({ tasks: [{ taskId: 'x' }, { taskId: 'x' }] }, engine), 'REQUEST_INVALID');
  await expectCode(renderBatch({ tasks: Array.from({ length: 91 }, (_, i) => ({ taskId: String(i) })) }, engine), 'REQUEST_INVALID');
});

test('renderOutput returns a structured failure for invalid input and never throws', async () => {
  const engine = { browsers: { get version() { return undefined; } } } as unknown as RenderEngine;
  const result = await renderOutput({ taskId: 'bad', format: 'square', snapshot: { creativeId: 'x' } }, engine);
  assert.equal(result.status, 'failed');
  assert.equal(result.error?.code, 'REQUEST_INVALID');
  assert.equal(result.error?.stage, 'validate');
  assert.equal(result.error?.retryable, false);
});

test('registry-backed validation catches unknown template and missing facts before any browser work', async () => {
  const { shirt } = await simulatedBriefs();
  const registry = new TemplateRegistry().register(createFixtureTemplate({ version: '0.1.0' }));
  const engine = {
    browsers: { get version() { return undefined; }, withPage: async () => { throw new Error('browser must not be used'); } },
    templates: registry,
    assets: new RenderAssetResolver(new MemoryAssetSource().put(shirt.assets[0]!)),
    fonts: new FontLoader(),
    store: new OutputStore(await mkdtemp(join(tmpdir(), 'lf-val-'))),
  } as unknown as RenderEngine;
  const envelope = (snapshot: unknown) => ({
    taskId: '99999999-9999-4999-8999-999999999999', format: 'square', encodings: ['png'], jobId: '44444444-4444-4444-8444-444444444444', attempt: 1, snapshot,
  });
  const unknownTemplate = await renderOutput(envelope({ ...shirt.snapshot, templateId: 'other' }), engine);
  assert.equal(unknownTemplate.error?.code, 'TEMPLATE_UNKNOWN');
  const missingFacts = await renderOutput(envelope({ ...shirt.snapshot, facts: [] }), engine);
  assert.equal(missingFacts.error?.code, 'FACT_MISSING');
  assert.equal(missingFacts.error?.stage, 'validate');

  // Every fact id the config can reference is checked, including the content-model ones.
  const config = shirt.snapshot.config as Record<string, unknown>;
  const copy = config.copy as Record<string, unknown>;
  const withoutOffer = { ...config };
  delete withoutOffer.offerFactId;
  const referencing: Array<[string, Record<string, unknown>]> = [
    ['bodyFactIds', { ...config, copy: { ...copy, body: 'Licht en zacht', bodyFactIds: ['no-such-fact'] } }],
    ['heroFactId', { ...withoutOffer, heroFactId: 'no-such-fact' }],
    ['disclaimerFactId', { ...config, disclaimerFactId: 'no-such-fact' }],
  ];
  for (const [field, changed] of referencing) {
    const result = await renderOutput(envelope({ ...shirt.snapshot, config: changed }), engine);
    assert.equal(result.error?.code, 'FACT_MISSING', field);
    assert.match(result.error?.message ?? '', /no-such-fact/, field);
  }
});

// ---- Review pass 2: regression tests written before the fixes ----

test('public error messages never contain raw exception text, paths or provider detail', async () => {
  const mapped = toRenderError(new Error("ENOENT: no such file or directory, open 'C:/Users/secret/file.png'"), 'encode');
  assert.equal(mapped.code, 'ENCODE_FAILED');
  assert.doesNotMatch(mapped.message, /secret|ENOENT|Users/);
  assert.match(mapped.internal ?? '', /ENOENT/, 'operators can still read the raw text via internal');

  // A storage root that cannot be used must not leak its path through the result message.
  const dir = await mkdtemp(join(tmpdir(), 'lf-leak-'));
  const asFile = join(dir, 'not-a-directory');
  await writeFile(asFile, 'x');
  const store = new OutputStore(asFile);
  const key = store.key({ campaignId: CAMPAIGN, creativeId: SIM.shirt.creativeId, revision: 1, fingerprint: 'abcdef0123456789', format: 'square' }, 'png');
  const bytes = Buffer.from('x');
  const sha256 = (await import('node:crypto')).createHash('sha256').update(bytes).digest('hex');
  await assert.rejects(store.publish('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', [{ key, bytes, sha256 }], () => true), (error: unknown) => {
    assert.ok(error instanceof RenderError);
    assert.doesNotMatch(error.message, /lf-leak|not-a-directory|ENOTDIR|EEXIST|Users/);
    return true;
  });
});

test('batch: several malformed tasks fail individually; only repeated valid taskIds reject the envelope', async () => {
  const engine = { browsers: { get version() { return undefined; } } } as unknown as RenderEngine;
  const results = await renderBatch({ tasks: [{ nope: 1 }, { nope: 2 }, { taskId: 7 }] }, engine);
  assert.equal(results.length, 3);
  assert.ok(results.every((r) => r.status === 'failed' && r.error?.code === 'REQUEST_INVALID'));
  const id = '12345678-1234-4234-8234-123456789012';
  await expectCode(renderBatch({ tasks: [{ taskId: id }, { taskId: id }] }, engine), 'REQUEST_INVALID');
});

test('failed result for an unusable request does not pretend a format was requested', async () => {
  const engine = { browsers: { get version() { return undefined; } } } as unknown as RenderEngine;
  const missing = await renderOutput({ taskId: 'x' }, engine);
  assert.equal(missing.format, null);
  const bogus = await renderOutput({ taskId: 'x', format: 'story' }, engine);
  assert.equal(bogus.format, null);
  const real = await renderOutput({ taskId: 'x', format: 'vertical' }, engine);
  assert.equal(real.format, 'vertical', 'a valid format is echoed even when the rest is invalid');
});

test('format profiles are frozen so template code cannot change the shared safe area', () => {
  assert.ok(Object.isFrozen(FORMAT_PROFILES));
  for (const profile of Object.values(FORMAT_PROFILES)) {
    assert.ok(Object.isFrozen(profile));
    assert.ok(Object.isFrozen(profile.safe));
  }
  assert.throws(() => { (FORMAT_PROFILES.vertical.safe as { top: number }).top = 0; }, TypeError);
});

test('registry rejects duplicate or malformed slot names in a manifest', () => {
  const base = createFixtureTemplate({ version: '1.0.0' });
  const registry = new TemplateRegistry();
  assert.throws(() => registry.register({ ...base, version: '1.0.1', slots: [{ name: 'a', required: true }, { name: 'a', required: false }] }), TypeError);
  assert.throws(() => registry.register({ ...base, version: '1.0.2', slots: [{ name: 'Bad Name', required: true }] }), TypeError);
  registry.register({ ...base, version: '1.0.3' });
});

test('CSS validation also rejects escape-obfuscated imports and urls', () => {
  validateTemplateCss(String.raw`.md\:flex{display:flex}.w-1\/2{width:50%}`); // Tailwind-style escaped class names stay valid
  for (const css of [String.raw`@\69mport "x.css";`, String.raw`.a{background:\75rl(https://example.com/x.png)}`, String.raw`.a{background:u\72l(http://x/y)}`]) {
    assert.throws(() => validateTemplateCss(css), (e: unknown) => e instanceof RenderError && e.code === 'CSS_INVALID', css);
  }
});
