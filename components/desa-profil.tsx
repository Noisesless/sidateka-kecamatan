import type { PerangkatDesa } from '@/lib/db';
import { SafeImage } from '@/components/safe-image';

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}

/**
 * Section aparatur desa: satu-satunya konten non-berita yang ditampilkan
 * di halaman publik desa. Konten profil hasil scrape sengaja tidak lagi
 * dirender di sini karena berantakan (menyeret seluruh chrome tema sumber);
 * datanya tetap tersimpan dan dapat dikelola via admin.
 */
function DesaPerangkatSection({ perangkat = [] }: { perangkat?: PerangkatDesa[] }) {
  if (perangkat.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
            />
          </svg>
        </span>
        <div>
          <h2 className="text-xl font-bold text-[var(--color-foreground)]">Aparatur Desa</h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">{perangkat.length} perangkat desa</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {perangkat.map((p) => (
          <div
            key={p.id}
            className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-sm"
          >
            {p.foto_url ? (
              <div className="aspect-[3/4] w-full overflow-hidden bg-[var(--color-muted)]">
                <SafeImage
                  src={p.foto_url}
                  alt={p.nama}
                  className="h-full w-full object-cover object-top"
                />
              </div>
            ) : (
              <div className="flex aspect-[3/4] w-full items-center justify-center bg-[var(--color-primary)]/5 text-[var(--color-muted-foreground)]">
                <UserIcon className="h-16 w-16" />
              </div>
            )}
            <div className="p-3 text-center">
              <p className="text-sm font-semibold leading-snug text-[var(--color-foreground)]">{p.nama}</p>
              {p.jabatan && (
                <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">{p.jabatan}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export { DesaPerangkatSection };
export default DesaPerangkatSection;
