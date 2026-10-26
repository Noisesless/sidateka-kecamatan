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
    SyncEngine[Agregator & Scraper (Cheerio + RSS Parser)]
    AuthService[Auth Guard & Session Manager (lib/auth.ts)]
    PushService[Push API Controller (lib/sync.ts)]
    AduanEngine[Ticket Generator & Workflow Engine]
  end

  subgraph Data [Data Access & Persistence Layer]
    Queries[Data Queries (lib/queries.ts)]
    SQLiteDB[(SQLite 3 - WAL Mode)]
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
  AduanEngine --> Queries

  Queries --> SQLiteDB
```

---

## 2. Layering & Responsibility Separation

### A. Presentation Layer (`app/*`, `components/*`)
- **Server Components (RSC):** Merender halaman secara instan di server dengan direct DB query untuk kecepatan LCP optimal.
- **Client Components (`"use client"`):** Terisolasi untuk komponen interaktif seperti slider, peta Leaflet (`peta-banjarmangu.tsx`), filter tabs, form pengaduan, dan modal.
- **Styling Architecture:** Tailwind CSS v4 dengan CSS variable tokens inline di `app/globals.css`.

### B. Business Logic Layer (`lib/*`, `app/api/*`)
- **Web Scraping & Aggregator (`lib/sync.ts`):** Mengambil RSS feed dari 17 desa (`/feed`), mem-parse item berita, mendownload profil desa, dan mengurai struktur HTML via `cheerio`.
- **Push Controller (`app/api/push/*`):** Menangani kiriman REST API langsung dari instalasi OpenSID desa menggunakan validasi `X-API-Key`.
- **Authentication & Security (`lib/auth.ts`):** SHA-256 hash validation, single-token session cookies (`admin_session`), dan role checking.

### C. Data Access Layer (`lib/db.ts`, `lib/queries.ts`)
- **Singleton Connection (`globalThis.__db`):** Menghindari exhaustion file locks pada parallel build Next.js.
- **ACID & Concurrency:** Write-Ahead Logging (WAL mode) dengan `busy_timeout = 30000` mencegah error `database is locked`.
- **Prepared Queries:** Seluruh operasi data menggunakan parameter binding native `better-sqlite3`.
