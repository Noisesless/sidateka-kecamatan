import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getBeritaBySlug,
  getBeritaFotos,
  getBeritaLainnya,
  incrementBeritaView,
} from "@/lib/queries";
import { BeritaCard } from "@/components/berita-card";
import { SafeImage } from "@/components/safe-image";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://banjarmangu.rapidnet.id";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const b = getBeritaBySlug(slug);
  if (!b) return { title: "Berita tidak ditemukan" };
  return {
    title: b.judul,
    description: b.ringkasan ?? b.judul,
    openGraph: {
      title: b.judul,
      description: b.ringkasan ?? b.judul,
      images: b.gambar_utama ? [b.gambar_utama] : undefined,
    },
  };
}

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

export default async function BeritaDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const b = getBeritaBySlug(slug);
  if (!b) notFound();

  incrementBeritaView(b.id);
  const fotos = getBeritaFotos(b.id);
  const related = getBeritaLainnya(b.id, 4).slice(0, 4);
  const shareUrl = `${SITE_URL}/berita/${b.slug}`;

  return (
    <article className="bg-white">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-foreground)] text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <nav className="flex flex-wrap items-center gap-1.5 text-xs text-white/70 mb-5">
            <Link href="/" className="hover:text-white">Beranda</Link>
            <span>/</span>
            <Link href="/berita" className="hover:text-white">Berita Kecamatan</Link>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            {b.kategori && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--color-accent)] text-white">
                {b.kategori}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-white/80 font-semibold">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-white" />
              Kecamatan Banjarmangu
            </span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight mb-5 drop-shadow-lg !text-white">
            {b.judul}
          </h1>

          {b.ringkasan && (
            <p className="text-lg sm:text-xl text-white/80 leading-relaxed max-w-3xl">
              {b.ringkasan}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/70 border-t border-white/15 pt-4">
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {b.penulis ?? "Admin Kecamatan"}
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {formatDate(b.published_at)}
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {b.view_count + 1} dilihat
            </div>
          </div>
        </div>
      </div>

      {/* Foto unggulan */}
      {b.gambar_utama && (
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 -mt-8 sm:-mt-12 relative z-10">
          <div className="rounded-2xl overflow-hidden border-4 border-white shadow-2xl bg-[var(--color-muted)]">
            <SafeImage
              src={b.gambar_utama}
              alt={b.judul}
              className="w-full h-auto max-h-[480px] object-cover"
            />
          </div>
        </div>
      )}

      {/* Konten */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {b.konten ? (
          <div className="mb-8 rounded-2xl border border-[var(--color-border)] bg-white p-6 sm:p-7">
            <div
              className="prose-article text-[var(--color-foreground)] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: b.konten }}
            />
          </div>
        ) : (
          <div className="mb-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-6 text-center">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Konten berita belum tersedia.
            </p>
          </div>
        )}

        {/* Galeri foto tambahan */}
        {fotos.length > 0 && (
          <div className="mb-8">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)] mb-3">
              Galeri Foto
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {fotos.map((f) => (
                <a
                  key={f.id}
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-muted)] aspect-[4/3]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.url}
                    alt={f.caption ?? `Foto ${b.judul}`}
                    loading="lazy"
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Share buttons */}
        <div className="mb-8 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-[var(--color-muted-foreground)]">Bagikan:</span>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Bagikan ke Facebook"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#1877F2] text-white hover:opacity-80 transition-opacity"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(b.judul)}&url=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Bagikan ke Twitter/X"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-black text-white hover:opacity-80 transition-opacity"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(b.judul + " - " + shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Bagikan ke WhatsApp"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#25D366] text-white hover:opacity-80 transition-opacity"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </a>
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(b.judul)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Bagikan ke Telegram"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#0088CC] text-white hover:opacity-80 transition-opacity"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.531 6.998-3.014 3.332-1.387 4.025-1.627 4.476-1.635z" />
            </svg>
          </a>
        </div>

        <div className="mt-10 pt-6 border-t border-[var(--color-border)] flex flex-col sm:flex-row gap-3 justify-between">
          <Link
            href="/berita"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-muted)] text-sm font-semibold text-[var(--color-foreground)] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
            Semua Berita Kecamatan
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg hover:bg-[var(--color-muted)] text-sm font-semibold text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
          >
            Kembali ke Beranda
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Berita lainnya */}
      {related.length > 0 && (
        <section className="border-t border-[var(--color-border)] bg-[var(--color-muted)]/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            <h2 className="font-serif text-2xl font-bold mb-6">Berita Lainnya</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {related.map((r) => (
                <BeritaCard key={r.id} berita={r} />
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
