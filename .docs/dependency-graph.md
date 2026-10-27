# DEPENDENCY GRAPH — PORTAL KECAMATAN BANJARMANGU

## 1. Critical Files (High-Blast Radius)

Perubahan pada file-file ini dapat merusak seluruh fungsionalitas aplikasi:

| File | Dependents (Imported By) | Risk Level | Alasan Kritis |
|---|---|---|---|
| `lib/db.ts` | 24+ files (`queries.ts`, `auth.ts`, `seed.ts`, `sync.ts`, `admin/actions.ts`, dll) | 🔴 CRITICAL | Jantung koneksi database SQLite, WAL setup, dan skema migration |
| `lib/queries.ts` | 35+ page components di `app/*` | 🔴 CRITICAL | Sumber tunggal query read-only data publik dan agregat |
| `lib/auth.ts` | `app/admin/actions.ts`, `app/admin/login/*`, `app/admin/page.tsx` | 🔴 CRITICAL | Pengatur session security, hashing password, dan verifikasi login |
| `lib/sync.ts` | `app/api/sync/*`, `app/admin/desa/*` | 🟡 HIGH | Engine scraping RSS dan web parsing data 17 desa |
| `app/globals.css` | `app/layout.tsx` | 🟡 HIGH | Root visual tokens (warna, font, spacing) yang memengaruhi semua halaman |
| `lib/navigation.ts`| `components/navbar.tsx`, `components/mobile-bottom-nav.tsx` | 🟡 HIGH | Peta navigasi dan link routing publik |

---

## 2. Import Chains & Critical Flow

```
app/layout.tsx
 ├── app/globals.css (Tailwind v4 tokens)
 ├── components/navbar.tsx
 │    └── lib/navigation.ts
 ├── components/footer.tsx
 └── components/mobile-bottom-nav.tsx

app/page.tsx (Beranda)
 ├── lib/queries.ts
 │    └── lib/db.ts
 ├── components/hero-slider.tsx
 ├── components/peta-banjarmangu-wrapper.tsx
 │    └── components/peta-banjarmangu.tsx (MapLibre GL JS + GeoJSON 17 Desa)
 └── components/article-card.tsx

app/admin/page.tsx (Admin Dashboard)
 ├── lib/auth.ts
 │    └── lib/db.ts
 ├── app/admin/actions.ts
 │    ├── lib/auth.ts
 │    ├── lib/db.ts
 │    └── lib/upload.ts
 └── components/confirm-button.tsx
```

---

## 3. Leaf Files (Low-Impact / Safe to Edit)
- `components/faq-accordion.tsx`
- `components/sikema-tracker.tsx`
- `components/visitor-counter.tsx`
- `app/tentang/page.tsx`
- `app/faq/page.tsx`
