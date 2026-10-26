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
  const [badge, setBadge] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSync = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setBadge(null);

    try {
      const res = await fetch("/api/sync/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: desaSlug }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        setBadge({
          type: "error",
          text: data?.error || "Gagal sinkron",
        });
      } else {
        const r = data.result;
        const newCount = r?.newCount ?? 0;
        const updatedCount = r?.updatedCount ?? 0;
        const text =
          newCount > 0
            ? `+${newCount} baru`
            : updatedCount > 0
            ? `${updatedCount} update`
            : "Selesai";

        setBadge({
          type: "success",
          text: `✓ ${text}`,
        });
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error koneksi";
      setBadge({
        type: "error",
        text: `Err: ${msg}`,
      });
    } finally {
      setLoading(false);
      setTimeout(() => {
        setBadge(null);
      }, 7000);
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5 justify-end">
      {badge && (
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded transition-opacity duration-200 ${
            badge.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-rose-50 text-rose-600 border border-rose-200"
          }`}
          title={badge.text}
        >
          {badge.text}
        </span>
      )}
      <button
        type="button"
        onClick={handleSync}
        disabled={loading}
        title={loading ? `Sedang menyinkronkan data ${desaNama}...` : `Sinkron desa ${desaNama}`}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed bg-white transition-all shadow-sm active:scale-95"
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
          className={loading ? "animate-spin text-[var(--color-primary)]" : "text-slate-600"}
        >
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
          <path d="M16 16h5v5" />
        </svg>
        <span>{loading ? "Syncing…" : "Sync"}</span>
      </button>
    </div>
  );
}
