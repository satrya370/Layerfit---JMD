import {z} from 'zod';
import {html} from '../../../../Layerfit-JMD-engine/src/shared/html.js';
import {templateConfigSchema,type TemplateModule} from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';
import {referenceCss} from './after-dark-reference-css.js';

export const T19_BUDGETS={headline:60,eyebrow:32,body:100,cta:24,benefits:3,benefit:40,brand:32} as const;
export const afterDarkEditorialSchema=templateConfigSchema.safeExtend({templateId:z.literal('after-dark-editorial')}).superRefine((config,ctx)=>{
  const issue=(path:Array<string|number>,message:string)=>ctx.addIssue({code:'custom',path,message});
  if(config.assets.length!==1)issue(['assets'],'T19 requires one photo');
  if(config.copy.headline.length>T19_BUDGETS.headline)issue(['copy','headline'],'T19 headline budget exceeded');
  if(config.brand.name.length>T19_BUDGETS.brand)issue(['brand','name'],'T19 brand budget exceeded');
  if(config.copy.cta.length>T19_BUDGETS.cta)issue(['copy','cta'],'T19 CTA budget exceeded');
  if(config.copy.eyebrow&&config.copy.eyebrow.length>T19_BUDGETS.eyebrow)issue(['copy','eyebrow'],'T19 eyebrow budget exceeded');
  if(config.copy.body&&config.copy.body.length>T19_BUDGETS.body)issue(['copy','body'],'T19 body budget exceeded');
  if(config.copy.body&&!config.copy.bodyFactIds?.length)issue(['copy','bodyFactIds'],'T19 description requires verified fact IDs');
  if(config.copy.benefits.length>T19_BUDGETS.benefits)issue(['copy','benefits'],'T19 supports three short verified detail lines');
  config.copy.benefits.forEach((b,i)=>{if(b.text.length>T19_BUDGETS.benefit)issue(['copy','benefits',i],'T19 benefit budget exceeded');});
  if(config.assets[0]?.kind==='cutout'&&config.assets[0]?.allowCrop)issue(['assets',0,'allowCrop'],'cutout fallback requires contain');
  if(config.heroFactId&&config.copy.benefits.some(b=>b.factIds.includes(config.heroFactId!)))issue(['heroFactId'],'hero fact must not repeat a benefit');
  if(config.callouts?.length||config.proofFactId||config.comparisonEvidenceId||config.disclaimerFactId)issue(['proofFactId'],'T19 does not support proof, disclaimer, callouts or comparison');
});

export const templateModule:TemplateModule={
  id:'after-dark-editorial',version:'0.2.0',formats:['square','portrait','vertical'],rootClass:'lf-after-dark-editorial',configSchema:afterDarkEditorialSchema,
  content:{headline:{max:T19_BUDGETS.headline},eyebrow:{use:'optional',max:T19_BUDGETS.eyebrow},body:{use:'optional',max:T19_BUDGETS.body},cta:{max:T19_BUDGETS.cta},benefits:{min:0,max:T19_BUDGETS.benefits,chars:T19_BUDGETS.benefit},photos:{min:1,max:1,kind:'scene'},offer:'optional-or-hero',proof:'none',disclaimer:'none'},
  slots:[{name:'brand',required:true},{name:'brand-name',required:true},{name:'eyebrow',required:false},{name:'headline',required:true},{name:'description',required:false},{name:'photo',required:true},{name:'product-name',required:false},{name:'offer',required:false},{name:'cta',required:true},{name:'benefit-1',required:false},{name:'benefit-2',required:false},{name:'benefit-3',required:false}],
  render({config:raw,photos,logo,facts}){
    const config=afterDarkEditorialSchema.parse(raw);
    const photo=photos[0];if(photos.length!==1||!photo||photo.assetId!==config.assets[0]?.assetId)throw new Error('T19 requires one matching photo');
    const fact=(id:string,what:string)=>{const f=facts.get(id);if(!f?.verified||f.id!==id)throw new Error(`T19 verified ${what} fact missing: ${id}`);return f.text;};
    // Canonical R4 permits caller-written copy with verified source IDs. This verifies references,
    // not semantic truth; the upstream grounding service/human review still owns substantiation.
    if(config.copy.body)config.copy.bodyFactIds!.forEach(id=>fact(id,'description'));
    config.copy.benefits.forEach(b=>b.factIds.forEach(id=>fact(id,'benefit')));
    const offerId=config.offerFactId??config.heroFactId;
    const offer=offerId?fact(offerId,'offer/hero'):undefined;
    if(offer&&offer.length>48)throw new Error('T19 opening offer exceeds 48 characters');
    const accent=config.copy.accentPhrase,at=accent?config.copy.headline.indexOf(accent):-1;
    const heading=at>=0?html`<span class="headline-lead">${config.copy.headline.slice(0,at).trim()}</span><em>${accent}</em>${config.copy.headline.slice(at+accent!.length)}`:html`${config.copy.headline}`;
    // If one raster is also used as the non-croppable logo, preserve it in both uses.
    const canCrop=photo.allowCrop&&photo.kind!=='cutout'&&logo?.src!==photo.src;
    const image=canCrop?html`<img src="${photo.src}" alt="${config.productName??''}" data-image-fit="cover" data-allow-crop="true"/>`:html`<img src="${photo.src}" alt="${config.productName??''}" data-image-fit="contain"/>`;
    // This source-fidelity port intentionally retains original placement, not frozen engine safe insets.
    // The required photo slot follows the source frame; caption intentionally overlays it.
    return {css:referenceCss,body:html`
      <div class="top-meta">${logo?html`<span data-slot="brand" data-required="true"><img class="brand-logo" src="${logo.src}" alt="${config.brand.name}" data-image-fit="contain"/></span>`:html`<span data-slot="brand" data-required="true">${config.brand.name}</span>`}${config.copy.eyebrow?html`<span data-slot="eyebrow">${config.copy.eyebrow}</span>`:''}</div>
      <div class="opening">${offer?html`<span class="edition" data-slot="offer">${offer}</span>`:''}<span class="tiny-rule"></span><span class="issue">NO. 019</span></div>
      <div class="heading"><h1 data-slot="headline" data-required="true">${heading}</h1>${config.copy.body?html`<p data-slot="description">${config.copy.body}</p>`:''}</div>
      <div class="photo-panel" data-slot="photo" data-required="true">${image}<div class="photo-caption">${config.productName?html`<span data-slot="product-name" data-allow-overlap="photo">${config.productName}</span>`:''}<span aria-hidden="true">✳</span></div></div>
      <div class="sticker"><span data-slot="cta" data-required="true" data-allow-overlap="photo">${config.copy.cta}</span></div>
      <section class="event-info"><div class="date-block">${config.copy.benefits[0]?html`<span class="overline">WHEN</span><span class="eventDate" data-slot="benefit-1">${config.copy.benefits[0].text}</span>`:''}${config.copy.benefits[1]?html`<span class="eventTime" data-slot="benefit-2">${config.copy.benefits[1].text}</span>`:''}</div><div class="location-block"><span class="overline">WHERE</span><span class="venue" data-slot="brand-name" data-required="true">${config.brand.name.split('/')[0]!.trim()}</span>${config.copy.benefits[2]?html`<span class="address" data-slot="benefit-3">${config.copy.benefits[2].text}</span>`:''}</div></section>
      <div class="bottom-rule" aria-hidden="true"></div>`,};
  },
};
