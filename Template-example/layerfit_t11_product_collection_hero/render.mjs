import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
const require = createRequire(import.meta.url);
let puppeteer;
try { puppeteer = (await import('puppeteer')).default; }
catch { puppeteer = (await import(pathToFileURL(require.resolve('../../templates/part01/node_modules/puppeteer/lib/puppeteer/puppeteer.js')).href)).default; }
const base=dirname(fileURLToPath(import.meta.url));
const data=JSON.parse(await readFile(join(base,'creative.example.json'),'utf8'));
await mkdir(join(base,'previews'),{recursive:true});
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH || undefined});
const results=[];
try {
  for(const [format,height] of [['square',1080],['portrait',1350],['story',1920]]) {
    const page=await browser.newPage();
    await page.setViewport({width:1080,height,deviceScaleFactor:1});
    await page.setRequestInterception(true);
    page.on('request',(request)=>void ((request.url().startsWith(pathToFileURL(base).href+'/') || request.url().startsWith('data:')) ? request.continue() : request.abort()));
    await page.goto(pathToFileURL(join(base,'index.html')).href,{waitUntil:'load'});
    await page.evaluate(async()=>await window.__T11_PROMISE__);
    await page.evaluate(async(input)=>await window.setCreative(input),{...data,format});
    const issues=await page.evaluate(()=>{
      const canvas=document.querySelector('[data-canvas]'),c=canvas.getBoundingClientRect();
      const errors=[];
      for(const el of canvas.querySelectorAll('[data-slot]')) {
        const r=el.getBoundingClientRect(),s=getComputedStyle(el);
        if(r.left<c.left-.5 || r.right>c.right+.5 || r.top<c.top-.5 || r.bottom>c.bottom+.5) errors.push(`${el.dataset.slot}: outside canvas`);
        if(s.display!=='inline' && (el.scrollWidth>el.clientWidth+1 || el.scrollHeight>el.clientHeight+Math.max(1,parseFloat(s.fontSize)*.2))) errors.push(`${el.dataset.slot}: overflow`);
      }
      return errors;
    });
    if(issues.length) throw new Error(`${format}: ${issues.join('; ')}`);
    await page.screenshot({path:join(base,'previews',`T11-${format}.png`),type:'png'});
    await page.screenshot({path:join(base,'previews',`T11-${format}.jpg`),type:'jpeg',quality:95});
    results.push({format,width:1080,height,issues});await page.close();
  }
} finally {await browser.close();await writeFile(join(base,'previews','render-report.json'),JSON.stringify(results,null,2));}
console.log(JSON.stringify(results,null,2));
