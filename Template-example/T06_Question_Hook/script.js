/* Reusable LayerFit T06 Question Hook template. Dynamic content is inserted as text nodes. */
(() => {
  const defaults = {
    format: 'square',
    brand: 'LAYERFIT', brandRight: 'PRODUCT IN BEELD', logoUrl: '',
    eyebrow: 'EVEN EEN VRAAGJE',
    headline: 'OP ZOEK NAAR\n[[IETS DAT PAST?]]',
    description: 'Maak kennis met Product A. Bekijk het product en ontdek de details.',
    photoCaption: 'MAAK KENNIS MET PRODUCT A',
    cta: 'BEKIJK PRODUCT',
    footerNote: 'ONTDEK MEER OVER HET PRODUCT',
    imageUrl: window.T06_DEFAULT_IMAGE || './assets/demo-product.png',
    imageAlt: 'Demo product photograph',
    features: [],
    colors: {paper:'#f5f0e7',ink:'#1c3129',accent:'#ef6744',photoBg:'#e9e7df'}
  };
  const el = id => document.getElementById(id);
  function setText(id, value) { el(id).textContent = String(value ?? ''); }
  function setHeadline(value) {
    const heading = el('headline'); heading.replaceChildren();
    for (const part of String(value ?? '').split(/(\[\[[\s\S]*?\]\]|\n)/g)) {
      if (!part) continue;
      if (part === '\n') heading.append(document.createElement('br'));
      else if (part.startsWith('[[') && part.endsWith(']]')) {
        const accent = document.createElement('em'); accent.textContent=part.slice(2,-2); heading.append(accent);
      } else heading.append(document.createTextNode(part));
    }
  }
  function fitCopy() {
    const container = el('creative');
    const heading=el('headline');
    const limits={square:87,portrait:102,story:120};
    const mode=container.className.match(/creative--(\w+)/)?.[1] || 'square';
    const max=limits[mode], min=mode==='story'?70:54;
    for (let px=max; px>=min;px-=2) {
      heading.style.fontSize=px+'px';
      if (heading.scrollWidth <= heading.clientWidth + 1 && document.querySelector('.hero-copy').scrollHeight <= document.querySelector('.hero-copy').clientHeight + 1) return;
    }
    heading.style.fontSize=min+'px';
  }
  window.setCreative = async (input={}) => {
    const config={...defaults,...input, colors:{...defaults.colors,...(input.colors||{})}};
    const format=['square','portrait','story'].includes(config.format)?config.format:'square';
    el('creative').className='creative creative--'+format;
    for(const key of ['paper','ink','accent','photoBg']) {
      const cssVar={photoBg:'photo-bg'}[key] || key;
      document.documentElement.style.setProperty('--'+cssVar, config.colors[key]);
    }
    for(const [key,id] of Object.entries({brand:'brand',brandRight:'brand-right',eyebrow:'eyebrow',description:'description',photoCaption:'photo-caption',cta:'cta',footerNote:'footer-note'}))setText(id,config[key]);
    setHeadline(config.headline);
    const logo=el('brand-logo');
    logo.hidden=!config.logoUrl;
    el('brand').hidden=!!config.logoUrl;
    if (config.logoUrl) { logo.src=String(config.logoUrl); logo.alt=`${config.brand} logo`; logo.onerror=()=>{logo.hidden=true;el('brand').hidden=false;}; }
    const featureBox=el('features');featureBox.replaceChildren();
    const features=Array.isArray(config.features)?config.features.filter(x=>String(x).trim()).slice(0,2):[];
    featureBox.hidden=features.length===0;
    for(const f of features){const pill=document.createElement('span');pill.textContent=String(f);featureBox.append(pill);}
    const img=el('product-image');
    el('image-guard').hidden=true; img.hidden=false; img.alt=config.imageAlt;
    img.src=config.imageUrl || '';
    await new Promise((resolve)=>{ if(!img.src){img.hidden=true;el('image-guard').hidden=false;return resolve();} if(img.complete){if(!img.naturalWidth){img.hidden=true;el('image-guard').hidden=false;}return resolve();} img.onload=resolve; img.onerror=()=>{img.hidden=true;el('image-guard').hidden=false;resolve();}; });
    await document.fonts.ready;
    fitCopy();
    window.__T06_READY__=true;
    return config;
  };
  const query=new URLSearchParams(window.location.search);
  window.setCreative({format:query.get('format')||'square'});
})();
