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

  // Jalankan cek konektivitas paralel untuk seluruh desa (selesai dalam 2-4 detik)
  const runProbe = async (): Promise<ProbeItem[]> => {
    setProbing(true);
    setTickerText("Memeriksa konektivitas 17 desa secara paralel (3 detik)…");
    try {
      const res = await fetch("/api/sync/probe", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && Array.isArray(data.results)) {
        setProbeResults(data.results);
        setTickerText(
          `Hasil koneksi: ${data.onlineCount} desa online, ${data.blockedCount} terblokir Cloudflare WAF.`
        );
        return data.results as ProbeItem[];
      }
    } catch (e: unknown) {
      setTickerText(`Gagal cek koneksi: ${(e as Error).message}`);
    } finally {
      setProbing(false);
    }
    return [];
  };

  // Mulai proses sync (opsi: onlineOnly)
  const handleStartSync = async (onlineOnly = true) => {
    if (running || probing) return;

    let targetProbe = probeResults;
    // Jika belum dicek dan memilih onlineOnly, lakukan probe terlebih dahulu
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
      alert("Tidak ada desa online yang terdeteksi untuk disinkronkan.");
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
        setTickerText("Sinkronisasi dihentikan oleh pengguna.");
        break;
      }

      const d = targetList[i];
      setCurrentDesa(d);
      setCurrentIndex(i + 1);
      setTickerText(`Menghubungi ${d.nama} (${d.website})…`);

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
          setTickerText(`Gagal: ${d.nama} (${errMsg})`);
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
              ? `+${nNew} artikel baru`
              : nUpd > 0
              ? `${nUpd} artikel update`
              : "data up to date";

          setTickerText(`Selesai: ${d.nama} (${desc}, ${(durationMs / 1000).toFixed(1)}s)`);

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
        const msg = err instanceof Error ? err.message : "Error jaringan";
        setTickerText(`Error: ${d.nama} (${msg})`);
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
    setTickerText("Menghentikan proses setelah desa saat ini selesai…");
  };

  const progressPercent =
    totalDesa > 0 ? Math.min(100, Math.round((currentIndex / totalDesa) * 100)) : 0;

  const onlineCount = probeResults?.filter((p) => p.status === "online").length;
  const blockedCount = probeResults?.filter((p) => p.status === "blocked_waf").length;

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Bar Kontrol & Pilihan Smart Sync */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Tombol Utama: Sync Cepat (Hanya Desa Online) */}
        <button
          type="button"
          onClick={() => handleStartSync(true)}
          disabled={running || probing}
          title="Filter desa yang bisa terhubung secara instan, lalu sync hanya yang online (Selesai ~15 detik)"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-foreground)] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-sm active:scale-95"
        >
          <svg
            width="15"
            height="15"
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
              ? "Memeriksa Koneksi (3s)…"
              : running
              ? `Menyinkronkan (${currentIndex}/${totalDesa})…`
              : onlineCount !== undefined
              ? `Sync Cepat (${onlineCount} Desa Online)`
              : "Sync Cepat (Hanya Desa Online)"}
          </span>
        </button>

        {/* Tombol Cek Koneksi Saja */}
        <button
          type="button"
          onClick={() => runProbe()}
          disabled={running || probing}
          title="Pindai status konektivitas 17 desa secara paralel tanpa menjalankan sinkronisasi data"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-60 transition-colors shadow-2xs"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12h20" />
            <path d="M20 12l-4-4" />
            <path d="M20 12l-4 4" />
          </svg>
          <span>{probing ? "Mengecek…" : "Cek Koneksi (3s)"}</span>
        </button>

        {/* Tombol Opsi: Sync Semua 17 Desa (Paksa) */}
        {!running && (
          <button
            type="button"
            onClick={() => handleStartSync(false)}
            disabled={running || probing}
            title="Sinkronkan seluruh 17 desa secara berurutan termasuk yang diblokir Cloudflare"
            className="px-2.5 py-1.5 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors underline"
          >
            Sync Semua 17 Desa (Paksa)
          </button>
        )}

        {running && (
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            Batal
          </button>
        )}

        {isFinished && !running && (
          <button
            type="button"
            onClick={() => setIsFinished(false)}
            className="px-2.5 py-1.5 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
          >
            Tutup Panel
          </button>
        )}
      </div>

      {/* Badge Hasil Probe Konektivitas Cepat */}
      {probeResults && !running && (
        <div className="flex flex-wrap items-center gap-2 text-xs py-1 px-3 bg-slate-50 border border-slate-200 rounded-lg">
          <span className="font-semibold text-slate-600">Status Koneksi 17 Desa:</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
            ● {onlineCount} Online
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">
            ● {blockedCount} Terblokir Cloudflare WAF
          </span>
          <span className="text-[11px] text-slate-500">
            (Hanya desa online yang akan disinkronkan untuk menghemat waktu)
          </span>
        </div>
      )}

      {/* Progress & Info Card (Aktif saat running, probing, atau selesai) */}
      {(running || probing || isFinished) && (
        <div className="rounded-xl border border-[var(--color-border)] bg-gradient-to-b from-white to-slate-50/70 p-4 sm:p-5 shadow-sm transition-all duration-300">
          {/* Header Info Desa Aktif */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              {running || probing ? (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600"></span>
                </span>
              ) : (
                <span className="inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
              )}

              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
                  {probing
                    ? "Pengecekan Konektivitas Paralel"
                    : running
                    ? `Sedang Sinkronisasi (${currentIndex} dari ${totalDesa} Desa)`
                    : "Sinkronisasi Selesai"}
                </div>
                <div className="text-sm font-bold text-[var(--color-foreground)]">
                  {probing
                    ? "Memindai 17 domain desa secara simultan…"
                    : running && currentDesa
                    ? `Desa ${currentDesa.nama}`
                    : `Selesai memproses ${totalDesa} desa`}
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="font-mono text-base font-bold text-[var(--color-primary)]">
                {probing ? "100%" : `${progressPercent}%`}
              </span>
              <div className="text-[10px] text-[var(--color-muted-foreground)]">
                {probing ? "Pindai Selesai" : `${currentIndex} / ${totalDesa} Desa`}
              </div>
            </div>
          </div>

          {/* Bar Progress */}
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/80 mb-3 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-out ${
                isFinished && summary.failed === 0
                  ? "bg-emerald-500"
                  : "bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500"
              }`}
              style={{ width: probing ? "100%" : `${progressPercent}%` }}
            />
          </div>

          {/* Ticker Simpel: Teks Berjalan / Status Terakhir */}
          {tickerText && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 mb-3 shadow-2xs">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="truncate">{tickerText}</span>
            </div>
          )}

          {/* Mini Counters Tally */}
          {!probing && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
              <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/70 text-emerald-800 flex items-center justify-between text-xs font-semibold">
                <span>Berhasil</span>
                <span className="font-mono font-bold text-sm">{summary.success}</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200/70 text-rose-800 flex items-center justify-between text-xs font-semibold">
                <span>Gagal</span>
                <span className="font-mono font-bold text-sm">{summary.failed}</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200/70 text-blue-800 flex items-center justify-between text-xs font-semibold">
                <span>Artikel Baru</span>
                <span className="font-mono font-bold text-sm">{summary.newArticles}</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200/70 text-indigo-800 flex items-center justify-between text-xs font-semibold">
                <span>Diperbarui</span>
                <span className="font-mono font-bold text-sm">{summary.updatedArticles}</span>
              </div>
            </div>
          )}

          {/* Toggle Log Rincian */}
          {logs.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-200/60">
              <button
                type="button"
                onClick={() => setShowLogs(!showLogs)}
                className="text-xs font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1"
              >
                <span>{showLogs ? "Sembunyikan Riwayat Desa" : `Lihat Riwayat Desa (${logs.length})`}</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
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
                      className="flex items-center justify-between py-1 px-2 rounded bg-white border border-slate-100"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            item.status === "ok" ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        <span className="font-semibold">{item.nama}</span>
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
