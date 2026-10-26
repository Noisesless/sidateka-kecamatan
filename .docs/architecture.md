# ARCHITECTURE BLUEPRINT — PORTAL KECAMATAN BANJARMANGU

## 1. High-Level System Architecture

```mermaid
graph TD
  subgraph Client [Client / Browser Layer]
    Web[Next.js Frontend / PWA]
    Leaflet[Interactive Maps Leaflet]
    AdminUI[Admin Management Panel]
  end

  subgraph Presentation [Presentation Layer - Next.js 16 App Router]
    Pages[Server Components (RSC)]
    ClientComp[Client Components (Interactivity)]
    ServerActions[Next.js Server Actions (CRUD Admin)]
  end

  subgraph Logic [Business Logic & Service Layer]
    SyncEngine[Smart Sync Engine (Pre-flight Probe + Fail-Fast)]
    AuthService[Auth Guard & Session Manager (lib/auth.ts)]
    PushService[Push API Controller (lib/sync.ts)]
    AduanEngine[Ticket Generator & Workflow Engine]
    MediaPipeline[Universal Fallback Media Pipeline]
  end

  subgraph Data [Data Access & Persistence Layer]
    Queries[Data Queries (lib/queries.ts)]
    SQLiteDB[(SQLite 3 - WAL Mode)]
    UploadsDir[Local File Storage (.data/uploads/)]
  end

  subgraph External [External Services & Sources]
    DesaWeb[17 Website Desa (OpenSID / Feed)]
    DesaPush[OpenSID Push REST API]
  end

  Web --> Pages
  AdminUI --> Pages
  Pages --> ServerActions
  Pages --> Queries
  ClientComp --> ServerActions

  ServerActions --> AuthService
  ServerActions --> Queries

  SyncEngine --> DesaWeb
  PushService --> DesaPush
  PushService --> Queries
  SyncEngine --> Queries
  SyncEngine --> UploadsDir
  MediaPipeline --> UploadsDir
  AduanEngine --> Queries

  Queries --> SQLiteDB
```

---

## 2. Layering & Responsibility Separation

### A. Presentation Layer (`app/*`, `components/*`)
- **Server Components (RSC):** Merender halaman secara instan di server dengan direct DB query untuk kecepatan LCP optimal.
- **Client Components (`"use client"`):** Terisolasi untuk komponen interaktif seperti slider, peta Leaflet (`peta-banjarmangu.tsx`), filter tabs, form pengaduan, dan modal.
- **Universal SafeImage (`components/safe-image.tsx`):** Komponen gambar terlindungi yang otomatis menangkap event `onError` dan mengganti sumber gambar yang rusak ke gambar kolase kegiatan desa (`/placeholder-artikel.jpg`).

### B. Business Logic & Sync Layer (`lib/*`, `app/api/*`)
- **Smart 2-Phase Sync Engine (`lib/sync.ts` & `/api/sync/probe`):**
  1. *Phase 1 (Pre-flight Probe):* Memeriksa konektivitas 17 desa secara paralel (3 detik) untuk memetakan status `online` vs `blocked_waf` Cloudflare.
  2. *Phase 2 (Selective Sync):* Menyinkronkan hanya desa-desa yang terbukti online, memangkas waktu proses dari 6 menit menjadi 10–15 detik.
  3. *Fail-Fast WAF Guard:* Jika mendeteksi Cloudflare 403 (*Just a moment...*), sistem menghentikan retry seketika (<1 detik) tanpa membuang waktu 25 detik per desa.
- **Push Controller (`app/api/push/*`):** Menangani kiriman REST API langsung dari instalasi OpenSID desa menggunakan validasi `X-API-Key`.
- **Authentication & Security (`lib/auth.ts`):** SHA-256 hash validation, single-token session cookies (`admin_session`), dan role checking.

### C. Data Access Layer (`lib/db.ts`, `lib/queries.ts`, `lib/statistik.ts`)
- **Singleton Connection (`globalThis.__db`):** Menghindari exhaustion file locks pada parallel build Next.js.
- **ACID & Concurrency:** Write-Ahead Logging (WAL mode) dengan `busy_timeout = 30000` mencegah error `database is locked`.
- **Hybrid Statistik Fallback:** Halaman statistik memprioritaskan live fetch OpenSID, namun jika gagal/terblokir WAF otomatis beralih ke cache data tabel SQLite lokal `statistik_desa` & `statistik_penduduk`.
