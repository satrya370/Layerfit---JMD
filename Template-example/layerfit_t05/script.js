/* T05 configurable creative template. Only render verified product data. */
(function () {
  const FORMATS = { square: 'square', portrait: 'portrait', story: 'story' };
  const defaults = {
    brand: 'LAYERFIT',
    eyebrow: 'PRODUCT SPOTLIGHT · 05/15',
    overline: 'ONTDEK DE COLLECTIE',
    headline: 'ONTDEK\n[[PRODUCT A.]]',
    description: 'Bekijk het product, ontdek de details en vind wat bij jou past.',
    benefits: [],
    cta: 'BEKIJK PRODUCT',
    footerNote: 'JOUW PRODUCT. JOUW VERHAAL.',
    visualLabel: 'GEMAAKT OM TE ONTDEKKEN',
    floatingPill: 'BEKIJK DE DETAILS',
    brandSubline: 'LAYERFIT / CREATIVE STUDIO',
    imageUrl: window.T05_DEFAULT_IMAGE || './assets/demo-product.png',
    imageAlt: 'Demonstration product photograph',
    format: 'square',
    colors: { ink:'#182820', panel:'#173028', photoBg:'#e9e8e0', accent:'#d5f86a' }
  };
  const $ = (id) => document.getElementById(id);
  const text = (id, value) => { $(id).textContent = String(value ?? ''); };
  const plainText = (v) => String(v ?? '').replace(/<[^>]*>/g, '');

  function applyHeadline(raw) {
    const el = $('headline');
    el.replaceChildren();
    // [[...]] marks highlighted words; newline becomes a literal <br>.
    // Content always uses text nodes (never untrusted HTML).
    const parts = plainText(raw).split(/(\[\[[\s\S]*?\]\]|\n)/g);
    parts.forEach((part) => {
      if (!part) return;
      if (part === '\n') el.append(document.createElement('br'));
      else if (part.startsWith('[[') && part.endsWith(']]')) {
        const em = document.createElement('em'); em.textContent = part.slice(2,-2); el.append(em);
      } else el.append(document.createTextNode(part));
    });
  }

  function fitHeadline() {
    const h = $('headline');
    const maxSize = document.getElementById('creative').classList.contains('creative--story') ? 100 : document.getElementById('creative').classList.contains('creative--portrait') ? 78 : 68;
    h.style.fontSize = maxSize + 'px';
    const area = document.querySelector('.copy-area');
    // Reduce headline only when the whole copy block cannot fit.
    for (let px = maxSize; px >= 49; px -= 2) {
      h.style.fontSize = px + 'px';
      if (area.scrollHeight <= area.clientHeight + 2 && h.scrollWidth <= h.clientWidth + 2) break;
    }
  }

  window.setCreative = function setCreative(input = {}) {
    const cfg = { ...defaults, ...input, colors: { ...defaults.colors, ...(input.colors || {}) } };
    const format = FORMATS[cfg.format] || 'square';
    $('creative').className = 'creative creative--' + format;
    document.documentElement.style.setProperty('--ink', cfg.colors.ink);
    document.documentElement.style.setProperty('--panel', cfg.colors.panel);
    document.documentElement.style.setProperty('--photo-bg', cfg.colors.photoBg);
    document.documentElement.style.setProperty('--acid', cfg.colors.accent);
    text('brand', cfg.brand);
    text('eyebrow', cfg.eyebrow);
    text('overline', cfg.overline);
    applyHeadline(cfg.headline);
    text('description', cfg.description);
    text('cta-text', cfg.cta);
    text('footer-note', cfg.footerNote);
    text('visual-label', cfg.visualLabel);
    text('floating-pill', cfg.floatingPill);
    text('brand-subline', cfg.brandSubline);
    const img = $('product-image');
    img.src = cfg.imageUrl;
    img.alt = cfg.imageAlt;
    img.onerror = () => { img.classList.add('image-unavailable'); img.alt = 'Product photo unavailable — please provide a valid image'; };
    img.onload = () => img.classList.remove('image-unavailable');
    const benefitList = $('benefit-list');
    benefitList.replaceChildren();
    (Array.isArray(cfg.benefits) ? cfg.benefits : []).slice(0,3).forEach((item) => {
      const node = document.createElement('span');
      node.className = 'benefit'; node.textContent = plainText(item); benefitList.append(node);
    });
    requestAnimationFrame(fitHeadline);
    return cfg;
  };
  const query = new URLSearchParams(location.search);
  window.setCreative({ format: query.get('format') || 'square' });
  window.addEventListener('load', () => { document.fonts.ready.then(fitHeadline); });
})();
