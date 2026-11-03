/**
 * Utilitas penanganan tanggal & waktu untuk zona waktu Asia/Jakarta (WIB, UTC+7).
 * Menangani string tanggal ISO 8601, string SQLite UTC ("YYYY-MM-DD HH:MM:SS"),
 * dan objek Date JavaScript secara seragam dan akurat.
 */

export const TIMEZONE_WIB = "Asia/Jakarta";

/**
 * Parsing string tanggal dari SQLite atau RSS.
 * SQLite datetime('now') menghasilkan waktu UTC tanpa akhiran 'Z'.
 * Fungsi ini memastikan string tanggal tanpa timezone offset diparsing sebagai UTC.
 */
export function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

  const s = String(value).trim();
  if (!s) return null;

  // Jika sudah memiliki 'T' dan penanda timezone 'Z' atau offset (+07:00), parse langsung
  if (s.includes("T") && (s.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(s))) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  // Jika format SQLite UTC "YYYY-MM-DD HH:MM:SS", tambahkan penanda Z
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) {
    const d = new Date(s.replace(" ", "T") + "Z");
    return isNaN(d.getTime()) ? null : d;
  }

  // Fallback umum
  const d = new Date(s.includes("T") ? s : s.replace(" ", "T") + (s.endsWith("Z") ? "" : "Z"));
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format tanggal & jam ke format standar Indonesia dalam zona waktu Asia/Jakarta (WIB).
 * Contoh default: "03 Nov, 16.52"
 */
export function formatDateTimeWib(
  value: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = parseDate(value);
  if (!d) return "—";

  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIMEZONE_WIB,
    ...options,
  };

  return d.toLocaleString("id-ID", defaultOptions);
}

/**
 * Format tanggal saja (tanpa jam) dalam bahasa Indonesia.
 * Contoh: "3 November 2026"
 */
export function formatDateWib(
  value: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = parseDate(value);
  if (!d) return "";

  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIMEZONE_WIB,
    ...options,
  };

  return d.toLocaleDateString("id-ID", defaultOptions);
}

/**
 * Format relatif waktu lampau ("baru saja", "5 mnt", "2 jam", "3 hari").
 */
export function timeAgoWib(value: string | Date | null | undefined): string {
  const d = parseDate(value);
  if (!d) return "";

  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 0 || diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari`;
  return formatDateWib(d);
}
