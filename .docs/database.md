# DATABASE BLUEPRINT — PORTAL KECAMATAN BANJARMANGU

## 1. Metadata Engine & Driver
- **Database Engine:** SQLite 3 (WAL Mode — Write-Ahead Logging)
- **Driver:** `better-sqlite3` (Synchronous Fast C-bindings)
- **Path Penyimpanan:** `.data/portal.db` (overrideable via `DATABASE_PATH` env)
- **Konkurensi & Locking:**
  - `PRAGMA busy_timeout = 30000;` (30 detik toleransi wait lock)
  - `PRAGMA journal_mode = WAL;` (Memungkinkan pembacaan simultan saat proses tulis)
  - `PRAGMA foreign_keys = ON;` (Integritas referensial aktif)

---

## 2. Skema Tabel DDL & Relasi

### A. Tabel Master Desa & Agregasi
```sql
CREATE TABLE desa (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  nama TEXT NOT NULL,
  website TEXT NOT NULL,
  feed_url TEXT,
  scraper_enabled INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_sync_at TEXT,
  last_sync_status TEXT,
  last_sync_message TEXT,
  opensid_api_url TEXT,
  opensid_api_token TEXT,
  profil_urls TEXT,
  statistik_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE artikel (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  desa_id INTEGER NOT NULL,
  external_id TEXT,
  judul TEXT NOT NULL,
  slug TEXT NOT NULL,
  url TEXT NOT NULL,
  ringkasan TEXT,
  konten TEXT,
  gambar TEXT,
  penulis TEXT,
  kategori TEXT,
  published_at TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'rss',
  fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (desa_id, slug),
  FOREIGN KEY (desa_id) REFERENCES desa(id) ON DELETE CASCADE
);
CREATE INDEX idx_artikel_desa ON artikel(desa_id);
CREATE INDEX idx_artikel_published ON artikel(published_at DESC);

CREATE TABLE sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  desa_id INTEGER,
  source TEXT,
  status TEXT NOT NULL,
  message TEXT,
  new_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### B. Tabel Keamanan, Autentikasi & Push API
```sql
CREATE TABLE admin_user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE admin_session (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES admin_user(id) ON DELETE CASCADE
);
CREATE INDEX idx_session_token ON admin_session(token);

CREATE TABLE desa_api_key (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  desa_id INTEGER NOT NULL UNIQUE,
  api_key TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_push_at TEXT,
  last_push_status TEXT,
  last_push_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (desa_id) REFERENCES desa(id) ON DELETE CASCADE
);
CREATE INDEX idx_api_key ON desa_api_key(api_key);

CREATE TABLE push_inbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  desa_id INTEGER NOT NULL,
  endpoint TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  items_received INTEGER NOT NULL DEFAULT 0,
  items_inserted INTEGER NOT NULL DEFAULT 0,
  items_updated INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  message TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (desa_id) REFERENCES desa(id) ON DELETE CASCADE
);
CREATE INDEX idx_push_inbox_desa ON push_inbox(desa_id, created_at DESC);
```

### C. Tabel Konten Profil & Statistik Wilayah
```sql
CREATE TABLE profil_desa (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  desa_id INTEGER NOT NULL,
  jenis TEXT NOT NULL,
  judul TEXT NOT NULL,
  konten_html TEXT,
  gambar TEXT,
  source_url TEXT NOT NULL,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (desa_id, source_url),
  FOREIGN KEY (desa_id) REFERENCES desa(id) ON DELETE CASCADE
);
CREATE INDEX idx_profil_desa_desa ON profil_desa(desa_id);

CREATE TABLE perangkat_desa (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  desa_id INTEGER NOT NULL,
  nama TEXT NOT NULL,
  jabatan TEXT NOT NULL DEFAULT '',
  foto_url TEXT,
  urutan INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (desa_id, nama, jabatan),
  FOREIGN KEY (desa_id) REFERENCES desa(id) ON DELETE CASCADE
);
CREATE INDEX idx_perangkat_desa_desa ON perangkat_desa(desa_id);

CREATE TABLE statistik_desa (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  desa_id INTEGER NOT NULL,
  kategori TEXT NOT NULL,
  urutan INTEGER NOT NULL DEFAULT 0,
  nama TEXT NOT NULL,
  jumlah INTEGER NOT NULL DEFAULT 0,
  laki INTEGER NOT NULL DEFAULT 0,
  perempuan INTEGER NOT NULL DEFAULT 0,
  persen TEXT,
  UNIQUE (desa_id, kategori, nama),
  FOREIGN KEY (desa_id) REFERENCES desa(id) ON DELETE CASCADE
);
CREATE INDEX idx_statistik_desa_desa ON statistik_desa(desa_id, kategori);

CREATE TABLE profil_kecamatan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama_kecamatan TEXT NOT NULL DEFAULT 'Banjarmangu',
  kabupaten TEXT NOT NULL DEFAULT 'Banjarnegara',
  provinsi TEXT NOT NULL DEFAULT 'Jawa Tengah',
  kode_wilayah TEXT,
  visi TEXT,
  misi TEXT,
  sejarah TEXT,
  letak_geografis TEXT,
  struktur_pemerintahan TEXT,
  alamat_kantor TEXT,
  telepon_kantor TEXT,
  email_kantor TEXT,
  website_sumber TEXT NOT NULL DEFAULT 'https://banjarmangu.banjarnegarakab.go.id/',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE statistik_penduduk (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  desa_id INTEGER NOT NULL,
  desa_slug TEXT NOT NULL,
  desa_nama TEXT NOT NULL,
  tahun INTEGER NOT NULL,
  penduduk INTEGER DEFAULT 0,
  laki_laki INTEGER DEFAULT 0,
  perempuan INTEGER DEFAULT 0,
  disabilitas INTEGER DEFAULT 0,
  jumlah_kk INTEGER DEFAULT 0,
  scraped_at TEXT,
  UNIQUE (desa_id, tahun),
  FOREIGN KEY (desa_id) REFERENCES desa(id) ON DELETE CASCADE
);
CREATE INDEX idx_statistik_desa ON statistik_penduduk(desa_id, tahun);
```

### D. Tabel Layanan Publik & Pengaduan
```sql
CREATE TABLE aduan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nomor TEXT NOT NULL UNIQUE,
  desa_id INTEGER REFERENCES desa(id) ON DELETE SET NULL,
  jenis TEXT NOT NULL,
  isi TEXT NOT NULL,
  nama TEXT NOT NULL,
  nik TEXT,
  telepon TEXT NOT NULL,
  email TEXT,
  alamat TEXT,
  status TEXT NOT NULL DEFAULT 'baru',
  tanggapan TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_aduan_nomor ON aduan(nomor);
CREATE INDEX idx_aduan_status ON aduan(status);

CREATE TABLE unduhan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kategori TEXT NOT NULL,
  judul TEXT NOT NULL,
  deskripsi TEXT,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  is_published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_unduhan_kategori ON unduhan(kategori, is_published);

CREATE TABLE artikel_kecamatan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  judul TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  ringkasan TEXT,
  konten TEXT,
  gambar_utama TEXT,
  penulis TEXT,
  kategori TEXT,
  is_published INTEGER NOT NULL DEFAULT 1,
  view_count INTEGER NOT NULL DEFAULT 0,
  published_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_artikel_kecamatan_pub ON artikel_kecamatan(is_published, published_at);

CREATE TABLE artikel_kecamatan_foto (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  artikel_id INTEGER NOT NULL REFERENCES artikel_kecamatan(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  urutan INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_artikel_kecamatan_foto ON artikel_kecamatan_foto(artikel_id, urutan);

CREATE TABLE visitor_daily (
  date TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE statistik_snapshot (
  cache_key TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## 3. Seed Data & Master Records

1. **17 Desa Terdaftar:** `banjarmangu`, `banjarkulon`, `beji`, `gripit`, `jenggawur`, `kalilunjar`, `kendaga`, `kesenet`, `majatengah`, `paseh`, `pekandangan`, `prendengan`, `rejasari`, `sigeblog`, `sijenggung`, `sijeruk`, `sipedang`.
2. **17 Kepala Desa (`perangkat_desa`):** Seluruh pimpinan 17 desa telah terdata dengan jabatan `Kepala Desa` untuk visualisasi peta geografis dan profil pemerintahan desa.
3. **Akun Administrator Default (`admin_user`):** 1 user default aktif terlindungi dengan SHA-256 + salt session.
