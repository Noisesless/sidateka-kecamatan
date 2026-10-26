# ROUTES BLUEPRINT — PORTAL KECAMATAN BANJARMANGU

## Frontend Routes (Pages)

| Route Path | File | Page Title | Auth | Status |
|---|---|---|---|---|
| `/` | `app/page.tsx` | Beranda Portal Kecamatan | Public | STABLE |
| `/artikel` | `app/artikel/page.tsx` | Berita & Artikel Desa | Public | STABLE |
| `/artikel/[slug]/[artikel]` | `app/artikel/[slug]/[artikel]/page.tsx` | Detail Berita Desa | Public | STABLE |
| `/berita` | `app/berita/page.tsx` | Berita Resmi Kecamatan | Public | STABLE |
| `/berita/[slug]` | `app/berita/[slug]/page.tsx` | Detail Berita Kecamatan | Public | STABLE |
| `/desa` | `app/desa/page.tsx` | Direktori 17 Desa | Public | STABLE |
| `/desa/[slug]` | `app/desa/[slug]/page.tsx` | Profil Desa & Perangkat | Public | STABLE |
| `/desa/[slug]/analitik` | `app/desa/[slug]/analitik/page.tsx` | Analitik Demografi Desa | Public | STABLE |
| `/profil` | `app/profil/page.tsx` | Profil & Sejarah Kecamatan | Public | STABLE |
| `/profil/letak-geografis` | `app/profil/letak-geografis/page.tsx` | Letak Geografis Wilayah | Public | STABLE |
| `/profil/struktur-pemerintahan` | `app/profil/struktur-pemerintahan/page.tsx` | Struktur Organisasi Kecamatan | Public | STABLE |
| `/profil/visi-misi` | `app/profil/visi-misi/page.tsx` | Visi & Misi Kecamatan | Public | STABLE |
| `/profil/tupoksi` | `app/profil/tupoksi/page.tsx` | Tugas Pokok & Fungsi | Public | STABLE |
| `/ppid` | `app/ppid/page.tsx` | Layanan Informasi PPID | Public | STABLE |
| `/ppid/informasi-berkala` | `app/ppid/informasi-berkala/page.tsx` | Informasi Berkala | Public | STABLE |
| `/ppid/informasi-setiap-saat` | `app/ppid/informasi-setiap-saat/page.tsx` | Informasi Setiap Saat | Public | STABLE |
| `/ppid/surat-keputusan` | `app/ppid/surat-keputusan/page.tsx` | Surat Keputusan PPID | Public | STABLE |
| `/ppid/surat-keputusan/pdf` | `app/ppid/surat-keputusan/pdf/page.tsx` | PDF Viewer Surat Keputusan | Public | STABLE |
| `/foto/[...path]` | `app/foto/[...path]/route.ts` | Proxy Cache Gambar Foto Desa | Public | STABLE |
| `/manifest.webmanifest` | `app/manifest.ts` | PWA Manifest Metadata | Public | STABLE |
| `/statistik` | `app/statistik/page.tsx` | Statistik Kependudukan | Public | STABLE |
| `/statistik/pendidikan` | `app/statistik/pendidikan/page.tsx` | Statistik Pendidikan | Public | STABLE |
| `/statistik/kesehatan` | `app/statistik/kesehatan/page.tsx` | Statistik Kesehatan | Public | STABLE |
| `/statistik/program-dan-bantuan` | `app/statistik/program-dan-bantuan/page.tsx` | Statistik Bantuan Sosial | Public | STABLE |
| `/statistik/anggaran-dan-realisasi` | `app/statistik/anggaran-dan-realisasi/page.tsx` | Realisasi Anggaran APBDes | Public | STABLE |
| `/analitik` | `app/analitik/page.tsx` | Analitik Agregat Kecamatan | Public | STABLE |
| `/pelayanan-publik` | `app/pelayanan-publik/page.tsx` | Standar Pelayanan Publik | Public | STABLE |
| `/pelayanan-publik/maklumat-pelayanan` | `app/pelayanan-publik/maklumat-pelayanan/page.tsx` | Maklumat Pelayanan | Public | STABLE |
| `/pelayanan-publik/sop` | `app/pelayanan-publik/sop/page.tsx` | Standar Operasional Prosedur | Public | STABLE |
| `/pelayanan-publik/sk-standar-pelayanan` | `app/pelayanan-publik/sk-standar-pelayanan/page.tsx` | SK Standar Pelayanan | Public | STABLE |
| `/pelayanan-publik/sk-jam-pelayanan` | `app/pelayanan-publik/sk-jam-pelayanan/page.tsx` | SK Jam Pelayanan Kantor | Public | STABLE |
| `/pelayanan-publik/sk-maklumat-pelayanan` | `app/pelayanan-publik/sk-maklumat-pelayanan/page.tsx` | SK Maklumat Pelayanan | Public | STABLE |
| `/pelayanan-publik/hasil-survei` | `app/pelayanan-publik/hasil-survei/page.tsx` | Hasil Survei SKM | Public | STABLE |
| `/unduhan` | `app/unduhan/page.tsx` | Katalog Dokumen & Unduhan | Public | STABLE |
| `/unduhan/prosedur` | `app/unduhan/prosedur/page.tsx` | Unduhan SOP & Prosedur | Public | STABLE |
| `/unduhan/regulasi` | `app/unduhan/regulasi/page.tsx` | Unduhan Peraturan & Regulasi | Public | STABLE |
| `/unduhan/form-dokumen` | `app/unduhan/form-dokumen/page.tsx` | Unduhan Formulir Layanan | Public | STABLE |
| `/aduan` | `app/aduan/page.tsx` | Form Pengaduan Masyarakat | Public | STABLE |
| `/aduan/lacak` | `app/aduan/lacak/page.tsx` | Lacak Status Aduan Tiket | Public | STABLE |
| `/faq` | `app/faq/page.tsx` | Tanya Jawab Umum (FAQ) | Public | STABLE |
| `/tentang` | `app/tentang/page.tsx` | Tentang Portal Kecamatan | Public | STABLE |
| `/admin` | `app/admin/page.tsx` | Dashboard Admin Kecamatan | Admin | STABLE |
| `/admin/login` | `app/admin/login/page.tsx` | Autentikasi Admin | Public | STABLE |
| `/admin/desa` | `app/admin/desa/page.tsx` | Manajemen Desa & API Key | Admin | STABLE |
| `/admin/desa/[id]` | `app/admin/desa/[id]/page.tsx` | Konfigurasi Scraper Desa | Admin | STABLE |
| `/admin/berita` | `app/admin/berita/page.tsx` | Manajemen Berita Kecamatan | Admin | STABLE |
| `/admin/profil` | `app/admin/profil/page.tsx` | Pengaturan Profil Kecamatan | Admin | STABLE |
| `/admin/unduhan` | `app/admin/unduhan/page.tsx` | Manajemen File Unduhan | Admin | STABLE |
| `/admin/aduan` | `app/admin/aduan/page.tsx` | Manajemen Aduan Warga | Admin | STABLE |

---

## Backend / API Routes

| Method | Endpoint | Handler | Auth | Status |
|---|---|---|---|---|
| `POST` | `/api/aduan` | `app/api/aduan/route.ts` | Public (Rate Limited) | STABLE |
| `POST` | `/api/push/artikel` | `app/api/push/artikel/route.ts` | API Key (`X-API-Key`) | STABLE |
| `GET` | `/api/statistik/sync` | `app/api/statistik/sync/route.ts` | Admin / Cron Key | STABLE |
| `GET, POST` | `/api/sync` | `app/api/sync/route.ts` | Admin / Cron Key | STABLE |
| `GET, POST` | `/api/sync/one` | `app/api/sync/one/route.ts` | Admin Session | STABLE |
| `GET, POST` | `/api/sync/probe` | `app/api/sync/probe/route.ts` | Admin Session | STABLE |
| `GET, POST` | `/api/sync/run` | `app/api/sync/run/route.ts` | Admin Session | STABLE |
| `GET` | `/api/sync/test` | `app/api/sync/test/route.ts` | Public Debug | STABLE |
| `GET, POST` | `/api/visitor` | `app/api/visitor/route.ts` | Public | STABLE |
