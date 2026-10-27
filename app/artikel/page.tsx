import Link from "next/link";
import { getAllDesa, getRecentArtikel } from "@/lib/queries";
import { ArticleCard } from "@/components/article-card";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = {
  desa?: string;
  page?: string;
};

const PAGE_SIZE = 12;

export default async function ArtikelIndexPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const desaSlug = sp.desa;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const desaList = getAllDesa(true);
  const selectedDesa = desaSlug
    ? desaList.find((d) => d.slug === desaSlug) ?? null
    : null;

  // Query with LIMIT/OFFSET
  const offset = (page - 1) * PAGE_SIZE;
  const rows = selectedDesa
    ? (db
        .prepare(
          `SELECT a.id FROM artikel a JOIN desa d ON d.id = a.desa_id
           WHERE d.slug = ?
           ORDER BY COALESCE(a.published_at, a.fetched_at) DESC
           LIMIT ? OFFSET ?`,
        )
        .all(selectedDesa.slug, PAGE_SIZE, offset) as { id: number }[])
    : (db
        .prepare(
          `SELECT id FROM artikel
           ORDER BY COALESCE(published_at, fetched_at) DESC
           LIMIT ? OFFSET ?`,
        )
        .all(PAGE_SIZE, offset) as { id: number[] }[]);

  // For simplicity fetch full articles via getRecentArtikel (limit max)
  const all = getRecentArtikel(page * PAGE_SIZE, desaSlug);
  const artikel = all.slice(offset, offset + PAGE_SIZE);

  const totalRow = selectedDesa
    ? (db
        .prepare(
          `SELECT COUNT(*) AS c FROM artikel a JOIN desa d ON d.id = a.desa_id WHERE d.slug = ?`,
        )
        .get(selectedDesa.slug) as { c: number })
    : (db.prepare(`SELECT COUNT(*) AS c FROM artikel`).get() as { c: number });

  const totalPages = Math.max(1, Math.ceil(totalRow.c / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <header className="mb-8">
        <div className="text-[11px] uppercase tracking-widest text-[var(--color-primary)] font-bold mb-1">
          · Arsip Artikel
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-2">
          {selectedDesa
            ? `Artikel Desa ${selectedDesa.nama}`
            : "Semua Artikel"}
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {totalRow.c.toLocaleString("id-ID")} artikel · halaman {page} dari {totalPages}
        </p>
      </header>

      {/* Filter desa */}
      <div className="mb-8 rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b border-[var(--color-border)]/60">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span>Filter Berdasarkan Desa</span>
            <span className="text-[11px] font-normal text-[var(--color-muted-foreground)]">
              ({desaList.length} Desa)
            </span>
          </div>
          {selectedDesa && (
            <Link
              href="/artikel"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-destructive)] hover:underline"
            >
              Reset Filter
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </Link>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <Link
            href="/artikel"
            className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              !selectedDesa
                ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-xs"
                : "bg-[var(--color-background)]/60 text-[var(--color-foreground)] border-[var(--color-border)] hover:bg-white hover:border-[var(--color-primary)]"
            }`}
          >
            Semua Desa
          </Link>
          {desaList.map((d) => (
            <Link
              key={d.id}
              href={`/artikel?desa=${d.slug}`}
              className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                selectedDesa?.id === d.id
                  ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-xs"
                  : "bg-[var(--color-background)]/60 text-[var(--color-foreground)] border-[var(--color-border)] hover:bg-white hover:border-[var(--color-primary)]"
              }`}
            >
              {d.nama}
            </Link>
          ))}
        </div>
      </div>

      {artikel.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-white p-12 text-center">
          <p className="text-[var(--color-muted-foreground)]">
            Belum ada artikel{selectedDesa ? ` dari Desa ${selectedDesa.nama}` : ""}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {artikel.map((a) => (
            <ArticleCard key={a.id} artikel={a} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={{
                pathname: "/artikel",
                query: { ...(desaSlug ? { desa: desaSlug } : {}), page: String(page - 1) },
              }}
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] bg-white hover:border-[var(--color-primary)] text-sm font-semibold"
            >
              ← Sebelumnya
            </Link>
          )}
          <span className="px-3 py-2 text-sm font-semibold">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={{
                pathname: "/artikel",
                query: { ...(desaSlug ? { desa: desaSlug } : {}), page: String(page + 1) },
              }}
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] bg-white hover:border-[var(--color-primary)] text-sm font-semibold"
            >
              Berikutnya →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
