# LayerFit Template T05 — Question Hook

Template iklan statis Meta Ads untuk pasar **Belanda (nl-NL)** dengan konsep
**Question Hook**: pertanyaan provokatif besar di atas, produk sebagai jawaban,
CTA tegas di bawah. Ditulis ulang 100% dengan HTML/CSS murni.

## Ukuran yang didukung

| Format  | Piksel      | Catatan komposisi |
|---------|-------------|-------------------|
| square  | 1080 × 1080 | Susunan vertikal padat, ring aksen di sekitar produk |
| portrait| 1080 × 1350 | Ruang lebih lega, produk & tipografi lebih besar |
| story   | 1080 × 1920 | Safe zone Meta: konten penting berhenti sebelum y=1580; zona atas (±250 px) dan bawah (±340 px) hanya berisi dekorasi |

Ketiga format adalah **komposisi yang disesuaikan** (tipografi, ukuran hero,
arah fitur, dekorasi) — bukan sekadar resize.

## Struktur file

```
index.html               markup + konten fallback statis (demo)
styles.css               semua styling + token warna (CSS variables)
script.js                window.setCreative(data) — injeksi konten dinamis
creative.example.json    data demo utama (SONIQ, headphone, charcoal+lime)
creative.example-alt.json data uji kedua (TONI HOMI, vacuum, navy+coral)
render.mjs               ekspor PNG via Puppeteer (3 ukuran)
assets/                  logo demo + foto produk demo
previews/                hasil render PNG (square, portrait, story)
package.json             dependensi: puppeteer-core
```

## Menjalankan

```bash
npm install            # memasang puppeteer-core (ringan, tanpa unduhan browser)

# render 3 ukuran dari data contoh -> previews/
node render.mjs

# render dengan data lain / folder lain
node render.mjs --data creative.example-alt.json --out /tmp/test
node render.mjs --formats square,story
```

`render.mjs` memakai paket `puppeteer` bila terpasang (Chromium bawaannya);
jika hanya ada `puppeteer-core`, script mendeteksi Chrome/Chromium sistem —
termasuk cache Playwright (`~/.cache/ms-playwright/...`). Bisa juga diarahkan
manual: `CHROME_PATH=/path/ke/chrome node render.mjs`.

Pipeline mengikuti kebiasaan `IG-Content-Builder` (goto file://, injeksi data,
tunggu `document.fonts.ready`, screenshot `clip` persis ukuran viewport,
`deviceScaleFactor: 1`).

## API konten dinamis — `window.setCreative(data)`

```js
window.setCreative({
  brand: "SONIQ",                        // nama merek (opsional)
  logoUrl: "assets/soniq-logo.svg",      // null -> logo disembunyikan
  headline: "Klaar met kabels?",         // kata TERAKHIR otomatis jadi aksen
  description: "…",                      // maks 3 baris (clamp)
  cta: "Shop nu",                        // null -> tombol disembunyikan
  imageUrl: "assets/headphone.png",      // null -> slot produk disembunyikan
  imageAlt: "…",
  imageMode: "contain",                  // "contain" PNG transparan | "cover" foto biasa
  features: ["…", "…", "…"],             // maks 3 pil, sisanya diabaikan
  colors: {                              // semua opsional, ada default
    bg: "#16181D", surface: "#1E2129", accent: "#C8F135",
    text: "#FFFFFF", muted: "#A6ACB8", onAccent: "#16181D"
  },
  format: "square"                       // "square" | "portrait" | "story"
});
```

Perilaku penting:

- Semua teks di-set melalui **`textContent`** (atau atribut aman seperti
  `src`/`alt`) — tidak ada `innerHTML`, sehingga konten AI/eksternal tidak
  bisa menyuntik markup.
- Data yang tidak tersedia **menyembunyikan elemennya** (brand bar, logo,
  deskripsi, fitur, CTA, foto) — tidak ada placeholder yang tampak seperti
  fakta produk.
- Ukuran font headline menyesuaikan panjang teks otomatis
  (≤16 karakter = XL, ≤26 = LG, sisanya MD).
- `imageMode`:
  - `"contain"` — untuk PNG transparan: produk melayang di dalam **ring**
    aksen dengan drop-shadow;
  - `"cover"` — untuk foto biasa: foto di-mask lingkaran dengan bingkai
    aksen (ring otomatis disembunyikan).
- Template tidak mengarang harga, diskon, rating, review, atau klaim apa pun
  yang tidak ada di data. Contoh di `creative.example*.json` adalah data demo
  fiktif untuk keperluan peragaan.

## Integrasi ke LayerFit

1. Muat `index.html` di Puppeteer/iframe.
2. Panggil `window.setCreative(data)` dengan output copywriting AI.
3. Tunggu `window.__layerfit.ready === true` (fonts + gambar selesai).
4. Screenshot `clip` sesuai ukuran format.

## Uji reusability

Sudah diuji dengan dua dataset berbeda:

- `creative.example.json` — headphone (PNG transparan, mode `contain`,
  palet charcoal + lime);
- `creative.example-alt.json` — robot vacuum (foto biasa, mode `cover`,
  palet navy + coral, tanpa logo) untuk membuktikan fallback elemen merek
  dan fleksibilitas warna/kategori produk.

```bash
node render.mjs --data creative.example-alt.json --out /tmp/alt-test
```
