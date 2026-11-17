import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import puppeteer from 'puppeteer';
import sharp from 'sharp';

/** Visual reconstruction study only, NOT a publishable ad or production-template acceptance.
 * Photo pixels are extracted from the user-supplied reference because no clean photo is available.
 * Only the photographic middle is reused: headline, badges, arrows, offer and footer are HTML/CSS.
 * Masks remove baked-in labels; underlying masked photo pixels cannot be recovered exactly.
 */
const referencePath = resolve('../../Template-example/Screenshot 2026-11-17 114011.png');
const output = resolve('artifacts/t01-reference-rebuild');
await mkdir(output, { recursive: true });
const reference = await readFile(referencePath);
const background = '#f3ece2';
const width = 779;
const height = 951;
const sceneTop = 290;
const sceneHeight = 546;
// These masks remove the reference's baked annotations, not the photograph itself.
const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="769" height="546">
  <g fill="${background}"><rect x="535" y="18" width="155" height="66" rx="24"/><rect x="502" y="170" width="160" height="42" rx="21"/><rect x="494" y="314" width="198" height="42" rx="21"/><rect x="246" y="512" width="287" height="66" rx="33"/></g>
  <g fill="none" stroke="${background}" stroke-width="3"><path d="M536 50H503m0 0 10-6m-10 6 10 6 M503 191H470m0 0 10-6m-10 6 10 6"/></g>
  <path d="M495 335H463m0 0 10-6m-10 6 10 6" fill="none" stroke="#c5b099" stroke-width="3"/>
</svg>`);
const scene = await sharp(reference).extract({ left: 5, top: sceneTop, width: 769, height: sceneHeight }).composite([{ input: mask }]).png().toBuffer();
await writeFile(join(output, 'reference-photo-extract.png'), scene);
const font = await readFile(resolve('node_modules/@fontsource/dm-serif-display/files/dm-serif-display-latin-400-normal.woff2'));
const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=779,initial-scale=1"><style>
@font-face{font-family:StudySerif;src:url(data:font/woff2;base64,${font.toString('base64')}) format('woff2');font-weight:400;font-style:normal;font-display:block}
*{box-sizing:border-box}html,body{margin:0;width:779px;height:951px;background:#080808}main{position:relative;width:779px;height:951px;border-left:5px solid #080808;border-right:5px solid #080808;background:${background};overflow:hidden}
.headline{position:absolute;z-index:2;left:5px;right:-5px;top:66px;margin:0;text-align:center;color:#2d4033;font-family:StudySerif,Georgia,serif;font-size:94px;font-weight:400;line-height:.92;letter-spacing:-3.7px}
.headline span{display:block}.scene{position:absolute;left:0;top:290px;width:769px;height:546px;display:block}
.badge{position:absolute;z-index:3;display:flex;align-items:center;justify-content:center;margin:0;background:#304637;color:#f3f0e8;font:400 20px/1.12 Arial,sans-serif;letter-spacing:-.4px;white-space:nowrap}
.badge-one{left:536px;top:309px;width:152px;height:63px;border-radius:23px;justify-content:flex-start;padding-left:14px;white-space:normal}
.badge-two{left:503px;top:462px;width:157px;height:39px;border-radius:24px}
.badge-three{left:495px;top:606px;width:195px;height:39px;border-radius:25px}
.arrows{position:absolute;left:0;top:0;z-index:3;width:769px;height:951px;pointer-events:none}
.offer{position:absolute;z-index:4;left:247px;top:803px;display:flex;align-items:center;justify-content:center;width:285px;height:64px;border-radius:38px;background:#304637;color:#f3f0e8;font:400 30px/1 Arial,sans-serif;letter-spacing:-.3px;white-space:nowrap}
.offer strong{font-weight:700}.footer{position:absolute;left:0;right:0;top:908px;text-align:center;color:#171717;font:400 21px/1.2 Arial,sans-serif;letter-spacing:-.6px}
</style></head><body><main data-study="user-reference-reconstruction-not-approved-brand-output">
<h1 class="headline"><span>Nooit meer</span><span>dat balletje</span></h1>
<img class="scene" alt="Photographic scene extracted from supplied reference, not an original clean asset" src="data:image/png;base64,${scene.toString('base64')}"/>
<svg class="arrows" viewBox="0 0 769 951" fill="none" stroke="#304637" stroke-width="1.4"><path d="M536 340H505m0 0 8-5m-8 5 8 5 M503 481H473m0 0 8-5m-8 5 8 5 M495 625H465m0 0 8-5m-8 5 8 5"/></svg>
<p class="badge badge-one">Geen balletje<br/>schoonmaken</p>
<p class="badge badge-two">Klaar in 15 sec</p>
<p class="badge badge-three">USB-C oplaadbaar</p>
<div class="offer">Van €45 voor&nbsp;<strong>€30</strong></div>
<div class="footer">manyhands.nl</div>
</main></body></html>`;
await writeFile(join(output, 'T01-reference-rebuild.html'), html);
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined, timeout: 30_000 });
let png: Buffer;
try {
  const page = await browser.newPage();
  await page.setJavaScriptEnabled(false);
  await page.setRequestInterception(true);
  page.on('request', (request) => void (request.url().startsWith('data:') ? request.continue() : request.abort()));
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((image) => image.decode())); });
  const fontLoaded = await page.evaluate(() => document.fonts.check('90px StudySerif'));
  assert.ok(fontLoaded);
  png = Buffer.from(await page.screenshot({ type: 'png' }));
} finally { await browser.close(); }
const pngPath = join(output, 'T01-reference-rebuild.png');
await writeFile(pngPath, png);
await sharp(png).jpeg({ quality: 95 }).toFile(join(output, 'T01-reference-rebuild.jpg'));
// Reference on the left; actual HTML/CSS reconstruction on the right. No reference copied as output.
await sharp({ create: { width: width * 2 + 20, height, channels: 3, background: '#fff' } })
  .composite([{ input: reference, left: 0, top: 0 }, { input: png, left: width + 20, top: 0 }])
  .png().toFile(join(output, 'T01-reference-vs-rebuild.png'));
const a = await sharp(reference).removeAlpha().raw().toBuffer();
const b = await sharp(png).removeAlpha().raw().toBuffer();
assert.equal(a.length, b.length);
let totalError = 0;
let differentPixels = 0;
for (let i = 0; i < a.length; i += 3) {
  const difference = Math.abs(a[i]! - b[i]!) + Math.abs(a[i + 1]! - b[i + 1]!) + Math.abs(a[i + 2]! - b[i + 2]!);
  totalError += difference;
  if (difference > 0) differentPixels++;
}
const report = {
  kind: 'local reference reconstruction study, not production or brand-safe creative',
  reference: referencePath, output: pngPath, width, height,
  photoSource: 'middle photographic scene cropped from the supplied screenshot; baked annotation rectangles masked',
  reconstructedWithHtml: ['headline', 'three benefit labels', 'three arrows', 'offer pill', 'site footer'],
  exactPixelMatch: differentPixels === 0,
  meanAbsoluteChannelError: totalError / a.length,
  differentPixels, pixelCount: width * height,
  limitations: ['Original clean scene unavailable; masked image areas not recoverable.', 'DM Serif Display approximates reference heading; original font unidentified.', 'Reference copy and prices reproduced only for this user-requested fidelity study, not verified LayerFit claims.', 'No full screenshot background shortcut; this is not a completed reusable engine integration.'],
};
await writeFile(join(output, 'comparison-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
