# POSTKU v2

PWA POS sederhana untuk HP.

## Fitur
- Login username/password dan role Admin/Kasir
- Produk dengan foto
- Keranjang + nama pembeli + meja/order
- Pending, lanjutkan, batalkan, void
- Pembayaran Tunai, QRIS, Transfer, Debit
- QRIS dan rekening toko di Pengaturan
- Cetak struk thermal 58/80 mm melalui dialog print
- Dashboard dan grafik penjualan
- Laporan + export CSV
- PWA/offline cache

## Akun awal
Admin: `admin` / `admin123`
Kasir: `kasir` / `kasir123`

## Catatan
Data saat ini disimpan lokal di browser (localStorage), sehingga belum tersinkron antar-HP. Login lokal juga bukan sistem keamanan server. Untuk penggunaan multi-device diperlukan backend/database pada tahap berikutnya.
