import {readFileSync} from 'node:fs';
import postcss from 'postcss';

/** Extract the supplied stylesheet, rather than reinterpret its composition.
 * Only scope, engine-owned canvas/font plumbing and IDs/format names are adapted. */
const source=readFileSync(new URL('../../../Template-example/t19/styles.css',import.meta.url),'utf8');
const root=postcss.parse(source);
root.walkRules(rule=>{
  if(rule.selectors.every(s=>['*','html','body'].includes(s.trim()))){rule.remove();return;}
  rule.selectors=rule.selectors.map(selector=>{
    let scoped=selector.replace(/\.creative/g,'.lf-after-dark-editorial').replace(/data-format="story"/g,'data-format="vertical"');
    scoped=scoped.replace(/#(eventDate|eventTime|venue|address)/g,'.$1');
    return scoped.startsWith('.lf-after-dark-editorial')?scoped:`.lf-after-dark-editorial ${scoped}`;
  });
});
root.walkDecls(decl=>{
  if(decl.prop==='font-family')decl.value=/Georgia|Times/.test(decl.value)?'var(--lf-font-body)':'var(--lf-font-heading)';
  if(decl.prop==='width'&&decl.value==='100vw')decl.value='100%';
  if(decl.prop==='height'&&decl.value==='100vh')decl.value='100%';
});
root.append(postcss.parse(`
.lf-after-dark-editorial { font-family:var(--lf-font-heading); --paper:var(--lf-brand-secondary); --ink:var(--lf-brand-primary); --accent:var(--lf-brand-accent); }
.lf-after-dark-editorial * { box-sizing:border-box; }
.lf-after-dark-editorial .brand-logo { max-width:280px; height:36px; object-fit:contain; display:block; }
.lf-after-dark-editorial .sticker span { white-space:normal; }
.lf-after-dark-editorial .photo-panel img[data-image-fit="contain"] { object-fit:contain; }
.lf-after-dark-editorial .heading h1 { width:fit-content; text-wrap:balance; }
.lf-after-dark-editorial .headline-lead { display:block; max-width:900px; text-wrap:balance; }
.lf-after-dark-editorial[data-format="square"] .headline-lead { max-width:760px; }
.lf-after-dark-editorial .heading p { width:fit-content; max-width:100%; }
.lf-after-dark-editorial .heading h1 em { display:block; margin-top:18px; letter-spacing:-3px; }
.lf-after-dark-editorial[data-format="square"] .heading h1 em { margin-top:14px; letter-spacing:-2.4px; }
.lf-after-dark-editorial[data-format="vertical"] .heading h1 em { margin-top:20px; letter-spacing:-3.5px; }
.lf-after-dark-editorial .venue { overflow-wrap:normal; }
`).nodes);
export const referenceCss=root.toString();
