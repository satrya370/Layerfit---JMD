import {readFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer';
const root=dirname(fileURLToPath(import.meta.url));
const [htmlRaw,css,scriptRaw,configRaw,svg]=await Promise.all(['index.html','styles.css','script.js','creative.example.json','assets/demo-tumbler.svg'].map(p=>readFile(resolve(root,p),'utf8')));
const asset='data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64');
const script=scriptRaw.replace("imageUrl:'assets/demo-tumbler.svg'",'imageUrl:'+JSON.stringify(asset));
const html=htmlRaw.replace('<link rel="stylesheet" href="styles.css">','<style>'+css+'</style>')
  .replace('<script src="script.js" defer></script>','')
  .replace('src="assets/demo-tumbler.svg"','src="'+asset+'"')
  .replace('</body>','<script>'+script+'</script></body>');
const config=JSON.parse(configRaw);
const sizes={square:[1080,1080],portrait:[1080,1350],story:[1080,1920]};
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']});
try {
 await mkdir(resolve(root,'previews'),{recursive:true});
 for(const [format,[width,height]] of Object.entries(sizes)){
   const page=await browser.newPage();
   try {
     await page.setViewport({width,height,deviceScaleFactor:1});
     await page.setContent(html,{waitUntil:'load'});
     const result=await page.evaluate(d=>window.setCreative(d),{...config,format,imageUrl:asset});
     if(!result.ok)throw new Error('Product image not loaded');
     await page.screenshot({path:resolve(root,'previews',`t17-${format}.png`),type:'png'});
     console.log(format,width,height);
   } finally {await page.close();}
 }
} finally {await browser.close();}
