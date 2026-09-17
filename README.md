POSTKU v2.3.6

Update: foto produk distandarkan 400x400 (1:1) secara otomatis; struk menampilkan varian/rasa.


## v2.3.5 — Local stability & product variants
- Struktur produk dimigrasikan otomatis tanpa menghapus data lokal lama.
- Setiap produk mendukung beberapa varian/rasa dengan harga, stok, dan SKU masing-masing.
- Stok dicek saat kasir menambah item dan saat pembayaran.
- Foto produk baru dikompres agar penyimpanan lokal lebih ringan.
- Backup/restore dan simpan login tetap dipertahankan.
# POSTKU v2.3

PWA kasir sederhana untuk HP.

## v2.3
- UI kasir baru yang lebih modern dan nyaman di HP
- Kartu produk dengan foto, kategori, indikator jumlah di keranjang
- Pencarian dan filter kategori
- Keranjang dan informasi pembeli yang lebih jelas
- Chart responsif + periode 1 hari, 7 hari, 30 hari, 3 bulan, 1 tahun
- Login admin/kasir lokal untuk prototipe
- Siap dipindahkan ke database cloud

## Database
Lihat `DATABASE-SETUP.md` dan `schema.sql` untuk tahap sinkronisasi antar perangkat.


### Login Session
POSTKU v2.3.2 menambahkan opsi **Tetap masuk di perangkat ini**. Yang disimpan hanya ID/username/role sesi, bukan password. Tombol Logout menghapus sesi tersimpan.


## v2.3.2
Menambahkan cetak struk laporan penjualan harian berdasarkan tanggal, tanpa mengubah atau menghapus data transaksi yang tersimpan. Export CSV tetap tersedia sebagai backup laporan.

## Versi
- v2.3.4: perbaikan Service Worker dan strategi cache agar pembaruan GitHub Pages lebih cepat diterapkan.
