import { readFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, extname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const folder=dirname(fileURLToPath(import.meta.url));
const fixture=JSON.parse(await readFile(resolve(folder,'creative.example.json'),'utf8'));
const [markup,stylesheet,scriptRaw]=await Promise.all(['index.html','styles.css','script.js'].map(name=>readFile(resolve(folder,name),'utf8')));
const mime={'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
async function encodeAsset(value){
  const src=String(value||'');
  if(/^data:image\//i.test(src))return src;
  if(/^https?:\/\//i.test(src))throw Error('Remote image URLs are disabled for deterministic demo rendering. Download the allowed asset first.');
  const full=resolve(folder,src);const rel=relative(folder,full);
  if(rel.startsWith('..')||isAbsolute(rel))throw Error('Asset path outside template');
  const type=mime[extname(full).toLowerCase()]; if(!type)throw Error('Unsupported image extension');
  const bytes=await readFile(full);
  return `data:${type};base64,${bytes.toString('base64')}`;
}
const imageUrl=await encodeAsset(fixture.imageUrl);
let script=scriptRaw.replaceAll(fixture.imageUrl, imageUrl);
let html=markup.replace('<link rel="stylesheet" href="styles.css">',`<style>${stylesheet}</style>`)
  .replace('<script defer src="script.js"></script>','')
  .replace(`src="${fixture.imageUrl}"`,`src="${imageUrl}"`)
  .replace('</body>',`<script>${script}</script></body>`);
const dimensions={square:[1080,1080],portrait:[1080,1350],story:[1080,1920]};
await mkdir(resolve(folder,'previews'),{recursive:true});
const browser=await puppeteer.launch({headless:true});
try{
 for(const [format,[width,height]] of Object.entries(dimensions)){
  const page=await browser.newPage();
  try{
   await page.setViewport({width,height,deviceScaleFactor:1});
   await page.setContent(html,{waitUntil:'domcontentloaded',timeout:15000});
   const result=await page.evaluate(async d=>window.setCreative(d),{...fixture,imageUrl,format});
   if(!result.ok)throw Error(`${format}: image failed to load`);
   const rects=await page.evaluate(()=>{
    const selectors=['#headline','#description','#cta'];
    const W=document.documentElement.clientWidth,H=document.documentElement.clientHeight;
    return selectors.map(selector=>{
      const node=document.querySelector(selector); if(!node)return {selector,ok:true};
      const r=node.getBoundingClientRect();return {selector,ok:r.width>0&&r.height>0&&r.left>=0&&r.top>=0&&r.right<=W+1&&r.bottom<=H+1};
    });
   });
   if(rects.some(r=>!r.ok))throw Error(`${format}: required text clipping ${JSON.stringify(rects)}`);
   await page.screenshot({path:resolve(folder,'previews',`t21-${format}.png`),type:'png'});
   console.log(`t21 / ${format}: ${width}x${height} rendered`);
  } finally {await page.close();}
 }
} finally {await browser.close();}
