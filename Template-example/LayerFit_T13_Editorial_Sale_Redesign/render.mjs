import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import puppeteer from 'puppeteer';
const root=dirname(fileURLToPath(import.meta.url));
const [h,c,j,config,asset]=await Promise.all(['index.html','styles.css','script.js','creative.example.json','assets/demo-product.jpg'].map(n=>readFile(resolve(root,n))));
const uri=`data:image/jpeg;base64,${asset.toString('base64')}`;
const html=h.toString().replace('<link rel="stylesheet" href="styles.css">',`<style>${c.toString()}</style>`).replace('<script defer src="script.js"></script>','').replace('src="assets/demo-product.jpg"',`src="${uri}"`).replace('</body>',`<script>${j.toString()}</script></body>`);
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
try {await mkdir(resolve(root,'previews'),{recursive:true});
for(const [format,[width,height]] of Object.entries({square:[1080,1080],portrait:[1080,1350],story:[1080,1920]})){
 const page=await browser.newPage();try{await page.setViewport({width,height,deviceScaleFactor:1});await page.setContent(html,{waitUntil:'load'});await page.evaluate(async data=>window.setCreative(data),{...JSON.parse(config.toString()),imageUrl:uri,format});await page.screenshot({path:resolve(root,'previews',`t22-${format}.png`)});console.log('Rendered',format);}finally{await page.close();}}
}finally{await browser.close();}
