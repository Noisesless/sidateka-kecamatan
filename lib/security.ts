import * as cheerio from "cheerio";

/**
 * Validasi apakah URL adalah URL publik yang aman untuk di-fetch oleh server (Anti-SSRF).
 * Memblokir loopback (127.0.0.1, localhost), IP privat (10.x, 192.168.x, 172.16-31.x),
 * dan cloud metadata IP (169.254.169.254).
 */
export function isSafePublicUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== "string") return false;
  const trimmed = urlStr.trim();

  // Hanya perbolehkan protokol http dan https
  if (!/^https?:\/\//i.test(trimmed)) return false;

  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase();

    // 1. Blokir localhost & local names
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      return false;
    }

    // 2. Blokir IPv4 loopback & private subnets
    // 127.0.0.0/8 (Loopback)
    if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return false;
    // 0.0.0.0
    if (hostname === "0.0.0.0") return false;
    // 10.0.0.0/8 (Private)
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return false;
    // 172.16.0.0/12 (Private)
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)) return false;
    // 192.168.0.0/16 (Private)
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return false;
    // 169.254.0.0/16 (Link-local / Cloud Metadata AWS, GCP, Azure, DigitalOcean)
    if (/^169\.254\.\d{1,3}\.\d{1,3}$/.test(hostname)) return false;

    // 3. Blokir IPv6 loopback & private
    if (
      hostname === "::1" ||
      hostname === "[::1]" ||
      hostname.startsWith("fe80:") ||
      hostname.startsWith("[fe80:") ||
      hostname.startsWith("fc00:") ||
      hostname.startsWith("[fc00:") ||
      hostname.startsWith("fd00:") ||
      hostname.startsWith("[fd00:")
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Pembersih HTML komprehensif untuk mencegah Stored / Proxy XSS.
 * Menghapus tag berbahaya, atribut event listener (on*), dan URI berbahaya.
 */
export function sanitizeHtmlContent(dirtyHtml: string): string {
  if (!dirtyHtml || typeof dirtyHtml !== "string") return "";

  const $ = cheerio.load(dirtyHtml, null, false);

  // 1. Hapus tag aktif dan berbahaya
  $(
    "script, style, iframe, object, embed, applet, base, link, meta, form, input, button, select, textarea"
  ).remove();

  // 2. Hapus elemen spam judi online yang sering disisipkan ke OpenSID
  $(
    "[class*='slot'], [class*='gacor'], [id*='slot'], [id*='gacor'], [class*='judol']"
  ).each((_i, el) => {
    const text = $(el).text();
    if (/slot|gacor|maxwin|judi|rtp/i.test(text)) {
      $(el).remove();
    }
  });

  // 3. Bersihkan atribut pada seluruh elemen yang tersisa
  $("*").each((_i, el) => {
    const attribs = $(el).attr() || {};
    for (const attr of Object.keys(attribs)) {
      const lower = attr.toLowerCase();

      // Hapus semua inline event handler (onclick, onload, onerror, onmouseover, dll)
      if (lower.startsWith("on")) {
        $(el).removeAttr(attr);
        continue;
      }

      // Periksa tautan (href, src, action, data, xlink:href)
      if (["href", "src", "action", "data", "xlink:href"].includes(lower)) {
        const val = (attribs[attr] || "").trim().toLowerCase();
        // Larang javascript:, vbscript:, data:text/html
        if (
          val.startsWith("javascript:") ||
          val.startsWith("vbscript:") ||
          val.startsWith("data:text/html")
        ) {
          $(el).removeAttr(attr);
        }
      }
    }
  });

  return $.html();
}
