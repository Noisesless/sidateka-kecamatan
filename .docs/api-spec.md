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

## 3. Administrative & Scraping Triggers

### `GET, POST /api/sync`
- **Deskripsi:** Memicu proses background agregasi/sync untuk seluruh 17 desa.
- **Autentikasi:** Header `Authorization: Bearer <CRON_SECRET>` atau Admin Session
- **Query Params:** `?limit=17`

### `GET, POST /api/sync/one`
- **Deskripsi:** Memicu sinkronisasi khusus untuk satu desa tertentu berdasarkan slug/id.
- **Autentikasi:** Admin Session Cookie
- **Query Params:** `?slug=prendengan`
