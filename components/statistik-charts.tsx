import type { ReactNode } from "react";

export function StatCard({ label, value, icon, color = "text-gray-700", sub }: {
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

export function DonutChart({ data }: { data: Array<{ label: string; value: number; color: string }> }) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const filtered = data.filter(d => d.value > 0);
  // Persentase kumulatif tiap segmen, dihitung immutabel (bukan reassign saat render)
  const startPcts = filtered.map((_, i) =>
    filtered.slice(0, i).reduce((sum, d) => sum + (d.value / total) * 100, 0)
  );
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
          const offset = -((startPcts[i] / 100) * circumference);
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

export function BarChartHorizontal({ data, maxItems = 15 }: { data: Array<{ label: string; value: number; color: string }>; maxItems?: number }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const sorted = [...data].filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, maxItems);
  return (
    <div className="space-y-3">
      {sorted.map((d, i) => {
        const pct = Math.max((Math.sqrt(d.value) / Math.sqrt(maxVal)) * 100, 5);
        return (
          <div key={i} className="flex items-start gap-2 sm:gap-3">
            <div
              className="w-28 sm:w-44 md:w-52 text-xs sm:text-sm text-[var(--color-muted-foreground)] flex-shrink-0 text-right leading-7 truncate"
              title={d.label}
            >
              {d.label}
            </div>
            <div className="flex-1 bg-gray-100 rounded-full h-7 relative overflow-hidden min-w-0">
              <div
                className="h-full rounded-full flex items-center justify-end px-2 transition-all"
                style={{ width: `${pct}%`, backgroundColor: d.color }}
              >
                <span className="text-[10px] font-bold text-white whitespace-nowrap">
                  {d.value.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>
        );
      })}
      {sorted.length === 0 && (
        <p className="text-sm text-[var(--color-muted-foreground)] text-center py-4">Tidak ada data</p>
      )}
    </div>
  );
}

export function StatistikTabNav({ active }: { active: string }) {
  const tabs = [
    { href: "/statistik", label: "Kependudukan", key: "kependudukan" },
    { href: "/statistik/pendidikan", label: "Pendidikan", key: "pendidikan" },
    { href: "/statistik/kesehatan", label: "Kesehatan", key: "kesehatan" },
    { href: "/statistik/program-dan-bantuan", label: "Program dan Bantuan", key: "program" },
    { href: "/statistik/anggaran-dan-realisasi", label: "Anggaran dan Realisasi", key: "anggaran" },
  ];
  return (
    <div className="flex flex-nowrap md:flex-wrap gap-2 mb-8 border-b border-[var(--color-border)] pb-1 overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => (
        <a
          key={tab.key}
          href={tab.href}
          className={`shrink-0 whitespace-nowrap px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            active === tab.key
              ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] -mb-px"
              : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          }`}
        >
          {tab.label}
        </a>
      ))}
    </div>
  );
}

export function DesaConnectivityBadge({ ok, total }: { ok: number; total: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
      {ok}/{total} desa terhubung
    </span>
  );
}
