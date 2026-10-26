import Link from "next/link";
import { db } from "@/lib/db";
import {
  getAllDesa,
  getPopularArtikel,
  getRecentArtikel,
  getRecentBerita,
  getPaginatedArtikel,
  getTotalArtikelCount,
} from "@/lib/queries";
import { ArticleCard } from "@/components/article-card";
import { BeritaCard } from "@/components/berita-card";
import { DesaCard } from "@/components/desa-card";
import { ArticleRowCard } from "@/components/article-row-card";
import { OpenDKBox, OpenDKSubBox } from "@/components/opendk-box";
import { HeroSlider, type HeroSlide } from "@/components/hero-slider";
import { VisitorCounter } from "@/components/visitor-counter";
import { SikemaTracker } from "@/components/sikema-tracker";
import { getVisitorStats } from "@/lib/visitor";

// Force dynamic to ensure fresh data on each request
export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatTanggal(s: string | null): string {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function HomePage(props: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const currentPage = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const pageSize = 6;

  const totalArtikel = getTotalArtikelCount();
  const totalPages = Math.max(1, Math.ceil(Math.max(0, totalArtikel - 1) / pageSize));

  const topRecent = getRecentArtikel(3);
  const popular = getPopularArtikel(5);
  const desaList = getAllDesa(true);
  const beritaKecamatan = getRecentBerita(4);

  // Pada halaman 1, tampilkan featured artikel besar dan 6 artikel berikutnya.
  // Pada halaman 2 ke atas, tampilkan 6 artikel sesuai offset.
  const featured = currentPage === 1 ? topRecent[0] : null;
  const offset = currentPage === 1 ? 1 : 1 + (currentPage - 1) * pageSize;
  const listArtikel = getPaginatedArtikel(pageSize, offset);

  // Nomor halaman yang ditampilkan (maksimal 5 tombol)
  const pagesToShow: number[] = [];
  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  if (endPage - startPage < maxButtons - 1) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }
  for (let p = startPage; p <= endPage; p++) {
    pagesToShow.push(p);
  }

  // hitung artikel per desa untuk badge di kartu desa
  const counts = db
    .prepare(
      "SELECT desa_id, COUNT(*) AS c FROM artikel GROUP BY desa_id",
    )
    .all() as Array<{ desa_id: number; c: number }>;
  const countMap = new Map(counts.map((r) => [r.desa_id, r.c]));

  // Susun slide hero dari 3 artikel terbaru
  const heroSlides: HeroSlide[] = [];
  if (topRecent[0]) {
    heroSlides.push({
      id: topRecent[0].id,
      title: topRecent[0].judul,
      subtitle: topRecent[0].ringkasan ?? undefined,
      image: topRecent[0].gambar ?? undefined,
      href: `/artikel/${topRecent[0].desa.slug}/${topRecent[0].slug}`,
      cta: "Baca selengkapnya",
    });
  }
  for (const a of topRecent.slice(1, 3)) {
    heroSlides.push({
      id: a.id,
      title: a.judul,
      subtitle: a.ringkasan ?? undefined,
      image: a.gambar ?? undefined,
      href: `/artikel/${a.desa.slug}/${a.slug}`,
      cta: "Baca selengkapnya",
    });
  }
  if (heroSlides.length === 0) {
    heroSlides.push({
      id: "default",
      title: "Selamat Datang di Portal Kecamatan Banjarmangu",
      subtitle:
        "Agregator berita & informasi 17 desa di Kabupaten Banjarnegara, Jawa Tengah.",
      cta: "Jelajahi Desa",
      href: "/desa",
    });
  }

  return (
    <>
      {/* =============== TOP BAR (OpenDK .topheader) =============== */}
      <div className="bg-[var(--color-foreground)] text-white text-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="font-semibold tracking-wide">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] mr-2 animate-pulse-soft" />
            Selamat Datang di Website Kecamatan Banjarmangu
          </div>
          <div className="hidden sm:flex items-center gap-3 text-white/80">
            <span>{formatTanggal(new Date().toISOString())}</span>
            <span className="h-3 w-px bg-white/20" />
            <Link href="/admin" className="hover:text-white">
              Login Admin
            </Link>
          </div>
        </div>
      </div>

      {/* =============== HERO SLIDER (OpenDK #swiper-slider) =============== */}
      <HeroSlider slides={heroSlides} />
      <div className="h-1 bg-[var(--color-accent)]" />

      {/* =============== MAIN CONTENT (OpenDK .container > .content) =============== */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ============ KOLOM KIRI (col-md-8) ============ */}
          <div className="lg:col-span-8 space-y-6">
            {/* Section header ala OpenDK: fat-arrow + page-header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--color-foreground)]">
                  Berita Kecamatan
                </h2>
              </div>
              <div className="h-px bg-[var(--color-border)]" />
            </div>

            {/* Featured: satu artikel besar */}
            {featured && (
              <ArticleCard artikel={featured} variant="featured" />
            )}

            {/* List artikel: OpenDK-style row card (col-sm-4 img + col-sm-8 content) */}
            {listArtikel.length > 0 && (
              <div id="kecamatan" className="space-y-4">
                {listArtikel.map((a) => (
                  <ArticleRowCard key={a.id} artikel={a} />
                ))}
              </div>
            )}

            {/* Pagination dinamis ala OpenDK */}
            {totalPages > 1 && (
              <nav
                className="flex items-center justify-center gap-1.5 pt-4"
                aria-label="Navigasi Halaman"
              >
                {/* Halaman Pertama */}
                {currentPage > 1 && (
                  <Link
                    href="/?page=1#kecamatan"
                    className="min-w-9 h-9 grid place-items-center px-2 rounded-md border text-xs font-semibold transition-colors bg-white text-[var(--color-foreground)] border-[var(--color-border)] hover:bg-[var(--color-muted)]"
                    title="Halaman Pertama"
                  >
                    «
                  </Link>
                )}

                {/* Halaman Sebelumnya */}
                {currentPage > 1 && (
                  <Link
                    href={`/?page=${currentPage - 1}#kecamatan`}
                    className="min-w-9 h-9 grid place-items-center px-2 rounded-md border text-xs font-semibold transition-colors bg-white text-[var(--color-foreground)] border-[var(--color-border)] hover:bg-[var(--color-muted)]"
                    title="Halaman Sebelumnya"
                  >
                    ‹
                  </Link>
                )}

                {/* Tombol Angka */}
                {pagesToShow.map((p) => {
                  const isActive = p === currentPage;
                  return (
                    <Link
                      key={p}
                      href={`/?page=${p}#kecamatan`}
                      className={`min-w-9 h-9 grid place-items-center px-3 rounded-md border text-sm font-semibold transition-colors ${
                        isActive
                          ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm"
                          : "bg-white text-[var(--color-foreground)] border-[var(--color-border)] hover:bg-[var(--color-muted)]"
                      }`}
                    >
                      {p}
                    </Link>
                  );
                })}

                {/* Halaman Berikutnya */}
                {currentPage < totalPages && (
                  <Link
                    href={`/?page=${currentPage + 1}#kecamatan`}
                    className="min-w-9 h-9 grid place-items-center px-2 rounded-md border text-xs font-semibold transition-colors bg-white text-[var(--color-foreground)] border-[var(--color-border)] hover:bg-[var(--color-muted)]"
                    title="Halaman Selanjutnya"
                  >
                    ›
                  </Link>
                )}

                {/* Halaman Terakhir */}
                {currentPage < totalPages && (
                  <Link
                    href={`/?page=${totalPages}#kecamatan`}
                    className="min-w-9 h-9 grid place-items-center px-2 rounded-md border text-xs font-semibold transition-colors bg-white text-[var(--color-foreground)] border-[var(--color-border)] hover:bg-[var(--color-muted)]"
                    title="Halaman Terakhir"
                  >
                    »
                  </Link>
                )}
              </nav>
            )}

            {/* Empty state */}
            {totalArtikel === 0 && (
              <div className="rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-white p-12 text-center">
                <svg
                  className="mx-auto mb-4 text-[var(--color-muted-foreground)]"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <h3 className="font-serif text-xl font-semibold mb-2">
                  Belum ada artikel
                </h3>
                <p className="text-sm text-[var(--color-muted-foreground)] mb-4">
                  Jalankan sinkronisasi untuk menarik artikel terbaru dari website
                  desa.
                </p>
                <code className="block bg-[var(--color-muted)] rounded-md p-3 text-xs font-mono">
                  curl -X POST /api/sync
                </code>
              </div>
            )}
          </div>

          {/* ============ SIDEBAR (col-md-4) ============ */}
          <aside className="lg:col-span-4 space-y-5">
            {/* Box: Aduan Masyarakat (CTA pengaduan + tracking) */}
            <OpenDKBox
              title="ADUAN MASYARAKAT"
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              }
            >
              <p className="text-xs text-[var(--color-muted-foreground)] mb-3 -mt-1">
                Sistem Keluhan Masyarakat — sampaikan aduan Anda terkait pelayanan
                publik di kecamatan.
              </p>
              <Link
                href="/aduan"
                className="block w-full text-center px-4 py-2.5 rounded-md bg-[var(--color-warning)] hover:bg-amber-600 text-white text-sm font-bold transition-colors mb-3"
              >
                <svg className="inline-block mr-1.5 -mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                Kirim Keluhan
              </Link>
              <OpenDKSubBox
                title="Lacak Keluhan Anda"
                titleClassName="text-[var(--color-foreground)]"
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                }
              >
                <SikemaTracker />
              </OpenDKSubBox>

              {/* TERPOPULER (nested inside SIKEMA box like OpenDK) */}
              {popular.length > 0 && (
                <OpenDKSubBox
                  title="TERPOPULER"
                  titleClassName="text-[var(--color-primary)]"
                  icon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                      <polyline points="17 6 23 6 23 12" />
                    </svg>
                  }
                >
                  <ol className="space-y-2">
                    {popular.slice(0, 5).map((a, idx) => (
                      <li key={a.id} className="flex gap-2.5">
                        <span className="flex-shrink-0 h-6 w-6 grid place-items-center rounded-full bg-[var(--color-primary)] text-white text-[11px] font-bold">
                          {idx + 1}
                        </span>
                        <Link
                          href={`/artikel/${a.desa.slug}/${a.slug}`}
                          className="text-sm text-[var(--color-foreground)] hover:text-[var(--color-primary)] line-clamp-2 leading-snug"
                        >
                          {a.judul}
                        </Link>
                      </li>
                    ))}
                  </ol>
                </OpenDKSubBox>
              )}

              {/* KELUHAN TERJAWAB */}
              <OpenDKSubBox
                title="KELUHAN TERJAWAB"
                titleClassName="text-[var(--color-primary)]"
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                }
              >
                <p className="text-xs text-[var(--color-muted-foreground)] text-center py-2">
                  <svg className="inline-block -mt-0.5 mr-1 text-[var(--color-muted-foreground)]" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  Data tidak ditemukan.
                </p>
              </OpenDKSubBox>
            </OpenDKBox>

            {/* Box: Media Sosial */}
            <OpenDKBox
              title="Media Sosial"
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              }
            >
              <div className="flex flex-wrap items-center gap-2 justify-center">
                {[
                  { name: "Facebook", color: "bg-blue-600", short: "Fb" },
                  { name: "Instagram", color: "bg-gradient-to-br from-purple-500 to-pink-500", short: "Ig" },
                  { name: "YouTube", color: "bg-red-600", short: "Yt" },
                  { name: "Twitter", color: "bg-sky-500", short: "X" },
                  { name: "WhatsApp", color: "bg-emerald-500", short: "Wa" },
                ].map((s) => (
                  <a
                    key={s.name}
                    href="#"
                    aria-label={s.name}
                    className={`h-9 w-9 grid place-items-center rounded-full ${s.color} text-white text-xs font-bold shadow-sm hover:scale-110 transition-transform`}
                  >
                    {s.short}
                  </a>
                ))}
              </div>
            </OpenDKBox>

            {/* Box: PENGUNJUNG (OpenDK #desa-visitor-container) */}
            <OpenDKBox
              title="Pengunjung"
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              }
            >
              <VisitorCounter stats={getVisitorStats()} />
            </OpenDKBox>
          </aside>
        </div>
      </section>

      {/* =============== BERITA KECAMATAN =============== */}
      {beritaKecamatan.length > 0 && (
        <section className="bg-white border-t border-[var(--color-border)]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-[var(--color-primary)] font-bold mb-1">
                  · Kabar Resmi
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold">
                  Berita Kecamatan
                </h2>
                <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                  Berita, pengumuman, dan kegiatan resmi dari Kecamatan Banjarmangu
                </p>
              </div>
              <Link
                href="/berita"
                className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)] hover:underline"
              >
                Lihat semua berita
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {beritaKecamatan.map((b) => (
                <BeritaCard key={b.id} berita={b} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =============== DAFTAR DESA =============== */}
      <section className="bg-white border-t border-[var(--color-border)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-[var(--color-secondary)] font-bold mb-1">
                · 17 Desa Terhubung
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold">
                Portal Desa di Banjarmangu
              </h2>
              <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                Status sinkronisasi terakhir dari website resmi masing-masing desa
              </p>
            </div>
            <Link
              href="/desa"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)] hover:underline"
            >
              Lihat semua desa
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {desaList.map((d) => (
              <DesaCard
                key={d.id}
                desa={d}
                articleCount={countMap.get(d.id) ?? 0}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
