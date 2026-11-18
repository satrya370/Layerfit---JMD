import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile,copyFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import sharp from 'sharp';
import {templateModule} from '../src/after-dark-editorial.js';
import {contractCases,referenceCase} from './after-dark-editorial-cases.js';
import {FONT_REGISTRY} from '../../../../Layerfit-JMD-engine/src/shared/fonts.js';
import type {FontWeight} from '../../../../Layerfit-JMD-engine/src/shared/fonts.js';
import {createHarness} from '../../../../Layerfit-JMD-engine/fixtures/engine/harness.js';
import {checkTemplateContract} from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';
import {renderOutput} from '../../../../Layerfit-JMD-engine/src/server/render/render-output.js';
import {composeDocument} from '../../../../Layerfit-JMD-engine/src/server/render/document.js';
import {FORMAT_PROFILES} from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';

const out=resolve('artifacts/t19-source-fidelity');await mkdir(out,{recursive:true});
const cases=[await referenceCase(),...await contractCases()];
// The user explicitly requested source positions, which do not consume frozen engine safe insets.
// This is a fidelity check, not safe-area certification: retain and report all warnings.
const contract=await checkTemplateContract(templateModule,cases,{strict:false});
await writeFile(join(out,'contract-report.json'),JSON.stringify(contract,null,2));
assert.ok(contract.passed,JSON.stringify(contract.checks.filter(c=>c.status!=='pass')));
const store=join(out,`store-${randomUUID()}`);
const harness=await createHarness({templates:[templateModule],assets:cases.flatMap(c=>c.assets),outputRoot:store,fontRegistry:{...FONT_REGISTRY,
  inter:{family:'LF Arimo',fallback:'sans-serif',licence:'OFL-1.1',faces:([400,700] as FontWeight[]).map(weight=>({weight,style:'normal' as const,module:`@fontsource/arimo/files/arimo-latin-${weight}-normal.woff2`}))},
  fraunces:{family:'LF Source Serif',fallback:'serif',licence:'OFL-1.1',faces:[{weight:400,style:'normal',module:'@fontsource/dm-serif-display/files/dm-serif-display-latin-400-normal.woff2'}]},
},fontResolve:s=>resolve('node_modules',s)});
const results=[];
try{
  for(const [index,item] of cases.entries()){
    for(const format of templateModule.formats){
    const config=templateModule.configSchema.parse(item.config);
    const resolved=await harness.engine.assets.resolve(item.campaignId,config);
    const output=templateModule.render({format,profile:FORMAT_PROFILES[format],config,...resolved,facts:new Map(item.facts.map(f=>[f.id,f]))});
    const document=composeDocument({templateId:templateModule.id,templateVersion:templateModule.version,rootClass:templateModule.rootClass,profile:FORMAT_PROFILES[format],config,language:'en',fonts:{heading:await harness.engine.fonts.load(config.brand.fontHeadingId),body:await harness.engine.fonts.load(config.brand.fontBodyId)},output});
    const prefix=index===0?'T19':'T19-synthetic';
    await writeFile(join(out,`${prefix}-${format}.html`),document.html);
    if(index===0&&format==='portrait')await writeFile(join(out,'index.html'),document.html);
    const result=await renderOutput({taskId:randomUUID(),jobId:randomUUID(),attempt:1,format,encodings:['png','jpg'],snapshot:{schemaVersion:1,campaignId:item.campaignId,creativeId:randomUUID(),revision:1,templateId:templateModule.id,templateVersion:templateModule.version,language:'en',config:item.config,facts:item.facts}},harness.engine);
    results.push({case:item.name,format,result});
    await writeFile(join(out,'engine-report.json'),JSON.stringify({scope:'Source-fidelity comparison, original unsafe insets preserved; reference photo fixture-only',results},null,2));
    if(result.status!=='success')continue;
    for(const artifact of result.artifacts){
      const stored=join(store,...artifact.storageKey.split('/'));
      const meta=await sharp(stored).metadata();
      assert.equal(meta.width,FORMAT_PROFILES[format].width);assert.equal(meta.height,FORMAT_PROFILES[format].height);
      await sharp(stored).raw().toBuffer();await copyFile(stored,join(out,`${prefix}-${format}.${artifact.encoding}`));
    }
  }
  }
}finally{await harness.close();}
assert.ok(results.every(r=>r.result.status==='success'),'See engine-report.json; successful outputs retained');
const tiles=[];
for(const [col,format] of templateModule.formats.entries()){
  const input=await sharp(join(out,`T19-${format}.png`)).resize(360,640,{fit:'contain',background:'#fff'}).png().toBuffer();
  tiles.push({input,left:col*372,top:0});
}
await sharp({create:{width:1104,height:640,channels:3,background:'#fff'}}).composite(tiles).png().toFile(join(out,'T19-reference-v020.png'));
const comparisons=[];
for(const format of templateModule.formats){
  const source=resolve('../../Template-example/t19/previews',`t19-${format==='vertical'?'story':format}.png`);
  const actual=join(out,`T19-${format}.png`);
  const left=await sharp(source).removeAlpha().raw().toBuffer();const right=await sharp(actual).removeAlpha().raw().toBuffer();
  let error=0;for(let i=0;i<left.length;i++)error+=Math.abs(left[i]!-right[i]!);
  const inputs=await Promise.all([source,actual].map(async(p,i)=>({input:await sharp(p).resize({width:460}).png().toBuffer(),left:i*470,top:0})));
  await sharp({create:{width:940,height:Math.ceil(FORMAT_PROFILES[format].height/1080*460),channels:3,background:'#fff'}}).composite(inputs).png().toFile(join(out,`T19-source-vs-engine-${format}-v020.png`));
  comparisons.push({format,mae:left.length===right.length?error/left.length:null,exactMatch:left.equals(right)});
}
await writeFile(join(out,'comparison.json'),JSON.stringify({note:'Left=supplied source preview, right=engine. Source geometry/photo retained; bundled Arimo/DM Serif replace system fonts, so not an exact pixel match. No engine-safe-inset acceptance.',comparisons},null,2));
console.log(JSON.stringify({out,contract:contract.counts,results:results.map(({case:name,format,result})=>({case:name,format,status:result.status,violations:result.diagnostics?.violations,error:result.error}))},null,2));
