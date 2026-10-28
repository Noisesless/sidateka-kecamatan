import { notFound } from "next/navigation";
import Link from "next/link";
import * as cheerio from "cheerio";
import { db } from "@/lib/db";
import { getArtikelByDesaAndSlug, getRecentArtikel } from "@/lib/queries";
import { ArticleCard } from "@/components/article-card";
import { SafeImage } from "@/components/safe-image";
import { isSafePublicUrl, sanitizeHtmlContent } from "@/lib/security";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function decodeEntities(s: string | null): string {
  if (!s) return "";
  return s
    .replace(/&amp;/g, "&")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;|&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<");
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fetch article content on-the-fly from the original desa website.
 * Tries multiple selectors for different OpenSID themes.
 * Returns { ringkasan, konten } or null if fetch fails.
 */
async function fetchArticleContent(
  url: string
): Promise<{ ringkasan: string; konten: string } | null> {
  // Anti-SSRF check: cegah server fetch ke IP loopback/privat/metadata
  if (!isSafePublicUrl(url)) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    // Remove noise elements
    $("script, style, nav, header, footer, .navbar, .sidebar, .comments, .comment, .widget, .adsbygoogle, iframe").remove();
    // Remove share sections from desa website
    $("[class*='share'], [class*='Share'], [id*='share'], .social-share, .share-buttons, .share-this").remove();
    $(":contains('Share this article')").each((_i, el) => {
      const $el = $(el);
      if ($el.children().length > 0 && $el.text().trim().startsWith("Share this article")) {
        $el.remove();
      }
    });

    // Try multiple selectors for article content (OpenSID themes vary)
    // OpenDesa theme uses English spelling (.article-content),
    // OpenSID default uses Indonesian spelling (.artikel-content),
    // OpenSID Esensi/Natra theme (desa.id) uses .content-isi inside #printing
    const contentSelectors = [
      ".artikelpage .isicontent",
      ".isicontent",
      ".content.space-y-2",
      "div.content",
      ".content-isi",
      "#printing .content-area",
      ".article-content",
      ".article-body",
      ".artikel-content",
      ".artikel .content",
      ".artikel",
      ".entry-content",
      ".post-content",
      ".post-body",
      "article .content",
      "article",
      "#content .artikel",
      "#content article",
      ".main-content article",
      ".main-content .artikel",
      ".article-detail-container",
    ];

    let konten: string | null = null;
    for (const sel of contentSelectors) {
      const $el = $(sel).first();
      if ($el.length) {
        // Remove the title heading from content (already shown in hero)

        const $clone = $el.clone();
        $clone.find("h1, h2.title, .artikel-title, .entry-title, .post-title, .head-content").remove();
        $clone.find(".artikelmeta, .entry-meta, .post-meta, span.inline-flex").remove();
        const text = $clone.text().replace(/\s+/g, " ").trim();
        const html2 = text.length > 50 ? $clone.html()?.trim() : null;
        if (html2 && html2.length > 100) {
          konten = html2;
          break;
        }
      }
    }

    if (!konten) return null;

    const safeKonten = sanitizeHtmlContent(konten);
    // Generate ringkasan from konten
    const text = stripHtml(safeKonten);
    const ringkasan =
      text.length > 280
        ? text.slice(0, text.slice(0, 280).lastIndexOf(" ") || 280) + " [...]"
        : text;

    return { ringkasan, konten: safeKonten };
  } catch {
    return null;
  }
}

type Params = { slug: string; artikel: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug, artikel: artikelSlug } = await params;
  const a = getArtikelByDesaAndSlug(slug, artikelSlug);
  if (!a) return { title: "Artikel tidak ditemukan" };
  return {
    title: a.judul,
    description: decodeEntities(a.ringkasan ?? a.judul),
    openGraph: {
      title: a.judul,
      description: a.ringkasan ?? a.judul,
      images: a.gambar ? [a.gambar] : undefined,
    },
  };
}

function formatDate(s: string | null): string {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ArtikelDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug, artikel: artikelSlug } = await params;
  const a = getArtikelByDesaAndSlug(slug, artikelSlug);
  if (!a) notFound();

  // Increment view count
  db.prepare("UPDATE artikel SET view_count = view_count + 1 WHERE id = ?").run(a.id);

  // Fetch konten lengkap dari situs desa jika konten belum ada ATAU hanya berisi
  // excerpt RSS (feed OpenSID memotong isi artikel dengan akhiran "[...]").
  let ringkasan = a.ringkasan;
  let konten = a.konten;
  const kontenHanyaExcerpt = !konten || stripHtml(konten).endsWith("[...]") || stripHtml(konten).length < 500;
  if (kontenHanyaExcerpt && a.url) {
    const fetched = await fetchArticleContent(a.url);
    if (fetched) {
      ringkasan = fetched.ringkasan;
      konten = fetched.konten;
      // Save to database so future visits don't need to re-fetch
      db.prepare(
        "UPDATE artikel SET ringkasan = ?, konten = ? WHERE id = ?"
      ).run(ringkasan, konten, a.id);
    }
  }

  // Bersihkan dan format ringkasan & konten
  const cleanRingkasan = decodeEntities(ringkasan);
  let cleanKonten = konten ? decodeEntities(konten) : "";

  if (cleanKonten) {
    const $clean = cheerio.load(cleanKonten);
    // Hapus widget sosial / tombol share bawaan dari tema OpenSID/WordPress
    $clean("[class*='share'], [class*='Share'], [id*='share'], .social-share, .share-buttons, .share-this").remove();
    $clean(":contains('Share this article')").each((_i, el) => {
      const $el = $clean(el);
      if ($el.children().length > 0 && $el.text().trim().startsWith("Share this article")) {
        $el.remove();
      }
    });

    // Hapus gambar utama di awal konten jika foto utama (a.gambar) sudah ditampilkan di hero banner.
    // Ini menghilangkan redundansi foto ganda dan mencegah ikon gambar rusak (broken image)
    // akibat hotlink protection / WAF server desa.
    if (a.gambar) {
      const $firstImg = $clean("img").first();
      if ($firstImg.length) {
        $firstImg.remove();
      }
    }

    // Bersihkan tag pembungkus kosong yang tersisa setelah gambar dihapus
    $clean("p, figure, div").each((_i, el) => {
      const $el = $clean(el);
      if (!$el.text().trim() && $el.find("img, iframe, table").length === 0) {
        $el.remove();
      }
    });

    cleanKonten = $clean("body").html()?.trim() || "";
  }

  const strippedKonten = cleanKonten ? stripHtml(cleanKonten) : "";
  const strippedRingkasan = cleanRingkasan ? stripHtml(cleanRingkasan) : "";

  // Cek apakah konten hanya berupa ringkasan pendek / kutipan cuplikan RSS
  const isExcerptOnly =
    !cleanKonten ||
    strippedKonten.endsWith("[...]") ||
    strippedKonten.length <= 320 ||
    strippedKonten.replace(/\s+/g, "") === strippedRingkasan.replace(/\s+/g, "");

  // Related: same desa
  const related = getRecentArtikel(4, slug).filter((x) => x.id !== a.id).slice(0, 3);

  return (
    <article className="bg-white">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-foreground)] text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <nav className="flex flex-wrap items-center gap-1.5 text-xs text-white/70 mb-5">
            <Link href="/" className="hover:text-white">Beranda</Link>
            <span>/</span>
            <Link href="/artikel" className="hover:text-white">Artikel</Link>
            <span>/</span>
            <Link href={`/desa/${a.desa.slug}`} className="hover:text-white">
              Desa {a.desa.nama}
            </Link>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            {a.kategori && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--color-accent)] text-white">
                {a.kategori}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-white/80 font-semibold">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-white" />
              Desa {a.desa.nama}
            </span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight mb-5 drop-shadow-lg text-white !text-white">
            {a.judul}
          </h1>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/70 border-t border-white/15 pt-4">
            {a.penulis && (
              <div className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                {a.penulis}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {formatDate(a.published_at)}
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {a.view_count} dilihat
            </div>
          </div>
        </div>
      </div>

      {/* Image */}
      {a.gambar && (
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 -mt-8 sm:-mt-12 relative z-10">
          <div className="rounded-2xl overflow-hidden border-4 border-white shadow-2xl bg-[var(--color-muted)]">
            <SafeImage
              src={a.gambar}
              alt={a.judul}
              className="w-full h-auto max-h-[480px] object-cover"
            />
          </div>
        </div>
      )}

      {/* Content - konten artikel / ringkasan resmi tanpa duplikasi */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* Jika artikel memiliki konten utuh (bukan sekadar ringkasan pendek) */}
        {!isExcerptOnly && cleanKonten ? (
          <div className="mb-10 rounded-2xl border border-[var(--color-border)] bg-white p-6 sm:p-9 shadow-xs">
            <div
              className="prose-article text-[var(--color-foreground)] leading-relaxed text-base sm:text-lg"
              dangerouslySetInnerHTML={{ __html: cleanKonten }}
            />
          </div>
        ) : null}

        {/* Jika artikel hanya memiliki ringkasan / cuplikan RSS */}
        {isExcerptOnly && (cleanRingkasan || strippedKonten) ? (
          <div className="mb-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-6 sm:p-8">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary)] mb-3 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="21" y1="10" x2="3" y2="10" />
                <line x1="21" y1="6" x2="3" y2="6" />
                <line x1="21" y1="14" x2="3" y2="14" />
                <line x1="17" y1="18" x2="3" y2="18" />
              </svg>
              <span>Ringkasan Berita Resmi</span>
            </div>
            <p className="text-base sm:text-lg text-[var(--color-foreground)] leading-relaxed whitespace-pre-line font-serif">
              {cleanRingkasan || strippedKonten}
            </p>
          </div>
        ) : null}

        {/* Pesan jika tidak ada konten sama sekali */}
        {!cleanRingkasan && !cleanKonten ? (
          <div className="mb-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-6 text-center">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Konten artikel belum tersedia. Silakan buka artikel asli untuk membaca konten lengkap.
            </p>
          </div>
        ) : null}

        {/* Share buttons */}
        <div className="mb-8 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-[var(--color-muted-foreground)]">Bagikan:</span>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(a.url)}`}
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
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(a.judul)}&url=${encodeURIComponent(a.url)}`}
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
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(a.judul + " - " + a.url)}`}
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
            href={`https://t.me/share/url?url=${encodeURIComponent(a.url)}&text=${encodeURIComponent(a.judul)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Bagikan ke Telegram"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#0088CC] text-white hover:opacity-80 transition-opacity"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.531 6.998-3.014 3.332-1.387 4.025-1.627 4.476-1.635z" />
            </svg>
          </a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(a.url)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Bagikan ke LinkedIn"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#0A66C2] text-white hover:opacity-80 transition-opacity"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </a>
        </div>

        {/* CTA: Baca artikel lengkap di situs desa */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-[var(--color-primary)] bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-foreground)] text-white p-7 sm:p-9 mb-8">
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 w-48 h-48 rounded-full bg-[var(--color-accent)]/20 blur-3xl pointer-events-none" />

          <div className="relative">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-[10px] font-bold uppercase tracking-widest mb-4">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Sumber: Desa {a.desa.nama}
            </div>

            <h2 className="font-serif text-2xl sm:text-3xl font-bold leading-tight mb-3 !text-white">
              {isExcerptOnly
                ? `Baca artikel lengkap di situs Desa ${a.desa.nama}`
                : `Kunjungi sumber asli di situs Desa ${a.desa.nama}`}
            </h2>
            <p className="text-sm sm:text-base text-white/80 leading-relaxed mb-6 max-w-2xl !text-white/80">
              {isExcerptOnly
                ? `Portal Sidateka menampilkan ringkasan berita resmi. Untuk membaca rincian selengkapnya, silakan kunjungi website resmi Desa ${a.desa.nama}.`
                : `Artikel ini dipublikasikan oleh Pemerintah Desa ${a.desa.nama}. Anda dapat mengunjungi website resmi desa untuk melihat informasi dan publikasi lainnya.`}
            </p>

            <a
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-[var(--color-accent)] hover:bg-white hover:text-[var(--color-primary)] text-sm font-bold text-white transition-all shadow-lg hover:shadow-xl"
            >
              Buka artikel asli
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>

            <div className="mt-5 pt-5 border-t border-white/15 text-[11px] text-white/60 break-all font-mono">
              {a.url}
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[var(--color-border)] flex flex-col sm:flex-row gap-3 justify-between">
          <Link
            href={`/desa/${a.desa.slug}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-muted)] text-sm font-semibold text-[var(--color-foreground)] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
            Kembali ke Desa {a.desa.nama}
          </Link>
          <Link
            href="/artikel"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg hover:bg-[var(--color-muted)] text-sm font-semibold text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
          >
            Lihat semua artikel
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="border-t border-[var(--color-border)] bg-[var(--color-muted)]/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            <h2 className="font-serif text-2xl font-bold mb-6">
              Artikel Lainnya dari Desa {a.desa.nama}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {related.map((r) => (
                <ArticleCard key={r.id} artikel={r} />
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
