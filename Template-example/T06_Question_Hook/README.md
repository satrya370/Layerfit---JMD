# LayerFit T06 — Question Hook

T06 adalah desain statis Meta Ads dengan *question-first headline*, kontras tipografi Dutch editorial, foto produk sebagai area utama, dan CTA. Ini merupakan template HTML/CSS/JS yang dapat dipakai ulang, **bukan AI image generation**. Konsepnya berbeda dari T05 Split Composition.

## Struktur
- `index.html` — canvas/template HTML
- `styles.css` — 3 layout art-directed: `square`, `portrait`, `story`
- `script.js` — `window.setCreative(input)` untuk data dinamis dan auto-fit headline
- `creative.example.json` — data simulasi (bukan klaim brand)
- `assets/demo-product.png` — foto contoh dari aset referensi yang diberikan user; ganti dengan foto asli produk sebelum penggunaan komersial
- `render.mjs` — export menggunakan Puppeteer
- `previews/` — hasil PNG 3 ukuran

## Render

```bash
npm install
npm run render
# satu ukuran:
node render.mjs --format=square
# data lain:
node render.mjs --input=/path/to/data.json --out=/path/to/output
```

Buka `index.html?format=square`, `?format=portrait`, atau `?format=story` untuk melihat layout di browser (canvas native 1080 px lebar).

Di Playwright/Puppeteer atau dashboard, panggil `await window.setCreative({...})`. `headline` boleh menggunakan `\\n` untuk baris baru dan `[[kata]]` untuk teks warna aksen. Field dinamis dipasang via text nodes, bukan `innerHTML`.

## Data & safety
- Foto, nama produk, claim/benefit harus berasal dari user.
- Template ini tidak memerlukan review, harga, atau diskon dan tidak mengarangnya.
- `features` opsional: [] menyembunyikan elemen fitur sepenuhnya; jika diisi, gunakan manfaat yang terverifikasi.
- Render sudah menggunakan fitur fallback jika foto kosong/tidak dapat dimuat.
- Verifikasi safe-area platform sebelum iklan dipublikasikan; kebutuhan placement Meta dapat berubah.

## Catatan
Status yang diuji di lingkungan ini: HTML/CSS/JS dirender menggunakan Chromium dengan output PNG square 1080×1080, portrait 1080×1350, story 1080×1920. Tidak termasuk dashboard atau AI integration.

## Verifikasi dalam sesi ini
Preview ketiga format telah dirender dan diperiksa menggunakan Playwright + Chromium. `render.mjs` disertakan sebagai jalur Puppeteer untuk integrasi pengguna, tetapi tidak dieksekusi dalam sesi ini karena paket npm Puppeteer belum terpasang di lingkungan tersebut. Jalankan `npm install` kemudian `npm run render` di lingkungan project.
