import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const ROOT=dirname(fileURLToPath(import.meta.url));
const formats={square:{width:1080,height:1080},portrait:{width:1080,height:1350},story:{width:1080,height:1920}};
const argv=process.argv.slice(2);
const flag=(name)=>argv.find(x=>x.startsWith(`--${name}=`))?.slice(name.length+3);
const inputFile=flag('input');
const config=JSON.parse(readFileSync(inputFile?resolve(inputFile):join(ROOT,'creative.example.json'),'utf8'));
const selected=flag('format')?[flag('format')]:Object.keys(formats);
const out=flag('out')?resolve(flag('out')):join(ROOT,'previews');
if(selected.some(name=>!formats[name]))throw new Error('Use --format=square|portrait|story');
mkdirSync(out,{recursive:true});
const mime=(ext)=>ext==='.jpg'||ext==='.jpeg'?'image/jpeg':ext==='.webp'?'image/webp':'image/png';
const toDataUrl=(name)=>`data:${mime(extname(name).toLowerCase())};base64,${readFileSync(name).toString('base64')}`;
const defaultImage=toDataUrl(join(ROOT,'assets','demo-product.png'));
if(typeof config.imageUrl==='string' && !/^(https?:|data:)/i.test(config.imageUrl)){
  const file=resolve(inputFile?dirname(resolve(inputFile)):ROOT,config.imageUrl);
  if(!existsSync(file))throw new Error(`Product image missing: ${file}`);
  config.imageUrl=toDataUrl(file);
}
const css=readFileSync(join(ROOT,'styles.css'),'utf8');
const js=readFileSync(join(ROOT,'script.js'),'utf8');
let html=readFileSync(join(ROOT,'index.html'),'utf8');
html=html.replace('<link rel="stylesheet" href="./styles.css" />',`<style>${css}</style>`);
html=html.replace('<script src="./script.js"></script>',`<script>window.T06_DEFAULT_IMAGE=${JSON.stringify(defaultImage)};</script><script>${js}</script>`);
const browser=await puppeteer.launch({headless:true,executablePath:process.env.PUPPETEER_EXECUTABLE_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
try {
 for(const format of selected){
   const dimensions=formats[format];
   const page=await browser.newPage();
   await page.setViewport({...dimensions,deviceScaleFactor:1});
   await page.setContent(html,{waitUntil:'load'});
   await page.evaluate(async ({cfg,format})=>{await window.setCreative({...cfg,format});}, {cfg:config,format});
   await page.waitForFunction(()=>window.__T06_READY__===true,{timeout:10000});
   const issues=await page.evaluate(()=>{
     const main=document.querySelector('.creative');
     return [...main.querySelectorAll('.headline,.description,.cta,.photo-caption')].filter(n=>n.scrollHeight>n.clientHeight+3||n.scrollWidth>n.clientWidth+3).map(n=>({class:n.className,text:n.innerText}));
   });
   if(issues.length)throw new Error(`Overflow on ${format}: ${JSON.stringify(issues)}`);
   const output=join(out,`t06-${format}.png`);
   await page.screenshot({path:output,clip:{x:0,y:0,width:dimensions.width,height:dimensions.height}});
   console.log(`Rendered ${format}: ${dimensions.width}x${dimensions.height} -> ${output}`);
   await page.close();
 }
} finally {await browser.close();}
