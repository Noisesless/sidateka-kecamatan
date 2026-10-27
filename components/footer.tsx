import Link from "next/link";
import { getAllDesa, getArtikelStats } from "@/lib/queries";
import { NAV_LINKS } from "@/lib/navigation";

/** Flatten nav links to top-level only (no children) for compact footer */
const FOOTER_QUICK_LINKS = NAV_LINKS.filter((item) => !item.children || item.children.length === 0)
  .concat(
    NAV_LINKS.filter((item) => item.children).map((item) => ({ href: item.href, label: item.label }))
  );

export function Footer() {
  const desa = getAllDesa(true);
  const stats = getArtikelStats();

  return (
    <footer className="block mt-14 sm:mt-24 border-t border-[var(--color-border)] bg-white pb-6 md:pb-0">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-3">
              <img
                src="/logo.png"
                alt="Logo Kecamatan"
                className="h-9 w-9 rounded-lg shadow-sm object-contain"
              />
              <div className="leading-tight">
                <div className="font-serif text-base font-semibold">
                  SIDATEKA BANJARMANGU
                </div>
                <div className="text-[10px] uppercase tracking-widest text-[var(--color-muted-foreground)]">
                  Sistim Informasi Desa Terintegrasi Kecamatan
                </div>
              </div>
            </div>
            <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed">
              Portal agregator artikel dan informasi 17 desa di Kecamatan
              Banjarmangu. Data bersumber dari website resmi masing-masing desa.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-foreground)] mb-3">
              Tautan Cepat
            </h3>
            <ul className="space-y-1.5 text-sm">
              {FOOTER_QUICK_LINKS.map((item) => (
                <li key={item.href + item.label}>
                  <Link
                    href={item.href}
                    className="text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Desa */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-foreground)] mb-3">
              17 Desa
            </h3>
            <ul className="space-y-1.5 text-sm max-h-48 overflow-y-auto pr-2">
              {desa.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/desa/${d.slug}`}
                    className="text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)]"
                  >
                    Desa {d.nama}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Stats */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-foreground)] mb-3">
              Statistik
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-dashed border-[var(--color-border)] pb-1.5">
                <dt className="text-[var(--color-muted-foreground)]">Total Desa</dt>
                <dd className="font-semibold text-[var(--color-foreground)]">
                  {stats.totalDesa}
                </dd>
              </div>
              <div className="flex justify-between border-b border-dashed border-[var(--color-border)] pb-1.5">
                <dt className="text-[var(--color-muted-foreground)]">Desa Aktif</dt>
                <dd className="font-semibold text-[var(--color-foreground)]">
                  {stats.totalDesaAktif}
                </dd>
              </div>
              <div className="flex justify-between border-b border-dashed border-[var(--color-border)] pb-1.5">
                <dt className="text-[var(--color-muted-foreground)]">Artikel</dt>
                <dd className="font-semibold text-[var(--color-foreground)]">
                  {stats.totalArtikel.toLocaleString("id-ID")}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-muted-foreground)]">Sinkron Terakhir</dt>
                <dd className="font-semibold text-[var(--color-foreground)] text-xs">
                  {stats.lastSync
                    ? new Date(stats.lastSync).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--color-muted-foreground)]">
          <div>
            © {new Date().getFullYear()} SIDATEKA · Sistim Informasi Desa
            Terintegrasi Kecamatan Banjarmangu, Kabupaten Banjarnegara, Jawa
            Tengah
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] animate-pulse-soft" />
            Dibangun oleh{" "}
            <a
              href="https://sid.clasnet.co.id"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[var(--color-foreground)] hover:text-[var(--color-primary)] transition-colors"
            >
              Clasnet
            </a>{" "}
            · Data agregat dari situs desa
          </div>
        </div>
      </div>
    </footer>
  );
}
