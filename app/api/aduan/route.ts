import { NextResponse } from 'next/server';
import { createAduan, getAduanByNomor, JENIS_ADUAN } from '@/lib/queries';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// In-memory sliding window rate limiter (SP-007)
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 menit
const MAX_REQUESTS_PER_WINDOW = 5; // Maksimal 5 aduan per 10 menit per IP
const ipHits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipHits.get(ip);
  if (!record || now > record.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  record.count += 1;
  return true;
}

// GET /api/aduan?nomor=ADM-YYYYMMDD-XXXX → tracking publik (nomor = kunci akses)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const nomor = (url.searchParams.get('nomor') ?? '').trim();
  if (!nomor) {
    return NextResponse.json({ error: 'nomor wajib diisi' }, { status: 400 });
  }
  const aduan = getAduanByNomor(nomor);
  if (!aduan) {
    return NextResponse.json({ error: 'Nomor aduan tidak ditemukan' }, { status: 404 });
  }
  // Hanya field yang aman untuk publik (identitas dibatasi)
  return NextResponse.json({
    nomor: aduan.nomor,
    jenis: aduan.jenis,
    isi: aduan.isi,
    nama: aduan.nama,
    desa_nama: aduan.desa_nama,
    status: aduan.status,
    tanggapan: aduan.tanggapan,
    created_at: aduan.created_at,
    updated_at: aduan.updated_at,
  });
}

// POST /api/aduan → buat aduan baru, kembalikan nomor tracking
export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  if (ip !== 'unknown' && !checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan aduan. Mohon tunggu beberapa saat sebelum mengirim aduan baru.' },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Body harus JSON' }, { status: 400 });
  }

  // Honeypot anti-bot: jika field jebakan diisi, tolak permintaan
  if (body['website_url_hp']) {
    return NextResponse.json({ error: 'Invalid submission' }, { status: 400 });
  }

  const str = (k: string) => String(body[k] ?? '').trim();
  const jenis = str('jenis');
  const isi = str('isi');
  const nama = str('nama');
  const nik = str('nik').replace(/\D/g, '') || null;
  const telepon = str('telepon');
  const email = str('email') || null;
  const alamat = str('alamat') || null;

  const desaRaw = Number(body['desa_id']);
  const desa_id = Number.isInteger(desaRaw) && desaRaw > 0 ? desaRaw : null;

  if (!JENIS_ADUAN.includes(jenis as (typeof JENIS_ADUAN)[number])) {
    return NextResponse.json({ error: 'Jenis aduan tidak valid' }, { status: 400 });
  }
  if (isi.length < 10) {
    return NextResponse.json({ error: 'Isi aduan minimal 10 karakter' }, { status: 400 });
  }
  if (nama.length < 3) {
    return NextResponse.json({ error: 'Nama lengkap wajib diisi' }, { status: 400 });
  }
  if (!/^[0-9+\-\s]{8,16}$/.test(telepon)) {
    return NextResponse.json({ error: 'Nomor HP/telepon tidak valid' }, { status: 400 });
  }
  if (nik && nik.length !== 16) {
    return NextResponse.json({ error: 'NIK harus 16 digit' }, { status: 400 });
  }
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Format email tidak valid' }, { status: 400 });
  }
  if (desa_id) {
    const desa = db.prepare('SELECT id FROM desa WHERE id = ?').get(desa_id);
    if (!desa) {
      return NextResponse.json({ error: 'Desa tidak ditemukan' }, { status: 400 });
    }
  }

  const aduan = createAduan({ desa_id, jenis, isi, nama, nik, telepon, email, alamat });
  return NextResponse.json({ ok: true, nomor: aduan.nomor }, { status: 201 });
}
