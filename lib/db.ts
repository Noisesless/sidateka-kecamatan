import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

const DB_PATH = process.env.DATABASE_PATH
  ? process.env.DATABASE_PATH
  : path.join(process.cwd(), '.data', 'portal.db');

const DB_DIR = path.dirname(DB_PATH);
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

function openDatabase(): Database.Database {
  const db = new Database(DB_PATH);
  // Tunggu sampai 30 detik kalau DB sedang dipakai proses lain
  // (berguna saat build paralel / PM2 restart)
  db.pragma('busy_timeout = 30000');
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.pragma('cache_size = -64000'); // 64 MB page cache di RAM
  db.pragma('temp_store = MEMORY');  // Temp table & sorting di RAM
  db.pragma('mmap_size = 268435456'); // 256 MB memory-mapped I/O
  return db;
}

// Jalankan schema setup SEKALI per file database, guarded by file lock
// (idempotent — CREATE TABLE IF NOT EXISTS, ALTER guarded by PRAGMA table_info).
function ensureSchemaSync(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS desa (
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
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const desaCols = db.prepare("PRAGMA table_info(desa)").all() as Array<{ name: string }>;
  const hasCol = (name: string) => desaCols.some((c) => c.name === name);
  if (!hasCol("opensid_api_url")) {
    db.exec("ALTER TABLE desa ADD COLUMN opensid_api_url TEXT");
  }
  if (!hasCol("opensid_api_token")) {
    db.exec("ALTER TABLE desa ADD COLUMN opensid_api_token TEXT");
  }
  if (!hasCol("profil_urls")) {
    db.exec("ALTER TABLE desa ADD COLUMN profil_urls TEXT");
  }
  if (!hasCol("statistik_at")) {
    db.exec("ALTER TABLE desa ADD COLUMN statistik_at TEXT");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS artikel (
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
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_artikel_desa ON artikel(desa_id);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_artikel_published ON artikel(published_at DESC);`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_log (
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
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_user (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_session (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES admin_user(id) ON DELETE CASCADE
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_session_token ON admin_session(token);`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS desa_api_key (
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
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_api_key ON desa_api_key(api_key);`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS push_inbox (
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
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_push_inbox_desa ON push_inbox(desa_id, created_at DESC);`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS visitor_daily (
      date TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS profil_desa (
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
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_profil_desa_desa ON profil_desa(desa_id);`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS perangkat_desa (
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
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_perangkat_desa_desa ON perangkat_desa(desa_id);`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS statistik_desa (
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
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_statistik_desa_desa ON statistik_desa(desa_id, kategori);`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS profil_kecamatan (
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
  `);

  const profilCount = db.prepare("SELECT COUNT(*) AS c FROM profil_kecamatan").get() as { c: number };
  if (profilCount.c === 0) {
    db.prepare(`
      INSERT INTO profil_kecamatan (nama_kecamatan, kabupaten, provinsi, website_sumber)
      VALUES ('Banjarmangu', 'Banjarnegara', 'Jawa Tengah', 'https://banjarmangu.banjarnegarakab.go.id/')
    `).run();
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS statistik_penduduk (
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
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_statistik_desa ON statistik_penduduk(desa_id, tahun);`);
  db.exec(`
    CREATE TABLE IF NOT EXISTS statistik_snapshot (
      key TEXT PRIMARY KEY,
      data_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS unduhan (
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
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_unduhan_kategori ON unduhan(kategori, is_published);`);

  // === Aduan masyarakat ===
  db.exec(`
    CREATE TABLE IF NOT EXISTS aduan (
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

    CREATE INDEX IF NOT EXISTS idx_aduan_nomor ON aduan(nomor);
    CREATE INDEX IF NOT EXISTS idx_aduan_status ON aduan(status);
  `);

  // === Artikel / berita kecamatan (konten manual, bukan hasil sync desa) ===
  db.exec(`
    CREATE TABLE IF NOT EXISTS artikel_kecamatan (
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

    CREATE INDEX IF NOT EXISTS idx_artikel_kecamatan_pub ON artikel_kecamatan(is_published, published_at);

    CREATE TABLE IF NOT EXISTS artikel_kecamatan_foto (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      artikel_id INTEGER NOT NULL REFERENCES artikel_kecamatan(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      caption TEXT,
      urutan INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_artikel_kecamatan_foto ON artikel_kecamatan_foto(artikel_id, urutan);
  `);
}

// Buka koneksi SQLite (singleton via globalThis).
// Schema otomatis dibuat di sini (idempotent) supaya tidak ada race antar worker build.
declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined;
  // eslint-disable-next-line no-var
  var __db_ready: boolean | undefined;
}

export const db = (() => {
  if (globalThis.__db) return globalThis.__db;
  const _db = openDatabase();
  try {
    // Schema setup idempotent — aman dipanggil setiap kali koneksi dibuat
    // (kalau ada banyak worker build paralel, setiap worker hanya bikin koneksi
    //  baru kalau globalThis.__db belum ada, jadi hanya worker pertama yang setup).
    ensureSchemaSync(_db);
  } catch (e) {
    // Ignore "duplicate column" kalau worker lain sudah setup duluan
    if (!(e as Error).message.includes("duplicate column")) {
      throw e;
    }
  }
  globalThis.__db = _db;
  globalThis.__db_ready = true;
  return _db;
})();

// Utilitas auth bersama (sumber tunggal — dipakai seed.ts & auth.ts)
export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.pbkdf2Sync(plain, salt, 100000, 32, "sha256").toString("hex");
  return `pbkdf2:${salt}:${derived}`;
}

export type Desa = {
  id: number;
  slug: string;
  nama: string;
  website: string;
  feed_url: string | null;
  scraper_enabled: number;
  is_active: number;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_message: string | null;
  created_at: string;
  opensid_api_url: string | null;
  opensid_api_token: string | null;
  profil_urls: string | null;
  statistik_at: string | null;
};

export type ProfilDesa = {
  id: number;
  desa_id: number;
  jenis: string; // 'pemerintah' | 'profil' | 'sejarah' | 'visi_misi' | 'lembaga'
  judul: string;
  konten_html: string | null;
  gambar: string | null;
  source_url: string;
  fetched_at: string;
};

export type PerangkatDesa = {
  id: number;
  desa_id: number;
  nama: string;
  jabatan: string;
  foto_url: string | null;
  urutan: number;
  updated_at: string;
};

export type StatistikDesa = {
  id: number;
  desa_id: number;
  kategori: string; // slug, mis. 'jenis_kelamin', 'umur_rentang'
  urutan: number;
  nama: string;
  jumlah: number;
  laki: number;
  perempuan: number;
  persen: string | null;
};

export type Artikel = {
  id: number;
  desa_id: number;
  external_id: string | null;
  judul: string;
  slug: string;
  url: string;
  ringkasan: string | null;
  konten: string | null;
  gambar: string | null;
  penulis: string | null;
  kategori: string | null;
  published_at: string | null;
  view_count: number;
  source: string;
  fetched_at: string;
};

export type DesaApiKey = {
  id: number;
  desa_id: number;
  api_key: string;
  is_active: number;
  last_push_at: string | null;
  last_push_status: string | null;
  last_push_message: string | null;
  created_at: string;
};

export type PushInboxEntry = {
  id: number;
  desa_id: number;
  endpoint: string;
  payload_hash: string;
  items_received: number;
  items_inserted: number;
  items_updated: number;
  status: string;
  message: string | null;
  ip_address: string | null;
  created_at: string;
};

// Generator API key untuk push dari desa
export function generateApiKey(): string {
  return "dsk_" + crypto.randomBytes(24).toString("hex");
}

export type Unduhan = {
  id: number;
  kategori: string;
  judul: string;
  deskripsi: string | null;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  is_published: number;
  created_at: string;
  updated_at: string;
};

export type Aduan = {
  id: number;
  nomor: string;
  desa_id: number | null;
  jenis: string;
  isi: string;
  nama: string;
  nik: string | null;
  telepon: string;
  email: string | null;
  alamat: string | null;
  status: string;
  tanggapan: string | null;
  created_at: string;
  updated_at: string;
};

export type ArtikelKecamatan = {
  id: number;
  judul: string;
  slug: string;
  ringkasan: string | null;
  konten: string | null;
  gambar_utama: string | null;
  penulis: string | null;
  kategori: string | null;
  is_published: number;
  view_count: number;
  published_at: string;
  created_at: string;
  updated_at: string;
};

export type ArtikelKecamatanFoto = {
  id: number;
  artikel_id: number;
  url: string;
  caption: string | null;
  urutan: number;
  created_at: string;
};

// Dipakai oleh lib/init.ts untuk ensureSchema idempotent
export { ensureSchemaSync };

export function getStatistikSnapshot<T>(key: string): { data: T; updated_at: string } | null {
  try {
    const row = db.prepare('SELECT data_json, updated_at FROM statistik_snapshot WHERE key = ?').get(key) as { data_json: string; updated_at: string } | undefined;
    if (!row) return null;
    return { data: JSON.parse(row.data_json) as T, updated_at: row.updated_at };
  } catch {
    return null;
  }
}

export function saveStatistikSnapshot(key: string, data: any): void {
  try {
    db.prepare(`
      INSERT INTO statistik_snapshot (key, data_json, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET
        data_json = excluded.data_json,
        updated_at = datetime('now')
    `).run(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Failed to save statistik snapshot ${key}:`, err);
  }
}

