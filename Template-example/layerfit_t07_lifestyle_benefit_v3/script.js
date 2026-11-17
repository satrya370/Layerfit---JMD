(() => {
  const $ = id => document.getElementById(id);
  const root=$('creative'), photo=$('product-photo'), logo=$('brand-logo');
  const formats=['square','portrait','story'];
  const rgb=/^#[0-9a-f]{6}$/i;
  function load(img) {
    if(img.hidden || !img.getAttribute('src')) return Promise.resolve();
    if(img.complete) return img.naturalWidth ? Promise.resolve() : Promise.reject(new Error('Image load failed: '+img.src));
    return new Promise((resolve,reject)=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',()=>reject(new Error('Image load failed: '+img.src)),{once:true});});
  }
  function fitHeadline(){
    const el=$('headline'), top=document.querySelector('.opening'), limits={square:[75,46],portrait:[83,49],story:[100,60]};
    const [max,min]=limits[root.dataset.format];
    for(let px=max;px>=min;px-=2){
      el.style.fontSize=px+'px';
      const b=el.getBoundingClientRect(), c=top.getBoundingClientRect(), d=$('description').getBoundingClientRect();
      if(b.right<=c.right+1 && b.bottom<=c.bottom-7 && (root.dataset.format!=='story'||b.bottom<=d.top-5)) return true;
    }
    return false;
  }
  window.setCreative=async function(data={}){
    root.dataset.format=formats.includes(data.format)?data.format:'square';
    for(const [key,id] of [['brand','brand-name'],['kicker','kicker'],['eyebrow','eyebrow'],['description','description'],['cta','cta'],['photoCaption','photo-caption'],['productLabel','product-label']]) if(typeof data[key]==='string') $(id).textContent=data[key];
    if(typeof data.headline==='string'){
      const h=$('headline');h.replaceChildren();
      const lines=data.headline.split('\n').slice(0,3);
      lines.forEach((line,i)=>{if(i) h.appendChild(document.createElement('br'));h.appendChild(document.createTextNode(line));});
    }
    if(Array.isArray(data.features)){
      const list=$('benefit-list');list.replaceChildren();
      data.features.slice(0,3).filter(x=>typeof x==='string' && x.trim()).forEach(v=>{
        const item=document.createElement('span');item.className='benefit';const dot=document.createElement('span');dot.className='bullet';const txt=document.createElement('span');txt.textContent=v;item.append(dot,txt);list.append(item);
      });
      list.hidden=!list.children.length;
    }
    if(typeof data.imageUrl==='string' && data.imageUrl) photo.src=data.imageUrl;
    if(typeof data.imageAlt==='string') photo.alt=data.imageAlt;
    if(typeof data.logoUrl==='string' && data.logoUrl){logo.src=data.logoUrl;logo.hidden=false;$('brand-name').hidden=true;}else{logo.hidden=true;$('brand-name').hidden=false;}
    if(data.colors && typeof data.colors==='object') for(const [key,val] of Object.entries(data.colors)) if(['paper','ink','accent'].includes(key)&&rgb.test(val))root.style.setProperty('--'+key,val);
    if(typeof data.imagePosition==='string' && /^(?:\d{1,3}%\s+\d{1,3}%)$/.test(data.imagePosition))root.style.setProperty('--photo-position',data.imagePosition);
    await Promise.all([load(photo),load(logo)]);await document.fonts.ready;
    await new Promise(requestAnimationFrame);
    return {ok:fitHeadline(),format:root.dataset.format};
  };
  window.setCreative({format:new URLSearchParams(location.search).get('format')||'square'});
})();
