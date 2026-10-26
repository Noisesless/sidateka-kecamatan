import Link from "next/link";
import { SafeImage } from "@/components/safe-image";
import type { ArtikelWithDesa } from "@/lib/queries";

function formatDate(s: string | null): string {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function timeAgo(s: string | null): string {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari`;
  return formatDate(s);
}

/**
 * OpenDK-style article row card: col-sm-4 image + col-sm-8 content (title, date, desa, kategori, excerpt, "Selengkapnya" button).
 */
export function ArticleRowCard({ artikel }: { artikel: ArtikelWithDesa }) {
  const href = `/artikel/${artikel.desa.slug}/${artikel.slug}`;
  const date = artikel.published_at ?? artikel.fetched_at;

  return (
    <article className="group rounded-lg border border-[var(--color-border)] bg-white overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-0">
        {/* image col-sm-4 */}
        <Link
          href={href}
          className="sm:col-span-4 block relative aspect-[16/10] sm:aspect-auto sm:min-h-[180px] overflow-hidden bg-[var(--color-muted)]"
        >
          <SafeImage
            src={artikel.gambar}
            alt={artikel.judul}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </Link>

        {/* content col-sm-8 */}
        <div className="sm:col-span-8 p-4 sm:p-5 flex flex-col">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-wider text-[var(--color-muted-foreground)] mb-1.5">
            <span className="font-bold text-[var(--color-primary)]">
              Desa {artikel.desa.nama}
            </span>
            <span>·</span>
            <span>{timeAgo(date)}</span>
            {artikel.kategori && (
              <>
                <span>·</span>
                <span className="px-1.5 py-0.5 rounded bg-[var(--color-muted)] text-[var(--color-foreground)] font-bold normal-case tracking-wide">
                  {artikel.kategori}
                </span>
              </>
            )}
          </div>

          <h3 className="font-serif text-lg font-semibold leading-snug text-[var(--color-foreground)] group-hover:text-[var(--color-primary)] line-clamp-2 mb-2 transition-colors">
            <Link href={href}>{artikel.judul}</Link>
          </h3>

          {artikel.ringkasan && (
            <p className="text-sm text-[var(--color-muted-foreground)] line-clamp-3 leading-relaxed mb-3">
              {artikel.ringkasan}
            </p>
          )}

          <div className="mt-auto flex items-center justify-between">
            <Link
              href={href}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--color-primary)] hover:bg-[var(--color-foreground)] text-white text-xs font-bold transition-colors"
            >
              Selengkapnya
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
            {artikel.view_count > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-muted-foreground)]">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {artikel.view_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
