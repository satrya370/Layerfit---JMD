# T19 — After Dark Editorial / LayerFit

Template iklan event/lifestyle HTML/CSS yang dikembangkan dari poster referensi pengguna. Tema demonstrasi: event makanan; konten, foto, warna, dan detail event dapat diganti dengan `window.setCreative(data)`.

## Jalankan
Buka `index.html` di browser atau jalankan `python render.py` (memerlukan `playwright` dan Chromium). `render.py` memakai aset dari folder ini, bukan screenshot final sebagai template.

## Input dinamis
`brand`, `series`, `edition`, `headline` (gunakan `\n` untuk baris dan `*...*` untuk serif italic), `subheadline`, `photoLabel`, `badgeText`, `eventDate`, `eventTime`, `venue`, `address`, `imageUrl`, `colors`, `format`.

## Catatan
Foto contoh diekstraksi dari gambar yang diberikan user; bukan aset produk LayerFit dan tidak boleh diklaim sebagai milik brand. Teks event juga data demonstrasi dari referensi, bukan informasi kampanye yang diverifikasi. Jika data event tidak tersedia, layout harus diubah atau tidak dipilih AI.
