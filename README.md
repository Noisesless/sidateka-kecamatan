# SIDATEKA — Sistem Informasi Desa Terintegrasi Kecamatan Banjarmangu

**SIDATEKA** (*Sistim Informasi Desa Terintegrasi Kecamatan Banjarmangu*) adalah portal resmi terpadu Pemerintah Kecamatan Banjarmangu, Kabupaten Banjarnegara, Jawa Tengah. Platform ini menyajikan informasi publik, agregasi berita desa, data statistik kependudukan, serta layanan pengaduan masyarakat dari 17 desa di wilayah Kecamatan Banjarmangu.

---

## 🏛️ Fitur Utama

- **Agregasi Berita & Publikasi Desa:** Mengintegrasikan publikasi berita terkini dari 17 desa di wilayah Kecamatan Banjarmangu.
- **Portal Data Statistik:** Visualisasi data demografi dan kependudukan tingkat kecamatan dan desa.
- **Layanan Pengaduan Online:** Formulir aspirasi dan tracking status pengaduan masyarakat.
- **Direktori & Profil Desa:** Informasi kontak, profil perangkat desa, dan tautan resmi desa.

---

## 🛠️ Tech Stack

- **Framework:** [Next.js](https://nextjs.org) (App Router)
- **Library UI:** [React](https://react.dev)
- **Styling:** [Tailwind CSS](https://tailwindcss.com)
- **Database:** SQLite
- **Peta:** MapLibre GL

---

## 💻 Menjalankan di Lingkungan Lokal

### Prasyarat
- Node.js (versi 20 atau yang lebih baru)
- npm

### Instalasi & Menjalankan

1. Salin berkas konfigurasi environment:
   ```bash
   cp .env.example .env
   ```

2. Pasang dependensi:
   ```bash
   npm install
   ```

3. Jalankan server pengembang (development):
   ```bash
   npm run dev
   ```
   Buka [http://localhost:3000](http://localhost:3000) pada peramban Anda.

4. Build untuk tahap produksi:
   ```bash
   npm run build
   npm run start
   ```

---

## 📄 Lisensi
Pemerintah Kecamatan Banjarmangu, Kabupaten Banjarnegara.
