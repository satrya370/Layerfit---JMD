(() => {
  const $ = (id) => document.getElementById(id);
  const root = $('creative');
  const slotsByCount = {
    1: ['top'],
    2: ['mid-left','mid-right'],
    3: ['top','mid-left','mid-right'],
    4: ['top','mid-left','mid-right','bottom-center'],
    5: ['top','mid-left','mid-right','bottom-left','bottom-right']
  };
  const defaultBenefits = [
    { title:'Removes hair', subtitle:'From roots' },
    { title:'Slows down', subtitle:'Hair regrowth' },
    { title:'Soothes skin', subtitle:'After waxing' },
    { title:'Helps reduce', subtitle:'Ingrown bumps' },
    { title:'Leaves skin soft', subtitle:'And smooth' }
  ];
  const defaults = {
    brand: 'Waxli',
    topline: 'Soft Hair Removal Wax',
    imageUrl: 'assets/waxli-demo-cutout.png',
    imageAlt: 'Waxli product photograph',
    benefits: defaultBenefits,
    format: 'square',
    colors: { bg:'#e65b62', bg2:'#fa7b71', title:'#fff7eb', sub:'#532738', ring:'#ffddcc', accent:'#fff1bc' }
  };
  function validImageSrc(value) {
    return typeof value === 'string' && /^(https?:\/\/|data:image\/(png|jpe?g|webp|svg\+xml);base64,|blob:|\.\.?\/|\/)/i.test(value.trim());
  }
  function validColor(value) {
    return typeof value === 'string' && /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\))$/i.test(value.trim());
  }
  window.setCreative = async (input = {}) => {
    const data = { ...defaults, ...input, colors:{ ...defaults.colors,...(input.colors || {}) } };
    if (!['square','portrait','story'].includes(data.format)) throw new Error('Unsupported format');
    root.dataset.format = data.format;
    $('brand').textContent = String(data.brand || '');
    $('topline').textContent = String(data.topline || '').toUpperCase();
    $('topline').hidden = !data.topline;
    const allowedColors = ['bg','bg2','title','sub','ring','accent'];
    for (const [key,value] of Object.entries(data.colors)) {
      if (allowedColors.includes(key) && validColor(value)) root.style.setProperty(`--${key}`,value);
    }
    if (typeof data.fontFamily === 'string' && /^[\w ,'-]{1,90}$/.test(data.fontFamily)) {
      root.style.setProperty('--brand-font',data.fontFamily);
    }
    const img = $('productImage');
    if (validImageSrc(data.imageUrl)) img.src = data.imageUrl;
    img.alt = String(data.imageAlt || data.brand || 'Product image');
    const values = Array.isArray(data.benefits) ? data.benefits.slice(0,5).map(value => {
      if (typeof value === 'string') return {title:value,subtitle:''};
      return {title:String(value?.title || ''),subtitle:String(value?.subtitle || '')};
    }).filter(item => item.title || item.subtitle) : [];
    const target = $('benefits'); target.replaceChildren();
    const slots = slotsByCount[values.length] || [];
    values.forEach((b,i) => {
      const el = document.createElement('div'); el.className = `benefit benefit--${slots[i]}`;
      if (b.title) { const t = document.createElement('strong'); t.className = 'benefit__title'; t.textContent = b.title; el.appendChild(t); }
      if (b.subtitle) { const s = document.createElement('span'); s.className = 'benefit__subtitle'; s.textContent = b.subtitle; el.appendChild(s); }
      target.appendChild(el);
    });
    await document.fonts.ready;
    if (!img.complete) await new Promise(resolve => {
      const finish = () => resolve();
      img.addEventListener('load',finish,{once:true}); img.addEventListener('error',finish,{once:true});
      setTimeout(finish,3500);
    });
    return {ok:img.naturalWidth>0 && values.length>0, format:data.format, benefitCount:values.length, imageLoaded:img.naturalWidth>0};
  };
  const urlFormat = new URLSearchParams(location.search).get('format');
  window.__creativeReady = window.setCreative({format:['square','portrait','story'].includes(urlFormat) ? urlFormat : 'square'});
})();
