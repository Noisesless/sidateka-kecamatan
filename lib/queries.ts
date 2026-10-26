import { db, type Desa, type Artikel, type DesaApiKey, type PushInboxEntry, type Unduhan, type Aduan, type ArtikelKecamatan, type ArtikelKecamatanFoto, type ProfilDesa, type PerangkatDesa, type StatistikDesa } from './db';
import crypto from 'crypto';

export type ArtikelWithDesa = Artikel & { desa: Pick<Desa, 'slug' | 'nama'> };

export function getAllDesa(activeOnly = true): Desa[] {
  if (activeOnly) {
    return db.prepare('SELECT * FROM desa WHERE is_active = 1 ORDER BY nama ASC').all() as Desa[];
  }
  return db.prepare('SELECT * FROM desa ORDER BY nama ASC').all() as Desa[];
}

export function getDesaBySlug(slug: string): Desa | null {
  const row = db.prepare('SELECT * FROM desa WHERE slug = ?').get(slug) as Desa | undefined;
  return row ?? null;
}

export function getArtikelById(id: number): ArtikelWithDesa | null {
  const row = db
    .prepare(
      `SELECT a.*, d.slug AS d_slug, d.nama AS d_nama
       FROM artikel a
       JOIN desa d ON d.id = a.desa_id
       WHERE a.id = ?`,
    )
    .get(id) as (Artikel & { d_slug: string; d_nama: string }) | undefined;
  if (!row) return null;
  const { d_slug, d_nama, ...artikel } = row;
  return { ...artikel, desa: { slug: d_slug, nama: d_nama } };
}

export function getArtikelByDesaAndSlug(desaSlug: string, slug: string): ArtikelWithDesa | null {
  const row = db
    .prepare(
      `SELECT a.*, d.slug AS d_slug, d.nama AS d_nama
       FROM artikel a
       JOIN desa d ON d.id = a.desa_id
       WHERE d.slug = ? AND a.slug = ?`,
    )
    .get(desaSlug, slug) as (Artikel & { d_slug: string; d_nama: string }) | undefined;
  if (!row) return null;
  const { d_slug, d_nama, ...artikel } = row;
  return { ...artikel, desa: { slug: d_slug, nama: d_nama } };
}

export function getRecentArtikel(limit = 12, desaSlug?: string): ArtikelWithDesa[] {
  const where = desaSlug ? 'WHERE d.slug = ?' : '';
  const rows = db
    .prepare(
      `SELECT a.*, d.slug AS d_slug, d.nama AS d_nama
       FROM artikel a
       JOIN desa d ON d.id = a.desa_id
       ${where}
       ORDER BY COALESCE(a.published_at, a.fetched_at) DESC
       LIMIT ?`,
    )
    .all(...(desaSlug ? [desaSlug, limit] : [limit])) as (Artikel & { d_slug: string; d_nama: string })[];
  return rows.map(({ d_slug, d_nama, ...a }) => ({ ...a, desa: { slug: d_slug, nama: d_nama } }));
}

/**
 * Mengambil hingga 10 artikel terbaru untuk hero slider dengan mengutamakan
 * artikel yang memiliki foto/gambar agar slide lebih variatif dan menarik.
 */
export function getHeroSlideArtikel(limit = 10): ArtikelWithDesa[] {
  const withImages = db
    .prepare(
      `SELECT a.*, d.slug AS d_slug, d.nama AS d_nama
       FROM artikel a
       JOIN desa d ON d.id = a.desa_id
       WHERE a.gambar IS NOT NULL AND TRIM(a.gambar) != ''
       ORDER BY COALESCE(a.published_at, a.fetched_at) DESC
       LIMIT ?`,
    )
    .all(limit) as (Artikel & { d_slug: string; d_nama: string })[];

  if (withImages.length >= limit) {
    return withImages.map(({ d_slug, d_nama, ...a }) => ({ ...a, desa: { slug: d_slug, nama: d_nama } }));
  }

  const excludeIds = withImages.map((a) => a.id);
  const remaining = limit - withImages.length;
  const placeholders = excludeIds.length > 0 ? `AND a.id NOT IN (${excludeIds.map(() => '?').join(',')})` : '';

  const others = db
    .prepare(
      `SELECT a.*, d.slug AS d_slug, d.nama AS d_nama
       FROM artikel a
       JOIN desa d ON d.id = a.desa_id
       WHERE 1=1 ${placeholders}
       ORDER BY COALESCE(a.published_at, a.fetched_at) DESC
       LIMIT ?`,
    )
    .all(...excludeIds, remaining) as (Artikel & { d_slug: string; d_nama: string })[];

  const combined = [...withImages, ...others];
  return combined.map(({ d_slug, d_nama, ...a }) => ({ ...a, desa: { slug: d_slug, nama: d_nama } }));
}

export function getPaginatedArtikel(limit = 6, offset = 0, desaSlug?: string): ArtikelWithDesa[] {
  const where = desaSlug ? 'WHERE d.slug = ?' : '';
  const rows = db
    .prepare(
      `SELECT a.*, d.slug AS d_slug, d.nama AS d_nama
       FROM artikel a
       JOIN desa d ON d.id = a.desa_id
       ${where}
       ORDER BY COALESCE(a.published_at, a.fetched_at) DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...(desaSlug ? [desaSlug, limit, offset] : [limit, offset])) as (Artikel & { d_slug: string; d_nama: string })[];
  return rows.map(({ d_slug, d_nama, ...a }) => ({ ...a, desa: { slug: d_slug, nama: d_nama } }));
}

export function getTotalArtikelCount(desaSlug?: string): number {
  const where = desaSlug ? 'WHERE d.slug = ?' : '';
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c
       FROM artikel a
       JOIN desa d ON d.id = a.desa_id
       ${where}`,
    )
    .get(...(desaSlug ? [desaSlug] : [])) as { c: number } | undefined;
  return row?.c ?? 0;
}

export function getPopularArtikel(limit = 8): ArtikelWithDesa[] {
  const rows = db
    .prepare(
      `SELECT a.*, d.slug AS d_slug, d.nama AS d_nama
       FROM artikel a
       JOIN desa d ON d.id = a.desa_id
       ORDER BY a.view_count DESC, COALESCE(a.published_at, a.fetched_at) DESC
       LIMIT ?`,
    )
    .all(limit) as (Artikel & { d_slug: string; d_nama: string })[];
  return rows.map(({ d_slug, d_nama, ...a }) => ({ ...a, desa: { slug: d_slug, nama: d_nama } }));
}

export function getArtikelStats(): {
  totalArtikel: number;
  totalDesa: number;
  totalDesaAktif: number;
  lastSync: string | null;
} {
  const totalArtikel = (db.prepare('SELECT COUNT(*) AS c FROM artikel').get() as { c: number }).c;
  const totalDesa = (db.prepare('SELECT COUNT(*) AS c FROM desa').get() as { c: number }).c;
  const totalDesaAktif = (db.prepare('SELECT COUNT(*) AS c FROM desa WHERE is_active = 1').get() as { c: number }).c;
  const last = db.prepare("SELECT last_sync_at FROM desa WHERE last_sync_at IS NOT NULL ORDER BY last_sync_at DESC LIMIT 1").get() as { last_sync_at: string } | undefined;
  return {
    totalArtikel,
    totalDesa,
    totalDesaAktif,
    lastSync: last?.last_sync_at ?? null,
  };
}

export function getRecentSyncLogs(limit = 20) {
  return db
    .prepare(
      `SELECT s.*, d.nama AS desa_nama
       FROM sync_log s
       LEFT JOIN desa d ON d.id = s.desa_id
       ORDER BY s.created_at DESC
       LIMIT ?`,
    )
    .all(limit) as Array<{
    id: number;
    desa_id: number | null;
    desa_nama: string | null;
    source: string;
    status: string;
    message: string | null;
    new_count: number;
    updated_count: number;
    duration_ms: number | null;
    created_at: string;
  }>;
}

// === API Key management untuk push dari desa ===

export function getApiKeyByDesaId(desaId: number): DesaApiKey | null {
  const row = db.prepare('SELECT * FROM desa_api_key WHERE desa_id = ?').get(desaId) as
    | DesaApiKey
    | undefined;
  return row ?? null;
}

export function getAllDesaWithApiKey(): Array<Desa & { api_key: string | null; last_push_at: string | null; last_push_status: string | null; last_push_message: string | null }> {
  return db
    .prepare(
      `SELECT d.*, k.api_key, k.last_push_at, k.last_push_status, k.last_push_message
       FROM desa d
       LEFT JOIN desa_api_key k ON k.desa_id = d.id
       ORDER BY d.nama ASC`,
    )
    .all() as Array<Desa & { api_key: string | null; last_push_at: string | null; last_push_status: string | null; last_push_message: string | null }>;
}

export function getDesaByApiKey(apiKey: string): { desa: Desa; apiKeyRow: DesaApiKey } | null {
  const row = db
    .prepare(
      `SELECT d.*, k.id AS k_id, k.api_key AS k_api_key, k.is_active AS k_is_active,
              k.last_push_at, k.last_push_status, k.last_push_message, k.created_at AS k_created_at
       FROM desa_api_key k
       JOIN desa d ON d.id = k.desa_id
       WHERE k.api_key = ? AND k.is_active = 1 AND d.is_active = 1`,
    )
    .get(apiKey) as any;
  if (!row) return null;
  const desa: Desa = {
    id: row.id, slug: row.slug, nama: row.nama, website: row.website,
    feed_url: row.feed_url, scraper_enabled: row.scraper_enabled, is_active: row.is_active,
    last_sync_at: row.last_sync_at, last_sync_status: row.last_sync_status,
    last_sync_message: row.last_sync_message, created_at: row.created_at,
    opensid_api_url: row.opensid_api_url, opensid_api_token: row.opensid_api_token,
    profil_urls: row.profil_urls, statistik_at: row.statistik_at,
  };
  const apiKeyRow: DesaApiKey = {
    id: row.k_id, desa_id: row.id, api_key: row.k_api_key, is_active: row.k_is_active,
    last_push_at: row.last_push_at, last_push_status: row.last_push_status,
    last_push_message: row.last_push_message, created_at: row.k_created_at,
  };
  return { desa, apiKeyRow };
}

export function recordPushAttempt(desaId: number, status: 'success' | 'failed', message: string): void {
  db.prepare(
    `UPDATE desa_api_key SET last_push_at = datetime('now'), last_push_status = ?, last_push_message = ? WHERE desa_id = ?`,
  ).run(status, message, desaId);
}

export function getRecentPushInbox(limit = 30): Array<PushInboxEntry & { desa_nama: string }> {
  return db
    .prepare(
      `SELECT p.*, d.nama AS desa_nama
       FROM push_inbox p
       JOIN desa d ON d.id = p.desa_id
       ORDER BY p.created_at DESC
       LIMIT ?`,
    )
    .all(limit) as Array<PushInboxEntry & { desa_nama: string }>;
}

// === Profil Kecamatan ===

export type ProfilKecamatan = {
  id: number;
  nama_kecamatan: string;
  kabupaten: string;
  provinsi: string;
  kode_wilayah: string | null;
  visi: string | null;
  misi: string | null;
  sejarah: string | null;
  letak_geografis: string | null;
  struktur_pemerintahan: string | null;
  alamat_kantor: string | null;
  telepon_kantor: string | null;
  email_kantor: string | null;
  website_sumber: string | null;
  created_at: string;
  updated_at: string;
};

export function getProfilKecamatan(): ProfilKecamatan | null {
  const row = db.prepare("SELECT * FROM profil_kecamatan LIMIT 1").get() as ProfilKecamatan | undefined;
  return row ?? null;
}

// === Unduhan (Downloads) ===

let unduhanTableEnsured = false;
function ensureUnduhanTable() {
  if (unduhanTableEnsured) return;
  try {
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
    unduhanTableEnsured = true;
  } catch {
    // abaikan — fallback ke fallback lain
  }
}

export function getUnduhanByKategori(kategori: string, publishedOnly = true): Unduhan[] {
  ensureUnduhanTable();
  const where = publishedOnly ? "WHERE kategori = ? AND is_published = 1" : "WHERE kategori = ?";
  return db
    .prepare(`SELECT * FROM unduhan ${where} ORDER BY updated_at DESC`)
    .all(kategori) as Unduhan[];
}

export function getAllUnduhanByKategoriGrouped(): Record<string, Unduhan[]> {
  ensureUnduhanTable();
  const rows = db
    .prepare("SELECT * FROM unduhan WHERE is_published = 1 ORDER BY kategori ASC, updated_at DESC")
    .all() as Unduhan[];
  const grouped: Record<string, Unduhan[]> = {};
  for (const r of rows) {
    if (!grouped[r.kategori]) grouped[r.kategori] = [];
    grouped[r.kategori].push(r);
  }
  return grouped;
}

export function getAllUnduhanAdmin(): Unduhan[] {
  ensureUnduhanTable();
  return db
    .prepare("SELECT * FROM unduhan ORDER BY kategori ASC, updated_at DESC")
    .all() as Unduhan[];
}

export function getUnduhanById(id: number): Unduhan | null {
  ensureUnduhanTable();
  const row = db.prepare("SELECT * FROM unduhan WHERE id = ?").get(id) as Unduhan | undefined;
  return row ?? null;
}

// === Aduan Masyarakat ===

export const JENIS_ADUAN = [
  'Pelayanan Publik',
  'Administrasi Kependudukan',
  'Infrastruktur',
  'Keamanan & Ketertiban',
  'Lingkungan',
  'Lainnya',
] as const;

export const STATUS_ADUAN = ['baru', 'diproses', 'selesai', 'ditolak'] as const;

// Nomor aduan unik: ADM-YYYYMMDD-XXXX (dipakai pengadu untuk tracking)
function generateNomorAduan(): string {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase(); // 4 hex char
  return `ADM-${ymd}-${rand}`;
}

export function createAduan(input: {
  desa_id: number | null;
  jenis: string;
  isi: string;
  nama: string;
  nik: string | null;
  telepon: string;
  email: string | null;
  alamat: string | null;
}): Aduan {
  // Coba beberapa kali kalau nomor bentrok (UNIQUE constraint)
  for (let attempt = 0; attempt < 5; attempt++) {
    const nomor = generateNomorAduan();
    try {
      const res = db
        .prepare(
          `INSERT INTO aduan (nomor, desa_id, jenis, isi, nama, nik, telepon, email, alamat)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(nomor, input.desa_id, input.jenis, input.isi, input.nama, input.nik, input.telepon, input.email, input.alamat);
      return db.prepare('SELECT * FROM aduan WHERE id = ?').get(res.lastInsertRowid) as Aduan;
    } catch (e) {
      if (!(e as Error).message.includes('UNIQUE')) throw e;
    }
  }
  throw new Error('Gagal membuat nomor aduan unik');
}

export type AduanWithDesa = Aduan & { desa_nama: string | null };

export function getAduanByNomor(nomor: string): AduanWithDesa | null {
  const row = db
    .prepare(
      `SELECT a.*, d.nama AS desa_nama
       FROM aduan a
       LEFT JOIN desa d ON d.id = a.desa_id
       WHERE a.nomor = ?`,
    )
    .get(nomor.trim().toUpperCase()) as AduanWithDesa | undefined;
  return row ?? null;
}

export function getAllAduanAdmin(status?: string): AduanWithDesa[] {
  const where = status && STATUS_ADUAN.includes(status as (typeof STATUS_ADUAN)[number]) ? 'WHERE a.status = ?' : '';
  return db
    .prepare(
      `SELECT a.*, d.nama AS desa_nama
       FROM aduan a
       LEFT JOIN desa d ON d.id = a.desa_id
       ${where}
       ORDER BY a.created_at DESC`,
    )
    .all(...(where ? [status] : [])) as AduanWithDesa[];
}

export function getAduanStats(): { total: number; baru: number; diproses: number; selesai: number } {
  const rows = db.prepare('SELECT status, COUNT(*) AS c FROM aduan GROUP BY status').all() as Array<{ status: string; c: number }>;
  const map = new Map(rows.map((r) => [r.status, r.c]));
  return {
    total: rows.reduce((s, r) => s + r.c, 0),
    baru: map.get('baru') ?? 0,
    diproses: map.get('diproses') ?? 0,
    selesai: map.get('selesai') ?? 0,
  };
}

// === Artikel / Berita Kecamatan (konten manual) ===

export const KATEGORI_BERITA = ['Berita', 'Pengumuman', 'Kegiatan', 'Pelayanan'] as const;

// Slug URL-friendly dari judul (unik divalidasi saat insert/update)
export function slugifyBerita(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 200);
}

export function getBeritaById(id: number): ArtikelKecamatan | null {
  const row = db.prepare('SELECT * FROM artikel_kecamatan WHERE id = ?').get(id) as ArtikelKecamatan | undefined;
  return row ?? null;
}

export function getBeritaBySlug(slug: string, publishedOnly = true): ArtikelKecamatan | null {
  const row = db
    .prepare(`SELECT * FROM artikel_kecamatan WHERE slug = ? ${publishedOnly ? 'AND is_published = 1' : ''}`)
    .get(slug) as ArtikelKecamatan | undefined;
  return row ?? null;
}

export function getBeritaFotos(artikelId: number): ArtikelKecamatanFoto[] {
  return db
    .prepare('SELECT * FROM artikel_kecamatan_foto WHERE artikel_id = ? ORDER BY urutan ASC, id ASC')
    .all(artikelId) as ArtikelKecamatanFoto[];
}

export function getRecentBerita(limit = 4): ArtikelKecamatan[] {
  return db
    .prepare('SELECT * FROM artikel_kecamatan WHERE is_published = 1 ORDER BY published_at DESC, id DESC LIMIT ?')
    .all(limit) as ArtikelKecamatan[];
}

export function getBeritaPaginated(page: number, pageSize: number): { items: ArtikelKecamatan[]; total: number } {
  const total = (db.prepare('SELECT COUNT(*) AS c FROM artikel_kecamatan WHERE is_published = 1').get() as { c: number }).c;
  const items = db
    .prepare('SELECT * FROM artikel_kecamatan WHERE is_published = 1 ORDER BY published_at DESC, id DESC LIMIT ? OFFSET ?')
    .all(pageSize, (page - 1) * pageSize) as ArtikelKecamatan[];
  return { items, total };
}

export function getAllBeritaAdmin(): ArtikelKecamatan[] {
  return db
    .prepare('SELECT * FROM artikel_kecamatan ORDER BY created_at DESC, id DESC')
    .all() as ArtikelKecamatan[];
}

// Untuk "berita lainnya" di halaman detail
export function getBeritaLainnya(excludeId: number, limit = 4): ArtikelKecamatan[] {
  return db
    .prepare('SELECT * FROM artikel_kecamatan WHERE is_published = 1 AND id != ? ORDER BY published_at DESC, id DESC LIMIT ?')
    .all(excludeId, limit) as ArtikelKecamatan[];
}

export function incrementBeritaView(id: number) {
  db.prepare('UPDATE artikel_kecamatan SET view_count = view_count + 1 WHERE id = ?').run(id);
}

// ===== Admin: kelola artikel hasil sinkron per desa (dengan pencarian + paginasi) =====
export type AdminArtikelPage = {
  items: Artikel[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function getArtikelByDesaAdmin(
  desaId: number,
  opts: { q?: string; page?: number; pageSize?: number } = {},
): AdminArtikelPage {
  const q = (opts.q ?? '').trim().toLowerCase();
  const pageSize = Math.max(1, opts.pageSize ?? 25);

  const where = ['desa_id = ?'];
  const params: (string | number)[] = [desaId];
  if (q) {
    where.push('(LOWER(judul) LIKE ? OR LOWER(slug) LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  const whereSql = where.join(' AND ');

  const total = (db.prepare(`SELECT COUNT(*) AS c FROM artikel WHERE ${whereSql}`).get(...params) as { c: number }).c;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, opts.page ?? 1), totalPages);
  const items = db
    .prepare(`SELECT * FROM artikel WHERE ${whereSql} ORDER BY published_at DESC, id DESC LIMIT ? OFFSET ?`)
    .all(...params, pageSize, (page - 1) * pageSize) as Artikel[];

  return { items, total, page, pageSize, totalPages };
}

// ===== Profil & lembaga desa (hasil sinkron) =====
export const PROFIL_JENIS_LABEL: Record<string, string> = {
  pemerintah: 'Pemerintah Desa',
  profil: 'Profil Wilayah',
  sejarah: 'Sejarah',
  visi_misi: 'Visi & Misi',
  lembaga: 'Lembaga Desa',
};

const PROFIL_JENIS_ORDER: Record<string, number> = {
  pemerintah: 0,
  profil: 1,
  sejarah: 2,
  visi_misi: 3,
  lembaga: 4,
};

export function getProfilByDesaId(desaId: number): ProfilDesa[] {
  const rows = db.prepare('SELECT * FROM profil_desa WHERE desa_id = ?').all(desaId) as ProfilDesa[];
  return rows.sort(
    (a, b) =>
      (PROFIL_JENIS_ORDER[a.jenis] ?? 9) - (PROFIL_JENIS_ORDER[b.jenis] ?? 9) ||
      a.judul.localeCompare(b.judul),
  );
}

export function getPerangkatByDesaId(desaId: number): PerangkatDesa[] {
  return db
    .prepare('SELECT * FROM perangkat_desa WHERE desa_id = ? ORDER BY urutan ASC, id ASC')
    .all(desaId) as PerangkatDesa[];
}

export function getStatistikByDesaId(desaId: number, kategori?: string): StatistikDesa[] {
  if (kategori) {
    return db
      .prepare('SELECT * FROM statistik_desa WHERE desa_id = ? AND kategori = ? ORDER BY urutan ASC')
      .all(desaId, kategori) as StatistikDesa[];
  }
  return db
    .prepare('SELECT * FROM statistik_desa WHERE desa_id = ? ORDER BY kategori ASC, urutan ASC')
    .all(desaId) as StatistikDesa[];
}

/** Ringkasan penduduk semua desa (dari kategori jenis_kelamin) untuk tabel perbandingan. */
export function getStatistikRingkasanSemuaDesa(): {
  slug: string;
  nama: string;
  penduduk: number;
  laki: number;
  perempuan: number;
  statistik_at: string | null;
}[] {
  return db
    .prepare(
      `SELECT d.slug, d.nama, d.statistik_at,
              COALESCE(SUM(s.jumlah), 0) AS penduduk,
              COALESCE(SUM(s.laki), 0) AS laki,
              COALESCE(SUM(s.perempuan), 0) AS perempuan
       FROM desa d
       LEFT JOIN statistik_desa s ON s.desa_id = d.id AND s.kategori = 'jenis_kelamin'
       WHERE d.is_active = 1
       GROUP BY d.id
       ORDER BY d.nama ASC`,
    )
    .all() as { slug: string; nama: string; penduduk: number; laki: number; perempuan: number; statistik_at: string | null }[];
}

/**
 * Agregasi statistik SELURUH desa aktif menjadi satu kecamatan.
 * Menjumlahkan jumlah/laki/perempuan per (kategori, nama) — label OpenSID
 * konsisten antar desa sehingga aman di-GROUP BY nama.
 */
export function getStatistikAgregatKecamatan(kategori?: string): StatistikDesa[] {
  // Subquery menormalisasi label umur_kategori: "TUA (31 - 150)" & "TUA (31 - 99999)"
  // (rentang dalam kurung bisa beda antar desa) digabung menjadi "TUA".
  const inner = `
    SELECT s.kategori AS kategori, s.urutan AS urutan,
           CASE WHEN s.kategori = 'umur_kategori' AND INSTR(s.nama, ' (') > 0
                THEN TRIM(SUBSTR(s.nama, 1, INSTR(s.nama, ' (') - 1))
                ELSE s.nama END AS nama,
           s.jumlah AS jumlah, s.laki AS laki, s.perempuan AS perempuan
    FROM statistik_desa s
    JOIN desa d ON d.id = s.desa_id AND d.is_active = 1
    ${kategori ? 'WHERE s.kategori = ?' : ''}`;
  const sql = `
    SELECT 0 AS id, 0 AS desa_id, kategori, MIN(urutan) AS urutan, nama,
           SUM(jumlah) AS jumlah, SUM(laki) AS laki, SUM(perempuan) AS perempuan,
           NULL AS persen
    FROM (${inner})
    GROUP BY kategori, nama
    ORDER BY ${kategori ? 'urutan ASC, nama ASC' : 'kategori ASC, urutan ASC, nama ASC'}`;
  if (kategori) {
    return db.prepare(sql).all(kategori) as StatistikDesa[];
  }
  return db.prepare(sql).all() as StatistikDesa[];
}
