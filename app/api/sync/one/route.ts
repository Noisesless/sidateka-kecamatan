import { NextRequest } from 'next/server';
import { ensureInitialized } from '@/lib/init';
import { syncDesa } from '@/lib/sync';
import { db, type Desa } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { clearStatistikCache } from '@/lib/statistik';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST /api/sync/one  body: { slug: string, fireAndForget?: boolean }
export async function POST(req: NextRequest) {
  await ensureInitialized();

  const token = req.headers.get('x-sync-token') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const expectedToken = process.env.SYNC_TOKEN || process.env.CRON_SECRET;
  const user = await getCurrentUser();

  const isAuthorized = !!user || (!!expectedToken && token === expectedToken);
  if (!isAuthorized) {
    return Response.json(
      { ok: false, error: 'Unauthorized: login admin diperlukan atau sertakan x-sync-token valid' },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const slug = typeof body?.slug === 'string' ? body.slug : null;
  const fireAndForget = !!body?.fireAndForget;
  if (!slug) return Response.json({ ok: false, error: 'slug wajib' }, { status: 400 });

  const desa = db.prepare('SELECT * FROM desa WHERE slug = ?').get(slug) as Desa | undefined;
  if (!desa) return Response.json({ ok: false, error: 'desa tidak ditemukan' }, { status: 404 });

  const run = async () => {
    const result = await syncDesa(desa);
    db.prepare(
      'INSERT INTO sync_log (desa_id, source, status, message, new_count, updated_count, duration_ms) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(desa.id, result.source, result.status, result.message, result.newCount, result.updatedCount, result.durationMs);
    db.prepare(
      "UPDATE desa SET last_sync_at = datetime('now'), last_sync_status = ?, last_sync_message = ? WHERE id = ?",
    ).run(result.status, result.message, desa.id);
    clearStatistikCache();
    try {
      revalidatePath('/statistik');
      revalidatePath('/statistik/pendidikan');
      revalidatePath('/statistik/kesehatan');
      revalidatePath('/statistik/anggaran-dan-realisasi');
      revalidatePath('/statistik/program-dan-bantuan');
      revalidatePath('/analitik');
      revalidatePath(`/desa/${desa.slug}`);
      revalidatePath(`/desa/${desa.slug}/analitik`);
      revalidatePath('/');
    } catch {}
    return { ok: true, result };
  };

  if (fireAndForget) {
    run().then((r) => console.log(`[sync/one ${slug}] selesai`, JSON.stringify(r?.result?.status))).catch((e) => console.error(`[sync/one ${slug}] error`, e));
    return Response.json({ ok: true, accepted: true }, { status: 202 });
  }
  const out = await run();
  return Response.json(out);
}
