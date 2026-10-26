# DESIGN SYSTEM INSTANCE — PORTAL KECAMATAN BANJARMANGU

> **Project Visual DNA Instance** untuk Portal Kecamatan Banjarmangu.
> Single Source of Truth visual design, token CSS, geometri, tipografi, dan registri komponen.

---

## 1. Visual DNA & Color Tokens

| Token Name | Hex Code | oklch Equiv | Role & Semantics |
|---|---|---|---|
| `--color-primary` / `--vibe-accent-1` | `#1E40AF` | `oklch(40% 0.18 260)` | Civic Deep Blue (Warna identitas utama, header, tombol primer) |
| `--color-secondary` | `#3B82F6` | `oklch(60% 0.19 255)` | Sky Blue (Aksen interaktif, badge, highlight aktif) |
| `--color-accent` / `--vibe-accent-2` | `#16A34A` | `oklch(62% 0.17 142)` | Government Green (Aksen keberhasilan, tombol aksi publik, lencana aktif) |
| `--color-background` / `--vibe-background` | `#EFF6FF` | `oklch(97% 0.02 250)` | Soft Blue Tint Background (Bukan putih mati) |
| `--color-card` / `--vibe-surface` | `#FFFFFF` | `oklch(100% 0 0)` | Surface Card putih bersih dengan elevasi border lembut |
| `--color-foreground` / `--vibe-text-main` | `#1E3A8A` | `oklch(32% 0.12 260)` | High-Contrast Civic Navy (Teks utama & headings) |
| `--color-muted-foreground` / `--vibe-text-sub` | `#475569` | `oklch(48% 0.03 250)` | Muted Slate (Teks sekunder & deskripsi) |
| `--color-border` | `#BFDBFE` | `oklch(88% 0.06 250)` | Blue-tinted border untuk kontur kartu |
| `--color-destructive` / `--vibe-error` | `#DC2626` | `oklch(55% 0.22 25)` | Error & peringatan status |

---

## 2. Typography Pairing (Editorial Civic Style)

- **Heading Font:** `Newsreader`, Georgia, "Times New Roman", serif
  - Karakter: Editorial, berwibawa, mencerminkan arsip & portal resmi pemerintahan.
  - Dipakai pada: `h1`, `h2`, `h3`, `h4`, title kartu berita.
- **Body Font:** `Roboto`, "Segoe UI", system-ui, -apple-system, sans-serif
  - Karakter: Bersih, legible tinggi pada layar kecil, modern.
  - Dipakai pada: Teks isi paragraf, label formulir, tabel, metadata.
- **Monospace Font:** `Menlo`, "Courier New", monospace (Data kode tiket aduan & nomor SK).

---

## 3. Geometry & Spacing Rhythm (8pt Grid)

- **Corner Radius:**
  - Standard Cards & Containers: `rounded-lg` (8px / `0.5rem`)
  - Badges & Pills: `rounded-full` (9999px)
  - Inputs & Buttons: `rounded-md` (6px - 8px)
- **Spacing Rhythm:**
  - Section Spacing: `--spacing-section: 4.5rem` (72px)
  - Large Section Spacing: `--spacing-section-lg: 6rem` (96px)
  - Card Padding: `1.5rem` (24px)
  - Grid Gap: `1.5rem` / `2rem` (24px / 32px)

---

## 4. Breakpoint Strategy (Laptop-First 1366px + Android 3M)

| Token Breakpoint | Target Layar | Perlakuan Layout |
|---|---|---|
| `--bp-mobile-sm` (360px) | Android Entry | 1 Kolom penuh, horizontal swipe tabs, bottom navigation aktif |
| `--bp-mobile-md` (393px) | Modern Android | 1 Kolom penuh, ukuran sentuh minimal 44×44px |
| `--bp-mobile-lg` (412px) | Large Android / Phablet | 1 Kolom berjarak nyaman |
| `--bp-tablet` (768px) | Tablet / iPad | 2 Kolom grid, top menu collapsible |
| `--bp-laptop-base` (1366px) | **Primary Target (Laptop 1366×768)** | 3-4 Kolom Bento grid, top sticky navbar penuh, max-w-7xl |
| `--bp-desktop-hd` (1920px) | Full HD Monitor | Konten terpusat dengan padding samping proporsional |

---

## 5. Component Token Registry (§7B — 32 Komponen)

1. `Header/Navbar`: Top sticky with civic blue backdrop and drop shadow on scroll.
2. `Footer`: Multi-column dark-tinted blue container with links, office contact, and disclaimer.
3. `MobileBottomNav`: 5-tab fixed bottom bar for mobile screens.
4. `HeroSlider`: Full-width banner slider with automatic carousel.
5. `ArticleCard`: Vertical card with news thumbnail, title serif, village badge, date, and link.
6. `ArticleRowCard`: Horizontal row variant for compact news feeds.
7. `BeritaCard`: Official district news card with prominent image and excerpt.
8. `DesaCard`: Village portal directory card with website link and status indicators.
9. `DesaProfil`: Village detail header with apparatus photos and stats summary.
10. `PetaBanjarmangu`: Leaflet interactive map with pins for 17 villages and click modal.
11. `AduanForm`: Multipart validated form with NIK, category, and photo attachment.
12. `SikemaTracker`: Ticket tracker search box with status badge (Baru / Proses / Selesai).
13. `StatistikCharts`: Interactive bar and donut charts for demographic distribution.
14. `AnalitikCharts`: Analytical charts comparing education, health, and social assistance.
15. `OpendkBox`: Integration widget showcasing aggregate data from 17 OpenDK/OpenSID nodes.
16. `PelayananTabs`: Category switcher for public service standards and procedures.
17. `PpidTabs`: Information category switcher for PPID disclosure.
18. `ProfilTabs`: Sub-page navigator for district profile and governance.
19. `UnduhanTabs`: Document category tabs with instant download button and file size badge.
20. `FaqAccordion`: Accessible collapsible Q&A items with smooth height animation.
21. `VisitorCounter`: Today vs Total counter widget.
22. `PwaInstallBanner`: Slide-up install prompt for mobile users.
23. `SyncAllButton`: Admin trigger button with loading spinner and status feedback.
24. `ConfirmButton`: Safe two-step confirmation button for administrative delete/reset.
25. `Table`: Striped border-blue civic table with responsive overflow scroll.
26. `Modal`: Floating backdrop-blur overlay dialog with focus-trap.
27. `Toast`: Feedback popup with green (success) / red (error) accent.
28. `Badge`: Pill status indicator (`success`, `warning`, `muted`).
29. `Breadcrumb`: Slash-separated route ancestry links.
30. `SearchBar`: Search input with magnifier icon and debounce.
31. `Pagination`: Numbered pagination bar with active page indicator.
32. `SkeletonLoader`: Shimmering placeholder animation during SSR data loading.
