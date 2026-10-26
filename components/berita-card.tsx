import Link from "next/link";
import type { ArtikelKecamatan } from "@/lib/db";
import { SafeImage } from "@/components/safe-image";

type Variant = "default" | "compact";

function formatDate(s: string | null): string {
  if (!s) return "";
  const d = new Date(s.includes("T") ? s : s.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function timeAgo(s: string | null): string {
  if (!s) return "";
  const d = new Date(s.includes("T") ? s : s.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return "";
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari`;
  return formatDate(s);
}

export function BeritaCard({
  berita,
  variant = "default",
}: {
  berita: ArtikelKecamatan;
  variant?: Variant;
}) {
  const href = `/berita/${berita.slug}`;

  if (variant === "compact") {
    return (
      <Link
        href={href}
        className="group flex gap-3 py-3 border-b border-dashed border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-muted)]/50 -mx-2 px-2 rounded-md transition-colors"
      >
        {berita.gambar_utama && (
          <div className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden bg-[var(--color-muted)] relative">
            <SafeImage
              src={berita.gambar_utama}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-[var(--color-muted-foreground)] mb-0.5">
            {berita.kategori ?? "Berita"} · {timeAgo(berita.published_at)}
          </div>
          <h4 className="font-serif text-sm font-semibold text-[var(--color-foreground)] group-hover:text-[var(--color-primary)] line-clamp-2 leading-snug">
            {berita.judul}
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
          src={berita.gambar_utama}
          alt={berita.judul}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {berita.kategori && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/90 text-[var(--color-primary)]">
            {berita.kategori}
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col p-4">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[var(--color-muted-foreground)] mb-1.5">
          <span className="font-bold text-[var(--color-primary)]">Kecamatan</span>
          <span>·</span>
          <span>{timeAgo(berita.published_at)}</span>
        </div>
        <h3 className="font-serif text-base font-semibold leading-snug text-[var(--color-foreground)] group-hover:text-[var(--color-primary)] line-clamp-3 mb-2 transition-colors">
          {berita.judul}
        </h3>
        {berita.ringkasan && (
          <p className="text-[13px] text-[var(--color-muted-foreground)] line-clamp-2 leading-relaxed mb-3">
            {berita.ringkasan}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between text-[11px] text-[var(--color-muted-foreground)]">
          <span>{berita.penulis ?? "Admin Kecamatan"}</span>
          {berita.view_count > 0 && (
            <span className="inline-flex items-center gap-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {berita.view_count}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
