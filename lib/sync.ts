import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { db, type Desa, type Artikel } from './db';
import { fetchStatistikDesa } from './analitik';

const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(process.cwd(), '.data', 'uploads');

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 ' +
  '(PortalKecamatanBanjarmangu/1.0)';

const FETCH_TIMEOUT = 60_000; // 60 detik (default)
const RSS_TIMEOUT = 120_000; // 120 detik
const MAX_RESPONSE_BYTES = 200 * 1024 * 1024; // 200MB hard cap

// Batas artikel terbaru yang diambil per desa per sync. Dipilih 20 berdasarkan
// uji streaming ke feed Sijenggung (~90MB): 20 item pertama hanya ±2 MB / ±2,5
// detik, sedangkan 50 item sudah ±86 MB (konten per-artikel sangat besar).
const MAX_ARTIKEL_PER_DESA = 20;
// Cap keras saat streaming feed RSS (jaga-jaga jika 20 item tidak kunjung
// tercapai karena feed berisi sedikit <item> tapi ukurannya raksasa).
const RSS_STREAM_MAX_BYTES = 150 * 1024 * 1024;

// Daftar User-Agent untuk rotasi (kadang Cloudflare membedakan tantangan berdasarkan UA)
const UAS = [
  USER_AGENT,
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
];

type SyncResult = {
  status: 'ok' | 'partial' | 'failed';
  message: string;
  newCount: number;
  updatedCount: number;
  durationMs: number;
  source: 'rss' | 'scrape' | 'opensid-api' | 'mixed';
};

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 200);
}

function absolutizeUrl(href: string, base: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

/**
 * Unduh dan simpan gambar secara lokal ke .data/uploads/sync/<subfolder>/
 * Mengembalikan path lokal /foto/sync/<subfolder>/<filename> jika sukses,
 * atau fallback ke url asli jika gagal (agar proses sync tidak terhenti).
 */
export async function downloadAndSaveImage(
  remoteUrl: string | null | undefined,
  subfolder: 'artikel' | 'perangkat' | 'profil',
  desaSlug: string
): Promise<string | null> {
  if (!remoteUrl) return null;
  // Jika sudah berupa path lokal /foto/..., tidak perlu diunduh ulang
  if (remoteUrl.startsWith('/foto/') || remoteUrl.startsWith('/')) {
    return remoteUrl;
  }
  // Hanya proses URL http/https
  if (!remoteUrl.startsWith('http://') && !remoteUrl.startsWith('https://')) {
    return remoteUrl;
  }

  try {
    const targetDir = path.join(UPLOAD_DIR, 'sync', subfolder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const hash = crypto.createHash('md5').update(remoteUrl).digest('hex').slice(0, 12);
    let ext = '.jpg';
    try {
      const parsedPath = new URL(remoteUrl).pathname;
      const parsedExt = path.extname(parsedPath).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(parsedExt)) {
        ext = parsedExt;
      }
    } catch {
      // fallback to .jpg
    }

    const safeSlug = slugify(desaSlug) || 'desa';
    const filename = `${safeSlug}-${hash}${ext}`;
    const localFilePath = path.join(targetDir, filename);
    const localServedUrl = `/foto/sync/${subfolder}/${filename}`;

    // Jika file sudah tersimpan di disk, langsung gunakan URL lokal
    if (fs.existsSync(localFilePath) && fs.statSync(localFilePath).size > 0) {
      return localServedUrl;
    }

    // Unduh gambar dengan timeout 12 detik dan User-Agent terpercaya
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12_000);

    const res = await fetch(remoteUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': UAS[Math.floor(Math.random() * UAS.length)],
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });
    clearTimeout(timeoutId);

    const FALLBACK_COLLAGE = '/placeholder-artikel.jpg';

    if (!res.ok) {
      return FALLBACK_COLLAGE;
    }

    const contentType = res.headers.get('content-type') || '';
    // Pastikan respon benar-benar file gambar, bukan HTML challenge/error Cloudflare
    if (contentType.includes('text/html') || contentType.includes('application/json')) {
      return FALLBACK_COLLAGE;
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Filter file kosong / korup
    if (buffer.length < 100) {
      return FALLBACK_COLLAGE;
    }

    fs.writeFileSync(localFilePath, buffer);
    return localServedUrl;
  } catch {
    return '/placeholder-artikel.jpg';
  }
}

function extractImage(content: string | undefined, base: string): string | null {
  if (!content) return null;
  const $ = cheerio.load(content);
  const img = $('img').first();
  const src = img.attr('src');
  return src ? absolutizeUrl(src, base) : null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// URL yang menunjuk ke file media/upload — bukan halaman artikel.
// Contoh kasus: tema OpenSID Sijenggung membungkus gambar beranda dengan
// <a data-fancybox href=".../desa/upload/artikel/sedang_xxx.webp">, dan path
// "/desa/upload/artikel/" ikut cocok dengan selector a[href*="/artikel/"].
const MEDIA_URL_RE = /\.(webp|jpe?g|png|gif|svg|mp4|pdf)(\?.*)?$/i;

function isMediaUrl(href: string): boolean {
  return MEDIA_URL_RE.test(href) || /\/upload\//i.test(href);
}

async function fetchText(url: string, timeoutMs = FETCH_TIMEOUT): Promise<string> {
  const maxAttempts = 3;
  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const ua = UAS[(attempt - 1) % UAS.length];
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': ua,
          Accept: 'text/html,application/rss+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'id,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          // Beberapa tema OpenSID mengirim ETag/If-Modified-Since — kita tidak, biarkan 200
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        const snippet = text.slice(0, 200).replace(/\s+/g, ' ');

        // Cloudflare Challenge (403 "Just a moment..."): retry dari IP yang sama tidak akan berhasil.
        // Langsung lempar error agar tidak membuang 25 detik per desa!
        const isCloudflare =
          res.status === 403 &&
          (snippet.includes('Just a moment') ||
            snippet.includes('challenge-platform') ||
            snippet.includes('Cloudflare') ||
            snippet.includes('Attention Required'));

        if (isCloudflare) {
          throw new Error(`Cloudflare WAF 403 (Just a moment...)`);
        }

        // Retry hanya untuk 408/429/502/503/504
        if ([408, 429, 502, 503, 504].includes(res.status) && attempt < maxAttempts) {
          const delay = 1500 + Math.floor(Math.random() * 1500);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw new Error(`HTTP ${res.status} ${res.statusText}${snippet ? ` (${snippet})` : ''}`);
      }
      // Cap response size to prevent OOM
      const contentLength = Number(res.headers.get('content-length') ?? 0);
      if (contentLength > MAX_RESPONSE_BYTES) {
        throw new Error(`response too large (${(contentLength / 1024 / 1024).toFixed(1)} MB)`);
      }
      const text = await res.text();
      if (text.length > MAX_RESPONSE_BYTES) {
        throw new Error(`response too large (${(text.length / 1024 / 1024).toFixed(1)} MB)`);
      }
      return text;
    } catch (e) {
      lastErr = e as Error;
      // AbortError atau network error → retry kalau masih ada kesempatan
      if (attempt < maxAttempts && (e as Error).name !== 'AbortError') {
        const delay = 2000 + Math.floor(Math.random() * 3000);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr ?? new Error('fetch failed after retries');
}

/* ====================== RSS ====================== */

// Download feed RSS sebagai stream dan BERHENTI setelah MAX_ARTIKEL_PER_DESA
// item, lalu rekonstruksi XML valid (preamble + item-item + penutup) supaya
// tetap bisa diparse rss-parser seperti biasa. Ini menyelesaikan feed raksasa
// seperti Sijenggung (~90MB) yang sebelumnya selalu gagal diparse utuh
// ("Maximum call stack size exceeded") — kini cukup ±2 MB untuk 20 item.
// Potong XML feed tepat setelah </item> ke-N dan tutup manual, sehingga hasilnya
// tetap XML valid untuk rss-parser. Mengembalikan '' jika tidak ada item lengkap.
function cutRssXml(buf: string): string {
  const itemOpen = buf.search(/<item[\s>]/);
  if (itemOpen === -1) return '';
  let pos = -1;
  for (let i = 0; i < MAX_ARTIKEL_PER_DESA; i++) {
    const next = buf.indexOf('</item>', pos + 1);
    if (next === -1) break;
    pos = next;
  }
  if (pos === -1) return '';
  const preamble = buf.slice(0, itemOpen); // <?xml...><rss...><channel>...
  const itemsXml = buf.slice(itemOpen, pos + '</item>'.length);
  return preamble + itemsXml + '\n</channel></rss>';
}

async function fetchRssXml(url: string, timeoutMs: number): Promise<string> {
  const maxAttempts = 3;
  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const ua = UAS[(attempt - 1) % UAS.length];
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': ua,
          Accept: 'application/rss+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'id,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        // Retry hanya untuk 403/408/429/5xx (Cloudflare/challenge)
        if ([403, 408, 429, 502, 503, 504].includes(res.status) && attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 2000 + Math.floor(Math.random() * 3000)));
          continue;
        }
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let bytes = 0;
      let streamErr: Error | null = null;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          bytes += value.length;
          buf += decoder.decode(value, { stream: true });
          const itemCount = (buf.match(/<\/item>/g) ?? []).length;
          if (itemCount >= MAX_ARTIKEL_PER_DESA || bytes > RSS_STREAM_MAX_BYTES) break;
        }
      } catch (e) {
        // Stream putus/timeout di tengah (mis. server desa intermiten lambat) —
        // selamatkan item yang sudah terdownload lengkap daripada gagal total.
        streamErr = e as Error;
      }
      await reader.cancel().catch(() => {});

      // Feed kecil yang terdownload lengkap: parse apa adanya.
      if (!streamErr && buf.includes('</rss>')) return buf;
      const xml = cutRssXml(buf);
      if (xml) return xml;
      throw streamErr ?? new Error('feed tidak memuat item lengkap');
    } catch (e) {
      lastErr = e as Error;
      if (attempt < maxAttempts && (e as Error).name !== 'AbortError') {
        await new Promise((r) => setTimeout(r, 2000 + Math.floor(Math.random() * 3000)));
        continue;
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr ?? new Error('fetch rss failed after retries');
}

async function fetchRss(desa: Desa): Promise<Artikel[]> {
  if (!desa.feed_url) return [];
  const parser = new Parser({ timeout: RSS_TIMEOUT, customFields: {} });
  const xml = await fetchRssXml(desa.feed_url, RSS_TIMEOUT);
  const feed = await parser.parseString(xml);
  const items: Artikel[] = [];
  for (const it of feed.items ?? []) {
    const judul = (it.title || '').trim();
    const url = (it.link || '').trim();
    if (!judul || !url) continue;
    const slug = slugify(judul) || slugify(url);
    const ringkasan =
      it.contentSnippet?.trim() ||
      stripHtml(it.content || '').slice(0, 280) ||
      null;
    const gambar = extractImage(it.content, desa.website) || null;
    const publishedAt = it.isoDate || it.pubDate || null;
    items.push({
      id: 0,
      desa_id: desa.id,
      external_id: it.guid || url,
      judul,
      slug,
      url,
      ringkasan,
      konten: it.content || null,
      gambar,
      penulis: it.creator || it.author || null,
      kategori: it.categories?.[0] || null,
      published_at: publishedAt,
      view_count: 0,
      source: 'rss',
      fetched_at: new Date().toISOString(),
    });
  }
  return items;
}

/* ====================== HTML SCRAPER ====================== */

type ScrapeTarget = {
  // Selector untuk container tiap item artikel di beranda
  itemSelector: string;
  // Selector untuk judul di dalam container
  titleSelector: string;
  // Selector untuk link di dalam container
  linkSelector: string;
  // Selector untuk gambar di dalam container
  imageSelector: string;
  // Selector untuk elemen tanggal
  dateSelector: string;
  // Selector untuk penulis
  authorSelector: string;
  // Selector untuk ringkasan/excerpt
  excerptSelector: string;
};

// Selector untuk tema default OpenSID (bukan desa.id theme) — diverifikasi dari
// https://sijenggung-banjarnegara.desa.id/ yang merupakan OpenSID asli.
// Struktur: .articlerow-box > .artikelhome-image + .artikelhome-text > h3 (judul)
const OPENSID_DEFAULT_SCRAPE_TARGET: ScrapeTarget = {
  itemSelector: '.articlerow-box, .artikelhome, article, .artikel, .entry, .post',
  titleSelector: 'h3 a, h3, h2 a, h2, .entry-title a, .entry-title',
  linkSelector: 'h3 a, h2 a, a[href*="/artikel/"]',
  imageSelector: '.artikelhome-image img, .entry-thumbnail img, img',
  dateSelector: '.metadate, .metanext, time, .entry-date, .post-date, .tanggal, .date',
  authorSelector: '.fa-user, .artikelhome-info p, .entry-author, .post-author',
  excerptSelector: '.artikelhome-text p, .entry-summary, .post-excerpt',
};

// Selector untuk tema OpenDesa (sistemdata.id) — Tailwind-based, tanpa class OpenSID.
// Diverifikasi dari https://prendengan-banjarmangu.sistemdata.id/
// Struktur: .bg-white.shadow > figure (img) + .space-y-3 > a[href*="/artikel/"] (judul)
// + p.line-clamp-4 (excerpt) + ul > li dengan icon fa-calendar-alt (tanggal Indo)
// + li dengan icon fa-user (author)
const OPENDESA_TAILWIND_SCRAPE_TARGET: ScrapeTarget = {
  itemSelector: '.bg-white.shadow, [class*="shadow rounded"], article',
  titleSelector: 'a[href*="/artikel/"]',
  linkSelector: 'a[href*="/artikel/"]',
  imageSelector: 'figure img, img[src*="/artikel/"], img[src*="/desa/upload/"]',
  dateSelector: 'li:has(i.fa-calendar-alt), .date, time',
  authorSelector: 'li:has(i.fa-user), .author',
  excerptSelector: 'p.line-clamp-4, p',
};

// Daftar target scrape — dicoba satu per satu sampai dapat item
const SCRAPE_TARGETS: ScrapeTarget[] = [
  OPENSID_DEFAULT_SCRAPE_TARGET,
  OPENDESA_TAILWIND_SCRAPE_TARGET,
];

async function fetchScrape(desa: Desa): Promise<Artikel[]> {
  const html = await fetchText(desa.website);
  const $ = cheerio.load(html);
  const items: Artikel[] = [];
  // Coba setiap target scrape sampai ada yang mengembalikan ≥1 item.
  // Kita pilih target terbaik berdasarkan item count, lalu loop dengan target itu.
  let bestItems: Artikel[] = [];
  let bestTarget: ScrapeTarget | null = null;
  for (const target of SCRAPE_TARGETS) {
    const candidate: Artikel[] = [];
    $(target.itemSelector).each((_i, el) => {
    const $el = $(el);

    // Lewati container pembungkus yang di dalamnya masih ada item artikel
    // lain (mis. <div class="artikelhome"> membungkus banyak .articlerow-box
    // — judulnya cuma heading section seperti "Artikel").
    if ($el.find(target.itemSelector).length > 0) return;

    // Cari judul
    const $titleEl = $el.find(target.titleSelector).first();
    let judul = $titleEl.text().trim();
    // Untuk target Tailwind, judul di element <a> langsung
    if (!judul && $titleEl.is('a')) judul = $titleEl.attr('title') || '';
    if (!judul) return;

    // Cari link — kumpulkan semua kandidat, ambil yang pertama BUKAN file media.
    // (Tema OpenSID Sijenggung punya <a> fancybox ke file .webp sebelum link judul.)
    const linkCandidates: string[] = [];
    $el.find(target.linkSelector).each((_j, a) => {
      const h = $(a).attr('href');
      if (h) linkCandidates.push(h);
    });
    const tParent = $titleEl.parent('a').attr('href');
    if (tParent) linkCandidates.push(tParent);
    const tSelf = $titleEl.attr('href');
    if (tSelf) linkCandidates.push(tSelf);
    if ($el.is('a')) {
      const selfHref = $el.attr('href');
      if (selfHref) linkCandidates.push(selfHref);
    }
    const href =
      linkCandidates.find((h) => !isMediaUrl(h)) ??
      linkCandidates[0] ??
      '';
    if (!href) return;

    const absUrl = absolutizeUrl(href, desa.website);
    // Buang item yang link-nya tetap file media (bukan halaman artikel)
    if (isMediaUrl(absUrl)) return;

    // Gambar
    const $img = $el.find(target.imageSelector).first();
    let gambar: string | null = null;
    const imgSrc = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src');
    if (imgSrc) gambar = absolutizeUrl(imgSrc, desa.website);

    // Tanggal: coba parse beberapa format
    let publishedAt: string | null = null;
    // Cek apakah ada struktur split .metadate (hari) + .metanext (bulan tahun) ala OpenSID
    const $metadate = $el.find('.metadate').first();
    const $metanext = $el.find('.metanext').first();
    let dateText: string | null = null;
    if ($metadate.length && $metanext.length) {
      dateText = `${$metadate.text().trim()} ${$metanext.text().trim()}`.replace(/\s+/g, ' ').trim();
    } else {
      const $dateEl = $el.find(target.dateSelector).first();
      dateText = $dateEl.attr('datetime') || $dateEl.text().trim();
    }
    if (dateText) {
      const cleaned = dateText.replace(/\s+/g, ' ').trim();
      const parsed = new Date(cleaned);
      if (!isNaN(parsed.getTime())) {
        publishedAt = parsed.toISOString();
      } else {
        // Coba parse "DD Month YYYY" / "DD Month YY" manual
        const months: Record<string, number> = {
          januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
          juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
          jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, agu: 7, sep: 8, okt: 9, nov: 10, des: 11,
        };
        const m = cleaned.match(/(\d{1,2})\s+([a-z]+)\s+(\d{2,4})/i);
        if (m) {
          const day = parseInt(m[1], 10);
          const mon = months[m[2].toLowerCase()];
          let year = parseInt(m[3], 10);
          if (year < 100) year += 2000;
          if (mon !== undefined) {
            const d = new Date(Date.UTC(year, mon, day));
            if (!isNaN(d.getTime())) publishedAt = d.toISOString();
          }
        }
      }
    }

    // Penulis
    const $authorEl = $el.find(target.authorSelector).first();
    let penulis: string | null = null;
    if ($authorEl.length) {
      const authorText = $authorEl.text().replace(/^.*?by\s*/i, '').trim();
      if (authorText) penulis = authorText;
    }

    // Ringkasan: ambil paragraf pertama yang bukan info meta
    // (tema Sijenggung tidak punya excerpt — <p> di dalamnya hanya berisi
    // "Admin : X", "157 Kali dibuka", "Buka Halaman").
    let ringkasan: string | null = null;
    $el.find(target.excerptSelector).each((_j, p) => {
      if (ringkasan) return;
      const $p = $(p);
      if ($p.closest('.artikelmeta, .artikelhome-info, .metadate, .metanext').length) return;
      const t = $p.text().replace(/\s+/g, ' ').trim();
      if (t.length < 40) return;
      ringkasan = t.slice(0, 320);
    });

    candidate.push({
      id: 0,
      desa_id: desa.id,
      external_id: null,
      judul,
      slug: slugify(judul) || slugify(absUrl),
      url: absUrl,
      ringkasan,
      konten: null,
      gambar,
      penulis,
      kategori: null,
      published_at: publishedAt,
      view_count: 0,
      source: 'scrape',
      fetched_at: new Date().toISOString(),
    });
  });
    // Simpan target dengan item count tertinggi
    if (candidate.length > bestItems.length) {
      bestItems = candidate;
      bestTarget = target;
    }
  }
  return bestItems;
}

/* ====================== OpenSID JSON API (internal_api) ====================== */
// Adapter untuk desa yang mengekspos endpoint `internal_api` ala OpenDK.
// Referensi struktur respons: openSID repo -> donjo-app/controllers/internal_api/Artikel.php
//   -> App\Repositories\ArtikelRepository + App\Http\Transformers\ArtikelTransformer
// Responsenya (Fractal JSON-API) berisi `data[].attributes` dengan field:
//   id, judul, slug, isi (HTML), gambar (filename), tgl_upload, tipe, id_kategori,
//   url_slug (accessor, path /artikel/YYYY/MM/DD/slug), hit, plus relasi
//   author.nama, category.kategori, comments[].id.
//
// Aktivasi: isi `opensid_api_url` (contoh: https://desa.id/api/v1/artikel)
// dan opsional `opensid_api_token` (Bearer) di admin per-desa.

type OpenSidApiItem = {
  type?: string;
  id?: string | number;
  attributes?: {
    id?: number;
    judul?: string;
    slug?: string;
    isi?: string;
    gambar?: string;
    tgl_upload?: string;
    tipe?: string;
    id_kategori?: number;
    id_user?: number;
    url_slug?: string;
    hit?: number;
    enabled?: number;
    [k: string]: unknown;
  };
  relationships?: {
    author?: { attributes?: { nama?: string } };
    category?: { attributes?: { kategori?: string; slug?: string } };
  };
};

type OpenSidApiResponse = {
  data?: OpenSidApiItem[];
  meta?: {
    pagination?: {
      total?: number;
      count?: number;
      per_page?: number;
      current_page?: number;
      total_pages?: number;
      links?: Record<string, string>;
    };
  };
  links?: Record<string, string>;
};

function buildOpenSidArticleUrl(
  attrs: OpenSidApiItem['attributes'],
  fallbackBase: string,
): string {
  if (attrs?.url_slug) {
    try {
      return new URL(attrs.url_slug, fallbackBase).toString();
    } catch {
      return attrs.url_slug;
    }
  }
  // Fallback: bentuk sendiri dari tgl_upload + slug
  if (attrs?.tgl_upload && attrs?.slug) {
    try {
      const d = new Date(attrs.tgl_upload);
      if (!isNaN(d.getTime())) {
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(d.getUTCDate()).padStart(2, '0');
        return absolutizeUrl(`/artikel/${yyyy}/${mm}/${dd}/${attrs.slug}`, fallbackBase);
      }
    } catch {
      // ignore
    }
  }
  return fallbackBase;
}

function buildOpenSidImageUrl(
  gambar: string | undefined,
  base: string,
): string | null {
  if (!gambar) return null;
  // OpenSID menyimpan gambar di /desa/upload/artikel/sedang_<file>
  return absolutizeUrl(`/desa/upload/artikel/sedang_${gambar}`, base);
}

async function fetchOpenSidApi(desa: Desa): Promise<Artikel[]> {
  if (!desa.opensid_api_url) return [];
  const url = desa.opensid_api_url.trim();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': USER_AGENT,
    'Accept-Language': 'id,en;q=0.9',
  };
  if (desa.opensid_api_token) {
    headers['Authorization'] = `Bearer ${desa.opensid_api_token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  let res: Response;
  try {
    res = await fetch(url, { headers, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as OpenSidApiResponse;
  const items: Artikel[] = [];
  for (const node of json.data ?? []) {
    const a = node.attributes;
    if (!a) continue;
    if (a.enabled !== undefined && a.enabled !== 1) continue;
    if (a.tipe && ['statis', 'agenda', 'keuangan'].includes(a.tipe)) continue;

    const judul = (a.judul || '').trim();
    const slug = (a.slug || '').trim();
    if (!judul || !slug) continue;

    // Ringkasan: potong 260 char mengikuti logika feed.blade.php OpenSID
    let ringkasan: string | null = null;
    let konten: string | null = null;
    if (a.isi) {
      const text = stripHtml(a.isi);
      ringkasan = text.length > 260
        ? text.slice(0, text.slice(0, 260).lastIndexOf(' ') || 260) + ' [...]'
        : text;
      // Simpan konten lengkap (HTML) untuk ditampilkan di halaman detail
      konten = a.isi;
    }

    items.push({
      id: 0,
      desa_id: desa.id,
      external_id: a.id != null ? String(a.id) : slug,
      judul,
      slug,
      url: buildOpenSidArticleUrl(a, desa.website),
      ringkasan,
      konten,
      gambar: buildOpenSidImageUrl(a.gambar, desa.website),
      penulis: node.relationships?.author?.attributes?.nama ?? null,
      kategori: node.relationships?.category?.attributes?.kategori ?? null,
      published_at: a.tgl_upload || null,
      view_count: typeof a.hit === 'number' ? a.hit : 0,
      source: 'opensid-api',
      fetched_at: new Date().toISOString(),
    });
  }
  return items;
}

/* ====================== UPSERT ====================== */

type UpsertResult = {
  newCount: number;
  updatedCount: number;
  skippedCount: number;
  savedPhotosCount: number;
};

function upsertArtikel(items: Artikel[], desaId: number): UpsertResult {
  const findExisting = db.prepare(
    'SELECT id, published_at, gambar, ringkasan, konten FROM artikel WHERE desa_id = ? AND slug = ?'
  );

  const insertStmt = db.prepare(`
    INSERT INTO artikel (
      desa_id, external_id, judul, slug, url, ringkasan, konten, gambar, penulis, kategori, published_at, source
    ) VALUES (
      @desa_id, @external_id, @judul, @slug, @url, @ringkasan, @konten, @gambar, @penulis, @kategori, @published_at, @source
    )
  `);

  const updateStmt = db.prepare(`
    UPDATE artikel SET
      judul = @judul,
      url = @url,
      ringkasan = CASE
        WHEN length(COALESCE(@ringkasan, '')) > length(COALESCE(ringkasan, ''))
        THEN @ringkasan
        ELSE ringkasan
      END,
      konten = CASE
        WHEN length(COALESCE(@konten, '')) > length(COALESCE(konten, ''))
        THEN @konten
        ELSE konten
      END,
      gambar = CASE
        WHEN gambar LIKE '/foto/%' THEN gambar
        WHEN @gambar IS NOT NULL AND @gambar != '' THEN @gambar
        ELSE gambar
      END,
      penulis = COALESCE(@penulis, penulis),
      kategori = COALESCE(@kategori, kategori),
      published_at = COALESCE(@published_at, published_at),
      source = @source,
      fetched_at = datetime('now')
    WHERE desa_id = @desa_id AND slug = @slug
  `);

  let newCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let savedPhotosCount = 0;

  const tx = db.transaction((rows: Artikel[]) => {
    for (const r of rows) {
      const existing = findExisting.get(desaId, r.slug) as
        | { id: number; published_at: string | null; gambar: string | null; ringkasan: string | null; konten: string | null }
        | undefined;

      if (!existing) {
        insertStmt.run({ ...r, desa_id: desaId });
        newCount++;
        if (r.gambar && r.gambar.startsWith('/foto/')) {
          savedPhotosCount++;
        }
      } else {
        // PERIKSA: Jika tanggal publikasi sama dan gambar lokal sudah tersimpan,
        // JANGAN timpa data lama secara membabi-buta (skip pembaruan redundan).
        const isSameDate = (existing.published_at ?? '') === (r.published_at ?? '');
        const hasLocalImage = existing.gambar && existing.gambar.startsWith('/foto/');

        if (isSameDate && hasLocalImage) {
          skippedCount++;
        } else {
          updateStmt.run({ ...r, desa_id: desaId });
          updatedCount++;
        }
        if ((r.gambar && r.gambar.startsWith('/foto/')) || hasLocalImage) {
          savedPhotosCount++;
        }
      }
    }
  });

  tx(items);
  return { newCount, updatedCount, skippedCount, savedPhotosCount };
}

/* ====================== PROFIL & LEMBAGA DESA ====================== */

export type ProfilJenis = 'pemerintah' | 'profil' | 'sejarah' | 'visi_misi' | 'lembaga';

// Urutan rule = prioritas klasifikasi (match pertama menang)
const PROFIL_RULES: Array<{ jenis: ProfilJenis; rx: RegExp }> = [
  { jenis: 'lembaga', rx: /lembaga|\bbpd\b|\blpm|lpmd|\bpkk\b|karang\s*taruna|posyandu|bumdes/i },
  { jenis: 'pemerintah', rx: /pemerintah|perangkat|struktur|sotk|aparatur/i },
  { jenis: 'sejarah', rx: /sejarah|asal[\s-]*usul/i },
  { jenis: 'visi_misi', rx: /visi|\bmisi\b/i },
  { jenis: 'profil', rx: /profil|wilayah|geografis|tentang|gambaran/i },
];

// Frasa spam judi online — situs desa yang diretas menyajikan doorway page
// (kasus nyata: sijenggung, Sep 2026). Hati-hati: JANGAN pakai kata "judi"
// sendirian — false positive pada nama orang (ada perangkat bernama "Judi").
const PROFIL_SPAM_RX =
  /(slot\s*gacor|slot\s*online|togel|casino\s*online|rtp\s*(slot|live)|maxwin|judi\s*online|situs\s*judi|pragmatic\s*play|depo\s*(pulsa|dana|ovo)|bonus\s*new\s*member|daftar\s*slot)/i;

const MAX_PROFIL_PER_DESA = 10;
const MAX_PROFIL_HTML = 1_500_000;

type ProfilTarget = { url: string; jenis: ProfilJenis; judul: string };

function classifyProfilJenis(text: string): ProfilJenis {
  for (const r of PROFIL_RULES) if (r.rx.test(text)) return r.jenis;
  return 'profil';
}

/** Deteksi tautan halaman profil/lembaga dari area menu homepage situs desa. */
function detectProfilLinks(html: string, baseUrl: string): ProfilTarget[] {
  const $ = cheerio.load(html);
  let anchors = $(
    'nav a[href], header a[href], .menu a[href], .navbar a[href], .main-menu a[href], #menu a[href], .nav a[href], .navigation a[href]',
  );
  if (anchors.length < 3) anchors = $('a[href]');

  const out: ProfilTarget[] = [];
  const seen = new Set<string>();
  anchors.each((_i, el) => {
    const href = ($(el).attr('href') || '').trim();
    const label = $(el).text().replace(/\s+/g, ' ').trim();
    if (!href || href === '#' || href.toLowerCase().startsWith('javascript:')) return;
    const probe = `${label} ${href}`;
    if (!PROFIL_RULES.some((r) => r.rx.test(probe))) return;
    const abs = absolutizeUrl(href, baseUrl);
    if (!abs || isMediaUrl(abs)) return;
    try {
      if (new URL(abs).hostname !== new URL(baseUrl).hostname) return;
    } catch {
      return;
    }
    const clean = abs.split('#')[0].replace(/\/+$/, '');
    if (seen.has(clean)) return;
    seen.add(clean);
    out.push({ url: clean, jenis: classifyProfilJenis(probe), judul: label || clean });
  });
  return out.slice(0, MAX_PROFIL_PER_DESA);
}

function parseManualProfilUrls(raw: string | null | undefined): ProfilTarget[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    const out: ProfilTarget[] = [];
    for (const item of arr) {
      const url = typeof item === 'string' ? item.trim() : '';
      if (!/^https?:\/\//i.test(url)) continue;
      out.push({ url: url.replace(/\/+$/, ''), jenis: classifyProfilJenis(url), judul: '' });
    }
    return out;
  } catch {
    return [];
  }
}

function pickPageTitle($: cheerio.CheerioAPI): string {
  const og = $('meta[property="og:title"]').attr('content')?.trim();
  if (og) return og;
  const h1 = $('h1').first().text().replace(/\s+/g, ' ').trim();
  if (h1) return h1;
  return $('title').text().replace(/\s+/g, ' ').trim();
}

/** Hapus semua konten sebelum heading yang memuat judul halaman (biasanya chrome tema:
 *  marquee "selamat datang", label "ARTIKEL", dsb.). Graceful — bila tidak cocok, tidak dipotong. */
function trimBeforeTitleHeading(
  $: cheerio.CheerioAPI,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  root: cheerio.Cheerio<any>,
  judulCandidates: string[],
) {
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  const targets = judulCandidates.map(norm).filter((s) => s.length >= 4);
  if (targets.length === 0) return;
  for (const el of root.find('h1, h2, h3, h4').toArray()) {
    const t = norm($(el).text());
    if (!targets.some((x) => t === x || (t.length > 0 && x.startsWith(t)) || t.startsWith(x))) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let node: cheerio.Cheerio<any> = $(el);
    while (node.length > 0 && node.get(0) !== root.get(0)) {
      node.prevAll().remove();
      node = node.parent();
    }
    $(el).remove(); // judul sudah ditampilkan oleh UI portal
    break;
  }
}

// URL gambar valid: harus berakhiran ekstensi gambar (menyaring src terpotong dari situs sumber)
const IMG_SRC_RX = /\.(jpe?g|png|gif|webp|svg|bmp|avif)(\?|#|$)/i;

/** Ambil konten utama halaman profil & bersihkan agar aman ditampilkan di portal. */
function sanitizeProfilHtml(html: string, pageUrl: string, judulCandidates: string[] = []): string {
  const $ = cheerio.load(html);
  $('script, style, iframe, noscript, form, button, input, select, textarea, video, audio, object, embed').remove();

  const candidates = [
    'article .entry-content', '.entry-content', '.post-content', '.article-content',
    '.content-artikel', '.single-article', 'article', '#artikel', '.artikel',
    'main', '#content', '.content',
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let root: cheerio.Cheerio<any> = $('body') as cheerio.Cheerio<any>;
  for (const sel of candidates) {
    const el = $(sel).first();
    if (el.length && el.text().replace(/\s+/g, '').length > 200) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      root = el as cheerio.Cheerio<any>;
      break;
    }
  }

  root.find(
    'nav, header, footer, aside, marquee, .breadcrumb, .breadcrumbs, .share, .sharedaddy, [class*="share"], .komentar, #comments, .comments, .comment-respond, .post-nav, .navigation, .related, .artikelmeta, .sosmed, .meta-author, .widget, [class*="widget"], .sidebar, [class*="sidebar"], [id*="sidebar"]',
  ).remove();
  root.find('img[src*="/widgets/"], img[src*="banner"]').remove();

  // buang gambar sampul ganda — komponen portal sudah menampilkan cover dari og:image
  root.find('img[alt*="sampul artikel" i]').remove();

  // potong chrome tema sebelum heading judul, lalu buang heading judulnya
  trimBeforeTitleHeading($, root, judulCandidates);
  root.find('h1').first().remove();

  // buang elemen kosong (beberapa pass untuk yang bersarang; whitespace dianggap kosong)
  for (let pass = 0; pass < 4; pass++) {
    root.find('div, span, p, section, i').each((_i, el) => {
      const $el = $(el);
      if ($el.text().trim() === '' && $el.find('img, table, video, iframe, hr, br').length === 0) {
        $el.remove();
      }
    });
  }

  // buang atribut berbahaya/pengganggu layout
  root.find('*').each((_i, el) => {
    const attribs = (el as { attribs?: Record<string, string> }).attribs ?? {};
    for (const name of Object.keys(attribs)) {
      const n = name.toLowerCase();
      if (n.startsWith('on') || n === 'style' || n === 'srcset' || n === 'sizes' || n === 'class' || n === 'id') {
        $(el).removeAttr(name);
      }
    }
  });

  // tautan → teks biasa (hindari tautan keluar / tautan spam)
  root.find('a').each((_i, el) => {
    $(el).replaceWith($(el).contents());
  });

  // gambar: absolutkan src + lazy-load; buang yang src-nya tidak valid/terpotong
  root.find('img').each((_i, el) => {
    const $img = $(el);
    const src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src') || '';
    const abs = src ? absolutizeUrl(src, pageUrl) : '';
    if (!abs || !IMG_SRC_RX.test(abs)) {
      $img.remove();
      return;
    }
    $img.attr('src', abs);
    $img.attr('loading', 'lazy');
    $img.removeAttr('data-src').removeAttr('data-lazy-src').removeAttr('width').removeAttr('height');
  });

  // buang komentar HTML (termasuk conditional comment berisi <script>)
  return (root.html() ?? '').replace(/<!--[\s\S]*?-->/g, '').trim();
}

function upsertProfil(
  desaId: number,
  jenis: ProfilJenis,
  judul: string,
  kontenHtml: string,
  gambar: string | null,
  sourceUrl: string,
) {
  db.prepare(
    `INSERT INTO profil_desa (desa_id, jenis, judul, konten_html, gambar, source_url, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(desa_id, source_url) DO UPDATE SET
       jenis = excluded.jenis,
       judul = excluded.judul,
       konten_html = excluded.konten_html,
       gambar = excluded.gambar,
       fetched_at = excluded.fetched_at`,
  ).run(desaId, jenis, judul, kontenHtml, gambar, sourceUrl);
}

/**
 * Sinkron halaman profil/pemerintah/lembaga desa.
 * Memakai mesin fetch yang sama seperti berita (fetchText: rotasi UA + retry).
 * Mengembalikan ringkasan untuk digabung ke pesan sync artikel.
 */
export type AparaturEntry = { nama: string; jabatan: string; foto: string | null };

/** Decode entitas HTML umum (dipakai untuk data-caption dsb). */
function decodeEntities(s: string): string {
  return s
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

/**
 * Deteksi kartu aparatur/perangkat desa pada halaman OpenSID.
 * Tema OpenSID menampilkan carousel aparatur berbentuk:
 *   <a href="foto" data-caption="Jabatan<br/>Nama"><img .../user_pict/...></a>
 * Mengembalikan daftar unik (urutan sesuai kemunculan pertama di dokumen).
 */
export function detectAparatur(html: string, pageUrl: string): AparaturEntry[] {
  const $ = cheerio.load(html);
  const out: AparaturEntry[] = [];
  const seen = new Set<string>();

  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  const push = (namaRaw: string, jabatanRaw: string, foto: string | null) => {
    const nama = norm(namaRaw);
    const jabatan = norm(jabatanRaw);
    if (nama.length < 3) return;
    const key = `${jabatan}|${nama}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ nama, jabatan, foto });
  };
  /** URL foto valid; placeholder tema (kuser dsb) -> null */
  const validFoto = (src: string | undefined): string | null => {
    if (!src) return null;
    const abs = absolutizeUrl(src, pageUrl);
    if (!abs || !IMG_SRC_RX.test(abs)) return null;
    if (/kuser|placeholder|default|no-?image/i.test(abs)) return null;
    return abs;
  };

  // Pola A — carousel tema (gripit, sijeruk): <a data-caption="Jabatan<br/>Nama"><img user_pict></a>
  $('a[data-caption]').each((_i, el) => {
    const $a = $(el);
    const cap = ($a.attr('data-caption') || '').trim();
    if (!cap) return;
    const $img = $a.find('img').first();
    const foto = validFoto($img.attr('src') || $img.attr('data-src') || $a.attr('href'));
    if (!foto || !/user_pict|pamong/i.test(foto)) return;
    const parts = cap
      .split(/<br\s*\/?>/i)
      .map((p) => norm(decodeEntities(p.replace(/<[^>]+>/g, ' '))))
      .filter(Boolean);
    if (parts.length >= 2) push(parts.slice(1).join(' '), parts[0], foto);
    else if (parts.length === 1) push(parts[0], '', foto);
  });

  // Pola B — widget slide (banjarmangu, kalilunjar, sigeblog): .aparatur-widget-slide = img + h4(nama) + p(jabatan)
  $('.aparatur-widget-slide').each((_i, el) => {
    const $el = $(el);
    const $img = $el.find('img').first();
    const src = $img.attr('src') || '';
    if (!/user_pict|pamong|kuser|pengguna/i.test(src)) return;
    const nama = norm($el.find('h4').first().text()) || norm($img.attr('alt') || '');
    const jabatan =
      norm($el.find('h4').first().nextAll('p').first().text()) || norm($el.find('p').first().text());
    push(nama, jabatan, validFoto(src));
  });

  // Pola C — widget team-scroll (beji, kendaga, dll): .card = img + h3(nama) + p(jabatan)
  $('#teamScroll .card, .team-scroll .card, .team-container-wrapper .card').each((_i, el) => {
    const $el = $(el);
    const $img = $el.find('img').first();
    const src = $img.attr('src') || '';
    if (!/user_pict|pamong|kuser|pengguna/i.test(src)) return;
    const nama = norm($el.find('h3').first().text()) || norm($img.attr('alt') || '');
    const jabatan =
      norm($el.find('h3').first().nextAll('p').first().text()) || norm($el.find('p').first().text());
    push(nama, jabatan, validFoto(src));
  });

  return out.slice(0, 40);
}

/** Ganti seluruh data perangkat desa dengan hasil deteksi terbaru (pertahankan foto lokal lama jika ada). */
function replacePerangkatDesa(desaId: number, rows: AparaturEntry[]): void {
  // Ambil foto yang sudah tersimpan lokal sebelumnya agar tidak hilang
  const existingRows = db
    .prepare('SELECT nama, jabatan, foto_url FROM perangkat_desa WHERE desa_id = ?')
    .all(desaId) as Array<{ nama: string; jabatan: string; foto_url: string | null }>;
  const existingPhotoMap = new Map<string, string>();
  for (const er of existingRows) {
    if (er.foto_url && er.foto_url.startsWith('/foto/')) {
      existingPhotoMap.set(`${er.jabatan}|${er.nama}`.toLowerCase(), er.foto_url);
    }
  }

  db.prepare('DELETE FROM perangkat_desa WHERE desa_id = ?').run(desaId);
  const ins = db.prepare(
    'INSERT INTO perangkat_desa (desa_id, nama, jabatan, foto_url, urutan) VALUES (?, ?, ?, ?, ?)',
  );
  rows.forEach((r, i) => {
    const key = `${r.jabatan}|${r.nama}`.toLowerCase();
    const finalFoto =
      r.foto && r.foto.startsWith('/foto/')
        ? r.foto
        : existingPhotoMap.get(key) || r.foto;
    ins.run(desaId, r.nama.slice(0, 200), r.jabatan.slice(0, 200), finalFoto, i);
  });
}

export async function fetchProfilDesa(desa: Desa): Promise<string> {
  // 1. Homepage → deteksi tautan profil dari menu
  const home = await fetchText(desa.website, 30_000);
  if (PROFIL_SPAM_RX.test(home)) {
    return 'profil: dilewati (situs terindikasi konten spam)';
  }
  const detected = detectProfilLinks(home, desa.website);
  const manual = parseManualProfilUrls(desa.profil_urls);

  // Gabung: manual lebih dulu, lalu hasil deteksi yang belum ada
  const seen = new Set(manual.map((m) => m.url));
  const targets: ProfilTarget[] = [...manual];
  for (const t of detected) {
    if (targets.length >= MAX_PROFIL_PER_DESA) break;
    if (!seen.has(t.url)) {
      seen.add(t.url);
      targets.push(t);
    }
  }
  if (targets.length === 0) return 'profil: tidak ada tautan profil terdeteksi';

  // 2. Fetch tiap halaman profil
  let saved = 0;
  let spam = 0;
  let gagal = 0;
  const perangkatMap = new Map<string, AparaturEntry>();
  // aparatur juga dideteksi dari homepage — widget tema (pola B/C) sering hanya tampil di sana
  for (const a of detectAparatur(home, desa.website)) {
    perangkatMap.set(`${a.jabatan}|${a.nama}`.toLowerCase(), a);
  }
  for (const t of targets) {
    try {
      const html = await fetchText(t.url, 30_000);
      if (PROFIL_SPAM_RX.test(html)) {
        spam++;
        continue;
      }
      // kumpulkan kartu aparatur (bila ada) dari halaman ini
      for (const a of detectAparatur(html, t.url)) {
        const key = `${a.jabatan}|${a.nama}`.toLowerCase();
        if (!perangkatMap.has(key)) perangkatMap.set(key, a);
      }
      const $ = cheerio.load(html);
      const judul = (t.judul || pickPageTitle($) || t.url).slice(0, 300);
      const konten = sanitizeProfilHtml(html, t.url, [t.judul, pickPageTitle($)].filter(Boolean));
      if (konten.replace(/<[^>]+>/g, '').trim().length < 100) {
        gagal++;
        continue;
      }
      const ogImg = $('meta[property="og:image"]').attr('content')?.trim() || null;
      const ogAbs = ogImg ? absolutizeUrl(ogImg, t.url) : null;
      // og:image dari situs sumber kadang terpotong/rusak — abaikan jika bukan URL gambar valid
      const gambar = ogAbs && IMG_SRC_RX.test(ogAbs) ? ogAbs : null;
      upsertProfil(desa.id, t.jenis, judul, konten.slice(0, MAX_PROFIL_HTML), gambar, t.url);
      saved++;
      await new Promise((r) => setTimeout(r, 400));
    } catch {
      gagal++;
    }
  }

  // 3. Hapus entri lama yang sudah tidak terdeteksi/dikonfigurasi.
  //    Hanya jika minimal satu fetch sukses — supaya situs down sesaat
  //    tidak menghapus semua profil yang tersimpan.
  if (saved > 0) {
    const placeholders = targets.map(() => '?').join(',');
    db.prepare(`DELETE FROM profil_desa WHERE desa_id = ? AND source_url NOT IN (${placeholders})`).run(
      desa.id,
      ...targets.map((t) => t.url),
    );
  }

  // 4. Simpan data perangkat hasil deteksi dan unduh foto aparatur ke lokal
  if (perangkatMap.size > 0) {
    const rows = [...perangkatMap.values()];
    for (const r of rows) {
      if (r.foto) {
        r.foto = await downloadAndSaveImage(r.foto, 'perangkat', desa.slug);
      }
    }
    replacePerangkatDesa(desa.id, rows);
  }

  return `profil: ${saved} tersimpan${spam ? `, ${spam} spam dilewati` : ''}${gagal ? `, ${gagal} gagal` : ''}${perangkatMap.size ? `, ${perangkatMap.size} perangkat` : ''}`;
}

/* ====================== PUSH INGEST ====================== */

// Bentuk payload artikel yang dikirim desa (kompatibel dengan format OpenSID)
export type PushArtikelItem = {
  judul: string;
  slug?: string;
  url: string;
  ringkasan?: string | null;
  gambar?: string | null;
  penulis?: string | null;
  kategori?: string | null;
  published_at?: string | null;
  external_id?: string | null;
};

export type PushPayload = {
  items: PushArtikelItem[];
  source?: string; // default 'push'
};

export type PushIngestResult = {
  newCount: number;
  updatedCount: number;
  totalReceived: number;
  invalid: number;
};

export async function ingestPushPayload(desaId: number, payload: PushPayload): Promise<PushIngestResult> {
  if (!Array.isArray(payload?.items)) {
    return { newCount: 0, updatedCount: 0, totalReceived: 0, invalid: 0 };
  }
  const items: Artikel[] = [];
  let invalid = 0;
  for (const it of payload.items) {
    if (!it || typeof it.judul !== 'string' || typeof it.url !== 'string' || !it.judul.trim() || !it.url.trim()) {
      invalid++;
      continue;
    }
    const judul = it.judul.trim();
    const url = it.url.trim();
    const slug = (it.slug && it.slug.trim()) || slugify(judul) || slugify(url);
    items.push({
      id: 0,
      desa_id: desaId,
      external_id: it.external_id || url,
      judul,
      slug,
      url,
      ringkasan: (it.ringkasan ?? null)?.toString().slice(0, 2000) || null,
      konten: null, // ringkasan saja, full content di situs desa
      gambar: it.gambar || null,
      penulis: it.penulis || null,
      kategori: it.kategori || null,
      published_at: it.published_at || null,
      view_count: 0,
      source: payload.source || 'push',
      fetched_at: new Date().toISOString(),
    });
  }
  // Unduh gambar artikel jika ada
  const desa = db.prepare('SELECT slug FROM desa WHERE id = ?').get(desaId) as { slug: string } | undefined;
  const desaSlug = desa?.slug || 'desa';
  for (const item of items) {
    if (item.gambar) {
      item.gambar = await downloadAndSaveImage(item.gambar, 'artikel', desaSlug);
    }
  }

  const { newCount, updatedCount } = upsertArtikel(items, desaId);
  return { newCount, updatedCount, totalReceived: payload.items.length, invalid };
}

/* ====================== SYNC ENTRY ====================== */

export async function syncDesa(desa: Desa): Promise<SyncResult> {
  const start = Date.now();
  let items: Artikel[] = [];
  const usedSources: Array<'opensid-api' | 'rss' | 'scrape'> = [];
  const errors: string[] = [];

  // Strategi 0: OpenSID JSON API (paling reliable jika endpoint dikonfigurasi)
  try {
    if (desa.opensid_api_url) {
      const apiItems = await fetchOpenSidApi(desa);
      if (apiItems.length > 0) {
        items = apiItems;
        usedSources.push('opensid-api');
      }
    }
  } catch (e) {
    errors.push(`opensid-api: ${(e as Error).message}`);
  }

  // Strategi 1: RSS
  try {
    if (items.length === 0 && desa.feed_url) {
      const rssItems = await fetchRss(desa);
      if (rssItems.length > 0) {
        items = rssItems;
        usedSources.push('rss');
      }
    }
  } catch (e) {
    errors.push(`rss: ${(e as Error).message}`);
  }

  const isCloudflareBlocked = errors.some((err) => err.includes('Cloudflare WAF'));

  // Strategi 2 (fallback): HTML scrape — lewati jika sudah terbukti diblokir Cloudflare WAF
  if (items.length === 0 && desa.scraper_enabled && !isCloudflareBlocked) {
    try {
      const scraped = await fetchScrape(desa);
      if (scraped.length > 0) {
        items = scraped;
        usedSources.push('scrape');
      }
    } catch (e) {
      errors.push(`scrape: ${(e as Error).message}`);
    }
  }

  // Sinkron halaman profil & lembaga desa (hanya jika tidak terblokir Cloudflare WAF)
  let profilMsg = '';
  let statistikMsg = '';
  if (desa.scraper_enabled && !isCloudflareBlocked) {
    try {
      profilMsg = await fetchProfilDesa(desa);
    } catch (e) {
      profilMsg = `profil: gagal (${(e as Error).message})`;
    }
    // Statistik analitik (di-throttle 20 jam di dalamnya; '' bila skip)
    try {
      statistikMsg = await fetchStatistikDesa(desa);
    } catch (e) {
      statistikMsg = `statistik: gagal (${(e as Error).message})`;
    }
  }

  if (items.length === 0) {
    return {
      status: 'failed',
      message: [errors.join(' | ') || 'tidak ada item yang berhasil diambil', profilMsg, statistikMsg].filter(Boolean).join(' | '),
      newCount: 0,
      updatedCount: 0,
      durationMs: Date.now() - start,
      source: 'rss',
    };
  }

  // Batasi ke N artikel terbaru per desa — berlaku untuk semua sumber
  items = items
    .slice()
    .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''))
    .slice(0, MAX_ARTIKEL_PER_DESA);

  // Unduh dan simpan gambar artikel secara lokal ke .data/uploads/sync/artikel/
  // agar foto tidak hilang saat proteksi WAF desa aktif kembali
  let photoSaved = 0;
  for (const item of items) {
    if (item.gambar) {
      const local = await downloadAndSaveImage(item.gambar, 'artikel', desa.slug);
      if (local && local.startsWith('/foto/')) photoSaved++;
      item.gambar = local;
    }
  }

  const { newCount, updatedCount, skippedCount, savedPhotosCount } = upsertArtikel(items, desa.id);

  // Backfill gambar artikel lama yang masih pakai URL remote (jika ada)
  try {
    const oldArticles = db
      .prepare("SELECT id, gambar FROM artikel WHERE desa_id = ? AND gambar LIKE 'http%'")
      .all(desa.id) as Array<{ id: number; gambar: string }>;
    for (const oa of oldArticles) {
      const local = await downloadAndSaveImage(oa.gambar, 'artikel', desa.slug);
      if (local && local.startsWith('/foto/')) {
        db.prepare("UPDATE artikel SET gambar = ? WHERE id = ?").run(local, oa.id);
      }
    }
  } catch {
    // silent fallback
  }

  const source: SyncResult['source'] =
    usedSources.length > 1 ? 'mixed' : usedSources[0] ?? 'rss';

  // Susun pesan status yang sangat jelas dan informatif
  const summaryParts: string[] = [];
  if (newCount > 0) summaryParts.push(`+${newCount} baru`);
  if (updatedCount > 0) summaryParts.push(`${updatedCount} diperbarui`);
  if (skippedCount > 0) summaryParts.push(`${skippedCount} tidak berubah`);
  if (savedPhotosCount > 0 || photoSaved > 0) {
    summaryParts.push(`${Math.max(savedPhotosCount, photoSaved)} foto tersimpan lokal`);
  }

  const artikelMsg = summaryParts.length > 0 ? summaryParts.join(', ') : 'artikel sinkron';

  return {
    status: 'ok',
    message: [
      errors.length ? `sebagian (${errors.join('; ')})` : `ok (${artikelMsg})`,
      profilMsg,
      statistikMsg,
    ]
      .filter(Boolean)
      .join(' | '),
    newCount,
    updatedCount,
    durationMs: Date.now() - start,
    source,
  };
}

export async function syncAllDesa(): Promise<Array<{ desa: Desa; result: SyncResult }>> {
  const rows = db.prepare('SELECT * FROM desa WHERE is_active = 1').all() as Desa[];
  const logStmt = db.prepare(`
    INSERT INTO sync_log (desa_id, source, status, message, new_count, updated_count, duration_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const updateDesa = db.prepare(`
    UPDATE desa SET last_sync_at = datetime('now'), last_sync_status = ?, last_sync_message = ? WHERE id = ?
  `);

  const out: Array<{ desa: Desa; result: SyncResult }> = [];
  // Beri jeda antar desa agar tidak membebani server desa
  for (const desa of rows) {
    const result = await syncDesa(desa);
    logStmt.run(desa.id, result.source, result.status, result.message, result.newCount, result.updatedCount, result.durationMs);
    updateDesa.run(result.status, result.message, desa.id);
    out.push({ desa, result });
    await new Promise((r) => setTimeout(r, 1500));
  }
  return out;
}

/* ====================== FAST PRE-FLIGHT CONNECTIVITY PROBE ====================== */

export type DesaProbeStatus = 'online' | 'blocked_waf' | 'offline';

export type DesaProbeResult = {
  id: number;
  nama: string;
  slug: string;
  website: string;
  feed_url: string | null;
  status: DesaProbeStatus;
  message: string;
  latencyMs: number;
};

export async function probeDesaConnectivity(desa: Desa): Promise<DesaProbeResult> {
  const start = Date.now();
  const targetUrl = desa.feed_url || desa.website;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000); // Max 4 detik timeout

  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': UAS[0],
        Accept: 'text/html,application/rss+xml,application/xml;q=0.9,*/*;q=0.8',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    const latencyMs = Date.now() - start;

    if (res.status === 403) {
      const text = await res.text().catch(() => '');
      const isCf =
        text.includes('Just a moment') ||
        text.includes('challenge-platform') ||
        text.includes('Cloudflare') ||
        text.includes('Attention Required');
      return {
        id: desa.id,
        nama: desa.nama,
        slug: desa.slug,
        website: desa.website,
        feed_url: desa.feed_url,
        status: 'blocked_waf',
        message: isCf ? 'Cloudflare WAF Challenge (403)' : 'Akses Ditolak (403)',
        latencyMs,
      };
    }

    if (res.ok) {
      return {
        id: desa.id,
        nama: desa.nama,
        slug: desa.slug,
        website: desa.website,
        feed_url: desa.feed_url,
        status: 'online',
        message: 'Online & Siap Sync',
        latencyMs,
      };
    }

    return {
      id: desa.id,
      nama: desa.nama,
      slug: desa.slug,
      website: desa.website,
      feed_url: desa.feed_url,
      status: 'offline',
      message: `HTTP ${res.status} ${res.statusText}`,
      latencyMs,
    };
  } catch (err: unknown) {
    clearTimeout(timer);
    const latencyMs = Date.now() - start;
    const isTimeout = (err as Error).name === 'AbortError';
    return {
      id: desa.id,
      nama: desa.nama,
      slug: desa.slug,
      website: desa.website,
      feed_url: desa.feed_url,
      status: 'offline',
      message: isTimeout ? 'Timeout (>4s)' : ((err as Error).message || 'Gagal terhubung'),
      latencyMs,
    };
  }
}

export async function probeAllDesa(): Promise<DesaProbeResult[]> {
  const rows = db.prepare('SELECT * FROM desa WHERE is_active = 1').all() as Desa[];
  // Jalankan SEMUA desa secara PARALEL untuk kecepatan instan (3-4 detik total)
  return Promise.all(rows.map((d) => probeDesaConnectivity(d)));
}

