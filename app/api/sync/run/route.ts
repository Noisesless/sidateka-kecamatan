import { NextRequest } from 'next/server';
import { ensureInitialized } from '@/lib/init';
import { syncAllDesa, syncDesa } from '@/lib/sync';
import { db, type Desa } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 600; // 10 menit, fallback kalau maxDuration di server action kena timeout

// POST /api/sync/run — body: { slug?: string, fireAndForget?: boolean }
//   fireAndForget=true  -> balasan cepat 202 Accepted, sync jalan di background (tidak kena timeout Nginx/PM2)
export async function POST(req: NextRequest) {
  await ensureInitialized();
  const body = await req.json().catch(() => ({}));
  const slug = typeof body?.slug === 'string' ? body.slug : null;
  const fireAndForget = !!body?.fireAndForget;
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

  const run = async () => {
    if (slug) {
      const desa = db.prepare('SELECT * FROM desa WHERE slug = ?').get(slug) as Desa | undefined;
      if (!desa) return { ok: false, error: 'desa tidak ditemukan' };
      const result = await syncDesa(desa);
      db.prepare(
        'INSERT INTO sync_log (desa_id, source, status, message, new_count, updated_count, duration_ms) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).run(desa.id, result.source, result.status, result.message, result.newCount, result.updatedCount, result.durationMs);
      db.prepare(
        "UPDATE desa SET last_sync_at = datetime('now'), last_sync_status = ?, last_sync_message = ? WHERE id = ?",
      ).run(result.status, result.message, desa.id);
      return { ok: true, result, desaNama: desa.nama, desaSlug: desa.slug };
    }
    const results = await syncAllDesa();
    return {
      ok: true,
      summary: {
        total: results.length,
        success: results.filter((r) => r.result.status === 'ok').length,
        failed: results.filter((r) => r.result.status === 'failed').length,
        newArticles: results.reduce((s, r) => s + r.result.newCount, 0),
        updatedArticles: results.reduce((s, r) => s + r.result.updatedCount, 0),
      },
      results,
    };
  };

  if (fireAndForget) {
    // Jalankan tanpa await; proses tetap jalan walau response sudah dikirim.
    run()
      .then((r) => console.log('[sync/run] selesai', JSON.stringify(r?.summary ?? r)))
      .catch((e) => console.error('[sync/run] error', e));
    return Response.json({ ok: true, accepted: true, message: 'sinkronisasi berjalan di background' }, { status: 202 });
  }

  const out = await run();
  return Response.json(out);
}

export async function GET() {
  await ensureInitialized();
  return Response.json({
    ok: true,
    info: 'POST /api/sync/run. Body: { slug?: string, fireAndForget?: boolean }',
  });
}
