import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdir,readFile} from 'node:fs/promises';
import puppeteer from 'puppeteer';
const dir=dirname(fileURLToPath(import.meta.url));
const formats={square:[1080,1080],portrait:[1080,1350],story:[1080,1920]};
const cfg=JSON.parse(await readFile(resolve(dir,'creative.example.json'),'utf8'));
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
try{
  await mkdir(resolve(dir,'previews'),{recursive:true});
  for(const [format,[width,height]] of Object.entries(formats)){
    const page=await browser.newPage();
    await page.setViewport({width,height,deviceScaleFactor:1});
    await page.goto('file://'+resolve(dir,'index.html')+'?format='+format,{waitUntil:'load'});
    const result=await page.evaluate(async data=>window.setCreative(data),{...cfg,format});
    if(!result.ok)throw new Error('Headline overflow in '+format);
    await page.screenshot({path:resolve(dir,'previews',`t07-${format}.png`)});
    await page.close();
  }
}finally{await browser.close();}
