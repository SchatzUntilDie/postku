# POSTKU — Database Sync

POSTKU currently stores data in `localStorage`, so each phone/browser has its own data.
To make products, orders, reports, settings and users share the same data across devices,
POSTKU should use a hosted PostgreSQL database + authentication.

## Recommended: Supabase

The free plan currently includes a PostgreSQL database, Auth, Storage and Realtime within its quotas.

### What we will move to the database
- Produk + foto produk
- Pesanan dan detail pesanan
- Status pending / paid / cancelled
- Pembayaran
- Pengaturan toko
- Pengguna/kasir
- Laporan penjualan (calculated from orders)

### Important security change
Do **not** keep the admin password in `app.js` for the production version.
The next database integration step should replace the local username/password check with Supabase Auth + Row Level Security.

## Your next step
1. Create a Supabase account/project.
2. Open SQL Editor.
3. Run `schema.sql`.
4. Send me the **Project URL** and **publishable/anon key** (never send a service-role/secret key).
5. I will connect POSTKU to the database and migrate the existing local data.

The browser can safely use the project's publishable/anon key when the database is protected with proper RLS policies.
