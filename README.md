# SIDATEKA — Sistem Informasi Desa Terintegrasi Kecamatan Banjarmangu

**SIDATEKA** (*Sistim Informasi Desa Terintegrasi Kecamatan Banjarmangu*) adalah platform portal terpusat Pemerintah Kecamatan Banjarmangu, Kabupaten Banjarnegara, Jawa Tengah. Platform ini mengagregasi berita, publikasi artikel, data statistik kependudukan, transparansi anggaran, serta layanan pengaduan masyarakat dari **17 desa** di wilayah Kecamatan Banjarmangu secara terintegrasi dan otomatis.

---

## 🏛️ Daftar Desa Terintegrasi (17 Desa)

1. **Banjarkulon** (`banjarkulon-banjarnegara.desa.id`)
2. **Banjarmangu** (`banjarmangu-banjarnegara.desa.id`)
3. **Beji** (`beji-banjarnegara.desa.id`)
4. **Gripit** (`gripit-banjarnegara.desa.id`)
5. **Jenggawur** (`jenggawur-banjarnegara.desa.id`)
6. **Kalilunjar** (`kalilunjar-banjarnegara.desa.id`)
7. **Kendaga** (`kendaga-banjarnegara.desa.id`)
8. **Kesenet** (`kesenet-banjarnegara.desa.id`)
9. **Majatengah** (`majatengah-banjarnegara.desa.id`)
10. **Paseh** (`paseh.desa.id`)
11. **Pekandangan** (`pekandangan-banjarnegara.desa.id`)
12. **Prendengan** (`prendengan-banjarmangu.sistemdata.id`)
13. **Rejasari** (`rejasari-banjarnegara.desa.id`)
14. **Sigeblog** (`sigeblog-banjarnegara.desa.id`)
15. **Sijenggung** (`sijenggung-banjarnegara.desa.id`)
16. **Sijeruk** (`sijeruk-banjarnegara.desa.id`)
17. **Sipedang** (`sipedang-banjarnegara.desa.id`)

---

## 🚀 Arsitektur & Teknologi

* **Frontend & Backend:** [Next.js](https://nextjs.org) 16.4.2 (App Router, Server Actions) + [React](https://react.dev) 19.2.8
* **Styling & UI:** Tailwind CSS v4 + Font Geist / Phosphor Icons
* **Database:** SQLite 3 via `better-sqlite3` dengan WAL (*Write-Ahead Logging*) mode
* **Peta Geospasial:** MapLibre GL
* **Reverse Proxy:** Nginx dengan HTTP/2 & SSL Let's Encrypt
* **Process Manager:** PM2 v7 (Node.js runtime v24)
* **Zona Waktu:** `Asia/Jakarta` (WIB, UTC+7)

---

## 🔄 Integrasi Sinkronisasi OpenSID

SIDATEKA mengagregasi data desa melalui tiga jalur integrasi otomatis:

1. **Agregasi Berita (RSS Feed & Deep Scrape):** Mengambil feed artikel dari `/feed` tiap desa secara terjadwal. Gambar artikel diunduh dan disimpan secara lokal di `.data/uploads/sync/` untuk menjamin ketersediaan aset saat situs desa lambat.
2. **Statistik Kependudukan (OpenSID Internal API):** Mengambil 13 kategori data kependudukan (Umur, Pekerjaan, Pendidikan, Agama, Status Kawin, Golongan Darah, dll.) melalui `/internal_api/statistik/{id}`.
3. **Internal Server Loopback (Nargaroth Origin Route):**
   * Karena 15 dari 17 desa berada pada satu server fisik yang sama (`nargaroth` — `103.255.133.227`), koneksi sinkronisasi dialihkan langsung ke Nginx origin via `/etc/hosts`.
   * **Bypass Cloudflare WAF:** Menghindari pemblokiran Cloudflare Bot Fight Mode / Under Attack Mode.
   * **Toleransi TLS Internal (`NODE_TLS_REJECT_UNAUTHORIZED='0'`):** Memastikan proses ingest internal tetap berjalan lancar tanpa terhenti oleh sertifikat SSL origin yang kedaluwarsa.
   * **Nginx Global Rewrite:** Routing otomatis `/internal_api/` ke `/index.php/internal_api/` pada konfigurasi Nginx global server.

---

## 🔒 Keamanan & Perlindungan (Security Hardening)

SIDATEKA dilindungi dengan prinsip *Defense-in-Depth* pada lapisan Nginx Edge dan Node.js:

### 1. Edge Rate Limiting & Anti Brute-Force
* **Admin Login (`/admin/login`):** Dibatasi maksimal 5 request/menit dengan `burst=5 nodelay`. Request agresif langsung dipotong dengan `HTTP 429 Too Many Requests`.
* **API Aduan & Sync (`/api/aduan`, `/api/sync`):** Dibatasi maksimal 10 request/detik dengan `burst=10 nodelay`.
* **Proteksi Programmatic Sync:** Endpoint `/api/sync/run` wajib menyertakan secret token `x-sync-token` atau otentikasi admin.

### 2. Anti-Exploit Probing & Scanner Blocking
* **Hidden Files:** Seluruh file bertitik `/\.(?!well-known)` diblokir dengan respons `HTTP 404`.
* **Sensitive Assets & Database:** Akses langsung ke `.env*`, `.git`, `package.json`, `.data/portal.db`, file `.sql`, `.bak`, `.old`, `.swp` diblokir dengan `HTTP 404`.
* **Bot Scanner:** Probing umum bot (`wp-login.php`, `phpmyadmin`, `xmlrpc`, dll.) otomatis diblokir dengan `HTTP 404`.
* **HTTP Method Whitelisting:** Hanya metode `GET`, `HEAD`, `POST`, `PUT`, `DELETE`, `OPTIONS` yang diizinkan; metode lain merespons `HTTP 405`.

### 3. Header Keamanan Standar
* `Strict-Transport-Security: max-age=31536000; includeSubDomains`
* `X-Content-Type-Options: nosniff`
* `X-Frame-Options: SAMEORIGIN`
* `X-XSS-Protection: 1; mode=block`
* `Referrer-Policy: strict-origin-when-cross-origin`
* `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`

---

## 🕒 Standarisasi Zona Waktu (WIB / UTC+7)

Semua pencatatan dan penayangan waktu diseragamkan ke zona waktu **`Asia/Jakarta` (WIB, UTC+7)** melalui modul utilitas [`lib/date.ts`](./lib/date.ts):
* Waktu yang dihasilkan fungsi `datetime('now')` SQLite (disimpan sebagai UTC tanpa offset) secara otomatis dikonversi dan ditampilkan dalam waktu lokal WIB.
* Penayangan tanggal artikel, sinkronisasi terakhir, log aktivitas admin, dan pengaduan masyarakat konsisten dengan jam operasional setempat.

---

## ⚙️ Panduan Pengoperasian & Deployment

### Menjalankan di Lingkungan Lokal
```bash
# Salin konfigurasi environment
cp .env.example .env

# Pasang dependensi
npm install

# Jalankan server development
npm run dev
```

### Build & Menjalankan di Production (PM2)
```bash
# Build aplikasi Next.js
npm run build

# Menjalankan melalui PM2
pm2 start ecosystem.config.js

# Restart dengan update environment
pm2 restart ecosystem.config.js --update-env
```

### Trigger Sinkronisasi Data Manual
```bash
# Sinkronisasi seluruh desa (background)
curl -X POST http://127.0.0.1:3010/api/sync/run \
  -H "x-sync-token: bna-ops-sync-secret-2026" \
  -H "Content-Type: application/json" \
  -d '{"fireAndForget": true}'

# Sinkronisasi satu desa spesifik (contoh: sijenggung)
curl -X POST http://127.0.0.1:3010/api/sync/run \
  -H "x-sync-token: bna-ops-sync-secret-2026" \
  -H "Content-Type: application/json" \
  -d '{"slug": "sijenggung"}'
```

---

## 📄 Lisensi
Pemerintah Kecamatan Banjarmangu, Kabupaten Banjarnegara, Jawa Tengah.
