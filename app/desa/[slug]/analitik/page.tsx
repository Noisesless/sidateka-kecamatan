import { notFound } from "next/navigation";
import Link from "next/link";
import { getDesaBySlug, getStatistikByDesaId, getPerangkatByDesaId } from "@/lib/queries";
import { statistikLabel } from "@/lib/analitik";
import { getKecamatanPenduduk } from "@/lib/opendata";
import { BarList, Donut, Pyramid, fmtNum } from "@/components/analitik-charts";
import { db } from "@/lib/db";
import type { StatistikDesa } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const d = getDesaBySlug(slug);
  if (!d) return { title: "Analitik Desa" };
  return {
    title: `Analitik Desa ${d.nama}`,
    description: `Statistik kependudukan, pemerintahan, dan aktivitas Desa ${d.nama}, Kecamatan Banjarmangu — diambil otomatis dari situs resmi desa (OpenSID).`,
  };
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
      <h3 className="text-base font-bold text-[var(--color-foreground)]">{title}</h3>
      {subtitle && <p className="mb-3 mt-0.5 text-xs text-[var(--color-muted-foreground)]">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </section>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <p className="text-sm italic text-[var(--color-muted-foreground)]">{text}</p>;
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--color-foreground)]">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">{sub}</p>}
    </div>
  );
}

export default async function AnalitikDesaPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const desa = getDesaBySlug(slug);
  if (!desa) notFound();

  const statistik = getStatistikByDesaId(desa.id);
  const perangkat = getPerangkatByDesaId(desa.id);
  const kec = await getKecamatanPenduduk();

  const byKategori = (kat: string): StatistikDesa[] => statistik.filter((s) => s.kategori === kat);

  const jk = byKategori("jenis_kelamin");
  const jkL = jk.find((r) => /laki/i.test(r.nama));
  const jkP = jk.find((r) => /perempuan/i.test(r.nama));
  const totalPenduduk = jk.reduce((s, r) => s + r.jumlah, 0);

  const umur = byKategori("umur_rentang");
  const agama = byKategori("agama");
  const pendidikan = byKategori("pendidikan_kk");
  const pekerjaan = [...byKategori("pekerjaan")].sort((a, b) => b.jumlah - a.jumlah);
  const statusKawin = byKategori("status_kawin");
  const statusPenduduk = byKategori("status_penduduk");
  const cacat = byKategori("cacat");
  const penyakit = byKategori("penyakit_menahun");

  const cacatTotal = cacat.reduce((s, r) => s + r.jumlah, 0);
  const penyakitTotal = penyakit.reduce((s, r) => s + r.jumlah, 0);

  // Aktivitas konten: berita tersalin per bulan (12 bulan terakhir)
  const beritaPerBulan = (
    db
      .prepare(
        `SELECT strftime('%Y-%m', published_at) AS bulan, COUNT(*) AS n
         FROM artikel WHERE desa_id = ? AND published_at IS NOT NULL
         GROUP BY bulan ORDER BY bulan DESC LIMIT 12`,
      )
      .all(desa.id) as { bulan: string | null; n: number }[]
  ).filter((b): b is { bulan: string; n: number } => b.bulan !== null);
  beritaPerBulan.reverse();
  const totalBerita = (
    db.prepare("SELECT COUNT(*) AS n FROM artikel WHERE desa_id = ?").get(desa.id) as { n: number }
  ).n;

  const pctKecamatan =
    kec && kec.totalPenduduk > 0 && totalPenduduk > 0
      ? ((totalPenduduk / kec.totalPenduduk) * 100).toFixed(1)
      : null;

  const adaStatistik = statistik.length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-2 text-sm text-[var(--color-muted-foreground)]">
        <Link href="/analitik" className="hover:text-[var(--color-primary)] hover:underline">
          Analitik
        </Link>{" "}
        /{" "}
        <Link href={`/desa/${desa.slug}`} className="hover:text-[var(--color-primary)] hover:underline">
          Desa {desa.nama}
        </Link>{" "}
        / Analitik
      </nav>
      <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Analitik Desa {desa.nama}</h1>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        Data kependudukan bersumber dari publikasi data resmi desa.
        {desa.statistik_at && (
          <>
            {" "}
            Pembaruan terakhir:{" "}
            {new Date(desa.statistik_at.replace(" ", "T")).toLocaleString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            .
          </>
        )}
      </p>

      {/* Ringkasan */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard
          label="Total Penduduk"
          value={totalPenduduk > 0 ? fmtNum(totalPenduduk) : "—"}
          sub={pctKecamatan ? `${pctKecamatan}% dari Kec. Banjarmangu` : undefined}
        />
        <SummaryCard
          label="Laki-laki / Perempuan"
          value={jkL && jkP ? `${fmtNum(jkL.jumlah)} / ${fmtNum(jkP.jumlah)}` : "—"}
          sub={
            jkL && jkP && jkP.jumlah > 0
              ? `rasio ${((jkL.jumlah / jkP.jumlah) * 100).toFixed(1)} : 100`
              : undefined
          }
        />
        <SummaryCard
          label="Aparatur Desa"
          value={perangkat.length > 0 ? String(perangkat.length) : "—"}
          sub={perangkat.length > 0 ? "perangkat terdata" : undefined}
        />
        <SummaryCard label="Publikasi Artikel" value={fmtNum(totalBerita)} sub="artikel di portal" />
      </div>

      {!adaStatistik && (
        <div className="mt-6 rounded-2xl border border-dashed border-[var(--color-border)] bg-white p-8 text-center">
          <p className="text-[var(--color-muted-foreground)]">
            Data statistik kependudukan desa ini belum tersedia — situs desa belum mempublikasikannya
            atau sedang dalam proses pemutakhiran data.
          </p>
        </div>
      )}

      {adaStatistik && (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Piramida Penduduk" subtitle={statistikLabel("umur_rentang")}>
            {umur.length > 0 ? (
              <Pyramid rows={umur.filter((r) => !/belum mengisi/i.test(r.nama)).map((r) => ({ label: r.nama, laki: r.laki, perempuan: r.perempuan }))} />
            ) : (
              <EmptyNote text="Data umur belum tersedia." />
            )}
          </Panel>

          <Panel title="Jenis Kelamin" subtitle={statistikLabel("jenis_kelamin")}>
            {jk.length > 0 ? (
              <Donut rows={jk.map((r) => ({ label: r.nama, value: r.jumlah }))} />
            ) : (
              <EmptyNote text="Data jenis kelamin belum tersedia." />
            )}
          </Panel>

          <Panel title="Agama" subtitle={statistikLabel("agama")}>
            {agama.length > 0 ? (
              <Donut rows={agama.map((r) => ({ label: r.nama, value: r.jumlah }))} />
            ) : (
              <EmptyNote text="Data agama belum tersedia." />
            )}
          </Panel>

          <Panel title="Pendidikan dalam KK" subtitle={statistikLabel("pendidikan_kk")}>
            {pendidikan.length > 0 ? (
              <BarList rows={pendidikan.map((r) => ({ label: r.nama, value: r.jumlah }))} />
            ) : (
              <EmptyNote text="Data pendidikan belum tersedia." />
            )}
          </Panel>

          <Panel title="Pekerjaan" subtitle="10 pekerjaan terbanyak">
            {pekerjaan.length > 0 ? (
              <BarList
                rows={pekerjaan.slice(0, 10).map((r) => ({ label: r.nama, value: r.jumlah }))}
                color="#16a34a"
              />
            ) : (
              <EmptyNote text="Data pekerjaan belum tersedia." />
            )}
          </Panel>

          <Panel title="Status Perkawinan" subtitle={statistikLabel("status_kawin")}>
            {statusKawin.length > 0 ? (
              <BarList rows={statusKawin.map((r) => ({ label: r.nama, value: r.jumlah }))} color="#7c3aed" />
            ) : (
              <EmptyNote text="Data status perkawinan belum tersedia." />
            )}
          </Panel>

          <Panel title="Status Penduduk" subtitle={statistikLabel("status_penduduk")}>
            {statusPenduduk.length > 0 ? (
              <BarList rows={statusPenduduk.map((r) => ({ label: r.nama, value: r.jumlah }))} color="#0891b2" />
            ) : (
              <EmptyNote text="Data status penduduk belum tersedia." />
            )}
          </Panel>

          {(cacatTotal > 0 || penyakitTotal > 0) && (
            <Panel title="Kesehatan & Disabilitas" subtitle="Penyandang cacat dan penyakit menahun">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold tabular-nums text-[var(--color-foreground)]">
                    {fmtNum(cacatTotal)}
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">penyandang cacat</p>
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums text-[var(--color-foreground)]">
                    {fmtNum(penyakitTotal)}
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">penderita penyakit menahun</p>
                </div>
              </div>
            </Panel>
          )}
        </div>
      )}

      {/* Aktivitas konten */}
      {beritaPerBulan.length > 0 && (
        <div className="mt-4">
          <Panel title="Aktivitas Publikasi" subtitle="Berita tersalin di portal per bulan">
            <BarList
              rows={beritaPerBulan.map((b) => ({ label: b.bulan, value: b.n }))}
              color="#d97706"
            />
          </Panel>
        </div>
      )}

      <p className="mt-6 text-xs text-[var(--color-muted-foreground)]">
        Sumber:{" "}
        <a href={desa.website} target="_blank" rel="noopener noreferrer" className="underline">
          {desa.website.replace(/^https?:\/\//, "")}
        </a>{" "}
        (OpenSID) · Data agregat kecamatan dari OpenDK Banjarmangu ·{" "}
        <Link href="/analitik" className="underline">
          Lihat perbandingan antar-desa
        </Link>
      </p>
    </div>
  );
}
