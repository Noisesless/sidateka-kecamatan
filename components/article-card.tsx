import Link from "next/link";
import { SafeImage } from "@/components/safe-image";
import type { ArtikelWithDesa } from "@/lib/queries";

type Variant = "default" | "featured" | "compact";

function formatDate(s: string | null): string {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
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

export function ArticleCard({
  artikel,
  variant = "default",
}: {
  artikel: ArtikelWithDesa;
  variant?: Variant;
}) {
  const href = `/artikel/${artikel.desa.slug}/${artikel.slug}`;
  const date = artikel.published_at ?? artikel.fetched_at;

  if (variant === "featured") {
    return (
      <Link
        href={href}
        className="group block relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
      >
        <div className="relative aspect-[16/9] w-full bg-[var(--color-muted)] overflow-hidden">
          <SafeImage
            src={artikel.gambar}
            alt={artikel.judul}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--color-accent)] text-white shadow-md">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-white" />
            Pilihan
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-[var(--color-muted-foreground)] mb-2">
            <span className="font-bold text-[var(--color-primary)]">
              Desa {artikel.desa.nama}
            </span>
            <span>·</span>
            <span>{timeAgo(date)}</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold leading-tight text-[var(--color-foreground)] group-hover:text-[var(--color-primary)] transition-colors">
            {artikel.judul}
          </h2>
          {artikel.ringkasan && (
            <p className="mt-3 text-[15px] text-[var(--color-muted-foreground)] line-clamp-3 leading-relaxed">
              {artikel.ringkasan}
            </p>
          )}
          <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)]">
            Baca selengkapnya
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </div>
        </div>
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link
        href={href}
        className="group flex gap-3 py-3 border-b border-dashed border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-muted)]/50 -mx-2 px-2 rounded-md transition-colors"
      >
        {artikel.gambar && (
          <div className="flex-shrink-0 relative w-16 h-16 rounded-md overflow-hidden bg-[var(--color-muted)]">
            <SafeImage
              src={artikel.gambar}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-[var(--color-muted-foreground)] mb-0.5">
            {artikel.desa.nama} · {timeAgo(date)}
          </div>
          <h4 className="font-serif text-sm font-semibold text-[var(--color-foreground)] group-hover:text-[var(--color-primary)] line-clamp-2 leading-snug">
            {artikel.judul}
          </h4>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="group flex flex-col h-full overflow-hidden rounded-xl border border-[var(--color-border)] bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
    >
      <div className="relative aspect-[16/10] w-full bg-[var(--color-muted)] overflow-hidden">
        <SafeImage
          src={artikel.gambar}
          alt={artikel.judul}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {artikel.kategori && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/90 text-[var(--color-primary)]">
            {artikel.kategori}
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col p-4">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[var(--color-muted-foreground)] mb-1.5">
          <span className="font-bold text-[var(--color-primary)]">
            {artikel.desa.nama}
          </span>
          <span>·</span>
          <span>{timeAgo(date)}</span>
        </div>
        <h3 className="font-serif text-base font-semibold leading-snug text-[var(--color-foreground)] group-hover:text-[var(--color-primary)] line-clamp-3 mb-2 transition-colors">
          {artikel.judul}
        </h3>
        {artikel.ringkasan && (
          <p className="text-[13px] text-[var(--color-muted-foreground)] line-clamp-2 leading-relaxed mb-3">
            {artikel.ringkasan}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between text-[11px] text-[var(--color-muted-foreground)]">
          <span className="capitalize">
            via {artikel.source === "rss" ? "RSS" : "Web"}
          </span>
          {artikel.view_count > 0 && (
            <span className="inline-flex items-center gap-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {artikel.view_count}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
