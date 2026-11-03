import type { Metadata } from "next";
import { getAduanByNomor } from "@/lib/queries";
import { formatDateTimeWib } from "@/lib/date";

export const metadata: Metadata = {
  title: "Lacak Aduan",
  description: "Pantau status penanganan aduan masyarakat Kecamatan Banjarmangu dengan nomor tracking.",
};

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, { label: string; cls: string; desc: string }> = {
  baru: {
    label: "Baru",
    cls: "bg-blue-100 text-blue-700 border-blue-200",
    desc: "Aduan diterima dan menunggu verifikasi petugas.",
  },
  diproses: {
    label: "Diproses",
    cls: "bg-amber-100 text-amber-700 border-amber-200",
    desc: "Aduan sedang ditangani oleh perangkat kecamatan/desa terkait.",
  },
  selesai: {
    label: "Selesai",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    desc: "Aduan telah selesai ditangani.",
  },
  ditolak: {
    label: "Ditolak",
    cls: "bg-red-100 text-red-700 border-red-200",
    desc: "Aduan tidak dapat diproses. Lihat tanggapan petugas.",
  },
};

function formatTanggal(iso: string): string {
  return formatDateTimeWib(iso, { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function LacakAduanPage({
  searchParams,
}: {
  searchParams: Promise<{ nomor?: string }>;
}) {
  const { nomor } = await searchParams;
  const aduan = nomor ? getAduanByNomor(nomor) : null;
  const statusInfo = aduan ? STATUS_STYLE[aduan.status] ?? STATUS_STYLE.baru : null;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <header className="mb-6">
        <div className="text-[11px] uppercase tracking-widest text-[var(--color-primary)] font-bold mb-1">
          · Aduan Masyarakat
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-2">Lacak Aduan</h1>
        <p className="text-sm sm:text-base text-[var(--color-muted-foreground)]">
          Masukkan nomor tracking aduan (contoh: ADM-20260831-1A2B) untuk melihat status penanganannya.
        </p>
      </header>

      <form method="GET" className="flex gap-2 mb-6">
        <input
          type="text"
          name="nomor"
          defaultValue={nomor ?? ""}
          required
          placeholder="Nomor aduan, mis. ADM-20260831-1A2B"
          className="flex-1 min-w-0 px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-white font-mono text-sm focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:outline-none uppercase"
        />
        <button
          type="submit"
          className="px-5 py-2.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-foreground)] text-white text-sm font-bold transition-colors"
        >
          Lacak
        </button>
      </form>

      {nomor && !aduan && (
        <div className="rounded-2xl border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/5 p-5 text-sm text-[var(--color-destructive)]">
          Nomor aduan <strong className="font-mono">{nomor.toUpperCase()}</strong> tidak ditemukan.
          Periksa kembali penulisannya.
        </div>
      )}

      {aduan && statusInfo && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2">
            <div className="font-mono text-lg font-bold tracking-wider text-[var(--color-primary)]">
              {aduan.nomor}
            </div>
            <span className={`inline-flex items-center px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${statusInfo.cls}`}>
              {statusInfo.label}
            </span>
          </div>
          <div className="p-5 sm:p-6 space-y-5">
            <p className="text-sm text-[var(--color-muted-foreground)]">{statusInfo.desc}</p>

            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">Pengadu</dt>
                <dd className="font-semibold">{aduan.nama}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">Desa Terkait</dt>
                <dd className="font-semibold">{aduan.desa_nama ?? "Umum / Kecamatan"}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">Jenis Aduan</dt>
                <dd className="font-semibold">{aduan.jenis}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">Tanggal Aduan</dt>
                <dd className="font-semibold">{formatTanggal(aduan.created_at)}</dd>
              </div>
            </dl>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-1.5">
                Isi Aduan
              </div>
              <p className="text-sm whitespace-pre-line rounded-lg bg-[var(--color-muted)]/40 border border-[var(--color-border)] p-4">
                {aduan.isi}
              </p>
            </div>

            {aduan.tanggapan && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-1.5">
                  Tanggapan Petugas
                </div>
                <p className="text-sm whitespace-pre-line rounded-lg bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 p-4">
                  {aduan.tanggapan}
                </p>
              </div>
            )}

            {/* Timeline sederhana */}
            <ol className="relative border-l-2 border-[var(--color-border)] ml-2 space-y-4 pt-1">
              <li className="pl-5 relative">
                <span className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-[var(--color-primary)]" />
                <div className="text-xs font-bold">Aduan diterima</div>
                <div className="text-[11px] text-[var(--color-muted-foreground)]">{formatTanggal(aduan.created_at)}</div>
              </li>
              {aduan.status !== "baru" && (
                <li className="pl-5 relative">
                  <span className={`absolute -left-[7px] top-1 w-3 h-3 rounded-full ${aduan.status === "selesai" ? "bg-emerald-500" : aduan.status === "ditolak" ? "bg-red-500" : "bg-amber-500"}`} />
                  <div className="text-xs font-bold">Status: {statusInfo.label}</div>
                  <div className="text-[11px] text-[var(--color-muted-foreground)]">{formatTanggal(aduan.updated_at)}</div>
                </li>
              )}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
