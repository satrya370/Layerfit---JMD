/** Browser geometry regression for the user-requested tall-format alignment revision.
 * Audited lifecycle pattern: isolated page per document, await fonts/images, finally close.
 * This is local template geometry evidence, not application E2E or Meta certification. */
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import puppeteer from 'puppeteer';

const out=resolve('artifacts/t13-t18-layout-review');
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
const results=[];
try{
  for(const template of ['t13','t18'])for(const variant of template==='t13'?['reference']:['linen','denim'])for(const format of ['portrait','vertical']){
    const height=format==='portrait'?1350:1920;
    const file=template==='t13'?`t13-editorial-sale-promo/T13-${format}.html`:`t18-mediterranean-fashion-poster/T18-${variant}-${format}.html`;
    const page=await browser.newPage();
    try{
      await page.setViewport({width:1080,height,deviceScaleFactor:1});
      await page.setRequestInterception(true);
      page.on('request',r=>void (/^(data:|about:)/.test(r.url())?r.continue():r.abort()));
      await page.setContent(await readFile(resolve('artifacts',file),'utf8'),{waitUntil:'load'});
      await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(Array.from(document.images).map(img=>img.decode()));});
      const geometry=await page.evaluate((kind)=>{
        const rect=(selector)=>{
          const el=document.querySelector(selector);if(!el)throw new Error(`Missing ${selector}`);
          const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,cx:(r.left+r.right)/2};
        };
        if(kind==='t13')return {masthead:rect('.t13-topline'),offer:rect('.t13-offer-block'),photo:rect('.t13-photo'),message:rect('.t13-message'),headline:rect('.t13-headline'),description:rect('.t13-description'),cta:rect('.t13-cta'),terms:rect('.t13-fineprint')};
        return {head:rect('.t18-head'),photo:rect('.t18-hero'),info:rect('.t18-info'),brand:rect('.t18-brand'),date:rect('.t18-event-date'),benefit:rect('.t18-event-time'),cta:rect('.t18-cta')};
      },template);
      const near=(a,b,label)=>assert.ok(Math.abs(a-b)<1.1,`${label}: ${a} vs ${b}`);
      if(template==='t13'&&geometry.offer&&geometry.message&&geometry.masthead&&geometry.terms&&geometry.headline&&geometry.description&&geometry.cta){
        near(geometry.offer.width,geometry.photo.width,'equal offer/photo columns');
        near(geometry.offer.left,70,'left margin');near(geometry.photo.right,1010,'right margin');
        near(geometry.photo.left-geometry.offer.right,32,'column gap');
        near(geometry.message.cx,540,'message centered');near(geometry.headline.cx,540,'headline centered');
        near(geometry.description.cx,540,'description centered');near(geometry.cta.cx,540,'CTA centered');
        near(geometry.message.top-geometry.photo.bottom,32,'hero to message gap');
        near(geometry.terms.top-geometry.message.bottom,32,'message to terms gap');
        near(geometry.description.top-geometry.headline.bottom,20,'headline to description gap');
        near(geometry.cta.top-geometry.description.bottom,20,'description to CTA gap');
      }else if(template==='t18'&&geometry.head&&geometry.info&&geometry.brand&&geometry.date&&geometry.benefit){
        for(const box of [geometry.head,geometry.photo,geometry.info,geometry.brand])near(box.cx,540,'poster center axis');
        const headGap=geometry.photo.top-geometry.head.bottom,infoGap=geometry.info.top-geometry.photo.bottom;
        assert.ok(headGap>=28&&headGap<=42,`head/hero gap ${headGap}`);
        assert.ok(infoGap>=28&&infoGap<=34,`hero/info gap ${infoGap}`);
        near(geometry.date.width,geometry.benefit.width,'balanced date/benefit columns');
        near(geometry.date.top,geometry.benefit.top,'event text baseline row');
        assert.ok(geometry.info.bottom<=geometry.cta.top-20,'info and CTA clearance');
      }else throw new Error('Missing expected revision layout groups');
      results.push({template,variant,format,status:'passed',geometry});
    }catch(error){results.push({template,variant,format,status:'failed',error:String(error)});}
    finally{await page.close();}
    await writeFile(join(out,'geometry-report.json'),JSON.stringify({scope:'Local HTML geometry regression; engine render gate reported separately',results},null,2));
  }
}finally{await browser.close();}
assert.ok(results.every(r=>r.status==='passed'),JSON.stringify(results.filter(r=>r.status!=='passed')));
console.log(`Tall-layout geometry checks PASS ${results.length}/${results.length}: ${out}`);
