import {readFileSync} from 'node:fs';
import {z} from 'zod';
import {html} from '../../../../Layerfit-JMD-engine/src/shared/html.js';
import {idSchema,templateConfigSchema,type TemplateModule} from '../../../../Layerfit-JMD-engine/src/shared/render-contract.js';

const text=(max:number)=>z.string().trim().min(1).max(max).refine(v=>!/\p{Cc}/u.test(v),'control characters are not allowed');
const hex=z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const mediterraneanFashionPosterSchema=templateConfigSchema.safeExtend({
  templateId:z.literal('mediterranean-fashion-poster'),
  t18:z.object({
    headlineFactId:idSchema,
    headlineLines:z.array(text(40)).min(1).max(3),
    accentLineFactId:idSchema.optional(),
    badgeFactId:idSchema,
    badgeLines:z.array(text(24)).min(1).max(2),
    eventDateFactId:idSchema.optional(),
    eventTimeFactId:idSchema.optional(),
    imageAlt:text(120),
    imageMode:z.enum(['cover','contain']).default('cover'),
    texture:z.boolean().default(true),
    midColor:hex.default('#5F6B3A'),
    goldColor:hex.default('#BC8A2E'),
    onAccentColor:hex.default('#F6EFE0'),
  }).strict(),
}).superRefine((config,ctx)=>{
  const issue=(path:Array<string|number>,message:string)=>ctx.addIssue({code:'custom',path,message});
  if(config.assets.length!==1)issue(['assets'],'T18 requires exactly one fashion/lifestyle photo');
  if(!config.offerFactId)issue(['offerFactId'],'T18 price/address slot requires a verified fact ID');
  if(config.t18.headlineLines.join(' ')!==config.copy.headline)issue(['copy','headline'],'headline and explicit lines must agree');
  const crop=config.t18.imageMode==='cover';
  if(config.assets[0]&&config.assets[0].allowCrop!==crop)issue(['assets',0,'allowCrop'],'cover requires crop permission; contain must not enable crop');
  if(config.copy.benefits.length)issue(['copy','benefits'],'T18 uses fact-bound event slots, not generic benefit chips');
  if(config.copy.body!==undefined)issue(['copy','body'],'T18 does not support body copy');
  if(config.brand.logoAssetId!==undefined)issue(['brand','logoAssetId'],'T18 renders brand as a text wordmark');
  if(config.callouts?.length||config.proofFactId!==undefined||config.comparisonEvidenceId!==undefined)issue(['proofFactId'],'T18 does not support proof, callouts or comparison blocks');
});

const css=readFileSync(new URL('./mediterranean-fashion-poster.css',import.meta.url),'utf8');

export const templateModule:TemplateModule={
  id:'mediterranean-fashion-poster',version:'0.2.1',formats:['square','portrait','vertical'],
  rootClass:'lf-mediterranean-fashion-poster',configSchema:mediterraneanFashionPosterSchema,
  slots:[
    {name:'headline',required:true},{name:'accent-line',required:false},{name:'badge',required:true},
    {name:'photo',required:true},{name:'offer',required:true},{name:'brand',required:true},
    {name:'event-date',required:false},{name:'event-time',required:false},{name:'cta',required:true},
  ],
  render({config:raw,photos,facts}){
    const config=mediterraneanFashionPosterSchema.parse(raw);
    if(photos.length!==1||photos[0]?.assetId!==config.assets[0]?.assetId)throw new Error('T18 requires one matching photo');
    const fact=(id:string,field:string)=>{
      const f=facts.get(id);
      if(!f?.verified||f.id!==id)throw new Error(`T18 verified ${field} fact missing: ${id}`);
      return f.text;
    };
    const headline=fact(config.t18.headlineFactId,'headline');
    if(headline!==config.copy.headline)throw new Error('T18 headline must exactly match its verified fact');
    const badge=fact(config.t18.badgeFactId,'scarcity badge');
    if(config.t18.badgeLines.join(' ')!==badge)throw new Error('T18 badge lines must exactly match their verified fact');
    const offer=fact(config.offerFactId!,'price/offer');
    const accentLine=config.t18.accentLineFactId?fact(config.t18.accentLineFactId,'collection line'):undefined;
    const eventDate=config.t18.eventDateFactId?fact(config.t18.eventDateFactId,'event date'):undefined;
    const eventTime=config.t18.eventTimeFactId?fact(config.t18.eventTimeFactId,'event benefit'):undefined;
    const photo=photos[0]!;
    const image=config.t18.imageMode==='cover'
      ?html`<img class="t18-image" src="${photo.src}" alt="${config.t18.imageAlt}" data-image-fit="cover" data-allow-crop="true"/>`
      :html`<img class="t18-image" src="${photo.src}" alt="${config.t18.imageAlt}" data-image-fit="contain"/>`;
    const badgeLines=config.t18.badgeLines.map(line=>html`<span>${line}</span>`);
    const headlineLines=config.t18.headlineLines.map(line=>html`<span class="t18-headline-line">${line}</span>`);
    const style=`--t18-mid:${config.t18.midColor};--t18-gold:${config.t18.goldColor};--t18-on-accent:${config.t18.onAccentColor}`;
    const sprig=html`<svg class="t18-sprig" viewBox="0 0 64 26" aria-hidden="true"><path d="M2 20C20 8 42 6 62 14"/><ellipse cx="14" cy="14" rx="6.2" ry="2.3"/><ellipse cx="24" cy="10.5" rx="6.2" ry="2.3"/><ellipse cx="35" cy="8.6" rx="6.2" ry="2.3"/><ellipse cx="46" cy="8.6" rx="6.2" ry="2.3"/><ellipse cx="56" cy="10.8" rx="5.6" ry="2.1"/><ellipse cx="18" cy="17.5" rx="5.4" ry="2"/><ellipse cx="30" cy="14" rx="5.4" ry="2"/><ellipse cx="42" cy="12.4" rx="5.4" ry="2"/><circle cx="12" cy="8.5" r="2.6"/><circle cx="38" cy="16.5" r="2.6"/></svg>`;
    return {css,body:html`
      <div class="t18-content" data-texture="${config.t18.texture?'on':'off'}" style="${style}">
        <div class="t18-grain" aria-hidden="true"></div>
        <main class="t18-stage">
          <header class="t18-head">
            <h1 class="t18-headline" data-slot="headline" data-required="true" data-safe="true" data-fit-group="t18-headline" data-fit-min="0.72">${headlineLines}</h1>
            ${accentLine?html`<p class="t18-script" data-slot="accent-line" data-safe="true" data-fit-group="t18-script" data-fit-min="0.75">${sprig}<span>${accentLine}</span>${sprig}</p>`:''}
          </header>
          <div class="t18-hero">
            <div class="t18-arch-shadow" aria-hidden="true"></div><figure class="t18-arch-frame" data-slot="photo" data-required="true" data-safe="true">${image}</figure>
            <div class="t18-burst" data-slot="badge" data-required="true" data-safe="true" data-allow-overlap="photo">
              <div class="t18-burst-star"></div><div class="t18-burst-star t18-burst-ring"></div><div class="t18-burst-star t18-burst-inner"></div>
              <div class="t18-burst-text" data-fit-group="t18-badge" data-fit-min="0.75">${badgeLines}</div>
            </div>
          </div>
          <section class="t18-info">
            <p class="t18-address" data-slot="offer" data-required="true" data-safe="true" data-fit-group="t18-address" data-fit-min="0.8">${offer}</p>
            <div class="t18-eventrow">
              ${eventDate?html`<span class="t18-event-side t18-event-date" data-slot="event-date" data-safe="true" data-fit-group="t18-event" data-fit-min="0.75">${eventDate}</span>`:''}
              <span class="t18-brand" data-slot="brand" data-required="true" data-safe="true" data-fit-group="t18-brand" data-fit-min="0.7">${config.brand.name}</span>
              ${eventTime?html`<span class="t18-event-side t18-event-time" data-slot="event-time" data-safe="true" data-fit-group="t18-event" data-fit-min="0.75">${eventTime}</span>`:''}
            </div>
          </section>
        </main>
        <footer class="t18-cta"><span class="t18-cta-label" data-slot="cta" data-required="true" data-safe="true" data-fit-group="t18-cta" data-fit-min="0.8">${config.copy.cta}</span><svg class="t18-arrow" viewBox="0 0 24 14" aria-hidden="true"><path d="M1 7H21M15 1.5 21.5 7 15 12.5"/></svg></footer>
        <div class="t18-meander t18-meander--foot" aria-hidden="true"></div>
      </div>`,
    };
  },
};
