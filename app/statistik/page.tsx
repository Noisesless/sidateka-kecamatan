import type { ReactNode } from "react";
import { getProfilKecamatan } from "@/lib/queries";
import {
  getStatistikKecamatanFromApi,
  getStatistikPerDesaDirect,
  getStatistikKecamatanDirect,
  getYearList,
  type ChartData,
  type DesaStatistikDirect,
  type StatistikKecamatanDirect,
  type AggregatedStatItem,
} from "@/lib/statistik";
import { StatistikTabNav } from "@/components/statistik-charts";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Statistik - Kecamatan Banjarmangu",
};

export default async function StatistikPage() {
  const profil = getProfilKecamatan();
  const years = await getYearList();
  const currentYear = years.length > 0 ? Math.max(...years) : new Date().getFullYear();

  // Fetch langsung dari OpenSID tiap desa + OpenDK untuk pertumbuhan historis
  const [kecDirect, perDesa, kecOpenDK] = await Promise.all([
    getStatistikKecamatanDirect(),
    getStatistikPerDesaDirect(),
    getStatistikKecamatanFromApi(currentYear),
  ]);

  const chart = kecOpenDK.chart; // pertumbuhan penduduk historis dari OpenDK

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Header */}
      <header className="mb-8">
        <div className="text-[11px] uppercase tracking-widest text-[var(--color-primary)] font-bold mb-1">
          · Statistik
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold leading-tight mb-3">
          Statistik Kecamatan
        </h1>
        <p className="text-lg text-[var(--color-muted-foreground)]">
          {profil?.nama_kecamatan ?? "Banjarmangu"} · Tahun {currentYear}
        </p>
        <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
          Sumber data: OpenSID per-desa ({kecDirect.desa_ok}/{kecDirect.desa_count} desa terhubung)
          {chart?.penduduk?.length ? ' + OpenDK untuk historis' : ''}
        </p>
      </header>

      {/* Tab Navigation */}
      <StatistikTabNav active="kependudukan" />

      {/* Ringkasan Kecamatan */}
      <section className="mb-10">
        <h2 className="font-serif text-xl font-bold mb-4 flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Ringkasan Penduduk Kecamatan
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard label="Total Penduduk" value={kecDirect.total_penduduk} icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          } />
          <StatCard label="Laki-laki" value={kecDirect.total_laki_laki} icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>
          } color="text-blue-600" />
          <StatCard label="Perempuan" value={kecDirect.total_perempuan} icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>
          } color="text-pink-600" />
          <StatCard label="Desa Terhubung" value={kecDirect.desa_ok} icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          } color="text-green-600" sub={`dari ${kecDirect.desa_count} desa`} />
          <StatCard label="KTP Terpenuhi" value={kecOpenDK.ktp_terpenuhi} icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/><circle cx="7" cy="15" r="1.5"/></svg>
          } color="text-green-600" sub={`dari ${kecOpenDK.ktp_wajib.toLocaleString("id-ID")}`} />
          <StatCard label="Akta Terpenuhi" value={kecOpenDK.akta_terpenuhi} icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M9 13h6"/><path d="M9 17h4"/></svg>
          } color="text-amber-600" sub={`dari ${kecDirect.total_penduduk.toLocaleString("id-ID")}`} />
        </div>
      </section>

      {/* Pertumbuhan Penduduk Historis (dari OpenDK) */}
      {chart?.penduduk && chart.penduduk.length > 0 && (
        <section className="rounded-2xl border border-[var(--color-border)] bg-white p-6 mb-8">
          <h3 className="font-serif text-lg font-bold mb-4">Pertumbuhan Penduduk Tiap Tahun</h3>
          <BarChartPertumbuhan data={chart.penduduk.filter(d => d.year !== 2020)} />
        </section>
      )}

      {/* Charts dari data desa langsung */}
      <div className="space-y-8 mb-10">
        {/* Agama & Usia */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {kecDirect.agama.length > 0 && (
            <section className="rounded-2xl border border-[var(--color-border)] bg-white p-6">
              <h3 className="font-serif text-lg font-bold mb-4">Agama</h3>
              <DonutChart data={kecDirect.agama.map(d => ({ label: d.nama, value: d.jumlah, color: d.color }))} />
            </section>
          )}
          {kecDirect.usia.length > 0 && (
            <section className="rounded-2xl border border-[var(--color-border)] bg-white p-6">
              <h3 className="font-serif text-lg font-bold mb-4">Kelompok Usia</h3>
              <DonutChart data={kecDirect.usia.map(d => ({ label: d.nama, value: d.jumlah, color: d.color }))} />
            </section>
          )}
        </div>

        {/* Pendidikan & Gol. Darah */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {kecDirect.pendidikan.length > 0 && (
            <section className="rounded-2xl border border-[var(--color-border)] bg-white p-6">
              <h3 className="font-serif text-lg font-bold mb-4">Pendidikan Dalam KK</h3>
              <BarChartHorizontal data={kecDirect.pendidikan.map(d => ({ label: d.nama, value: d.jumlah, color: d.color }))} />
            </section>
          )}
          {kecDirect.gol_darah.length > 0 && (
            <section className="rounded-2xl border border-[var(--color-border)] bg-white p-6">
              <h3 className="font-serif text-lg font-bold mb-4">Golongan Darah</h3>
              <DonutChart data={kecDirect.gol_darah.map(d => ({ label: d.nama, value: d.jumlah, color: d.color }))} />
            </section>
          )}
        </div>

        {/* Status Perkawinan & Pekerjaan */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {kecDirect.status_kawin.length > 0 && (
            <section className="rounded-2xl border border-[var(--color-border)] bg-white p-6">
              <h3 className="font-serif text-lg font-bold mb-4">Status Perkawinan</h3>
              <BarChartHorizontal data={kecDirect.status_kawin.map(d => ({ label: d.nama, value: d.jumlah, color: d.color }))} />
            </section>
          )}
          {kecDirect.pekerjaan.length > 0 && (
            <section className="rounded-2xl border border-[var(--color-border)] bg-white p-6">
              <h3 className="font-serif text-lg font-bold mb-4">Pekerjaan (Top 15)</h3>
              <BarChartHorizontal data={kecDirect.pekerjaan.slice(0, 15).map(d => ({ label: d.nama, value: d.jumlah, color: d.color }))} />
            </section>
          )}
        </div>
      </div>

      {/* Statistik Per Desa */}
      <section>
        <h2 className="font-serif text-xl font-bold mb-4 flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M3 9h18" />
            <path d="M3 15h18" />
            <path d="M9 3v18" />
            <path d="M15 3v18" />
          </svg>
          Statistik Per Desa
        </h2>
        {perDesa.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center">
            <p className="text-[var(--color-muted-foreground)]">
              Belum ada data statistik dari desa.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {perDesa.map((d) => (
              <DesaStatCardDirect key={d.desa_slug} data={d} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Components ───

function StatCard({ label, value, icon, color = "text-gray-700", sub }: {
  label: string;
  value: number;
  icon: ReactNode;
  color?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-4 text-center">
      <div className={`flex justify-center mb-2 ${color}`}>{icon}</div>
      <div className={`text-2xl sm:text-3xl font-bold ${color}`}>
        {value.toLocaleString("id-ID")}
      </div>
      <div className="text-xs text-[var(--color-muted-foreground)] mt-1">{label}</div>
      {sub && <div className="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">{sub}</div>}
    </div>
  );
}

function DesaStatCardDirect({ data }: {
  data: DesaStatistikDirect;
}) {
  const isError = data.status === 'error';
  const isEmpty = data.status === 'empty';
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-5 hover:border-[var(--color-primary)] transition-colors">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-[var(--color-foreground)]">{data.desa_nama}</h3>
        <a href={data.website} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--color-primary)] hover:underline">
          Desa →
        </a>
      </div>
      {isError || isEmpty ? (
        <div className="text-center py-5">
          <span className="inline-block px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 font-medium">
            Menunggu integrasi data desa
          </span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-blue-50 rounded-lg p-2">
              <div className="text-lg font-bold text-blue-600">
                {data.laki_laki.toLocaleString("id-ID")}
              </div>
              <div className="text-xs text-blue-600/70">Laki-laki</div>
            </div>
            <div className="bg-pink-50 rounded-lg p-2">
              <div className="text-lg font-bold text-pink-600">
                {data.perempuan.toLocaleString("id-ID")}
              </div>
              <div className="text-xs text-pink-600/70">Perempuan</div>
            </div>
          </div>
          <div className="mt-3 bg-gray-50 rounded-lg p-2 flex justify-between items-center">
            <span className="text-sm text-[var(--color-muted-foreground)]">Total</span>
            <span className="font-bold text-[var(--color-foreground)]">
              {data.penduduk.toLocaleString("id-ID")}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Chart Components (pure CSS/SVG, no external lib) ───

function BarChartPertumbuhan({ data }: { data: Array<{ year: number; value_lk: number; value_pr: number }> }) {
  if (data.length === 0) return null;

  const width = 700;
  const height = 280;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map(d => d.value_lk + d.value_pr), 1);
  const xStep = chartW / Math.max(data.length - 1, 1);

  const toX = (i: number) => padding.left + i * xStep;
  const toY = (val: number) => padding.top + chartH - (val / maxVal) * chartH;

  const lkPoints = data.map((d, i) => `${toX(i)},${toY(d.value_lk)}`).join(" ");
  const prPoints = data.map((d, i) => `${toX(i)},${toY(d.value_pr)}`).join(" ");
  const totalPoints = data.map((d, i) => `${toX(i)},${toY(d.value_lk + d.value_pr)}`).join(" ");

  const yTicks = 4;
  const tickVals = Array.from({ length: yTicks + 1 }, (_, i) => Math.round((maxVal / yTicks) * i));

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="min-w-full">
        {/* Y-axis grid lines & labels */}
        {tickVals.map((val, i) => {
          const y = toY(val);
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e5e7eb" strokeWidth={1} />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" className="fill-gray-500 text-[10px]">
                {val.toLocaleString("id-ID")}
              </text>
            </g>
          );
        })}

        {/* X-axis labels (years) */}
        {data.map((d, i) => (
          <text key={d.year} x={toX(i)} y={height - padding.bottom + 18} textAnchor="middle" className="fill-gray-500 text-[10px]">
            {d.year}
          </text>
        ))}

        {/* Total line (green) */}
        <polyline points={totalPoints} fill="none" stroke="#059669" strokeWidth={2.5} />
        {data.map((d, i) => (
          <circle key={`t-${d.year}`} cx={toX(i)} cy={toY(d.value_lk + d.value_pr)} r={3.5} fill="#059669" />
        ))}

        {/* Laki-laki line (blue) */}
        <polyline points={lkPoints} fill="none" stroke="#3b82f6" strokeWidth={2} />
        {data.map((d, i) => (
          <circle key={`lk-${d.year}`} cx={toX(i)} cy={toY(d.value_lk)} r={3} fill="#3b82f6" />
        ))}

        {/* Perempuan line (pink) */}
        <polyline points={prPoints} fill="none" stroke="#ec4899" strokeWidth={2} />
        {data.map((d, i) => (
          <circle key={`pr-${d.year}`} cx={toX(i)} cy={toY(d.value_pr)} r={3} fill="#ec4899" />
        ))}
      </svg>
      <div className="flex gap-4 text-xs text-[var(--color-muted-foreground)] pt-2 justify-center">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-600" /> Total</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500" /> Laki-laki</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-pink-500" /> Perempuan</span>
      </div>
    </div>
  );
}

function DonutChart({ data }: { data: Array<{ label: string; value: number; color: string }> }) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const filtered = data.filter(d => d.value > 0);
  let cumulativePct = 0;
  const radius = 60;
  const stroke = 25;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      <svg width="160" height="160" viewBox="0 0 160 160" className="flex-shrink-0">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#f3f4f6" strokeWidth={stroke} />
        {filtered.map((d, i) => {
          const pct = (d.value / total) * 100;
          const dash = (pct / 100) * circumference;
          const offset = -((cumulativePct / 100) * circumference);
          cumulativePct += pct;
          return (
            <circle
              key={i}
              cx="80" cy="80" r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={offset}
              transform="rotate(-90 80 80)"
            />
          );
        })}
        <text x="80" y="76" textAnchor="middle" className="text-2xl font-bold fill-gray-800">
          {total.toLocaleString("id-ID")}
        </text>
        <text x="80" y="92" textAnchor="middle" className="text-[10px] fill-gray-500">
          Total
        </text>
      </svg>
      <div className="flex-1 space-y-2 w-full">
        {filtered.map((d, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: d.color }} />
              {d.label}
            </span>
            <span className="font-medium">
              {d.value.toLocaleString("id-ID")}
              <span className="text-[var(--color-muted-foreground)] ml-1.5">
                ({((d.value / total) * 100).toFixed(1)}%)
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChartHorizontal({ data }: { data: Array<{ label: string; value: number; color: string }> }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const filtered = data.filter(d => d.value > 0);
  return (
    <div className="space-y-3">
      {filtered.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-28 text-sm text-[var(--color-muted-foreground)] flex-shrink-0 truncate" title={d.label}>{d.label}</div>
          <div className="flex-1 bg-gray-100 rounded-full h-7 relative overflow-hidden">
            <div
              className="h-full rounded-full flex items-center justify-end px-2 transition-all"
              style={{ width: `${Math.max((d.value / maxVal) * 100, 3)}%`, backgroundColor: d.color }}
            >
              <span className="text-[10px] font-bold text-white whitespace-nowrap">
                {d.value.toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        </div>
      ))}
      {filtered.length === 0 && (
        <p className="text-sm text-[var(--color-muted-foreground)] text-center py-4">Tidak ada data</p>
      )}
    </div>
  );
}
