import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllDesa, getDesaBySlug, getRecentArtikel, getPerangkatByDesaId } from "@/lib/queries";
import { ArticleCard } from "@/components/article-card";
import { DesaPerangkatSection } from "@/components/desa-profil";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const d = getDesaBySlug(slug);
  if (!d) return { title: "Desa tidak ditemukan" };
  return {
    title: `Desa ${d.nama}`,
    description: `Portal publikasi dan informasi resmi Desa ${d.nama}, Kecamatan Banjarmangu, Kabupaten Banjarnegara.`,
  };
}

export default async function DesaDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const desa = getDesaBySlug(slug);
  if (!desa) notFound();

  const all = getAllDesa(false);
  const others = all.filter((d) => d.id !== desa.id);

  const artikel = getRecentArtikel(24, slug);
  const perangkatItems = getPerangkatByDesaId(desa.id);
  const total = (
    db
      .prepare(
        "SELECT COUNT(*) AS c FROM artikel a JOIN desa d ON d.id = a.desa_id WHERE d.slug = ?",
      )
      .get(slug) as { c: number }
  ).c;

  return (
    <>
      {/* Header */}
      <section className="bg-gradient-to-br from-[var(--color-primary)] via-[#1d3da1] to-[var(--color-foreground)] text-white">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <nav className="flex items-center gap-1.5 text-xs text-white/70 mb-5">
            <Link href="/" className="hover:text-white">Beranda</Link>
            <span>/</span>
            <Link href="/desa" className="hover:text-white">Desa</Link>
            <span>/</span>
            <span className="text-white">{desa.nama}</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 font-serif text-2xl font-bold">
                  {desa.nama.charAt(0)}
                </span>
                <div className="text-[11px] uppercase tracking-widest text-white/70 font-semibold">
                  Desa · Kecamatan Banjarmangu
                </div>
              </div>
              <h1 className="font-serif text-4xl sm:text-5xl font-bold leading-tight mb-2 !text-white">
                Desa {desa.nama}
              </h1>
              <p className="text-sm text-white/80">
                Kecamatan Banjarmangu, Kabupaten Banjarnegara
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-3">
                <div className="font-serif text-2xl font-bold leading-none">
                  {total}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-white/70 font-semibold mt-1">
                  Artikel
                </div>
              </div>
              <a
                href={desa.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 px-4 py-3 text-white transition-colors"
              >
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                    Situs Resmi
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </div>
                  <div className="text-xs text-white/80 font-mono mt-0.5">
                    {new URL(desa.website).hostname}
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <DesaPerangkatSection perangkat={perangkatItems} />

        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-[var(--color-primary)] font-bold mb-1">
              · Artikel
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold">
              {artikel.length > 0
                ? `${artikel.length} Artikel Terbaru`
                : "Belum ada artikel"}
            </h2>
          </div>
          {artikel.length > 0 && (
            <Link
              href={`/artikel?desa=${desa.slug}`}
              className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)] hover:underline"
            >
              Lihat semua
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>

        {artikel.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-white p-12 text-center">
            <p className="text-[var(--color-muted-foreground)]">
              Belum ada artikel publikasi terbaru dari Desa {desa.nama}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {artikel.map((a) => (
              <ArticleCard key={a.id} artikel={a} />
            ))}
          </div>
        )}

        {/* Other villages */}
        {others.length > 0 && (
          <div className="mt-16 pt-10 border-t border-[var(--color-border)]">
            <h3 className="font-serif text-lg font-bold mb-4">
              Desa Lainnya
            </h3>
            <div className="flex flex-wrap gap-2">
              {others.map((d) => (
                <Link
                  key={d.id}
                  href={`/desa/${d.slug}`}
                  className="px-3 py-1.5 rounded-full text-sm font-semibold border border-[var(--color-border)] bg-white hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
                >
                  {d.nama}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
