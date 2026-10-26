"use client";

import { useState } from "react";
import Link from "next/link";

type DesaOption = { id: number; nama: string };

export function AduanForm({
  desaOptions,
  jenisOptions,
}: {
  desaOptions: DesaOption[];
  jenisOptions: string[];
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nomor, setNomor] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      desa_id: fd.get("desa_id") ? Number(fd.get("desa_id")) : null,
      jenis: fd.get("jenis"),
      isi: fd.get("isi"),
      nama: fd.get("nama"),
      nik: fd.get("nik"),
      telepon: fd.get("telepon"),
      email: fd.get("email"),
      alamat: fd.get("alamat"),
    };
    try {
      const res = await fetch("/api/aduan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal mengirim aduan");
        return;
      }
      setNomor(data.nomor);
    } catch {
      setError("Gagal terhubung ke server. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  // Tampilan sukses: nomor tracking ditampilkan besar agar mudah dicatat
  if (nomor) {
    return (
      <div className="rounded-2xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 p-6 sm:p-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)] mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="font-serif text-2xl font-bold mb-2">Aduan Terkirim</h2>
        <p className="text-sm text-[var(--color-muted-foreground)] mb-5">
          Simpan nomor aduan berikut untuk memantau status penanganannya.
        </p>
        <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-5 py-3 mb-5">
          <span className="font-mono text-xl sm:text-2xl font-bold tracking-wider text-[var(--color-primary)]">
            {nomor}
          </span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(nomor);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="px-3 py-1.5 rounded-md bg-[var(--color-primary)] hover:bg-[var(--color-foreground)] text-white text-xs font-bold transition-colors"
          >
            {copied ? "Tersalin" : "Salin"}
          </button>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Link
            href={`/aduan/lacak?nomor=${encodeURIComponent(nomor)}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-foreground)] text-white text-sm font-semibold transition-colors"
          >
            Lacak Status Aduan
          </Link>
          <button
            type="button"
            onClick={() => setNomor(null)}
            className="px-5 py-2.5 rounded-lg border border-[var(--color-border)] bg-white hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] text-sm font-semibold transition-colors"
          >
            Buat Aduan Baru
          </button>
        </div>
      </div>
    );
  }

  const inputCls =
    "w-full px-3.5 py-2.5 rounded-lg border border-[var(--color-border)] bg-white focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:outline-none text-sm transition-shadow";
  const labelCls =
    "block text-[11px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-1.5";

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-7 space-y-5">
      {/* Honeypot field untuk proteksi bot anti-spam (SP-007) */}
      <div className="hidden" aria-hidden="true" style={{ display: 'none' }}>
        <label htmlFor="website_url_hp">Website</label>
        <input
          type="text"
          id="website_url_hp"
          name="website_url_hp"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-[var(--color-destructive)]/10 text-[var(--color-destructive)] text-sm border border-[var(--color-destructive)]/20">
          {error}
        </div>
      )}

      {/* Data aduan */}
      <fieldset className="space-y-4">
        <legend className="font-serif text-lg font-bold mb-1">Data Aduan</legend>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="desa_id" className={labelCls}>Desa Terkait</label>
            <select id="desa_id" name="desa_id" className={inputCls} defaultValue="">
              <option value="">Umum / Tingkat Kecamatan</option>
              {desaOptions.map((d) => (
                <option key={d.id} value={d.id}>{d.nama}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="jenis" className={labelCls}>Jenis Aduan *</label>
            <select id="jenis" name="jenis" required className={inputCls} defaultValue="">
              <option value="" disabled>Pilih jenis aduan</option>
              {jenisOptions.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="isi" className={labelCls}>Isi Aduan *</label>
          <textarea
            id="isi"
            name="isi"
            required
            minLength={10}
            rows={5}
            placeholder="Tuliskan aduan Anda secara jelas: apa yang terjadi, kapan, dan di mana."
            className={inputCls}
          />
          <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">Minimal 10 karakter.</p>
        </div>
      </fieldset>

      {/* Data diri pengadu */}
      <fieldset className="space-y-4 border-t border-[var(--color-border)] pt-5">
        <legend className="font-serif text-lg font-bold mb-1">Data Diri Pengadu</legend>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="nama" className={labelCls}>Nama Lengkap *</label>
            <input id="nama" name="nama" type="text" required minLength={3} placeholder="Sesuai KTP" className={inputCls} />
          </div>
          <div>
            <label htmlFor="nik" className={labelCls}>NIK</label>
            <input id="nik" name="nik" type="text" inputMode="numeric" pattern="[0-9]{16}" maxLength={16} placeholder="16 digit (opsional)" className={inputCls} />
          </div>
          <div>
            <label htmlFor="telepon" className={labelCls}>No. HP / Telepon *</label>
            <input id="telepon" name="telepon" type="tel" required placeholder="08xxxxxxxxxx" className={inputCls} />
          </div>
          <div>
            <label htmlFor="email" className={labelCls}>Email</label>
            <input id="email" name="email" type="email" placeholder="Opsional" className={inputCls} />
          </div>
        </div>
        <div>
          <label htmlFor="alamat" className={labelCls}>Alamat</label>
          <textarea id="alamat" name="alamat" rows={2} placeholder="Dusun/RT/RW/Desa (opsional)" className={inputCls} />
        </div>
        <p className="text-[11px] text-[var(--color-muted-foreground)]">
          Data diri hanya digunakan untuk keperluan tindak lanjut aduan dan tidak dipublikasikan.
        </p>
      </fieldset>

      <button
        type="submit"
        disabled={loading}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-foreground)] disabled:opacity-60 text-white text-sm font-bold transition-colors"
      >
        {loading ? "Mengirim..." : "Kirim Aduan"}
      </button>
    </form>
  );
}
