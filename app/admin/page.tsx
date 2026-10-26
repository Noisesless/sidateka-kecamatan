import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getAllDesa, getArtikelStats, getRecentSyncLogs, getAduanStats } from "@/lib/queries";
import { db } from "@/lib/db";
import {
  logoutAction,
  triggerSyncAction,
  toggleActiveAction,
  updateDesaAction,
  changePasswordAction,
} from "./actions";
import SyncAllButton from "@/components/sync-all-button";
import SyncSingleButton from "@/components/sync-single-button";

export const dynamic = "force-dynamic";

type SearchParams = {
  message?: string;
  error?: string;
  sync?: string;
};

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  const sp = await searchParams;

  const desa = getAllDesa(false);
  const stats = getArtikelStats();
  const logs = getRecentSyncLogs(10);
  const aduanStats = getAduanStats();

  // hitung artikel per desa
  const counts = db
    .prepare("SELECT desa_id, COUNT(*) AS c FROM artikel GROUP BY desa_id")
    .all() as Array<{ desa_id: number; c: number }>;
  const countMap = new Map(counts.map((r) => [r.desa_id, r.c]));

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-[var(--color-primary)] font-bold mb-1">
            · Admin Panel
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold">
            Dashboard
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
            Login sebagai <strong>{user.username}</strong>
          </p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg border border-[var(--color-border)] bg-white hover:border-[var(--color-destructive)] hover:text-[var(--color-destructive)] text-sm font-semibold transition-colors"
          >
            Logout
          </button>
        </form>
      </div>

      {/* Flash messages */}
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatTile label="Desa" value={stats.totalDesa} />
        <StatTile label="Aktif" value={stats.totalDesaAktif} accent />
        <StatTile label="Artikel" value={stats.totalArtikel} />
        <StatTile
          label="Sync Terakhir"
          value={stats.lastSync ? new Date(stats.lastSync).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
          small
        />
      </div>

      {/* Sync action */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6 mb-6">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <h2 className="font-serif text-lg font-bold">Sinkronisasi</h2>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Tarik artikel terbaru dari website desa
            </p>
          </div>
          <Link
            href="/admin/aduan"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-foreground)] text-white text-sm font-semibold transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Aduan{aduanStats.baru > 0 ? ` (${aduanStats.baru} baru)` : ""}
          </Link>
          <Link
            href="/admin/profil"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--color-warning)] hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Profil Kecamatan
          </Link>
          <Link
            href="/admin/berita"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-white hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] text-sm font-semibold transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
              <path d="M18 14h-8" />
              <path d="M15 18h-5" />
              <path d="M10 6h8v4h-8V6Z" />
            </svg>
            Berita Kecamatan
          </Link>
          <Link
            href="/admin/unduhan"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-white hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] text-sm font-semibold transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Kelola Unduhan
          </Link>
        </div>
        <div className="w-full">
          <SyncAllButton
            desaList={desa.map((d) => ({
              id: d.id,
              nama: d.nama,
              slug: d.slug,
              website: d.website,
              is_active: d.is_active,
            }))}
          />
        </div>
      </div>

      {/* Tabel desa */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden mb-6">
        <div className="px-5 sm:px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold">Kelola Desa</h2>
          <span className="text-xs text-[var(--color-muted-foreground)]">
            {desa.length} desa
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-muted)]/50 text-[10px] uppercase tracking-widest text-[var(--color-muted-foreground)]">
              <tr>
                <th className="text-left px-4 py-3 font-bold">Desa</th>
                <th className="text-left px-4 py-3 font-bold">Website</th>
                <th className="text-left px-4 py-3 font-bold">Artikel</th>
                <th className="text-left px-4 py-3 font-bold">Sinkron</th>
                <th className="text-left px-4 py-3 font-bold">Status</th>
                <th className="text-right px-4 py-3 font-bold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {desa.map((d) => (
                <tr
                  key={d.id}
                  className="border-t border-[var(--color-border)] hover:bg-[var(--color-muted)]/30"
                >
                  <td className="px-4 py-3 font-semibold">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-white text-xs font-bold">
                        {d.nama.charAt(0)}
                      </span>
                      <div>
                        <div>{d.nama}</div>
                        <div className="text-[10px] font-mono text-[var(--color-muted-foreground)]">
                          {d.slug}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={d.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-primary)] hover:underline text-xs"
                    >
                      {new URL(d.website).hostname}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-center font-mono">
                    {countMap.get(d.id) ?? 0}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
                    {d.last_sync_at
                      ? new Date(d.last_sync_at).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                        d.is_active
                          ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                          : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
                      }`}
                    >
                      {d.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <SyncSingleButton desaNama={d.nama} desaSlug={d.slug} />
                      <Link
                        href={`/admin/desa/${d.id}`}
                        title="Kelola API key & setelan push"
                        className="px-2.5 py-1.5 rounded-md border border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] text-xs font-semibold"
                      >
                        API
                      </Link>
                      <form action={toggleActiveAction}>
                        <input type="hidden" name="id" value={d.id} />
                        <button
                          type="submit"
                          title="Toggle aktif/nonaktif"
                          className="px-2.5 py-1.5 rounded-md border border-[var(--color-border)] hover:border-[var(--color-warning)] hover:text-[var(--color-warning)] text-xs font-semibold"
                        >
                          {d.is_active ? "Off" : "On"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit feed_url & opensid_api_url per desa */}
      <details className="rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden mb-6">
        <summary className="cursor-pointer list-none px-5 sm:px-6 py-4 font-serif text-lg font-bold hover:bg-[var(--color-muted)]/30">
          Edit Sumber Data per Desa (RSS, OpenSID API, Scraper)
        </summary>
        <div className="border-t border-[var(--color-border)] p-5 sm:p-6 space-y-4">
          {desa.map((d) => (
            <form
              key={d.id}
              action={updateDesaAction}
              className="pb-4 border-b border-dashed border-[var(--color-border)] last:border-b-0 last:pb-0 space-y-2"
            >
              <input type="hidden" name="id" value={d.id} />
              <div className="grid sm:grid-cols-[180px_1fr_auto_auto] gap-2 items-end">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-1">
                    Desa
                  </div>
                  <div className="font-serif text-sm font-semibold">{d.nama}</div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-1">
                    Feed URL (opsional)
                  </label>
                  <input
                    type="url"
                    name="feed_url"
                    defaultValue={d.feed_url ?? ""}
                    placeholder={`${d.website}/feed`}
                    className="w-full px-3 py-1.5 rounded-md border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none text-xs font-mono"
                  />
                </div>
                <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-[var(--color-border)] cursor-pointer hover:border-[var(--color-primary)] text-xs font-semibold">
                  <input
                    type="checkbox"
                    name="scraper_enabled"
                    defaultChecked={d.scraper_enabled === 1}
                    className="accent-[var(--color-primary)]"
                  />
                  HTML Scrape
                </label>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-md bg-[var(--color-primary)] text-white text-xs font-semibold hover:bg-[var(--color-foreground)]"
                >
                  Simpan
                </button>
              </div>
              <details className="rounded-md bg-[var(--color-muted)]/30 px-3 py-2">
                <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">
                  Sumber OpenSID API (adapter internal_api) — opsional
                </summary>
                <div className="grid sm:grid-cols-[1fr_1fr] gap-2 mt-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-1">
                      API URL
                    </label>
                    <input
                      type="url"
                      name="opensid_api_url"
                      defaultValue={d.opensid_api_url ?? ""}
                      placeholder={`${d.website}/api/v1/artikel`}
                      className="w-full px-3 py-1.5 rounded-md border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none text-xs font-mono"
                    />
                    <p className="mt-1 text-[10px] text-[var(--color-muted-foreground)]">
                      Endpoint JSON ala OpenDK. Prioritas tertinggi (dicoba sebelum RSS/scrape).
                    </p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-1">
                      Bearer Token (opsional)
                    </label>
                    <input
                      type="password"
                      name="opensid_api_token"
                      defaultValue={d.opensid_api_token ?? ""}
                      placeholder="jwt atau api key dari desa"
                      className="w-full px-3 py-1.5 rounded-md border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none text-xs font-mono"
                    />
                  </div>
                </div>
              </details>
            </form>
          ))}
        </div>
      </details>

      {/* Sync log */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden mb-6">
        <div className="px-5 sm:px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="font-serif text-lg font-bold">Log Sinkronisasi</h2>
        </div>
        {logs.length === 0 ? (
          <div className="px-5 sm:px-6 py-8 text-sm text-[var(--color-muted-foreground)] text-center">
            Belum ada log sinkronisasi.
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {logs.map((l) => (
              <div
                key={l.id}
                className="px-5 sm:px-6 py-3 flex flex-wrap items-center gap-3 text-sm"
              >
                <div className="font-mono text-xs text-[var(--color-muted-foreground)] w-32">
                  {new Date(l.created_at).toLocaleString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div className="font-semibold flex-1 min-w-0 truncate">
                  {l.desa_nama ?? "—"}
                </div>
                <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-muted-foreground)]">
                  {l.source ?? "—"}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                    l.status === "success"
                      ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                      : l.status === "failed"
                        ? "bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]"
                        : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
                  }`}
                >
                  {l.status}
                </span>
                <div className="text-xs text-[var(--color-muted-foreground)] font-mono">
                  +{l.new_count} baru · {l.updated_count} update
                  {l.duration_ms ? ` · ${l.duration_ms}ms` : ""}
                </div>
                {l.message && (
                  <div className="w-full text-xs text-[var(--color-muted-foreground)] pl-[8.5rem]">
                    {l.message}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Change password */}
      <details className="rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden">
        <summary className="cursor-pointer list-none px-5 sm:px-6 py-4 font-serif text-lg font-bold hover:bg-[var(--color-muted)]/30">
          Ganti Password
        </summary>
        <form
          action={changePasswordAction}
          className="border-t border-[var(--color-border)] p-5 sm:p-6 grid sm:grid-cols-3 gap-3 items-end"
        >
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-1">
              Password Lama
            </label>
            <input
              type="password"
              name="old_password"
              required
              className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-1">
              Password Baru
            </label>
            <input
              type="password"
              name="new_password"
              required
              minLength={6}
              className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-[var(--color-primary)] text-white text-sm font-semibold hover:bg-[var(--color-foreground)]"
          >
            Ganti Password
          </button>
        </form>
      </details>
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
  small,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  small?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-4">
      <div
        className={`font-serif ${small ? "text-base" : "text-3xl"} font-bold leading-none ${
          accent ? "text-[var(--color-accent)]" : "text-[var(--color-primary)]"
        }`}
      >
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-widest text-[var(--color-muted-foreground)] font-semibold mt-1.5">
        {label}
      </div>
    </div>
  );
}
