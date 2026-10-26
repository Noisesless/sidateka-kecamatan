import { NextResponse } from 'next/server';
import { ensureInitialized } from '@/lib/init';
import { probeAllDesa } from '@/lib/sync';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  await ensureInitialized();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const results = await probeAllDesa();
  const online = results.filter((r) => r.status === 'online');
  const blocked = results.filter((r) => r.status === 'blocked_waf');
  const offline = results.filter((r) => r.status === 'offline');

  return NextResponse.json({
    ok: true,
    total: results.length,
    onlineCount: online.length,
    blockedCount: blocked.length,
    offlineCount: offline.length,
    results,
  });
}

export async function POST() {
  return GET();
}
