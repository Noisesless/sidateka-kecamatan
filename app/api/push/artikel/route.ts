import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { getDesaByApiKey, recordPushAttempt } from "@/lib/queries";
import { ingestPushPayload, type PushPayload } from "@/lib/sync";

// Endpoint ini adalah "inbox" push API untuk desa-desa Banjarmangu.
//
// Alur:
//   1. Admin kecamatan membuat API key untuk tiap desa (di halaman /admin/desa).
//   2. Admin desa (atau cron job di server desa) mengirim POST ke endpoint ini
//      dengan header `X-Api-Key: <api_key>` dan body JSON berisi daftar artikel.
//   3. Server kecamatan memvalidasi api_key, meng-upsert artikel ke DB lokal,
//      dan mengembalikan ringkasan.
//
// Catatan: endpoint ini adalah server-to-server. Tidak ada session admin yang
// dilibatkan di sini — api_key + HTTPS sudah cukup sebagai autentikasi.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ITEMS_PER_REQUEST = 200;
const MAX_PAYLOAD_BYTES = 2 * 1024 * 1024; // 2 MB

function logInbox(
  desaId: number,
  endpoint: string,
  payloadHash: string,
  itemsReceived: number,
  itemsInserted: number,
  itemsUpdated: number,
  status: string,
  message: string | null,
  ip: string | null,
) {
  db.prepare(
    `INSERT INTO push_inbox
       (desa_id, endpoint, payload_hash, items_received, items_inserted, items_updated, status, message, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(desaId, endpoint, payloadHash, itemsReceived, itemsInserted, itemsUpdated, status, message, ip);
}

function hashPayload(body: string): string {
  return crypto.createHash("sha256").update(body).digest("hex");
}

function unauthorized(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 401 });
}

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!apiKey) {
    return unauthorized("Missing X-Api-Key header");
  }

  // Batas ukuran payload — Lindungi dari DoS
  const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
  if (contentLength > MAX_PAYLOAD_BYTES) {
    return badRequest("Payload terlalu besar (maks 2 MB)");
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return badRequest("Tidak dapat membaca body request");
  }
  if (rawBody.length > MAX_PAYLOAD_BYTES) {
    return badRequest("Payload terlalu besar (maks 2 MB)");
  }

  const payloadHash = hashPayload(rawBody);

  let payload: PushPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return badRequest("Body bukan JSON valid");
  }

  if (!payload || !Array.isArray(payload.items)) {
    return badRequest("Field 'items' harus berupa array");
  }
  if (payload.items.length === 0) {
    return NextResponse.json({ ok: true, message: "Tidak ada item", newCount: 0, updatedCount: 0, invalid: 0 });
  }
  if (payload.items.length > MAX_ITEMS_PER_REQUEST) {
    return badRequest(`Maksimum ${MAX_ITEMS_PER_REQUEST} item per request`);
  }

  // Validasi api key dan dapatkan desa
  const match = getDesaByApiKey(apiKey);
  if (!match) {
    logInbox(0, "/api/push/artikel", payloadHash, 0, 0, 0, "unauthorized", "api_key tidak valid", ip);
    return unauthorized("API key tidak valid atau tidak aktif");
  }
  const { desa, apiKeyRow } = match;

  // Proses upsert
  let result;
  try {
    result = await ingestPushPayload(desa.id, payload);
  } catch (e) {
    const msg = (e as Error).message;
    logInbox(desa.id, "/api/push/artikel", payloadHash, payload.items.length, 0, 0, "failed", msg, ip);
    recordPushAttempt(desa.id, "failed", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  // Update last sync di tabel desa juga (supaya UI konsisten)
  db.prepare(
    `UPDATE desa SET last_sync_at = datetime('now'),
       last_sync_status = 'ok', last_sync_message = ? WHERE id = ?`,
  ).run(`push: ${result.newCount} baru, ${result.updatedCount} update`, desa.id);

  // Log audit
  const statusLabel = result.invalid > 0 ? "partial" : "success";
  logInbox(
    desa.id,
    "/api/push/artikel",
    payloadHash,
    result.totalReceived,
    result.newCount,
    result.updatedCount,
    statusLabel,
    result.invalid > 0 ? `${result.invalid} item tidak valid` : null,
    ip,
  );
  recordPushAttempt(
    desa.id,
    result.newCount > 0 || result.updatedCount > 0 ? "success" : "success",
    `+${result.newCount} baru / ${result.updatedCount} update`,
  );

  return NextResponse.json({
    ok: true,
    desa: { slug: desa.slug, nama: desa.nama },
    received: result.totalReceived,
    invalid: result.invalid,
    newCount: result.newCount,
    updatedCount: result.updatedCount,
    durationMs: Date.now() - start,
    apiKeyId: apiKeyRow.id,
  });
}

// GET tidak diizinkan — push hanya lewat POST
export async function GET() {
  return NextResponse.json(
    { ok: false, error: "Gunakan POST dengan header X-Api-Key dan body JSON { items: [...] }" },
    { status: 405, headers: { Allow: "POST" } },
  );
}
