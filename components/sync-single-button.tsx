"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SyncSingleButton({
  desaNama,
  desaSlug,
}: {
  desaNama: string;
  desaSlug: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [badge, setBadge] = useState<{
    type: "success" | "error";
    text: string;
    detail?: string;
  } | null>(null);

  const handleSync = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setBadge(null);

    const startTime = Date.now();

    try {
      const res = await fetch("/api/sync/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: desaSlug }),
      });

      const data = await res.json().catch(() => ({}));
      const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

      if (!res.ok || !data.ok) {
        const errorMsg = data?.error || res.statusText || "Gagal menghubungi";
        const isWaf = errorMsg.toLowerCase().includes("cloudflare") || errorMsg.includes("403");
        setBadge({
          type: "error",
          text: isWaf ? "⚠ Terblokir WAF" : "⚠ Gagal",
          detail: `${errorMsg} (${durationSec}s)`,
        });
      } else {
        const r = data.result;
        const newCount = r?.newCount ?? 0;
        const updatedCount = r?.updatedCount ?? 0;
        const text =
          newCount > 0
            ? `✓ +${newCount} baru`
            : updatedCount > 0
            ? `✓ ${updatedCount} update`
            : "✓ Selesai";

        setBadge({
          type: "success",
          text,
          detail: `${r?.message || "Data mutakhir"} (${durationSec}s)`,
        });
        router.refresh();
      }
    } catch (err: unknown) {
      const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
      const msg = err instanceof Error ? err.message : "Error koneksi";
      setBadge({
        type: "error",
        text: "⚠ Error",
        detail: `${msg} (${durationSec}s)`,
      });
    } finally {
      setLoading(false);
      setTimeout(() => {
        setBadge(null);
      }, 9000);
    }
  };

  return (
    <div className="inline-flex flex-col items-end">
      <div className="inline-flex items-center gap-1.5">
        {/* Indikator Loading Aktif dengan animasi detak */}
        {loading && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-semibold animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-ping" />
            Memproses…
          </span>
        )}

        {/* Badge Hasil Sukses / Error dengan tooltip rincian */}
        {badge && !loading && (
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-md border shadow-2xs transition-all duration-200 cursor-help ${
              badge.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                : "bg-rose-50 text-rose-800 border-rose-300"
            }`}
            title={badge.detail || badge.text}
          >
            {badge.text}
          </span>
        )}

        {/* Tombol Sync dengan feedback warna & spinner aktif */}
        <button
          type="button"
          onClick={handleSync}
          disabled={loading}
          title={
            loading
              ? `Sedang menyinkronkan data ${desaNama}...`
              : `Sinkronkan artikel & data ${desaNama}`
          }
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all shadow-2xs active:scale-95 disabled:cursor-not-allowed ${
            loading
              ? "bg-blue-600 text-white border border-blue-700 shadow-inner"
              : "border border-[var(--color-border)] bg-white hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] text-slate-700"
          }`}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={loading ? "animate-spin text-white" : "text-slate-600"}
          >
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 16h5v5" />
          </svg>
          <span>{loading ? "Syncing…" : "Sync"}</span>
        </button>
      </div>

      {/* Mini Bar Loading Halus saat Proses */}
      {loading && (
        <div className="w-full h-1 bg-blue-100 rounded-full overflow-hidden mt-1">
          <div className="h-full bg-blue-600 rounded-full animate-pulse w-full" />
        </div>
      )}
    </div>
  );
}
