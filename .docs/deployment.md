# DEPLOYMENT BLUEPRINT — PORTAL KECAMATAN BANJARMANGU

## 1. Target & Architecture Lingkungan Produksi
- **Target Platform:** CloudPanel / VPS Linux (Ubuntu / Debian)
- **Hostname Server:** `nargaroth` (IP: `103.255.133.227`)
- **User SSH:** `sidateka-bjmangu-01` (Non-Root / Non-Sudo)
- **Root Path:** `/home/sidateka-bjmangu-01/htdocs/sidateka.banjarmangu.banjarnegarakab.go.id`
- **Domain Produksi:** `sidateka.banjarmangu.banjarnegarakab.go.id`
- **Reverse Proxy:** Nginx CloudPanel Reverse Proxy ke port Node.js
- **Port Produksi:** `3010`
- **Process Manager:** PM2 (dipasang di lokal user `~/.npm-global/bin/pm2`)
- **Process Name:** `sidateka` (Online, cluster fork, memory ~55MB)
- **Node.js Runtime:** `v24.22.0`
- **Next.js Engine:** `16.4.2` (Turbopack, Patched Release)
- **Database Persistence:** `.data/portal.db` tersimpan di local persistent disk (diabaikan dari git via `.gitignore`)

---

## 2. Environment Variables Mapping

| Variable | Lingkungan Dev | Lingkungan Produksi | Deskripsi |
|---|---|---|---|
| `NODE_ENV` | `development` | `production` | Mode Next.js runtime |
| `PORT` | `3100` | `3010` | Port listening HTTP server |
| `DATABASE_PATH` | `.data/portal.db` | `/home/sidateka-bjmangu-01/htdocs/sidateka.banjarmangu.banjarnegarakab.go.id/.data/portal.db` | Path mutlak SQLite |
| `SESSION_SECRET` | `dev-secret-key-12345` | Random 48-byte hex string (auto-gen by `init-env.sh`) | Kunci enkripsi cookie session admin |

---

## 3. Checklist Deployment (Langkah demi Langkah)

1. **Persiapan Direktori & Kloning Repository:**
   ```bash
   cd ~/htdocs/sidateka.banjarmangu.banjarnegarakab.go.id
   rm -f index.html
   git clone https://github.com/diskonnekted/kecamatan.git .
   ```

2. **Inisialisasi Environment (.env) Port 3010:**
   ```bash
   bash init-env.sh 3010
   ```

3. **Instalasi PM2 untuk Akun Non-Root:**
   ```bash
   mkdir -p ~/.npm-global
   npm install -g --prefix=~/.npm-global pm2
   export PATH="$HOME/.npm-global/bin:$PATH"
   echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.bashrc
   ```

4. **Kompilasi & Optimasi Bundle:**
   ```bash
   npm ci
   npm run build
   npm prune --omit=dev
   ```

5. **Eksekusi & Persistensi PM2:**
   ```bash
   PORT=3010 pm2 start npm --name "sidateka" -- start -- -p 3010
   pm2 save
   ```

6. **Konfigurasi Domain & SSL (CloudPanel):**
   - Buat DNS A Record: `sidateka.banjarmangu.banjarnegarakab.go.id` mengarah ke IP `103.255.133.227`.
   - Tunggu propagasi DNS (verifikasi dengan `ping sidateka.banjarmangu.banjarnegarakab.go.id`).
   - Buka CloudPanel -> Menu **Sites** -> **sidateka.banjarmangu.banjarnegarakab.go.id** -> **SSL/TLS**.
   - Klik **New Let's Encrypt Certificate** -> **Create and Install**.

---

## 4. Monitoring & Troubleshooting

- Cek status aplikasi:
  ```bash
  pm2 status
  ```
- Pantau live log aplikasi:
  ```bash
  pm2 logs sidateka --lines 50
  ```
- Restart aplikasi setelah git pull pembaruan kode:
  ```bash
  git pull origin main
  npm ci
  npm run build
  npm prune --omit=dev
  pm2 restart sidateka
  ```

---

## 5. Rollback Plan
Jika terjadi kegagalan fatal saat deploy versi baru:
1. Revert commit via Git: `git checkout HEAD~1`
2. Jalankan build ulang: `npm ci && npm run build && pm2 restart sidateka`
3. Verifikasi file database `.data/portal.db` tetap utuh.
