/* ============================================================
   LAYERFIT TEMPLATE T05 — QUESTION HOOK — dynamic content
   ------------------------------------------------------------
   API publik: window.setCreative(data)

   data = {
     brand?,       "SONIQ"
     logoUrl?,     "assets/soniq-logo.svg"   (null -> logo disembunyikan)
     headline?,    "Klaar met kabels?"       (kata terakhir jadi aksen)
     description?, string | null
     cta?,         "Shop nu"                 (null -> tombol disembunyikan)
     imageUrl?,    "assets/headphone.png"    (null -> hero disembunyikan)
     imageAlt?,    string
     imageMode?,   "contain" (PNG transparan) | "cover" (foto biasa)
     features?,    string[]                  (>3 -> pakai 3 pertama)
     colors?,      { bg, surface, accent, text, muted, onAccent }
     format?       "square" | "portrait" | "story"
   }

   Keamanan: SEMUA teks di-set via textContent / attribute aman —
   tidak ada innerHTML dengan data eksternal. Elemen tanpa data
   disembunyikan, bukan diisi placeholder palsu.
   ============================================================ */

(function () {
  'use strict';

  var DEFAULT_COLORS = {
    bg: '#16181d',
    surface: '#1e2129',
    accent: '#c8f135',
    text: '#ffffff',
    muted: '#a6acb8',
    onAccent: '#16181d'
  };

  var FORMATS = ['square', 'portrait', 'story'];

  /* ---------- helper ---------- */

  function $(id) { return document.getElementById(id); }

  /** Set teks; sembunyikan elemen bila teks kosong. */
  function setText(el, value) {
    if (!el) return;
    var text = typeof value === 'string' ? value.trim() : '';
    if (text) {
      el.textContent = text;
      el.hidden = false;
    } else {
      el.textContent = '';
      el.hidden = true;
    }
  }

  /** Terapkan warna brand ke CSS variables pada root .ad. */
  function applyColors(ad, colors) {
    var c = colors && typeof colors === 'object' ? colors : {};
    Object.keys(DEFAULT_COLORS).forEach(function (key) {
      if (typeof c[key] === 'string' && c[key].trim()) {
        ad.style.setProperty('--c-' + kebab(key), c[key].trim());
      } else {
        ad.style.removeProperty('--c-' + kebab(key));
      }
    });
  }

  function kebab(camel) {
    return camel.replace(/[A-Z]/g, function (m) { return '-' + m.toLowerCase(); });
  }

  /** Panjang headline menentukan kelas skala tipografi. */
  function headlineScale(text) {
    var n = (text || '').trim().length;
    if (n === 0) return 'xl';
    if (n <= 16) return 'xl';
    if (n <= 26) return 'lg';
    return 'md';
  }

  /**
   * Bagi headline: kata terakhir menjadi aksen lime pada baris
   * tersendiri; sisanya jadi baris utama (bisa wrap beberapa baris).
   * "Klaar met kabels?" -> ["Klaar met", "kabels?"]
   */
  function splitHeadline(text) {
    var t = (text || '').trim().replace(/\s+/g, ' ');
    if (!t) return { main: '', accent: '' };
    var idx = t.lastIndexOf(' ');
    if (idx === -1) return { main: '', accent: t };
    return { main: t.slice(0, idx), accent: t.slice(idx + 1) };
  }

  /** Muat gambar; resolve "ok"|"error" (timeout 12 dtk). */
  function loadImage(img, url) {
    return new Promise(function (resolve) {
      if (!url) { resolve('empty'); return; }
      var settled = false;
      var timer = setTimeout(function () {
        if (!settled) { settled = true; resolve('error'); }
      }, 12000);
      img.onload = function () {
        if (settled) return; settled = true;
        clearTimeout(timer); resolve('ok');
      };
      img.onerror = function () {
        if (settled) return; settled = true;
        clearTimeout(timer); resolve('error');
      };
      img.src = url;
    });
  }

  /* ---------- API publik ---------- */

  /**
   * Terapkan satu creative ke template.
   * Mengembalikan Promise; render.mjs menunggu window.__layerfit.ready.
   */
  window.setCreative = function (data) {
    window.__layerfit = { ready: false };

    var d = data || {};
    var ad = $('ad');

    /* --- format kanvas --- */
    var format = FORMATS.indexOf(d.format) !== -1 ? d.format : 'square';
    ad.dataset.format = format;

    /* --- warna --- */
    applyColors(ad, d.colors);

    /* --- baris merek --- */
    var brand = typeof d.brand === 'string' ? d.brand.trim() : '';
    var logo = $('brandLogo');
    var hasLogo = false;
    if (logo) {
      if (typeof d.logoUrl === 'string' && d.logoUrl.trim()) {
        logo.src = d.logoUrl.trim();
        logo.hidden = false;
        hasLogo = true;
      } else {
        logo.removeAttribute('src');
        logo.hidden = true;
      }
    }
    setText($('brandName'), brand);
    var brandbar = $('brandbar');
    if (brandbar) brandbar.hidden = !brand && !hasLogo;

    /* --- headline (pertanyaan) --- */
    var parts = splitHeadline(d.headline);
    setText($('qMain'), parts.main);
    setText($('qAccent'), parts.accent);
    var question = $('question');
    if (question) question.hidden = !parts.main && !parts.accent;
    ad.dataset.headline = headlineScale(d.headline);

    /* --- produk --- */
    var hero = $('hero');
    var img = $('productImg');
    ad.dataset.imageMode = d.imageMode === 'cover' ? 'cover' : 'contain';

    /* --- deskripsi --- */
    setText($('description'), d.description);

    /* --- fitur (maks. 3) --- */
    var list = $('features');
    var items = Array.isArray(d.features)
      ? d.features.filter(function (f) { return typeof f === 'string' && f.trim(); }).slice(0, 3)
      : [];
    if (list) {
      list.hidden = items.length === 0;
      var template = list.querySelector('.feature');
      // bersihkan daftar lalu bangun ulang dari satu <li> acuan
      var iconSvg = template.querySelector('.feature__icon');
      var iconClone = iconSvg ? iconSvg.cloneNode(true) : null;
      list.textContent = '';
      items.forEach(function (text) {
        var li = document.createElement('li');
        li.className = 'feature';
        if (iconClone) li.appendChild(iconClone.cloneNode(true));
        var span = document.createElement('span');
        span.className = 'feature__text';
        span.textContent = text.trim();
        li.appendChild(span);
        list.appendChild(li);
      });
    }

    /* --- CTA --- */
    var cta = $('cta');
    var ctaLabel = $('ctaLabel');
    var ctaText = typeof d.cta === 'string' ? d.cta.trim() : '';
    if (ctaLabel) ctaLabel.textContent = ctaText;
    if (cta) cta.hidden = !ctaText;

    /* --- muat gambar produk, lalu tandai siap-render --- */
    return loadImage(img, typeof d.imageUrl === 'string' ? d.imageUrl.trim() : '')
      .then(function (status) {
        if (img) {
          img.alt = typeof d.imageAlt === 'string' ? d.imageAlt : '';
          if (status === 'ok') {
            img.hidden = false;
          } else {
            // tanpa foto: sembunyikan slot produk (jangan pakai placeholder)
            img.removeAttribute('src');
            img.hidden = true;
          }
        }
        if (hero) hero.hidden = status !== 'ok';

        return document.fonts.ready.then(function () {
          window.__layerfit.ready = true;
          return { imageStatus: status, format: format };
        });
      });
  };
})();
