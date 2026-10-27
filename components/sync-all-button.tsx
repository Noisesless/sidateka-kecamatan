"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export type DesaSyncItem = {
  id: number;
  nama: string;
  slug: string;
  website: string;
  is_active: number | boolean;
};

type SyncLogItem = {
  nama: string;
  slug: string;
  status: "ok" | "failed" | "skipped";
  message: string;
  newCount: number;
  updatedCount: number;
  durationMs: number;
};

type ProbeItem = {
  id: number;
  nama: string;
  slug: string;
  website: string;
  status: "online" | "blocked_waf" | "offline";
  message: string;
  latencyMs: number;
};

type Props = {
  desaList?: DesaSyncItem[];
  label?: string;
};

export default function SyncAllButton({
  desaList = [],
}: Props) {
  const router = useRouter();

  const [running, setRunning] = useState(false);
  const [probing, setProbing] = useState(false);
  const [probeResults, setProbeResults] = useState<ProbeItem[] | null>(null);

  const [currentDesa, setCurrentDesa] = useState<DesaSyncItem | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalDesa, setTotalDesa] = useState(0);
  const [tickerText, setTickerText] = useState<string>("");
  const [isFinished, setIsFinished] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const [summary, setSummary] = useState({
    success: 0,
    failed: 0,
    skipped: 0,
    newArticles: 0,
    updatedArticles: 0,
  });

  const [logs, setLogs] = useState<SyncLogItem[]>([]);
  const cancelRequestedRef = useRef(false);

  const activeList = desaList.filter((d) => !!d.is_active);

  // Jalankan cek konektivitas paralel untuk seluruh desa
  const runProbe = async (): Promise<ProbeItem[]> => {
    setProbing(true);
    setTickerText("Memeriksa status domain desa…");
    try {
      const res = await fetch("/api/sync/probe", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && Array.isArray(data.results)) {
        setProbeResults(data.results);
        setTickerText(
          `${data.onlineCount} dari ${data.total} desa siap disinkronkan.`
        );
        return data.results as ProbeItem[];
      }
    } catch (e: unknown) {
      setTickerText(`Pemeriksaan gagal: ${(e as Error).message}`);
    } finally {
      setProbing(false);
    }
    return [];
  };

  // Mulai proses sync (opsi: onlineOnly)
  const handleStartSync = async (onlineOnly = true) => {
    if (running || probing) return;

    let targetProbe = probeResults;
    if (onlineOnly && (!targetProbe || targetProbe.length === 0)) {
      targetProbe = await runProbe();
    }

    let targetList: DesaSyncItem[] = activeList.length > 0 ? activeList : desaList;

    if (onlineOnly && targetProbe && targetProbe.length > 0) {
      const onlineSlugs = new Set(
        targetProbe.filter((p) => p.status === "online").map((p) => p.slug)
      );
      targetList = targetList.filter((d) => onlineSlugs.has(d.slug));
    }

    if (targetList.length === 0) {
      alert("Tidak ada desa aktif yang dapat dihubungi saat ini.");
      return;
    }

    setRunning(true);
    setIsFinished(false);
    setCurrentIndex(0);
    setTotalDesa(targetList.length);
    setLogs([]);
    setSummary({ success: 0, failed: 0, skipped: 0, newArticles: 0, updatedArticles: 0 });
    cancelRequestedRef.current = false;

    let successCount = 0;
    let failedCount = 0;
    let totalNew = 0;
    let totalUpdated = 0;

    for (let i = 0; i < targetList.length; i++) {
      if (cancelRequestedRef.current) {
        setTickerText("Sinkronisasi dihentikan.");
        break;
      }

      const d = targetList[i];
      setCurrentDesa(d);
      setCurrentIndex(i + 1);
      setTickerText(`Menghubungi ${d.nama}…`);

      const startTime = Date.now();

      try {
        const res = await fetch("/api/sync/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: d.slug }),
        });

        const data = await res.json().catch(() => ({}));
        const durationMs = Date.now() - startTime;

        if (!res.ok || !data.ok) {
          failedCount += 1;
          const errMsg = data?.error || res.statusText || "Gagal menghubungi";
          setTickerText(`Gagal: ${d.nama}`);
          setLogs((prev) => [
            {
              nama: d.nama,
              slug: d.slug,
              status: "failed",
              message: errMsg,
              newCount: 0,
              updatedCount: 0,
              durationMs,
            },
            ...prev,
          ]);
        } else {
          const r = data.result;
          const isOk = r?.status === "ok" || r?.status === "partial";
          if (isOk) {
            successCount += 1;
          } else {
            failedCount += 1;
          }

          const nNew = r?.newCount ?? 0;
          const nUpd = r?.updatedCount ?? 0;
          totalNew += nNew;
          totalUpdated += nUpd;

          const desc =
            nNew > 0
              ? `+${nNew} baru`
              : nUpd > 0
              ? `${nUpd} diperbarui`
              : "Data mutakhir";

          setTickerText(`${d.nama}: ${desc} (${(durationMs / 1000).toFixed(1)}s)`);

          setLogs((prev) => [
            {
              nama: d.nama,
              slug: d.slug,
              status: isOk ? "ok" : "failed",
              message: r?.message || desc,
              newCount: nNew,
              updatedCount: nUpd,
              durationMs,
            },
            ...prev,
          ]);
        }
      } catch (err: unknown) {
        failedCount += 1;
        const msg = err instanceof Error ? err.message : "Gangguan jaringan";
        setTickerText(`Gagal: ${d.nama}`);
        setLogs((prev) => [
          {
            nama: d.nama,
            slug: d.slug,
            status: "failed",
            message: msg,
            newCount: 0,
            updatedCount: 0,
            durationMs: Date.now() - startTime,
          },
          ...prev,
        ]);
      }

      setSummary({
        success: successCount,
        failed: failedCount,
        skipped: 0,
        newArticles: totalNew,
        updatedArticles: totalUpdated,
      });
    }

    setRunning(false);
    setIsFinished(true);
    setCurrentDesa(null);
    router.refresh();
  };

  const handleCancel = () => {
    cancelRequestedRef.current = true;
    setTickerText("Menghentikan proses…");
  };

  const progressPercent =
    totalDesa > 0 ? Math.min(100, Math.round((currentIndex / totalDesa) * 100)) : 0;

  const onlineCount = probeResults?.filter((p) => p.status === "online").length;

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Bar Kontrol */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Tombol Utama */}
        <button
          type="button"
          onClick={() => handleStartSync(true)}
          disabled={running || probing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-foreground)] disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold transition-all shadow-2xs active:scale-[0.98]"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={running || probing ? "animate-spin" : ""}
          >
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 16h5v5" />
          </svg>
          <span>
            {probing
              ? "Memeriksa…"
              : running
              ? `Menyinkronkan (${currentIndex}/${totalDesa})…`
              : "Sinkronkan"}
          </span>
          {!running && !probing && onlineCount !== undefined && (
            <span className="px-1.5 py-0.5 rounded text-[11px] bg-white/20 font-mono">
              {onlineCount} Siap
            </span>
          )}
        </button>

        {/* Tombol Cek Status */}
        <button
          type="button"
          onClick={() => runProbe()}
          disabled={running || probing}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 disabled:opacity-60 transition-colors shadow-2xs"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <span>{probing ? "Memeriksa…" : "Periksa Status"}</span>
        </button>

        {/* Tombol Opsi: Sinkron Semua */}
        {!running && (
          <button
            type="button"
            onClick={() => handleStartSync(false)}
            disabled={running || probing}
            className="px-2.5 py-2 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors underline"
          >
            Sinkron Semua (17 Desa)
          </button>
        )}

        {running && (
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>Batal</span>
          </button>
        )}

        {isFinished && !running && (
          <button
            type="button"
            onClick={() => setIsFinished(false)}
            className="px-2.5 py-2 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
          >
            Tutup
          </button>
        )}
      </div>

      {/* Ringkasan Status Pemeriksaan Desa */}
      {probeResults && !running && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Status:</span>
            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {onlineCount} aktif
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500">
              {desaList.length - (onlineCount ?? 0)} tidak merespons
            </span>
          </div>
          <button
            type="button"
            onClick={() => setProbeResults(null)}
            className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Progress & Result Card */}
      {(running || probing || isFinished) && (
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-4 sm:p-5 shadow-2xs transition-all duration-300">
          {/* Header Info */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <span
                className={`inline-flex h-2.5 w-2.5 rounded-full ${
                  running || probing
                    ? "bg-blue-600 animate-pulse"
                    : summary.failed > 0 && summary.success === 0
                    ? "bg-rose-500"
                    : "bg-emerald-500"
                }`}
              />
              <div>
                <div className="text-xs font-semibold text-[var(--color-muted-foreground)]">
                  {probing
                    ? "Pemeriksaan Status"
                    : running
                    ? "Sinkronisasi Berjalan"
                    : "Sinkronisasi Selesai"}
                </div>
                <div className="text-sm font-bold text-[var(--color-foreground)]">
                  {probing
                    ? "Memeriksa domain desa"
                    : running && currentDesa
                    ? `Desa ${currentDesa.nama}`
                    : `${totalDesa} desa selesai diproses`}
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="font-mono text-sm sm:text-base font-bold text-[var(--color-primary)]">
                {probing ? "100%" : `${progressPercent}%`}
              </span>
              <div className="text-[10px] text-[var(--color-muted-foreground)]">
                {probing ? "Selesai" : `${currentIndex} / ${totalDesa} Desa`}
              </div>
            </div>
          </div>

          {/* Bar Progress */}
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-out ${
                isFinished && summary.failed === 0
                  ? "bg-emerald-600"
                  : "bg-[var(--color-primary)]"
              }`}
              style={{ width: probing ? "100%" : `${progressPercent}%` }}
            />
          </div>

          {/* Ticker / Status Terakhir */}
          {tickerText && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700 mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
              <span className="truncate">{tickerText}</span>
            </div>
          )}

          {/* Metrik Tally Ringkas */}
          {!probing && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <span className="text-slate-600 font-medium">Berhasil</span>
                <span className="font-mono font-bold text-emerald-700">{summary.success}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <span className="text-slate-600 font-medium">Gagal</span>
                <span className={`font-mono font-bold ${summary.failed > 0 ? "text-rose-600" : "text-slate-400"}`}>
                  {summary.failed}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <span className="text-slate-600 font-medium">Artikel Baru</span>
                <span className="font-mono font-bold text-slate-800">{summary.newArticles}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <span className="text-slate-600 font-medium">Diperbarui</span>
                <span className="font-mono font-bold text-slate-800">{summary.updatedArticles}</span>
              </div>
            </div>
          )}

          {/* Toggle Log Rincian */}
          {logs.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLogs(!showLogs)}
                className="text-xs font-medium text-[var(--color-primary)] hover:underline inline-flex items-center gap-1"
              >
                <span>{showLogs ? "Sembunyikan Rincian" : `Rincian Desa (${logs.length})`}</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform duration-200 ${showLogs ? "rotate-180" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {showLogs && (
                <div className="mt-2 max-h-48 overflow-y-auto space-y-1 pr-1 text-xs">
                  {logs.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-1.5 px-2.5 rounded bg-slate-50 border border-slate-100"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={`inline-block h-1.5 w-1.5 rounded-full ${
                            item.status === "ok" ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        <span className="font-semibold text-slate-800">{item.nama}</span>
                        <span className="text-[11px] text-[var(--color-muted-foreground)] truncate">
                          {item.message}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 shrink-0 ml-2">
                        {(item.durationMs / 1000).toFixed(1)}s
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
