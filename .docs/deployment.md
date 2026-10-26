# DEPLOYMENT BLUEPRINT — PORTAL KECAMATAN BANJARMANGU (SIDATEKA)

Dokumen ini adalah Single Source of Truth (SSOT) untuk prosedur instalasi awal, monitoring, dan pembaruan rutin (*update production*) di server CloudPanel VPS.

---

## 1. Identitas Server & Spesifikasi Produksi
- **Target Platform:** CloudPanel / VPS Linux (Ubuntu / Debian)
- **Hostname Server:** `nargaroth` (IP: `103.255.133.227`)
- **User SSH:** `sidateka-bjmangu-01` (Non-Root / Non-Sudo)
- **Root Path:** `/home/sidateka-bjmangu-01/htdocs/sidateka.banjarmangu.banjarnegarakab.go.id`
- **Domain Produksi:** `sidateka.banjarmangu.banjarnegarakab.go.id`
- **Reverse Proxy:** Nginx CloudPanel Reverse Proxy ke `http://127.0.0.1:3010`
- **Port Produksi:** `3010`
- **Process Manager:** PM2 (dipasang di lokal user `~/.npm-global/bin/pm2`)
- **Process Name:** `sidateka` (Process ID: `0`)
- **Node.js Runtime:** `v24.22.0`
- **Next.js Engine:** `16.4.2` (Turbopack, Patched Release)
- **Repository GitHub:** `https://github.com/Noisesless/sidateka-kecamatan.git` (Branch: `main`)
- **Database & Uploads Persistence:**
  - Database: `.data/portal.db` (SQLite WAL mode)
  - Foto Berita & Perangkat: `.data/uploads/sync/`
  - *Folder `.data/` dan file `.env` diabaikan oleh Git via `.gitignore` sehingga tidak akan terhapus saat update.*

---

## 2. Environment Variables (.env)

File `.env` di server produksi wajib tersimpan di root proyek dengan permission `600`:

```env
PORT=3010
NODE_ENV=production
DATABASE_PATH=/home/sidateka-bjmangu-01/htdocs/sidateka.banjarmangu.banjarnegarakab.go.id/.data/portal.db
SESSION_SECRET=<random-48-byte-hex-string>
```

---

## 3. SOP UPDATE PRODUKSI (Pembaruan Rutin) ⚡

Setiap kali ada pembaruan kode baru yang telah di-commit ke GitHub, jalankan langkah standar berikut:

```bash
# 1. Masuk ke direktori web
cd ~/htdocs/sidateka.banjarmangu.banjarnegarakab.go.id

# 2. Tarik kode terbaru dari GitHub
git pull origin main

# 3. Build bundle produksi Next.js (WAJIB agar Server Actions dan chunk terbarui)
npm run build

# 4. Restart proses PM2
pm2 restart sidateka

# 5. Verifikasi log (pastikan status ready tanpa error)
pm2 logs sidateka --lines 20
```

> ⚠️ **PENTING:** Selalu jalankan `npm run build` sebelum `pm2 restart`. Melewatkan build akan menyebabkan error `The Server Reference ID did not match the expected format` karena Next.js masih mengeksekusi chunk versi lama di folder `.next/`.

---

## 4. Troubleshooting & Solusi Kasus Khusus

### A. Kasus: `fatal: not a git repository`
**Penyebab:** Folder website di-upload secara manual (ZIP / SFTP) sehingga direktori `.git` belum terbentuk.  
**Solusi Aman (Database `.data` dan `.env` tetap terjaga):**
```bash
cd ~/htdocs/sidateka.banjarmangu.banjarnegarakab.go.id

# Inisialisasi git dan hubungkan ke remote
git init
git remote add origin https://github.com/Noisesless/sidateka-kecamatan.git
git fetch origin main

# Sinkronkan file dengan branch main
git reset --mixed origin/main
git checkout -f main
git branch --set-upstream-to=origin/main main

# Build dan restart
npm run build
pm2 restart sidateka
```

---

### B. Kasus: `[PM2][ERROR] Process or Namespace ... not found`
**Penyebab:** Nama proses di PM2 berbeda atau PM2 belum pernah dijalankan di sesi tersebut.  
**Solusi:**
```bash
# 1. Cek daftar proses yang aktif
pm2 list

# 2. Jika muncul id 0 dengan nama sidateka:
pm2 restart 0
# atau
pm2 restart sidateka

# 3. Jika daftar PM2 kosong (belum ada proses):
pm2 start npm --name "sidateka" -- start -- -p 3010
pm2 save
```

---

### C. Kasus: `Server Reference ID did not match the expected format. Received "y"`
**Penyebab:** Ada form atau request yang mengakses Server Action lama dari client/browser, sementara bundle `.next/` belum di-build ulang setelah update source code.  
**Solusi:**
```bash
npm run build
pm2 restart sidateka
```

---

## 5. Setup Awal dari Nol (Fresh Installation)

Jika melakukan deployment di server/subdomain baru dari nol:

1. **Kloning Repository:**
   ```bash
   cd ~/htdocs/sidateka.banjarmangu.banjarnegarakab.go.id
   rm -f index.html
   git clone https://github.com/Noisesless/sidateka-kecamatan.git .
   ```

2. **Inisialisasi Environment (.env):**
   ```bash
   bash init-env.sh 3010
   ```

3. **Instalasi PM2 (User Non-Root):**
   ```bash
   mkdir -p ~/.npm-global
   npm install -g --prefix=~/.npm-global pm2
   export PATH="$HOME/.npm-global/bin:$PATH"
   echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.bashrc
   ```

4. **Kompilasi & Build:**
   ```bash
   npm ci
   npm run build
   ```

5. **Jalankan Aplikasi:**
   ```bash
   PORT=3010 pm2 start npm --name "sidateka" -- start -- -p 3010
   pm2 save
   ```

6. **Konfigurasi SSL di CloudPanel:**
   - CloudPanel -> **Sites** -> **sidateka.banjarmangu.banjarnegarakab.go.id** -> **SSL/TLS**.
   - Pilih **New Let's Encrypt Certificate** -> **Create and Install**.

---

## 6. Perintah Operasional Harian

| Kebutuhan | Perintah Terminal |
|---|---|
| Cek status service | `pm2 status` atau `pm2 list` |
| Monitor penggunaan CPU/RAM | `pm2 monit` |
| Pantau live log | `pm2 logs sidateka --lines 50` |
| Restart aplikasi | `pm2 restart sidateka` |
| Stop aplikasi | `pm2 stop sidateka` |
| Simpan daftar proses | `pm2 save` |
