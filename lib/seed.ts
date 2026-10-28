import { db, hashPassword } from './db';

// Daftar 17 desa di Kecamatan Banjarmangu, Kabupaten Banjarnegara
// Domain bersumber dari pantauan OpenSID / Clasnet
export const DESA_BANJARMANGU = [
  { slug: 'banjarkulon',     nama: 'Banjarkulon',  website: 'https://banjarkulon-banjarnegara.desa.id' },
  { slug: 'banjarmangu',     nama: 'Banjarmangu',  website: 'https://banjarmangu-banjarnegara.desa.id' },
  { slug: 'beji',            nama: 'Beji',         website: 'https://beji-banjarnegara.desa.id' },
  { slug: 'gripit',          nama: 'Gripit',       website: 'https://gripit-banjarnegara.desa.id' },
  { slug: 'jenggawur',       nama: 'Jenggawur',    website: 'https://jenggawur-banjarnegara.desa.id' },
  { slug: 'kalilunjar',      nama: 'Kalilunjar',   website: 'https://kalilunjar-banjarnegara.desa.id' },
  { slug: 'kendaga',         nama: 'Kendaga',      website: 'https://kendaga-banjarnegara.desa.id' },
  { slug: 'kesenet',         nama: 'Kesenet',      website: 'https://kesenet-banjarnegara.desa.id' },
  { slug: 'majatengah',      nama: 'Majatengah',   website: 'https://majatengah-banjarmangu.desa.id' },
  { slug: 'paseh',           nama: 'Paseh',        website: 'https://paseh-banjarnegara.desa.id' },
  { slug: 'pekandangan',     nama: 'Pekandangan',  website: 'https://pekandangan-banjarnegara.desa.id' },
  { slug: 'prendengan',      nama: 'Prendengan',   website: 'https://prendengan-banjarmangu.sistemdata.id' },
  { slug: 'rejasari',        nama: 'Rejasari',     website: 'https://rejasari-banjarnegara.desa.id' },
  { slug: 'sigeblog',        nama: 'Sigeblog',     website: 'https://sigeblog-banjarnegara.desa.id' },
  { slug: 'sijenggung',      nama: 'Sijenggung',   website: 'https://sijenggung-banjarnegara.desa.id' },
  { slug: 'sijeruk',         nama: 'Sijeruk',      website: 'https://sijeruk-banjarnegara.desa.id' },
  { slug: 'sipedang',        nama: 'Sipedang',     website: 'https://sipedang-banjarnegara.desa.id' },
];

export function seedDesa() {
  // Perbaikan: jika website berubah, feed_url lama mungkin sudah stale.
  // Kita update feed_url hanya jika feed_url saat ini masih mengandung domain
  // "sistemdata.id" (host lama yang tidak bisa serve RSS) atau tidak ada.
  const fixFeed = db.prepare(`
    UPDATE desa
    SET feed_url = @new_feed
    WHERE slug = @slug
      AND (feed_url IS NULL OR feed_url = '' OR feed_url LIKE '%sistemdata.id%')
  `);

  const stmt = db.prepare(`
    INSERT INTO desa (slug, nama, website, feed_url, scraper_enabled, is_active)
    VALUES (@slug, @nama, @website, @feed_url, 1, 1)
    ON CONFLICT(slug) DO UPDATE SET
      nama = excluded.nama,
      website = excluded.website
  `);

  const fixFeedMany = db.transaction((rows: typeof DESA_BANJARMANGU) => {
    for (const r of rows) {
      const newFeed = `${r.website}/feed`;
      fixFeed.run({ slug: r.slug, new_feed: newFeed });
    }
  });
  fixFeedMany(DESA_BANJARMANGU);

  const insertMany = db.transaction((rows: typeof DESA_BANJARMANGU) => {
    for (const r of rows) {
      stmt.run({
        slug: r.slug,
        nama: r.nama,
        website: r.website,
        feed_url: `${r.website}/feed`,
      });
    }
  });
  insertMany(DESA_BANJARMANGU);

  // Buat admin default (username: admin, password: admin123).
  // Pakai INSERT OR IGNORE supaya race antar worker build tidak error.
  db.prepare(
    'INSERT OR IGNORE INTO admin_user (username, password_hash) VALUES (?, ?)',
  ).run('admin', hashPassword('admin123'));
  seedPerangkatDesa();
}

/** Seed tabel profil_kecamatan jika belum ada */
export function seedProfilKecamatan() {
  // Buat tabel jika belum ada
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

  // Seed data jika kosong
  const profilCount = db.prepare("SELECT COUNT(*) AS c FROM profil_kecamatan").get() as { c: number };
  if (profilCount.c === 0) {
    db.prepare(`
      INSERT INTO profil_kecamatan (nama_kecamatan, kabupaten, provinsi, website_sumber)
      VALUES ('Banjarmangu', 'Banjarnegara', 'Jawa Tengah', 'https://banjarmangu.banjarnegarakab.go.id/')
    `).run();
  }
}

export function seedPerangkatDesa() {
  const count = (db.prepare('SELECT COUNT(*) AS c FROM perangkat_desa WHERE desa_id IN (10, 12, 15)').get() as { c: number }).c;
  if (count > 5) return; // Sudah terisi

  const sijenggungPamong = [
    { nama: 'SUYONO', jabatan: 'Kepala Desa', foto: 'https://sijenggung-banjarnegara.desa.id/desa/upload/user_pict/1662428873208010.jpeg' },
    { nama: 'TEGUH GIANA', jabatan: 'Sekretaris Desa', foto: 'https://sijenggung-banjarnegara.desa.id/desa/upload/user_pict/2kwrb_pamong_1790580951-51-183221.webp' },
    { nama: 'SUPRIYANTO', jabatan: 'Kasi Kesejahteraan', foto: 'https://sijenggung-banjarnegara.desa.id/desa/upload/user_pict/166242887360780.jpeg' },
    { nama: 'WAHYUDIANA', jabatan: 'Kasi Pelayanan', foto: 'https://sijenggung-banjarnegara.desa.id/desa/upload/user_pict/1662428873696283.jpeg' },
    { nama: 'TATUN FITNA ARIASIH', jabatan: 'Kasi Pemerintahan', foto: 'https://sijenggung-banjarnegara.desa.id/desa/upload/user_pict/1662428873892155.jpg' },
    { nama: 'SAKHERUN', jabatan: 'Kaur Umum', foto: 'https://sijenggung-banjarnegara.desa.id/desa/upload/user_pict/1662428873832129.jpeg' },
    { nama: 'SIGIT WAGITO', jabatan: 'Kaur Perencanaan', foto: 'https://sijenggung-banjarnegara.desa.id/desa/upload/user_pict/166242887368230.jpg' },
    { nama: 'DEPI LASPRIATI', jabatan: 'Kaur Keuangan', foto: 'https://sijenggung-banjarnegara.desa.id/desa/upload/user_pict/166242887333386.jpeg' },
    { nama: 'AMIN SETIANTO', jabatan: 'Kadus I', foto: 'https://sijenggung-banjarnegara.desa.id/desa/upload/user_pict/1662428873222622.jpeg' },
    { nama: 'BISPANTO', jabatan: 'Kadus II', foto: 'https://sijenggung-banjarnegara.desa.id/desa/upload/user_pict/1662428873369144.jpeg' },
    { nama: 'PONDEH', jabatan: 'Kadus III', foto: 'https://sijenggung-banjarnegara.desa.id/desa/upload/user_pict/WRY2r_pamong_1779711955-48-970703.webp' },
  ];

  const pasehPamong = [
    { nama: 'WARIS MUSTOFA', jabatan: 'Kepala Desa', foto: 'https://paseh-banjarnegara.desa.id/desa/upload/user_pict/1740108404964204.jpg' },
    { nama: 'SURANTO', jabatan: 'Sekretaris', foto: 'https://paseh-banjarnegara.desa.id/desa/upload/user_pict/1740108445484862.jpg' },
    { nama: 'PUTHUT HERI CAHYADI', jabatan: 'Kepala Seksi Pemerintahan', foto: 'https://paseh-banjarnegara.desa.id/desa/upload/user_pict/1740108462981018.jpg' },
    { nama: 'YAYAN BUDHI PRASETYA', jabatan: 'Kepala Urusan TU-Umum', foto: 'https://paseh-banjarnegara.desa.id/desa/upload/user_pict/1740108479871688.jpg' },
    { nama: 'RASMONO', jabatan: 'Kepala Seksi Kesejahteraan', foto: 'https://paseh-banjarnegara.desa.id/desa/upload/user_pict/1740108491131939.jpg' },
    { nama: 'KUSWAJI', jabatan: 'Kepala Urusan Keuangan', foto: 'https://paseh-banjarnegara.desa.id/desa/upload/user_pict/1740108506606254.jpg' },
    { nama: 'BURHANUDIN', jabatan: 'Kepala Seksi Pelayanan', foto: 'https://paseh-banjarnegara.desa.id/desa/upload/user_pict/1740108531979968.jpg' },
    { nama: 'AHLUL NAZA', jabatan: 'Kepala Urusan Perencanaan', foto: 'https://paseh-banjarnegara.desa.id/desa/upload/user_pict/1740108546683805.jpg' },
    { nama: 'YATIN BUDIMAN', jabatan: 'Kepala Dusun I', foto: 'https://paseh-banjarnegara.desa.id/desa/upload/user_pict/1740108558173007.jpg' },
    { nama: 'SLAMET PRIYONO', jabatan: 'Kepala Dusun II', foto: 'https://paseh-banjarnegara.desa.id/desa/upload/user_pict/1740108572543952.jpg' },
    { nama: 'AKHMAD PRASOJO', jabatan: 'Kepala Dusun III', foto: 'https://paseh-banjarnegara.desa.id/desa/upload/user_pict/1740108655611182.jpg' },
    { nama: 'MISTAR', jabatan: 'Kepala Dusun IV', foto: 'https://paseh-banjarnegara.desa.id/desa/upload/user_pict/1740108672874466.jpg' },
  ];

  const prendenganPamong = [
    { nama: 'MOHAMAD BAROKAH', jabatan: 'Kepala Desa', foto: null },
    { nama: 'NUKI NUFIAN', jabatan: 'Sekretaris Desa', foto: null },
    { nama: 'NURUL IKSAN', jabatan: 'Kaur Tu dan Umum', foto: null },
    { nama: 'RINDIYATI', jabatan: 'Kaur Perencanaan', foto: null },
    { nama: 'SITI ROCHJATI', jabatan: 'Kaur Keuangan', foto: null },
    { nama: 'ANDI MAULANA SETIADI', jabatan: 'Kasi Pemerintahan', foto: null },
    { nama: 'SYARIEF WAKHYO', jabatan: 'Kasi Kesejahteraan', foto: null },
    { nama: 'BAMBANG NURHADIYANTO', jabatan: 'Kasi Pelayanan', foto: null },
    { nama: 'BAMBANG NUROCHMAN', jabatan: 'Kepala Dusun 1', foto: null },
    { nama: 'KHASRIYATUN', jabatan: 'Kepala Dusun 2', foto: null },
    { nama: 'MAEDI IRAWAN', jabatan: 'Kepala Dusun 3', foto: null },
  ];

  const getDesaId = (slug: string) => (db.prepare('SELECT id FROM desa WHERE slug = ?').get(slug) as { id: number } | undefined)?.id;

  const saveList = (slug: string, list: Array<{ nama: string; jabatan: string; foto: string | null }>) => {
    const id = getDesaId(slug);
    if (!id) return;
    db.prepare('DELETE FROM perangkat_desa WHERE desa_id = ?').run(id);
    const ins = db.prepare('INSERT INTO perangkat_desa (desa_id, nama, jabatan, foto_url, urutan) VALUES (?, ?, ?, ?, ?)');
    list.forEach((p, i) => ins.run(id, p.nama, p.jabatan, p.foto, i));
  };

  saveList('sijenggung', sijenggungPamong);
  saveList('paseh', pasehPamong);
  saveList('prendengan', prendenganPamong);
}
