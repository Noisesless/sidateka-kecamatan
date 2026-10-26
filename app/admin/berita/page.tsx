import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getAllBeritaAdmin, getBeritaFotos, KATEGORI_BERITA } from "@/lib/queries";
import {
  logoutAction,
  createBeritaAction,
  updateBeritaAction,
  deleteBeritaAction,
  togglePublishBeritaAction,
  deleteBeritaFotoAction,
} from "../actions";
import { ConfirmSubmitButton } from "../confirm-button";

export const dynamic = "force-dynamic";

type SearchParams = {
  message?: string;
  error?: string;
  edit?: string;
};

function formatTanggal(iso: string): string {
  try {
    return new Date(iso.replace(" ", "T") + "Z").toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default async function AdminBeritaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  const sp = await searchParams;
  const all = getAllBeritaAdmin();
  const editId = sp.edit ? parseInt(sp.edit, 10) : null;
  const editItem = editId ? all.find((b) => b.id === editId) ?? null : null;
  const editFotos = editItem ? getBeritaFotos(editItem.id) : [];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-[var(--color-primary)] font-bold mb-1">
            · Admin Panel
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold">Berita Kecamatan</h1>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
            Kelola artikel/berita resmi kecamatan yang tampil di menu Berita Kecamatan
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin"
            className="px-4 py-2 rounded-lg border border-[var(--color-border)] bg-white hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] text-sm font-semibold transition-colors"
          >
            Kembali
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] bg-white hover:border-[var(--color-destructive)] hover:text-[var(--color-destructive)] text-sm font-semibold transition-colors"
            >
              Logout
            </button>
          </form>
        </div>
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

      {/* Form tambah/edit */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-lg font-bold">
            {editItem ? `Edit: ${editItem.judul}` : "Tambah Berita"}
          </h2>
          {editItem && (
            <Link
              href="/admin/berita"
              className="text-xs font-semibold text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            >
              ← Batal edit
            </Link>
          )}
        </div>

        <form
          action={editItem ? updateBeritaAction : createBeritaAction}
          encType="multipart/form-data"
          className="space-y-4"
        >
          {editItem && <input type="hidden" name="id" value={editItem.id} />}

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-1">
              Judul <span className="text-[var(--color-destructive)]">*</span>
            </label>
            <input
              type="text"
              name="judul"
              required
              defaultValue={editItem?.judul ?? ""}
              placeholder="Judul berita"
              className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none text-sm"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-1">
                Kategori
              </label>
              <select
                name="kategori"
                defaultValue={editItem?.kategori ?? "Berita"}
                className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none text-sm bg-white"
              >
                {KATEGORI_BERITA.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-1">
                Penulis
              </label>
              <input
                type="text"
                name="penulis"
                defaultValue={editItem?.penulis ?? ""}
                placeholder="Admin Kecamatan"
                className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-1">
              Ringkasan
            </label>
            <textarea
              name="ringkasan"
              defaultValue={editItem?.ringkasan ?? ""}
              rows={2}
              placeholder="Ringkasan singkat untuk kartu berita (opsional)"
              className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none text-sm resize-y"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-1">
              Konten (HTML)
            </label>
            <textarea
              name="konten"
              defaultValue={editItem?.konten ?? ""}
              rows={10}
              placeholder={"Tulis konten berita di sini. Bisa pakai tag HTML: <p>, <h3>, <ul>, <strong>, <a>, <img>, dll."}
              className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none text-sm font-mono resize-y"
            />
          </div>

          {/* Foto unggulan */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-4 space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">
              Foto Unggulan
            </div>
            {editItem?.gambar_utama && (
              <div className="flex items-start gap-3">
                <img
                  src={editItem.gambar_utama}
                  alt="Foto unggulan"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder-artikel.jpg";
                  }}
                  className="w-32 h-20 object-cover rounded-lg border border-[var(--color-border)]"
                />
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    name="hapus_gambar"
                    className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-destructive)] focus:ring-[var(--color-destructive)]"
                  />
                  <span className="font-medium text-[var(--color-destructive)]">Hapus foto unggulan</span>
                </label>
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <input
                  type="file"
                  name="gambar_file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="w-full text-sm file:mr-3 file:px-3 file:py-2 file:rounded-md file:border-0 file:bg-[var(--color-primary)] file:text-white file:text-xs file:font-semibold file:cursor-pointer"
                />
                <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                  Upload file (JPG/PNG/WebP/GIF, maks 5 MB)
                </p>
              </div>
              <div>
                <input
                  type="text"
                  name="gambar_url"
                  placeholder="...atau tempel URL gambar (https://...)"
                  className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* Foto tambahan */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-4 space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">
              Foto Tambahan (Galeri)
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <input
                  type="file"
                  name="foto_files"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="w-full text-sm file:mr-3 file:px-3 file:py-2 file:rounded-md file:border-0 file:bg-[var(--color-primary)] file:text-white file:text-xs file:font-semibold file:cursor-pointer"
                />
                <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                  Bisa pilih lebih dari satu file
                </p>
              </div>
              <div>
                <textarea
                  name="foto_urls"
                  rows={2}
                  placeholder={"...atau tempel URL gambar, satu per baris"}
                  className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none text-sm font-mono resize-y"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="is_published"
                defaultChecked={editItem ? editItem.is_published === 1 : true}
                className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
              />
              <span className="text-sm font-medium">Publikasikan</span>
            </label>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-foreground)] text-white text-sm font-semibold transition-colors"
            >
              {editItem ? "Simpan Perubahan" : "Tambah Berita"}
            </button>
          </div>
        </form>
      </div>

      {/* Galeri foto tersimpan (mode edit) — di luar form utama agar tidak nested */}
      {editItem && editFotos.length > 0 && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6 mb-6">
          <h2 className="font-serif text-lg font-bold mb-4">Galeri Tersimpan ({editFotos.length})</h2>
          <div className="flex flex-wrap gap-3">
            {editFotos.map((f) => (
              <div key={f.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.url}
                  alt={f.caption ?? "Foto galeri"}
                  className="w-32 h-20 object-cover rounded-lg border border-[var(--color-border)]"
                />
                <form action={deleteBeritaFotoAction} className="absolute -top-2 -right-2">
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="artikel_id" value={editItem.id} />
                  <ConfirmSubmitButton
                    confirmMessage="Hapus foto ini?"
                    title="Hapus foto"
                    className="w-5 h-5 rounded-full bg-[var(--color-destructive)] text-white text-[10px] font-bold leading-none flex items-center justify-center"
                  >
                    ×
                  </ConfirmSubmitButton>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daftar berita */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-muted)]/30 flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold">Semua Berita</h2>
          <span className="text-xs font-bold text-[var(--color-muted-foreground)]">
            {all.length} berita
          </span>
        </div>
        {all.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--color-muted-foreground)]">
            Belum ada berita. Tambahkan lewat form di atas.
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {all.map((b) => (
              <div key={b.id} className="px-5 sm:px-6 py-4 flex flex-wrap items-center gap-4">
                {b.gambar_utama ? (
                  <img
                    src={b.gambar_utama}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder-artikel.jpg";
                    }}
                    className="w-20 h-14 object-cover rounded-lg border border-[var(--color-border)] shrink-0"
                  />
                ) : (
                  <div className="w-20 h-14 rounded-lg bg-[var(--color-muted)] flex items-center justify-center text-[10px] text-[var(--color-muted-foreground)] shrink-0">
                    Tanpa foto
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {b.kategori && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                        {b.kategori}
                      </span>
                    )}
                    {b.is_published === 0 && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
                        Draft
                      </span>
                    )}
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      {formatTanggal(b.published_at)} · {b.view_count} views
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm truncate">{b.judul}</h3>
                  <Link
                    href={`/berita/${b.slug}`}
                    target="_blank"
                    className="text-[10px] text-[var(--color-primary)] font-mono mt-1 inline-block truncate max-w-full hover:underline"
                  >
                    /berita/{b.slug}
                  </Link>
                </div>
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/admin/berita?edit=${b.id}`}
                    className="px-3 py-1.5 rounded-md border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] text-xs font-semibold transition-colors"
                  >
                    Edit
                  </Link>
                  <form action={togglePublishBeritaAction}>
                    <input type="hidden" name="id" value={b.id} />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-md border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] text-xs font-semibold transition-colors"
                    >
                      {b.is_published === 1 ? "Sembunyikan" : "Publish"}
                    </button>
                  </form>
                  <form action={deleteBeritaAction}>
                    <input type="hidden" name="id" value={b.id} />
                    <ConfirmSubmitButton
                      confirmMessage={`Hapus berita "${b.judul}"?`}
                      className="px-3 py-1.5 rounded-md border border-[var(--color-border)] hover:border-[var(--color-destructive)] hover:text-[var(--color-destructive)] text-xs font-semibold transition-colors"
                    >
                      Hapus
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
