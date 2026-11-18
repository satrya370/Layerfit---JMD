import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile,copyFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import sharp from 'sharp';
import {templateModule} from '../src/mediterranean-fashion-poster.js';
import {contractCases} from './mediterranean-fashion-cases.js';
import {createHarness} from '../../../../Layerfit-JMD-engine/fixtures/engine/harness.js';
import {checkTemplateContract} from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';
import {renderOutput} from '../../../../Layerfit-JMD-engine/src/server/render/render-output.js';
import {composeDocument} from '../../../../Layerfit-JMD-engine/src/server/render/document.js';
import {FORMAT_PROFILES} from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';

const out=resolve('artifacts/t18-mediterranean-fashion-poster'); await mkdir(out,{recursive:true});
const cases=await contractCases();
const contract=await checkTemplateContract(templateModule,cases,{strict:true});
await writeFile(join(out,'contract-report.json'),JSON.stringify(contract,null,2));
assert.ok(contract.passed,JSON.stringify(contract.checks.filter(c=>c.status!=='pass')));
const store=join(out,`store-${randomUUID()}`);
const harness=await createHarness({templates:[templateModule],assets:cases.flatMap(c=>c.assets),outputRoot:store});
const results=[];
try{
  for(const [index,item] of cases.entries())for(const format of templateModule.formats){
    const config=templateModule.configSchema.parse(item.config);
    const resolved=await harness.engine.assets.resolve(item.campaignId,config);
    const output=templateModule.render({format,profile:FORMAT_PROFILES[format],config,...resolved,facts:new Map(item.facts.map(f=>[f.id,f]))});
    const document=composeDocument({templateId:templateModule.id,templateVersion:templateModule.version,rootClass:templateModule.rootClass,profile:FORMAT_PROFILES[format],config,language:'nl',fonts:{heading:await harness.engine.fonts.load(config.brand.fontHeadingId),body:await harness.engine.fonts.load(config.brand.fontBodyId)},output});
    const name=index===0?'linen':'denim';
    await writeFile(join(out,`T18-${name}-${format}.html`),document.html);
    if(index===0&&format==='portrait')await writeFile(join(out,'index.html'),document.html);
    const result=await renderOutput({taskId:randomUUID(),jobId:randomUUID(),attempt:1,format,encodings:['png','jpg'],snapshot:{schemaVersion:1,campaignId:item.campaignId,creativeId:randomUUID(),revision:1,templateId:templateModule.id,templateVersion:templateModule.version,language:'nl',config:item.config,facts:item.facts}},harness.engine);
    results.push({case:item.name,format,result});
    await writeFile(join(out,'engine-report.json'),JSON.stringify({syntheticAssetsOnly:true,results},null,2));
    if(result.status!=='success')continue;
    for(const artifact of result.artifacts){
      const stored=join(store,...artifact.storageKey.split('/'));
      const meta=await sharp(stored).metadata();
      assert.equal(meta.width,FORMAT_PROFILES[format].width);assert.equal(meta.height,FORMAT_PROFILES[format].height);
      await sharp(stored).raw().toBuffer();
      await copyFile(stored,join(out,`T18-${name}-${format}.${artifact.encoding}`));
    }
  }
}finally{await harness.close();}
assert.ok(results.every(r=>r.result.status==='success'),'See engine-report.json; successful outputs retained');
const tiles=[];
for(const [row,name] of ['linen','denim'].entries())for(const [col,format] of templateModule.formats.entries()){
  const input=await sharp(join(out,`T18-${name}-${format}.png`)).resize(360,640,{fit:'contain',background:'#fff'}).png().toBuffer();
  tiles.push({input,left:col*372,top:row*652});
}
await sharp({create:{width:1104,height:1304,channels:3,background:'#fff'}}).composite(tiles).png().toFile(join(out,'T18-no-top-border-v021.png'));
console.log(JSON.stringify({out,contract:contract.counts,results:results.map(({case:name,format,result})=>({case:name,format,status:result.status,violations:result.diagnostics?.violations,error:result.error}))},null,2));
