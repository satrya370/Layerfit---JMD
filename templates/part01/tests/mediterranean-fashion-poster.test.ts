import assert from 'node:assert/strict';
import test from 'node:test';
import {checkTemplateContract} from '../../../../Layerfit-JMD-engine/src/server/render/contract-kit.js';
import {FORMAT_PROFILES,type ResolvedAsset} from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';
import {mediterraneanFashionPosterSchema,templateModule} from '../src/mediterranean-fashion-poster.js';
import {contractCases} from '../scripts/mediterranean-fashion-cases.js';

const cases=await contractCases();
function fixture(index=0){
  const item=cases[index]!; const config=mediterraneanFashionPosterSchema.parse(item.config);
  const photo:ResolvedAsset={assetId:config.assets[0]!.assetId,role:'lifestyle',mime:'image/png',width:900,height:1200,sha256:'fixture',src:'data:image/png;base64,fixture',allowCrop:true};
  return {item,config,input:{format:'square' as const,profile:FORMAT_PROFILES.square,config,photos:[photo],facts:new Map(item.facts.map(f=>[f.id,f]))}};
}

test('T18 Mediterranean fashion poster passes strict contract kit',async()=>{
  const report=await checkTemplateContract(templateModule,cases,{strict:true});
  assert.equal(report.counts.fail,0,JSON.stringify(report.checks.filter(c=>c.status==='fail')));
  assert.equal(report.counts.warn,0,JSON.stringify(report.checks.filter(c=>c.status==='warn')));
});

test('T18 preserves pyramid, script line, arch photo, verified badge, info row and CTA',()=>{
  const {input}=fixture(); const body=templateModule.render(input).body.toString();
  assert.equal((body.match(/class="t18-headline-line"/g)||[]).length,3);
  assert.ok(body.includes('Winterzon Editie')&&body.includes('LIMITED'));
  assert.ok(body.includes('VANAF € 24,95')&&body.includes('T/M ZO 29 NOV.')&&body.includes('-30% ONLINE'));
  assert.ok(body.includes('ELIA')&&body.includes('SHOP DE COLLECTIE'));
  assert.ok(body.includes('data-image-fit="cover"')&&body.includes('data-allow-crop="true"'));
  assert.ok(body.includes('t18-burst')&&body.includes('t18-arch-frame'));
  assert.ok(!body.includes('t18-meander--top'));
  for(const format of templateModule.formats){
    const output=templateModule.render({...input,format,profile:FORMAT_PROFILES[format]});
    assert.ok(output.body.toString().includes('data-slot="cta"'));
  }
});

test('T18 fails closed for missing/unverified fact copy and escapes user CTA',()=>{
  const {item,input}=fixture();
  assert.throws(()=>templateModule.render({...input,facts:new Map()}),/verified headline fact missing/);
  const badBadgeFacts=new Map(item.facts.map(f=>[f.id,f]));
  badBadgeFacts.set('t18-linen-badge',{id:'t18-linen-badge',text:'ALWAYS LIMITED',verified:true as const});
  assert.throws(()=>templateModule.render({...input,facts:badBadgeFacts}),/badge lines must exactly match/);
  const unverified=new Map(item.facts.map(f=>[f.id,{...f,verified:false as const}]));
  // @ts-expect-error invalid snapshot intentionally tests the runtime fact guard
  assert.throws(()=>templateModule.render({...input,facts:unverified}),/verified headline fact missing/);
  input.config.copy.cta='<script>bad</script>';
  assert.ok(templateModule.render(input).body.toString().includes('&lt;script&gt;bad&lt;/script&gt;'));
  for(const rejected of item.rejects||[])assert.equal(mediterraneanFashionPosterSchema.safeParse(rejected.config).success,false,rejected.name);
  assert.throws(()=>templateModule.render({...input,photos:[]}),/matching photo/);
});
