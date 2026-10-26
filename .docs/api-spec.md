# API SPECIFICATION — PORTAL KECAMATAN BANJARMANGU

## 1. Public API Endpoints

### `POST /api/aduan`
- **Deskripsi:** Mengirimkan laporan atau pengaduan masyarakat baru.
- **Autentikasi:** None (Public)
- **Request Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "nama": "Budi Santoso",
    "nik": "3304XXXXXXXXXXXX",
    "telepon": "08123456789",
    "email": "budi@example.com",
    "alamat": "Desa Majatengah RT 01/RW 02",
    "desa_id": 9,
    "jenis": "infrastruktur",
    "isi": "Jalan penghubung desa berlubang parah..."
  }
  ```
- **Response Success (200 OK):**
  ```json
  {
    "success": true,
    "nomor": "ADU-20261020-0012",
    "message": "Pengaduan berhasil dikirim"
  }
  ```

---

### `GET, POST /api/visitor`
- **Deskripsi:** Mencatat hit pengunjung harian dan mengembalikan total statistik visitor.
- **Autentikasi:** None (Public)
- **Response Success (200 OK):**
  ```json
  {
    "today": 142,
    "total": 5820
  }
  ```

---

### `GET /foto/[...path]`
- **Deskripsi:** Menyajikan file gambar artikel dan profil dari disk lokal `.data/uploads/`.
- **Autentikasi:** None (Public)
- **Perlindungan Anti-Broken:** Jika file gambar tidak ditemukan di disk lokal, endpoint secara dinamis menyajikan file kolase kegiatan warga desa (`/placeholder-artikel.jpg` atau SVG fallback) dengan HTTP 200, sehingga browser tidak pernah menampilkan ikon gambar rusak.

---

## 2. Push Integration Endpoints (OpenSID Desa)

### `POST /api/push/artikel`
- **Deskripsi:** Menerima payload artikel/berita yang di-push otomatis dari OpenSID desa.
- **Autentikasi:** Header `X-API-Key: <DESA_API_KEY>`
- **Request Body:**
  ```json
  {
    "external_id": "1042",
    "judul": "Penyaluran BLT Dana Desa Tahap II",
    "slug": "penyaluran-blt-dana-desa-tahap-ii",
    "url": "https://majatengah-banjarmangu.desa.id/artikel/penyaluran-blt",
    "ringkasan": "Pemerintah desa telah menyalurkan...",
    "konten": "<p>Isi lengkap berita...</p>",
    "gambar": "https://majatengah-banjarmangu.desa.id/uploads/blt.jpg",
    "penulis": "Admin Desa",
    "kategori": "Pemerintahan",
    "published_at": "2026-10-19T08:00:00Z"
  }
  ```
- **Response Success (200 OK):**
  ```json
  {
    "success": true,
    "status": "inserted",
    "artikel_id": 418
  }
  ```
- **Response Error (401 Unauthorized):**
  ```json
  {
    "error": "API Key tidak valid atau dinonaktifkan"
  }
  ```

---

## 3. Administrative & Sync Endpoints

### `GET, POST /api/sync/probe`
- **Deskripsi:** Memeriksa konektivitas seluruh 17 desa secara **paralel (simultan)** dalam 3–4 detik sebelum proses sinkronisasi dimulai.
- **Autentikasi:** Admin Session Cookie
- **Response Success (200 OK):**
  ```json
  {
    "ok": true,
    "total": 17,
    "onlineCount": 4,
    "blockedCount": 13,
    "offlineCount": 0,
    "results": [
      {
        "id": 12,
        "nama": "Prendengan",
        "slug": "prendengan",
        "website": "https://prendengan-banjarmangu.sistemdata.id",
        "status": "online",
        "message": "Online & Siap Sync",
        "latencyMs": 380
      },
      {
        "id": 2,
        "nama": "Banjarmangu",
        "slug": "banjarmangu",
        "website": "https://banjarmangu-banjarnegara.desa.id",
        "status": "blocked_waf",
        "message": "Cloudflare WAF Challenge (403)",
        "latencyMs": 240
      }
    ]
  }
  ```

---

### `POST /api/sync/run`
- **Deskripsi:** Menjalankan sinkronisasi penuh untuk satu desa tertentu (Artikel, Foto Lokal, Profil, dan Statistik).
- **Autentikasi:** Admin Session Cookie
- **Request Body:**
  ```json
  {
    "slug": "prendengan"
  }
  ```
- **Response Success (200 OK):**
  ```json
  {
    "ok": true,
    "result": {
      "status": "ok",
      "message": "ok (+2 baru, 8 foto tersimpan lokal) | profil: 7 tersimpan",
      "newCount": 2,
      "updatedCount": 0,
      "durationMs": 4200,
      "source": "rss"
    }
  }
  ```

---

### `GET, POST /api/sync`
- **Deskripsi:** Memicu proses cron background agregasi/sync untuk seluruh desa aktif.
- **Autentikasi:** Header `Authorization: Bearer <CRON_SECRET>` atau Admin Session
- **Query Params:** `?limit=17`
