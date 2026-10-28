import Link from "next/link";
import { getArtikelStats, getAllDesa } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tentang Portal",
};

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 11a9 9 0 0 1 9 9" />
        <path d="M4 4a16 16 0 0 1 16 16" />
        <circle cx="5" cy="19" r="1" />
      </svg>
    ),
    title: "Auto-Sync RSS",
    desc: "Menarik artikel otomatis dari feed RSS website desa. Prioritas pertama saat sinkronisasi.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    title: "HTML Scraper",
    desc: "Fallback ketika RSS tidak tersedia. Membaca daftar artikel langsung dari halaman desa.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: "Cloudflare-Aware",
    desc: "Request server-to-server yang menghindari deteksi Cloudflare dan proteksi lainnya.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5v14a9 3 0 0 0 18 0V5" />
        <path d="M3 12a9 3 0 0 0 18 0" />
      </svg>
    ),
    title: "SQLite Storage",
    desc: "Penyimpanan lokal ringan, cepat, dan tanpa setup database server.",
  },
];

export default function TentangPage() {
  const stats = getArtikelStats();
  const desa = getAllDesa(false);
  const aktif = desa.filter((d) => d.is_active).length;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <header className="mb-10">
        <div className="text-[11px] uppercase tracking-widest text-[var(--color-primary)] font-bold mb-1">
          · Tentang
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold leading-tight mb-3">
          Portal Kecamatan Banjarmangu
        </h1>
        <p className="text-lg text-[var(--color-muted-foreground)] leading-relaxed">
          Portal agregator yang mengumpulkan artikel dan informasi dari 17 desa
          di Kecamatan Banjarmangu, Kabupaten Banjarnegara, Jawa Tengah.
        </p>
      </header>

      {/* Stats banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-4">
          <div className="font-serif text-2xl font-bold text-[var(--color-primary)]">{stats.totalDesa}</div>
          <div className="text-[11px] uppercase tracking-widest text-[var(--color-muted-foreground)] font-semibold mt-1">Desa</div>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-4">
          <div className="font-serif text-2xl font-bold text-[var(--color-primary)]">{aktif}</div>
          <div className="text-[11px] uppercase tracking-widest text-[var(--color-muted-foreground)] font-semibold mt-1">Aktif</div>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-4">
          <div className="font-serif text-2xl font-bold text-[var(--color-primary)]">{stats.totalArtikel.toLocaleString("id-ID")}</div>
          <div className="text-[11px] uppercase tracking-widest text-[var(--color-muted-foreground)] font-semibold mt-1">Artikel</div>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-4">
          <div className="font-serif text-2xl font-bold text-[var(--color-primary)]">
            {stats.lastSync ? new Date(stats.lastSync).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) : "—"}
          </div>
          <div className="text-[11px] uppercase tracking-widest text-[var(--color-muted-foreground)] font-semibold mt-1">Pembaruan Terakhir</div>
        </div>
      </div>

      {/* Cara kerja */}
      <section className="mb-12">
        <h2 className="font-serif text-2xl font-bold mb-5">Cara Kerja</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {FEATURES.map((f, i) => (
            <div key={i} className="rounded-xl border border-[var(--color-border)] bg-white p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] mb-3">
                {f.icon}
              </div>
              <h3 className="font-serif text-lg font-semibold mb-1.5">{f.title}</h3>
              <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Strategi 3-tier */}
      <section className="mb-12">
        <h2 className="font-serif text-2xl font-bold mb-5">Strategi Pengambilan Data</h2>
        <ol className="space-y-3">
          {[
            { tier: "01", title: "API Satu Data", desc: "Memanggil API OpenSID Satu Data jika desa menyediakan endpoint publik.", color: "bg-[var(--color-accent)]" },
            { tier: "02", title: "RSS Feed", desc: "Parsing feed RSS yang disediakan oleh website desa.", color: "bg-[var(--color-secondary)]" },
            { tier: "03", title: "HTML Scrape", desc: "Fallback terakhir — membaca daftar artikel dari halaman utama website desa.", color: "bg-[var(--color-warning)]" },
          ].map((s) => (
            <li key={s.tier} className="flex gap-4 p-4 rounded-xl border border-[var(--color-border)] bg-white">
              <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${s.color} text-white font-bold text-sm flex items-center justify-center`}>
                {s.tier}
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold mb-0.5">{s.title}</h3>
                <p className="text-sm text-[var(--color-muted-foreground)]">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Stack */}
      <section className="mb-12">
        <h2 className="font-serif text-2xl font-bold mb-5">Teknologi</h2>
        <div className="flex flex-wrap gap-2">
          {["Next.js 16", "React 19", "TypeScript", "Tailwind CSS v4", "SQLite", "better-sqlite3", "rss-parser", "cheerio"].map((t) => (
            <span key={t} className="px-3 py-1.5 rounded-full text-xs font-mono font-semibold border border-[var(--color-border)] bg-white text-[var(--color-foreground)]">
              {t}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-foreground)] p-8 sm:p-10 text-white">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold mb-3 !text-white">
          Jelajahi Portal Sidateka
        </h2>
        <p className="text-white/80 mb-6 max-w-2xl leading-relaxed">
          Temukan publikasi berita terkini, profil wilayah, dan data analitik kependudukan dari 17 desa di wilayah Kecamatan Banjarmangu.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/artikel"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--color-accent)] hover:bg-white hover:text-[var(--color-primary)] font-semibold transition-colors"
          >
            Lihat Artikel
          </Link>
          <Link
            href="/desa"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 font-semibold transition-colors"
          >
            Daftar Desa
          </Link>
        </div>
      </section>
    </div>
  );
}
