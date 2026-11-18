import puppeteer from 'puppeteer';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,extname,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const read=path=>readFile(resolve(root,path),'utf8');
const [h,c,s]=await Promise.all([read('index.html'),read('styles.css'),read('script.js')]);
const data=JSON.parse(await read('creative.example.json'));
async function toDataUrl(filename){
  if(!filename)throw new Error('Missing asset');
  if(filename.startsWith('data:'))return filename;
  const path=resolve(root,filename), rel=relative(root,path);
  if(rel.startsWith('..')||isAbsolute(rel))throw new Error('Asset outside project folder');
  const ext=extname(path).toLowerCase(),mime={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'}[ext];
  if(!mime)throw new Error('Unsupported asset type');
  return `data:${mime};base64,${(await readFile(path)).toString('base64')}`;
}
const src=await toDataUrl(data.productImages[0]);
const js=s.replace("'assets/demo-products.png'",JSON.stringify(src));
const html=h.replace('<link rel="stylesheet" href="styles.css">',`<style>${c}</style>`)
  .replace('<script defer src="script.js"></script>','')
  .replace('src="assets/demo-products.png"',`src="${src}"`)
  .replace('</body>',`<script>${js}</script></body>`);
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']});
try{
 await mkdir(resolve(root,'previews'),{recursive:true});
 for(const [format,[width,height]] of Object.entries({square:[1080,1080],portrait:[1080,1350],story:[1080,1920]})){
   const page=await browser.newPage();
   await page.setViewport({width,height,deviceScaleFactor:1});
   await page.setContent(html,{waitUntil:'load'});
   await page.evaluate(async d=>{await window.setCreative(d)}, {...data,format,productImages:[src]});
   await page.screenshot({path:resolve(root,'previews',`t16-${format}.png`)});
   await page.close();
 }
}finally{await browser.close()}
