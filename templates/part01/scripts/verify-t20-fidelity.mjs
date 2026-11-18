/** Source-neutral baseline + geometry regression. Single audited browser, isolated pages,
 * fonts/image readiness and finally cleanup. No remote requests and no AI calls. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import puppeteer from 'puppeteer';
import sharp from 'sharp';

const source=resolve('../../Template-example/LayerFit_T20_Symmetric_v2');
const out=resolve('artifacts/t20-circular-product-benefits');await mkdir(out,{recursive:true});
const cfg=JSON.parse(await readFile(join(source,'creative.example.json'),'utf8'));
const css=await readFile(join(source,'styles.css'),'utf8');
const image=`data:image/png;base64,${(await readFile(join(source,'assets/waxli-demo-cutout.png'))).toString('base64')}`;
const js=(await readFile(join(source,'script.js'),'utf8')).replaceAll('assets/waxli-demo-cutout.png',image);
const html=(await readFile(join(source,'index.html'),'utf8')).replace('<link rel="stylesheet" href="styles.css">',`<style>${css}</style>`).replace('<script src="script.js" defer></script>','').replace('src="assets/waxli-demo-cutout.png"',`src="${image}"`);
const palette={bg:'#f6f5f1',bg2:'#e8e6df',title:'#252b27',sub:'#373a36',ring:'#b8b4a9',accent:'#ece7dc'};
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
const results=[];
try{
  for(const [format,height] of [['square',1080],['portrait',1350],['vertical',1920]]){
    const pages=[];
    try{
      for(const mode of ['source','engine']){
        const page=await browser.newPage();pages.push(page);
        await page.setViewport({width:1080,height,deviceScaleFactor:1});
        await page.setRequestInterception(true);
        page.on('request',r=>void (/^(data:|about:)/.test(r.url())?r.continue():r.abort()));
        if(mode==='source'){
          // Compare geometry under identical bundled fonts, not Windows Arial vs OFL Arimo.
          // Raw supplied previews remain unchanged; this baseline isolates palette/layout fidelity.
          const engineHtml=await readFile(join(out,`T20-${format}.html`),'utf8');
          const fontFaces=(engineHtml.match(/@font-face\{[^}]+\}/g)||[]).join('\n');
          await page.setContent(html.replace('</head>',`<style>${fontFaces}.creative{font-family:"LF Arimo",sans-serif;--brand-font:"LF Arimo",sans-serif;}</style></head>`),{waitUntil:'load'});await page.addScriptTag({content:js});
          await page.evaluate(()=>window.__creativeReady);
          await page.evaluate(d=>window.setCreative(d),{...cfg,imageUrl:image,colors:palette,format:format==='vertical'?'story':format});
          await page.screenshot({path:join(out,`T20-source-neutral-${format}.png`)});
        }else await page.setContent(await readFile(join(out,`T20-${format}.html`),'utf8'),{waitUntil:'load'});
        await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
      }
      const geometry=[];
      for(const page of pages)geometry.push(await page.evaluate(()=>{
        const selectors=['.brand-zone','.brand','.product-type','.orbit','.product-image','.benefit--top','.benefit--mid-left','.benefit--mid-right','.benefit--bottom-left','.benefit--bottom-right'];
        return Object.fromEntries(selectors.map(s=>{
          const e=document.querySelector(s);if(!e)throw new Error(`Missing ${s}`);
          const r=e.getBoundingClientRect();return [s,{left:r.left,top:r.top,width:r.width,height:r.height,right:r.right,bottom:r.bottom,cx:r.left+r.width/2,overflow:e.scrollWidth>e.clientWidth+2}];
        }));
      }));
      const [original,actual]=geometry;
      for(const selector of Object.keys(original))for(const prop of ['left','top','width','height']){
        assert.ok(Math.abs(original[selector][prop]-actual[selector][prop])<2.1,`${format} ${selector}.${prop}: source=${original[selector][prop]}, engine=${actual[selector][prop]}`);
      }
      const near=(a,b,label)=>assert.ok(Math.abs(a-b)<1.1,`${format} ${label}: ${a}/${b}`);
      for(const s of ['.brand-zone','.orbit','.product-image','.benefit--top'])near(actual[s].cx,540,s);
      for(const [left,right] of [['.benefit--mid-left','.benefit--mid-right'],['.benefit--bottom-left','.benefit--bottom-right']]){
        near(actual[left].top,actual[right].top,'mirrored text baseline');
        near(actual[left].width,actual[right].width,'mirrored label width');
        near(actual[left].left,1080-actual[right].right,'mirrored outer margin');
      }
      for(const [selector,box] of Object.entries(actual))assert.ok(!box.overflow&&box.left>=0&&box.right<=1080&&box.top>=0&&box.bottom<=height,`${format} ${selector}: overflow/outside canvas`);
      const cta=await pages[1].evaluate(()=>{
        const r=document.querySelector('.t20-cta').getBoundingClientRect();return {cx:r.left+r.width/2,top:r.top,bottom:r.bottom};
      });
      near(cta.cx,540,'CTA center');assert.ok(cta.top>Math.max(actual['.benefit--bottom-left'].bottom,actual['.benefit--bottom-right'].bottom)+12,'CTA must clear labels');
      const sourcePng=join(out,`T20-source-neutral-${format}.png`),enginePng=join(out,`T20-${format}.png`);
      const [a,b]=await Promise.all([sourcePng,enginePng].map(p=>sharp(p).removeAlpha().raw().toBuffer()));
      assert.equal(a.length,b.length);let error=0;for(let i=0;i<a.length;i++)error+=Math.abs(a[i]-b[i]);
      const tiles=await Promise.all([sourcePng,enginePng].map(async(p,i)=>({input:await sharp(p).resize({width:460}).png().toBuffer(),left:i*470,top:0})));
      await sharp({create:{width:940,height:Math.ceil(height/1080*460),channels:3,background:'#fff'}}).composite(tiles).png().toFile(join(out,`T20-neutral-source-vs-engine-${format}.png`));
      results.push({format,status:'passed',meanAbsoluteChannelError:error/a.length,geometry:actual,cta});
    }catch(error){results.push({format,status:'failed',error:String(error)});}
    finally{await Promise.all(pages.map(p=>p.close()));}
    await writeFile(join(out,'fidelity-geometry-report.json'),JSON.stringify({note:'Left=source layout with requested neutral palette and same bundled Arimo fonts as engine; right=engine. No source positions changed in baseline. Shadows neutralized and required small CTA added in engine. Raw source previews unchanged. Not Meta-safe certification; reference asset/copy fixture-only.',results},null,2));
  }
}finally{await browser.close();}
assert.ok(results.every(r=>r.status==='passed'),JSON.stringify(results.filter(r=>r.status!=='passed')));
console.log(`T20 source geometry + symmetry PASS ${results.length}/${results.length}`);
