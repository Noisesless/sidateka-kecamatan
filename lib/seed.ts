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
        ...r,
        feed_url: `${r.website}/feed`,
      });
    }
  });
  insertMany(DESA_BANJARMANGU);
}

export function seedAdmin() {
  const existing = db.prepare('SELECT id FROM admin_user WHERE username = ?').get('admin');
  if (!existing) {
    const hash = hashPassword('admin123');
    db.prepare('INSERT INTO admin_user (username, password_hash) VALUES (?, ?)').run('admin', hash);
  }
}

export function seedProfilKecamatan() {
  const count = (db.prepare('SELECT COUNT(*) AS c FROM profil_kecamatan').get() as { c: number }).c;
  if (count === 0) {
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
    { nama: 'SUYONO', jabatan: 'Kepala Desa', foto: null },
    { nama: 'TEGUH GIANA', jabatan: 'Sekretaris Desa', foto: null },
    { nama: 'SUPRIYANTO', jabatan: 'Kasi Kesejahteraan', foto: null },
    { nama: 'WAHYUDIANA', jabatan: 'Kasi Pelayanan', foto: null },
    { nama: 'TATUN FITNA ARIASIH', jabatan: 'Kasi Pemerintahan', foto: null },
    { nama: 'SAKHERUN', jabatan: 'Kaur Umum', foto: null },
    { nama: 'SIGIT WAGITO', jabatan: 'Kaur Perencanaan', foto: null },
    { nama: 'DEPI LASPRIATI', jabatan: 'Kaur Keuangan', foto: null },
    { nama: 'AMIN SETIANTO', jabatan: 'Kadus I', foto: null },
    { nama: 'BISPANTO', jabatan: 'Kadus II', foto: null },
    { nama: 'PONDEH', jabatan: 'Kadus III', foto: null },
  ];

  const pasehPamong = [
    { nama: 'WARIS', jabatan: 'Kepala Desa', foto: '/foto/sync/perangkat/paseh-787c601f08a2.jpg' },
    { nama: 'SURANTO', jabatan: 'Sekretaris', foto: '/foto/sync/perangkat/paseh-415549cc63cb.jpg' },
    { nama: 'PUTHUT HERI CAHYADI', jabatan: 'Kepala Seksi Pemerintahan', foto: '/foto/sync/perangkat/paseh-7d93ae1933df.jpg' },
    { nama: 'YAYAN BUDHI PRASETYA', jabatan: 'Kepala Urusan TU-Umum', foto: '/foto/sync/perangkat/paseh-d5eaf85d4993.jpg' },
    { nama: 'RASMONO', jabatan: 'Kepala Seksi Kesejahteraan', foto: '/foto/sync/perangkat/paseh-2a31b59f890c.jpg' },
    { nama: 'KUSWAJI', jabatan: 'Kepala Urusan Keuangan', foto: '/foto/sync/perangkat/paseh-77bd84730ff8.jpg' },
    { nama: 'BURHANUDIN', jabatan: 'Kepala Seksi Pelayanan', foto: '/foto/sync/perangkat/paseh-478b986eca26.jpg' },
    { nama: 'AHLUL NAZA', jabatan: 'Kepala Urusan Perencanaan', foto: '/foto/sync/perangkat/paseh-ec113f7a25e5.jpg' },
    { nama: 'YATIN BUDIMAN', jabatan: 'Kepala Dusun I', foto: '/foto/sync/perangkat/paseh-a18830d8e39c.jpg' },
    { nama: 'SLAMET PRIYONO', jabatan: 'Kepala Dusun II', foto: '/foto/sync/perangkat/paseh-0d55cf65ba41.jpg' },
    { nama: 'AKHMAD PRASOJO', jabatan: 'Kepala Dusun III', foto: '/foto/sync/perangkat/paseh-f1426ab0b4c1.jpg' },
    { nama: 'MISTAR', jabatan: 'Kepala Dusun IV', foto: '/foto/sync/perangkat/paseh-d13631423873.jpg' },
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
