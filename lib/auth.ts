import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const COOKIE_NAME = "admin_session";
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.pbkdf2Sync(plain, salt, 100000, 32, "sha256").toString("hex");
  return `pbkdf2:${salt}:${derived}`;
}

export function verifyPassword(plain: string, storedHash: string): boolean {
  if (!storedHash || typeof storedHash !== "string") return false;

  // Format baru ber-salt: pbkdf2:<salt>:<hash> (100.000 iterasi SHA-256)
  if (storedHash.startsWith("pbkdf2:")) {
    const parts = storedHash.split(":");
    if (parts.length !== 3) return false;
    const salt = parts[1];
    const expected = parts[2];
    const derived = crypto.pbkdf2Sync(plain, salt, 100000, 32, "sha256").toString("hex");
    return crypto.timingSafeEqual(Buffer.from(derived, "utf-8"), Buffer.from(expected, "utf-8"));
  }

  // Format legacy (unsalted SHA-256): kompatibel mundur untuk akun awal
  try {
    const legacy = crypto.createHash("sha256").update(plain).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(legacy, "utf-8"), Buffer.from(storedHash, "utf-8"));
  } catch {
    return false;
  }
}

export function createSession(userId: number): string {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL * 1000).toISOString();
  db.prepare(
    "INSERT INTO admin_session (token, user_id, expires_at, created_at) VALUES (?, ?, ?, datetime('now'))",
  ).run(token, userId, expiresAt);
  return token;
}

export function destroySession(token: string): void {
  db.prepare("DELETE FROM admin_session WHERE token = ?").run(token);
}

export function getSessionUser(token: string): { id: number; username: string } | null {
  const row = db
    .prepare(
      `SELECT u.id, u.username, s.expires_at FROM admin_session s
       JOIN admin_user u ON u.id = s.user_id
       WHERE s.token = ?`,
    )
    .get(token) as { id: number; username: string; expires_at: string } | undefined;
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    destroySession(token);
    return null;
  }
  return { id: row.id, username: row.username };
}

export async function getCurrentUser() {
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return getSessionUser(token);
}

export async function requireUser() {
  const u = await getCurrentUser();
  if (!u) throw new Error("Unauthorized");
  return u;
}

export const SESSION_COOKIE = COOKIE_NAME;
export { SESSION_TTL };
