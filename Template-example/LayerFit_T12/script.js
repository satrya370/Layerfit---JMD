(() => {
  const $ = (id) => document.getElementById(id);
  const root = $('creative');
  const defaults = {
    format: 'square',
    eyebrow: 'NEW FROM MOUNTAIN',
    headline: 'Know exactly what\nyou’re getting into.',
    description: 'Our new grading system triple-checks every route using first ascent reports, local consensus, and verified tick data.',
    heroImageUrl: 'assets/reference-hero.jpg',
    imageAlt: 'Mountain landscape with smartphone product interface',
    colors: { panel: '#eca16f', ink: '#1b1b1b', badgeBg: '#0e0e0e', badgeInk: '#eea47b' }
  };
  const imageAllowed = (src) => /^(https?:\/\/|data:image\/(?:png|jpg|jpeg|webp);base64,|blob:|\.\.?\/|\/|assets\/)/i.test(String(src || '').trim());
  const colorAllowed = (value) => typeof value === 'string' && /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\))$/i.test(value.trim());
  const cssNames = { panel: '--panel', ink: '--ink', badgeBg: '--badge-bg', badgeInk: '--badge-ink' };
  window.setCreative = async (data = {}) => {
    const d = { ...defaults, ...data, colors: { ...defaults.colors, ...(data.colors || {}) } };
    if (!['square', 'portrait', 'story'].includes(d.format)) throw new Error('Unsupported format: ' + d.format);
    root.dataset.format = d.format;
    document.documentElement.lang = d.locale || 'en';
    $('eyebrow').textContent = String(d.eyebrow || '');
    $('eyebrow').hidden = !d.eyebrow;
    $('headline').textContent = String(d.headline || '');
    $('description').textContent = String(d.description || '');
    $('description').hidden = !d.description;
    for (const [name, value] of Object.entries(d.colors)) {
      if (cssNames[name] && colorAllowed(value)) root.style.setProperty(cssNames[name], value);
    }
    const hero = $('heroImage');
    if (imageAllowed(d.heroImageUrl)) hero.src = String(d.heroImageUrl);
    hero.alt = String(d.imageAlt || 'Hero image');
    await document.fonts.ready;
    if (!hero.complete) await new Promise((resolve) => {
      hero.addEventListener('load', resolve, { once: true });
      hero.addEventListener('error', resolve, { once: true });
      setTimeout(resolve, 5000);
    });
    root.dataset.compact = ($('headline').textContent.length > 74) ? 'true' : 'false';
    return { ok: hero.naturalWidth > 0, format: d.format };
  };
  window.__creativeReady = window.setCreative({ format: new URLSearchParams(location.search).get('format') || 'square' });
})();
