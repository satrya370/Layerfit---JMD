# LayerFit T12 — Immersive Product / Editorial Copy (Reference Conversion)

Konversi HTML/CSS dari referensi terlampir. Struktur yang dipertahankan:
- Bagian visual besar di atas (sekitar 66% untuk 1:1).
- Badge kecil di tengah atas, dibuat sebagai teks HTML.
- Panel warna peach di bawah.
- Headline serif tebal dan paragraf pendukung, keduanya editable.
- Tanpa tombol CTA, footer website, atau komponen dashboard.

## Penting tentang aset
Untuk mendapatkan kemiripan sangat dekat, gambar gunung dan mockup ponsel dijadikan **satu aset komposit** `assets/reference-hero.jpg` yang dipotong dari screenshot referensi milik pengguna. Teks bagian bawah dan badge bukan bagian dari gambar hero; keduanya HTML dinamis.

Template ini menerima `heroImageUrl` sebagai **satu aset hero**. Jika ingin gambar produk dan background diganti secara independen, buat/siapkan kedua aset terpisah dan adaptasikan lapisan gambar; screenshot saja tidak menyediakan latar gunung bersih di balik mockup ponsel.

## Cara menggunakan
- Buka `index.html` melalui static server atau `render.mjs`.
- Isi data via `window.setCreative(data)` dengan `headline`, `description`, `eyebrow`, `heroImageUrl`, `colors`, dan `format`.
- Jalankan `npm install && npm run render` untuk membuat 3 preview menggunakan Puppeteer.
- Resolusi: square 1080×1080, portrait 1080×1350, story 1080×1920.

## Catatan verifikasi
Script rendering memeriksa gambar berhasil dimuat. Setiap hasil harus dicek visual kembali bila konten aktual memiliki headline lebih panjang daripada contoh. Penggunaan badge/brand, klaim aplikasi, dan foto demo di sini hanya meniru referensi pengguna, **bukan klaim tentang LayerFit**.
