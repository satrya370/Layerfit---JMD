import { mkdir, copyFile, writeFile, readFile, readdir, unlink } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const out = resolve('../../Template-example/layerfit_t11_product_collection_hero');
await mkdir(join(out, 'assets'), { recursive: true });
await copyFile('src/product-collection-hero.css', join(out, 'styles.css'));
await copyFile('artifacts/t11-semaglutide-banner/assets/product-0.png', join(out, 'assets', 'vial-demo.png'));
for (const file of await readdir(join(out, 'assets'))) if (/^product-[0-9]+\.png$/.test(file)) await unlink(join(out, 'assets', file));

let fontCss = '';
for (const weight of [400, 700, 800]) {
  const name = `inter-latin-${weight}-normal.woff2`;
  await copyFile(resolve('../../..', 'Layerfit-JMD-engine/node_modules/@fontsource/inter/files', name), join(out, 'assets', name));
  fontCss += `@font-face{font-family:"LF Inter";font-style:normal;font-weight:${weight};src:url("assets/${name}") format("woff2");}\n`;
}
await writeFile(join(out, 'fonts.css'), fontCss);
await copyFile(resolve('../../..', 'Layerfit-JMD-engine/node_modules/@fontsource/inter/LICENSE'), join(out, 'assets/Inter-OFL-LICENSE.txt'));
const example = JSON.parse(await readFile(join(out, 'creative.example.json'), 'utf8'));
if (!example.headlineFactId || !example.subheadFactId || !example.disclaimerFactId || example.ctaBottom !== 'LEARN MORE') throw new Error('Invalid T11 replacement export example');
console.log(out);
