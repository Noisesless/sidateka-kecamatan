import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { formatDateTimeWib } from "@/lib/date";
import { getAllAduanAdmin, getAduanStats, STATUS_ADUAN } from "@/lib/queries";
import { updateAduanAction, deleteAduanAction } from "../actions";

export const dynamic = "force-dynamic";

type SearchParams = {
  message?: string;
  error?: string;
  status?: string;
};

const STATUS_META: Record<string, { label: string; badge: string }> = {
  baru: { label: "Baru", badge: "bg-blue-100 text-blue-700" },
  diproses: { label: "Diproses", badge: "bg-amber-100 text-amber-700" },
  selesai: { label: "Selesai", badge: "bg-emerald-100 text-emerald-700" },
  ditolak: { label: "Ditolak", badge: "bg-red-100 text-red-700" },
};

function formatTanggal(iso: string): string {
  return formatDateTimeWib(iso);
}

export default async function AdminAduanPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  const sp = await searchParams;
  const stats = getAduanStats();
  const aduan = getAllAduanAdmin(sp.status);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-[var(--color-primary)] font-bold mb-1">
            · Admin Panel
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold">Aduan Masyarakat</h1>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
            Tindaklanjuti aduan yang masuk dari masyarakat
          </p>
        </div>
        <Link
          href="/admin"
          className="px-4 py-2 rounded-lg border border-[var(--color-border)] bg-white hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] text-sm font-semibold transition-colors"
        >
          ← Dashboard
        </Link>
      </div>

      {sp.message && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-sm border border-[var(--color-accent)]/20">
          {sp.message}
        </div>
      )}
      {sp.error && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--color-destructive)]/10 text-[var(--color-destructive)] text-sm border border-[var(--color-destructive)]/20">
          {sp.error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatTile label="Total Aduan" value={stats.total} />
        <StatTile label="Baru" value={stats.baru} accent="text-blue-600" />
        <StatTile label="Diproses" value={stats.diproses} accent="text-amber-600" />
        <StatTile label="Selesai" value={stats.selesai} accent="text-emerald-600" />
      </div>

      {/* Filter status */}
      <div className="flex flex-wrap gap-2 mb-4">
        <FilterLink href="/admin/aduan" label="Semua" active={!sp.status} />
        {STATUS_ADUAN.map((s) => (
          <FilterLink
            key={s}
            href={`/admin/aduan?status=${s}`}
            label={STATUS_META[s].label}
            active={sp.status === s}
          />
        ))}
      </div>

      {/* Daftar aduan */}
      {aduan.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-border)] bg-white px-6 py-12 text-center text-sm text-[var(--color-muted-foreground)]">
          Belum ada aduan{sp.status ? ` dengan status "${sp.status}"` : ""}.
        </div>
      ) : (
        <div className="space-y-3">
          {aduan.map((a) => {
            const meta = STATUS_META[a.status] ?? STATUS_META.baru;
            return (
              <details
                key={a.id}
                className="group rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden"
              >
                <summary className="cursor-pointer list-none px-5 py-4 flex flex-wrap items-center gap-3 hover:bg-[var(--color-muted)]/30">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className="font-mono text-sm font-bold text-[var(--color-primary)]">
                        {a.nomor}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${meta.badge}`}>
                        {meta.label}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-muted-foreground)]">
                        {a.jenis}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--color-muted-foreground)] truncate">
                      {a.nama} · {a.desa_nama ?? "Umum/Kecamatan"} · {formatTanggal(a.created_at)}
                    </div>
                  </div>
                  <p className="hidden md:block max-w-xs text-xs text-[var(--color-muted-foreground)] truncate">
                    {a.isi}
                  </p>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className="flex-shrink-0 text-[var(--color-muted-foreground)] transition-transform group-open:rotate-180"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </summary>

                <div className="border-t border-[var(--color-border)] p-5 grid lg:grid-cols-2 gap-5">
                  {/* Detail aduan & identitas pengadu */}
                  <div className="space-y-4">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-1.5">
                        Isi Aduan
                      </div>
                      <p className="text-sm whitespace-pre-line rounded-lg bg-[var(--color-muted)]/40 border border-[var(--color-border)] p-4">
                        {a.isi}
                      </p>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                      <div>
                        <dt className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">Nama</dt>
                        <dd className="font-semibold">{a.nama}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">NIK</dt>
                        <dd className="font-mono text-xs">{a.nik ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">Telepon</dt>
                        <dd className="font-mono text-xs">{a.telepon}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">Email</dt>
                        <dd className="text-xs break-all">{a.email ?? "—"}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">Alamat</dt>
                        <dd className="text-xs">{a.alamat ?? "—"}</dd>
                      </div>
                    </dl>
                  </div>

                  {/* Form tindak lanjut */}
                  <div className="space-y-3">
                    <form action={updateAduanAction} className="space-y-3">
                      <input type="hidden" name="id" value={a.id} />
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-1.5">
                          Status
                        </label>
                        <select
                          name="status"
                          defaultValue={a.status}
                          className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none text-sm bg-white"
                        >
                          {STATUS_ADUAN.map((s) => (
                            <option key={s} value={s}>{STATUS_META[s].label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-1.5">
                          Tanggapan untuk Pengadu
                        </label>
                        <textarea
                          name="tanggapan"
                          rows={4}
                          defaultValue={a.tanggapan ?? ""}
                          placeholder="Tanggapan ini dapat dilihat pengadu saat tracking."
                          className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-md bg-[var(--color-primary)] text-white text-sm font-semibold hover:bg-[var(--color-foreground)]"
                        >
                          Simpan Tindak Lanjut
                        </button>
                      </div>
                    </form>
                    <form action={deleteAduanAction}>
                      <input type="hidden" name="id" value={a.id} />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-md border border-[var(--color-border)] text-[var(--color-destructive)] hover:border-[var(--color-destructive)] text-sm font-semibold"
                      >
                        Hapus Aduan
                      </button>
                    </form>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-4">
      <div className={`font-serif text-3xl font-bold leading-none ${accent ?? "text-[var(--color-primary)]"}`}>
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-widest text-[var(--color-muted-foreground)] font-semibold mt-1.5">
        {label}
      </div>
    </div>
  );
}

function FilterLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${
        active
          ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
          : "bg-white border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
      }`}
    >
      {label}
    </Link>
  );
}
