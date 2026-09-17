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
