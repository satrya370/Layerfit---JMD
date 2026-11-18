import {readFileSync} from 'node:fs';
import postcss from 'postcss';

/** Faithful extraction of the user-supplied T20 v2 geometry. No invented border/UI. */
const source=readFileSync(new URL('../../../Template-example/LayerFit_T20_Symmetric_v2/styles.css',import.meta.url),'utf8');
const root=postcss.parse(source);
root.walkRules(rule=>{
  if(rule.selectors.every(s=>['*','html','body'].includes(s.trim()))){rule.remove();return;}
  rule.selectors=rule.selectors.map(selector=>{
    const scoped=selector.replace(/\.creative/g,'.lf-circular-product-benefits').replace(/data-format="story"/g,'data-format="vertical"');
    return scoped.startsWith('.lf-circular-product-benefits')?scoped:`.lf-circular-product-benefits ${scoped}`;
  });
});
root.walkDecls(d=>{
  if(d.prop==='width'&&d.value==='100vw')d.value='100%';
  if(d.prop==='height'&&d.value==='100vh')d.value='100%';
  if(d.prop==='--brand-font')d.value='var(--lf-font-heading)';
  if(d.prop==='--bg')d.value='var(--lf-brand-primary)';
  if(d.prop==='--bg2')d.value='var(--lf-brand-secondary)';
  if(d.prop==='--title')d.value='var(--lf-brand-accent)';
  if(d.prop==='--sub')d.value='#373a36';
  if(d.prop==='--ring')d.value='#b8b4a9';
  if(d.prop==='--accent')d.value='#ece7dc';
  // Neutralize the source's rose-tinted shadows as well as its background.
  d.value=d.value.replace(/rgba\((?:104,38,51|97,\s*38,\s*45|94,32,38|91,30,40),/g,'rgba(0,0,0,');
  if(d.prop==='font-size'&&d.parent?.type==='rule'){
    const selector=(d.parent as postcss.Rule).selector;
    const group=/benefit__/.test(selector)?'t20-benefit':/\.brand$/.test(selector)?'t20-brand':/product-type/.test(selector)?'t20-headline':undefined;
    if(group)d.value=`calc(${d.value} * var(--lf-fit-${group},1))`;
  }
});
root.append(postcss.parse(`
.lf-circular-product-benefits { font-family:var(--lf-font-body); }
.lf-circular-product-benefits * { box-sizing:border-box; margin:0; padding:0; }
.lf-circular-product-benefits .brand-logo { display:block; width:auto; max-width:320px; height:85px; object-fit:contain; }
.lf-circular-product-benefits[data-format="portrait"] .brand-logo { height:93px; }
.lf-circular-product-benefits[data-format="vertical"] .brand-logo { height:109px; }
.lf-circular-product-benefits .product-type { max-width:900px; text-align:center; text-wrap:balance; }
.lf-circular-product-benefits .eyebrow { font-size:14px; line-height:1.3; letter-spacing:.12em; color:var(--sub); text-transform:uppercase; }
.lf-circular-product-benefits .benefit__title { white-space:normal; }
.lf-circular-product-benefits .benefit__subtitle { display:block; }
.lf-circular-product-benefits .t20-cta { position:absolute; z-index:8; left:50%; bottom:36px; transform:translateX(-50%); max-width:900px; color:var(--sub); text-align:center; font-family:var(--lf-font-body); font-size:calc(19px * var(--lf-fit-t20-cta,1)); font-weight:700; line-height:1.3; letter-spacing:.08em; }
.lf-circular-product-benefits[data-format="portrait"] .t20-cta { bottom:60px; }
.lf-circular-product-benefits[data-format="vertical"] .t20-cta { bottom:240px; font-size:calc(22px * var(--lf-fit-t20-cta,1)); }
`).nodes);
export const circularProductBenefitsCss=root.toString();
