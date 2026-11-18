import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile,copyFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import sharp from 'sharp';
import {templateModule} from '../src/circular-product-benefits.js';
import {contractCases,referenceCase} from './circular-product-benefits-cases.js';
import {createHarness} from '../../../../Layerfit-JMD-engine/fixtures/engine/harness.js';
import {checkTemplateContract} from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';
import {renderOutput} from '../../../../Layerfit-JMD-engine/src/server/render/render-output.js';
import {composeDocument} from '../../../../Layerfit-JMD-engine/src/server/render/document.js';
import {FORMAT_PROFILES} from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';
import {FONT_REGISTRY,type FontWeight} from '../../../../Layerfit-JMD-engine/src/shared/fonts.js';

const out=resolve('artifacts/t20-circular-product-benefits');await mkdir(out,{recursive:true});
const cases=[await referenceCase(),...await contractCases()];
await mkdir(join(out,'fixtures'),{recursive:true});
for(const [i,item] of cases.entries())await writeFile(join(out,'fixtures',i===0?'reference-cutout.png':'synthetic-cutout.png'),item.assets[0]!.bytes);
const contract=await checkTemplateContract(templateModule,cases,{strict:false});
await writeFile(join(out,'contract-report.json'),JSON.stringify(contract,null,2));
assert.equal(contract.counts.fail,0,JSON.stringify(contract.checks.filter(c=>c.status==='fail')));
assert.ok(contract.checks.filter(c=>c.status==='warn').every(c=>c.id==='css.tokens'),'only original source-safe-inset warnings are accepted');
const store=join(out,`store-${randomUUID()}`);
const harness=await createHarness({templates:[templateModule],assets:cases.flatMap(c=>c.assets),outputRoot:store,fontRegistry:{...FONT_REGISTRY,inter:{family:'LF Arimo',fallback:'sans-serif',licence:'OFL-1.1',faces:([400,700] as FontWeight[]).map(weight=>({weight,style:'normal' as const,module:`@fontsource/arimo/files/arimo-latin-${weight}-normal.woff2`}))}},fontResolve:s=>resolve('node_modules',s)});
const results=[];
try{
  for(const [index,item] of cases.entries())for(const format of templateModule.formats){
    const c=templateModule.configSchema.parse(item.config);
    const resolved=await harness.engine.assets.resolve(item.campaignId,c);
    const output=templateModule.render({format,profile:FORMAT_PROFILES[format],config:c,...resolved,facts:new Map(item.facts.map(f=>[f.id,f]))});
    const document=composeDocument({templateId:templateModule.id,templateVersion:templateModule.version,rootClass:templateModule.rootClass,profile:FORMAT_PROFILES[format],config:c,language:'en',fonts:{heading:await harness.engine.fonts.load(c.brand.fontHeadingId),body:await harness.engine.fonts.load(c.brand.fontBodyId)},output});
    const prefix=index===0?'T20':'T20-synthetic';
    await writeFile(join(out,`${prefix}-${format}.html`),document.html);
    if(index===0&&format==='portrait')await writeFile(join(out,'index.html'),document.html);
    const result=await renderOutput({taskId:randomUUID(),jobId:randomUUID(),attempt:1,format,encodings:['png','jpg'],snapshot:{schemaVersion:1,campaignId:item.campaignId,creativeId:randomUUID(),revision:1,templateId:templateModule.id,templateVersion:templateModule.version,language:'en',config:item.config,facts:item.facts}},harness.engine);
    results.push({case:item.name,format,result});
    await writeFile(join(out,'engine-report.json'),JSON.stringify({scope:'Neutral palette per user; reference product photo is local comparison fixture only. Source original insets retained, not engine safe-area acceptance.',results},null,2));
    if(result.status!=='success')continue;
    for(const artifact of result.artifacts){
      const path=join(store,...artifact.storageKey.split('/'));const meta=await sharp(path).metadata();
      assert.equal(meta.width,FORMAT_PROFILES[format].width);assert.equal(meta.height,FORMAT_PROFILES[format].height);
      await sharp(path).raw().toBuffer();await copyFile(path,join(out,`${prefix}-${format}.${artifact.encoding}`));
    }
  }
}finally{await harness.close();}
console.log(JSON.stringify({out,contract:contract.counts,results:results.map(r=>({case:r.case,format:r.format,status:r.result.status,violations:r.result.diagnostics?.violations,error:r.result.error}))},null,2));
assert.ok(results.every(r=>r.result.status==='success'),'See engine-report.json; successes retained');
const tiles=[];
for(const [col,format] of templateModule.formats.entries()){
  const input=await sharp(join(out,`T20-${format}.png`)).resize(360,640,{fit:'contain',background:'#fff'}).png().toBuffer();
  tiles.push({input,left:col*372,top:0});
}
await sharp({create:{width:1104,height:640,channels:3,background:'#fff'}}).composite(tiles).png().toFile(join(out,'T20-neutral-final-v010.png'));
