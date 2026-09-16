# POSTKU PWA - Tahap 1
PWA POS offline-first untuk HP Android.

Fitur:
- Dashboard
- Kasir/keranjang
- Produk & kategori
- Pembayaran Tunai, QRIS, Transfer, Debit
- Hitung kembalian
- Riwayat transaksi
- Laporan penjualan
- Cetak struk melalui dialog print browser
- Install sebagai PWA
- Penyimpanan lokal

Catatan printer:
Versi ini belum melakukan koneksi Bluetooth/USB langsung ke printer thermal. Tombol Cetak menggunakan fungsi print browser. Integrasi ESC/POS Bluetooth/USB/Wi-Fi akan menjadi tahap berikutnya setelah model printer ditentukan.

Untuk pengujian PWA, buka melalui HTTPS atau localhost; service worker tidak aktif pada file://.
