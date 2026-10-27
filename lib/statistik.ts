import { db, getStatistikSnapshot, saveStatistikSnapshot } from './db';
import { DESA_BANJARMANGU } from './seed';

/**
 * API OpenDK Kecamatan Banjarmangu
 * Base URL: https://kecamatan-banjarmangu.smartdesa.net
 * API Prefix: /api/frontend/v1/
 */
const OPENDK_BASE = 'https://kecamatan-banjarmangu.smartdesa.net';
const OPENDK_API = `${OPENDK_BASE}/api/frontend/v1`;

/**
 * API OpenSID per-desa (internal_api)
 * Pattern: {desa_website}/internal_api/statistik/{id}
 * Format: Fractal JSON {data: [{type, id, attributes: {nama, jumlah, laki, perempuan, persen}}]}
 */

// Kategori statistik OpenSID (ID numerik)
export const STATISTIK_CATEGORIES = {
  PENDIDIKAN_KK: 0,
  PEKERJAAN: 1,
  STATUS_KAWIN: 2,
  AGAMA: 3,
  JENIS_KELAMIN: 4,
  WARGA_NEGARA: 5,
  STATUS_PENDUDUK: 6,
  GOL_DARAH: 7,
  CACAT: 9,
  PENYAKIT: 10,
  UMUR_RENTANG: 13,
  PENDIDIKAN_SEDANG: 14,
  UMUR_KATEGORI: 15,
} as const;

// Warna untuk chart donat/bar
const CHART_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e11d48', '#a855f7', '#0ea5e9', '#facc15',
  '#64748b',
];

// ─── Multi-Tier Cache Engine (L1 RAM + L2 SQLite Snapshot + SWR) ───

const MEM_CACHE = new Map<string, { data: any; expiresAt: number }>();
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 Jam TTL

export async function getOrFetchCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<T> {
  // 1. Cek L1 In-Memory Cache (RAM) — sub-millisecond (< 0.1ms)
  const mem = MEM_CACHE.get(key);
  if (mem && Date.now() < mem.expiresAt) {
    return mem.data as T;
  }

  // 2. Cek L2 SQLite Snapshot — ~1ms
  const snap = getStatistikSnapshot<T>(key);
  if (snap) {
    MEM_CACHE.set(key, { data: snap.data, expiresAt: Date.now() + ttlMs });

    // Background refresh jika snapshot sudah lebih tua dari TTL (Stale-While-Revalidate)
    const snapAge = Date.now() - new Date(snap.updated_at).getTime();
    if (snapAge > ttlMs) {
      fetcher()
        .then((fresh) => {
          if (fresh) {
            saveStatistikSnapshot(key, fresh);
            MEM_CACHE.set(key, { data: fresh, expiresAt: Date.now() + ttlMs });
          }
        })
        .catch(() => {});
    }
    return snap.data;
  }

  // 3. Cold Start: Jalankan fetcher jika belum ada data sama sekali
  const fresh = await fetcher();
  if (fresh) {
    saveStatistikSnapshot(key, fresh);
    MEM_CACHE.set(key, { data: fresh, expiresAt: Date.now() + ttlMs });
  }
  return fresh;
}

export function clearStatistikCache(): void {
  MEM_CACHE.clear();
  try {
    db.prepare('DELETE FROM statistik_snapshot').run();
  } catch {}
}

// ─── Types ───

export type DashboardData = {
  total_penduduk: number;
  total_lakilaki: number;
  total_perempuan: number;
  total_disabilitas: number;
  ktp_wajib: number;
  ktp_terpenuhi: number;
  ktp_persen_terpenuhi: string;
  akta_terpenuhi: number;
  akta_persen_terpenuhi: string;
  aktanikah_wajib: number;
  aktanikah_terpenuhi: number;
  aktanikah_persen_terpenuhi: string;
};

export type ChartPenduduk = {
  year: number;
  value_lk: number;
  value_pr: number;
};

export type ChartUsia = {
  umur: string;
  value: number;
  color: string;
};

export type ChartPendidikan = {
  year: string;
  SD: number;
  SLTP: number;
  SLTA: number;
  DIPLOMA: number;
  SARJANA: number;
};

export type ChartGolDarah = {
  blod_type: string;
  total: number;
  color: string;
};

export type ChartKawin = {
  status: string;
  total: number;
  color: string;
};

export type ChartAgama = {
  religion: string;
  total: number;
  color: string;
};

export type ChartData = {
  penduduk: ChartPenduduk[];
  'penduduk-usia': ChartUsia[];
  'penduduk-pendidikan': ChartPendidikan[];
  'penduduk-golongan-darah': ChartGolDarah[];
  'penduduk-kawin': ChartKawin[];
  'penduduk-agama': ChartAgama[];
};

export type StatistikResponse = {
  dashboard: DashboardData;
  chart: ChartData;
};

export type DesaOpenDK = {
  id: number;
  nama: string;
  desa_id: string;
  website: string | null;
};

export type YearList = number[];

// ─── OpenSID per-desa types ───

export type OpenSidStatistikItem = {
  type: string;
  id: string;
  attributes: {
    nama: string;
    jumlah: number;
    laki: number;
    perempuan: number;
    persen: string;
    persen1: string;
    persen2: string;
    no?: string;
  };
};

export type OpenSidStatistikResponse = {
  data: OpenSidStatistikItem[];
};

export type DesaStatistikDirect = {
  desa_slug: string;
  desa_nama: string;
  website: string;
  penduduk: number;
  laki_laki: number;
  perempuan: number;
  status: 'ok' | 'empty' | 'error';
};

export type AggregatedStatItem = {
  nama: string;
  jumlah: number;
  laki: number;
  perempuan: number;
  color: string;
};

export type StatistikKecamatanDirect = {
  desa_count: number;
  desa_ok: number;
  total_penduduk: number;
  total_laki_laki: number;
  total_perempuan: number;
  agama: AggregatedStatItem[];
  usia: AggregatedStatItem[];
  gol_darah: AggregatedStatItem[];
  status_kawin: AggregatedStatItem[];
  pendidikan: AggregatedStatItem[];
  pekerjaan: AggregatedStatItem[];
};

// ─── API Functions ───

/** Ambil daftar tahun yang tersedia di API */
export async function getYearList(): Promise<YearList> {
  return getOrFetchCached<YearList>('year_list', async () => {
    try {
      const res = await fetch(`${OPENDK_API}/statistik-penduduk/listYear`, {
        signal: AbortSignal.timeout(2500),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.data?.[0]?.attributes?.[0]?.tahun ?? [new Date().getFullYear()];
    } catch (err) {
      console.error('Gagal ambil list tahun:', err);
      return [new Date().getFullYear()];
    }
  }, 24 * 3600 * 1000);
}

/** Ambil data statistik penduduk dari API OpenDK */
export async function getStatistikFromApi(
  desaId: string = '',
  tahun: number | string = ''
): Promise<StatistikResponse | null> {
  try {
    const params = new URLSearchParams();
    if (desaId) params.set('desa', String(desaId));
    if (tahun) params.set('tahun', String(tahun));

    const url = `${OPENDK_API}/statistik-penduduk${params.toString() ? '?' + params.toString() : ''}`;
    const res = await fetch(url, {
      next: { revalidate: 300 }, // cache 5 menit
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.data && json.data.length > 0) {
      return json.data[0].attributes as StatistikResponse;
    }
    return null;
  } catch (err) {
    console.error('Gagal ambil statistik dari API:', err);
    return null;
  }
}

/** Ambil daftar desa dari API OpenDK */
export async function getDesaListFromApi(): Promise<DesaOpenDK[]> {
  try {
    const res = await fetch(`${OPENDK_API}/website`, {
      next: { revalidate: 3600 }, // cache 1 jam
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const desaAttr = json.data?.find((d: { id: string }) => d.id === 'desa');
    return desaAttr?.attributes?.[0] ?? [];
  } catch (err) {
    console.error('Gagal ambil daftar desa:', err);
    return [];
  }
}

// ─── Fungsi lama (dipertahankan untuk kompatibilitas admin) ───

export type StatistikPendudukDesa = {
  desa_id: number;
  desa_slug: string;
  desa_nama: string;
  tahun: number;
  penduduk: number;
  laki_laki: number;
  perempuan: number;
  disabilitas: number;
  jumlah_kk: number;
  scraped_at: string;
};

/** Sinkronisasi statistik dari API OpenDK ke database lokal */
export async function scrapeAllStatistik(): Promise<{
  success: number;
  failed: number;
  results: Array<{ desa: string; penduduk?: number; laki?: number; perempuan?: number }>;
}> {
  const tahun = new Date().getFullYear();
  const desaList = await getDesaListFromApi();
  const results: Array<{ desa: string; penduduk?: number; laki?: number; perempuan?: number }> = [];
  let success = 0;
  let failed = 0;

  // Ambil data kecamatan level
  const kecData = await getStatistikFromApi('', tahun);
  if (kecData) {
    // Simpan data kecamatan sebagai ringkasan
    const desaRows = db.prepare('SELECT id, slug, nama FROM desa WHERE is_active = 1').all() as Array<{
      id: number; slug: string; nama: string;
    }>;

    for (const desa of desaRows) {
      try {
        // Cari desa OpenDK yang cocok berdasarkan nama
        const desaMatch = desaList.find(
          (d) => d.nama.toLowerCase() === desa.nama.toLowerCase()
        );

        let data: StatistikResponse | null = null;
        if (desaMatch) {
          data = await getStatistikFromApi(String(desaMatch.id), tahun);
        }

        const dash = data?.dashboard;
        const penduduk = dash?.total_penduduk ?? 0;
        const laki = dash?.total_lakilaki ?? 0;
        const per = dash?.total_perempuan ?? 0;
        const disabilitas = dash?.total_disabilitas ?? 0;

        if (penduduk > 0 || laki > 0 || per > 0) {
          db.prepare(`
            INSERT INTO statistik_penduduk (desa_id, desa_slug, desa_nama, tahun, penduduk, laki_laki, perempuan, disabilitas, jumlah_kk, scraped_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(desa_id, tahun) DO UPDATE SET
              penduduk = excluded.penduduk,
              laki_laki = excluded.laki_laki,
              perempuan = excluded.perempuan,
              disabilitas = excluded.disabilitas,
              jumlah_kk = excluded.jumlah_kk,
              scraped_at = datetime('now')
          `).run(desa.id, desa.slug, desa.nama, tahun, penduduk, laki, per, disabilitas, 0);

          results.push({ desa: desa.nama, penduduk, laki, perempuan: per });
          success++;
        } else {
          failed++;
        }
      } catch (err) {
        console.error(`Gagal sync statistik ${desa.nama}:`, err);
        failed++;
      }
    }
  } else {
    failed = 1;
  }

  if (success > 0) {
    clearStatistikCache();
  }

  return { success, failed, results };
}

// ─── Query Functions (untuk halaman statistik) ───

/** Ambil ringkasan statistik kecamatan dari API */
export async function getStatistikKecamatanFromApi(tahun?: number) {
  const year = tahun ?? new Date().getFullYear();
  return getOrFetchCached(`opendk_kecamatan_${year}`, async () => {
    const data = await getStatistikFromApi('', year);

    if (!data) {
      return {
        desa_count: 16,
        total_penduduk: 0,
        total_laki_laki: 0,
        total_perempuan: 0,
        total_disabilitas: 0,
        total_kk: 0,
        ktp_wajib: 0,
        ktp_terpenuhi: 0,
        akta_terpenuhi: 0,
        aktanikah_terpenuhi: 0,
        last_update: null,
        chart: null as ChartData | null,
      };
    }

    const d = data.dashboard;
    return {
      desa_count: 16,
      total_penduduk: d.total_penduduk,
      total_laki_laki: d.total_lakilaki,
      total_perempuan: d.total_perempuan,
      total_disabilitas: d.total_disabilitas,
      total_kk: 0,
      ktp_wajib: d.ktp_wajib,
      ktp_terpenuhi: d.ktp_terpenuhi,
      akta_terpenuhi: d.akta_terpenuhi,
      aktanikah_terpenuhi: d.aktanikah_terpenuhi,
      last_update: new Date().toISOString(),
      chart: data.chart,
    };
  });
}

/** Ambil statistik per desa dari API (loop semua desa) */
export async function getStatistikPerDesaFromApi(tahun?: number) {
  const year = tahun ?? new Date().getFullYear();
  const desaList = await getDesaListFromApi();

  const results: Array<{
    desa_id_api: number;
    desa_nama: string;
    penduduk: number;
    laki_laki: number;
    perempuan: number;
    disabilitas: number;
    website: string | null;
  }> = [];

  for (const desa of desaList) {
    try {
      const data = await getStatistikFromApi(String(desa.id), year);
      const d = data?.dashboard;
      results.push({
        desa_id_api: desa.id,
        desa_nama: desa.nama,
        penduduk: d?.total_penduduk ?? 0,
        laki_laki: d?.total_lakilaki ?? 0,
        perempuan: d?.total_perempuan ?? 0,
        disabilitas: d?.total_disabilitas ?? 0,
        website: desa.website,
      });
    } catch {
      results.push({
        desa_id_api: desa.id,
        desa_nama: desa.nama,
        penduduk: 0,
        laki_laki: 0,
        perempuan: 0,
        disabilitas: 0,
        website: desa.website,
      });
    }
  }

  return results;
}

// ─── Fungsi lama (DB-based, untuk fallback) ───

export function getStatistikKecamatan() {
  const row = db.prepare(`
    SELECT
      COUNT(DISTINCT desa_id) as desa_count,
      SUM(penduduk) as total_penduduk,
      SUM(laki_laki) as total_laki_laki,
      SUM(perempuan) as total_perempuan,
      SUM(disabilitas) as total_disabilitas,
      SUM(jumlah_kk) as total_kk,
      MAX(scraped_at) as last_update
    FROM statistik_penduduk
    WHERE tahun = ${new Date().getFullYear()}
  `).get() as {
    desa_count: number;
    total_penduduk: number | null;
    total_laki_laki: number | null;
    total_perempuan: number | null;
    total_disabilitas: number | null;
    total_kk: number | null;
    last_update: string | null;
  };

  return {
    desa_count: row.desa_count,
    total_penduduk: row.total_penduduk ?? 0,
    total_laki_laki: row.total_laki_laki ?? 0,
    total_perempuan: row.total_perempuan ?? 0,
    total_disabilitas: row.total_disabilitas ?? 0,
    total_kk: row.total_kk ?? 0,
    last_update: row.last_update,
  };
}

export function getStatistikPerDesa() {
  return db.prepare(`
    SELECT
      d.slug as desa_slug,
      d.nama as desa_nama,
      s.penduduk,
      s.laki_laki,
      s.perempuan,
      s.disabilitas,
      s.jumlah_kk,
      s.scraped_at
    FROM statistik_penduduk s
    LEFT JOIN desa d ON s.desa_id = d.id
    WHERE s.tahun = ${new Date().getFullYear()}
    ORDER BY d.nama
  `).all() as Array<{
    desa_slug: string;
    desa_nama: string;
    penduduk: number | null;
    laki_laki: number | null;
    perempuan: number | null;
    disabilitas: number | null;
    jumlah_kk: number | null;
    scraped_at: string | null;
  }>;
}

// ─── Fungsi fetch langsung dari OpenSID per-desa ───

/** Ambil data statistik dari satu desa via internal_api OpenSID */
async function fetchDesaStatistik(
  website: string,
  statistikId: number,
): Promise<OpenSidStatistikItem[]> {
  const url = `${website}/internal_api/statistik/${statistikId}`;
  const res = await fetch(url, {
    next: { revalidate: 300 }, // cache 5 menit
    signal: AbortSignal.timeout(2500),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json: OpenSidStatistikResponse = await res.json();
  return json.data ?? [];
}

/** Filter item statistik — buang baris JUMLAH(666), BELUM MENGISI(777), TOTAL(888) */
function filterDataItems(items: OpenSidStatistikItem[]): OpenSidStatistikItem[] {
  return items.filter(
    (item) => item.id !== '666' && item.id !== '777' && item.id !== '888',
  );
}

/** Ambil total penduduk dari item TOTAL (id=888) atau JUMLAH (id=666) */
function extractTotals(items: OpenSidStatistikItem[]): {
  penduduk: number;
  laki: number;
  perempuan: number;
} {
  const total = items.find((i) => i.id === '888') ?? items.find((i) => i.id === '666');
  if (total) {
    return {
      penduduk: Number(total.attributes.jumlah) || 0,
      laki: Number(total.attributes.laki) || 0,
      perempuan: Number(total.attributes.perempuan) || 0,
    };
  }
  // Fallback: jumlahkan semua item data
  const dataItems = filterDataItems(items);
  return {
    penduduk: dataItems.reduce((s, i) => s + (Number(i.attributes.jumlah) || 0), 0),
    laki: dataItems.reduce((s, i) => s + (Number(i.attributes.laki) || 0), 0),
    perempuan: dataItems.reduce((s, i) => s + (Number(i.attributes.perempuan) || 0), 0),
  };
}

/** Agregasi item statistik dari multiple desa menjadi satu list */
function aggregateItems(
  allItems: OpenSidStatistikItem[][],
): AggregatedStatItem[] {
  const map = new Map<string, AggregatedStatItem>();
  let colorIdx = 0;

  for (const items of allItems) {
    const dataItems = filterDataItems(items);
    for (const item of dataItems) {
      const nama = item.attributes.nama;
      const jml = Number(item.attributes.jumlah) || 0;
      const lk = Number(item.attributes.laki) || 0;
      const pr = Number(item.attributes.perempuan) || 0;
      const existing = map.get(nama);
      if (existing) {
        existing.jumlah += jml;
        existing.laki += lk;
        existing.perempuan += pr;
      } else {
        map.set(nama, {
          nama,
          jumlah: jml,
          laki: lk,
          perempuan: pr,
          color: CHART_COLORS[colorIdx % CHART_COLORS.length],
        });
        colorIdx++;
      }
    }
  }

  return Array.from(map.values()).filter((i) => i.jumlah > 0).sort((a, b) => b.jumlah - a.jumlah);
}

/** Ambil statistik per desa langsung dari OpenSID tiap desa (Raw fetcher) */
async function fetchStatistikPerDesaDirectRaw(): Promise<DesaStatistikDirect[]> {
  const results: DesaStatistikDirect[] = [];

  // Fetch jenis kelamin (id=4) dari semua desa secara paralel
  const fetches = DESA_BANJARMANGU.map(async (desa) => {
    try {
      const items = await fetchDesaStatistik(desa.website, STATISTIK_CATEGORIES.JENIS_KELAMIN);
      if (items.length === 0) {
        return {
          desa_slug: desa.slug,
          desa_nama: desa.nama,
          website: desa.website,
          penduduk: 0,
          laki_laki: 0,
          perempuan: 0,
          status: 'empty' as const,
        };
      }
      const totals = extractTotals(items);
      return {
        desa_slug: desa.slug,
        desa_nama: desa.nama,
        website: desa.website,
        penduduk: totals.penduduk,
        laki_laki: totals.laki,
        perempuan: totals.perempuan,
        status: 'ok' as const,
      };
    } catch {
      // Fallback 1: Cek apakah ada data di tabel lokal statistik_desa
      try {
        const localStat = db
          .prepare(`
            SELECT
              COALESCE(SUM(s.jumlah), 0) AS penduduk,
              COALESCE(SUM(s.laki), 0) AS laki,
              COALESCE(SUM(s.perempuan), 0) AS perempuan
            FROM desa d
            JOIN statistik_desa s ON s.desa_id = d.id AND s.kategori = 'jenis_kelamin'
            WHERE d.slug = ?
          `)
          .get(desa.slug) as { penduduk: number; laki: number; perempuan: number } | undefined;

        if (localStat && localStat.penduduk > 0) {
          return {
            desa_slug: desa.slug,
            desa_nama: desa.nama,
            website: desa.website,
            penduduk: localStat.penduduk,
            laki_laki: localStat.laki,
            perempuan: localStat.perempuan,
            status: 'ok' as const,
          };
        }
      } catch {
        // lanjut ke fallback berikutnya
      }

      // Fallback 2: Cek apakah ada di tabel statistik_penduduk
      try {
        const localPenduduk = db
          .prepare(`
            SELECT penduduk, laki_laki, perempuan
            FROM statistik_penduduk
            WHERE desa_slug = ?
            ORDER BY tahun DESC
            LIMIT 1
          `)
          .get(desa.slug) as { penduduk: number; laki_laki: number; perempuan: number } | undefined;

        if (localPenduduk && (localPenduduk.penduduk ?? 0) > 0) {
          return {
            desa_slug: desa.slug,
            desa_nama: desa.nama,
            website: desa.website,
            penduduk: localPenduduk.penduduk,
            laki_laki: localPenduduk.laki_laki ?? 0,
            perempuan: localPenduduk.perempuan ?? 0,
            status: 'ok' as const,
          };
        }
      } catch {
        // fallback
      }

      return {
        desa_slug: desa.slug,
        desa_nama: desa.nama,
        website: desa.website,
        penduduk: 0,
        laki_laki: 0,
        perempuan: 0,
        status: 'empty' as const,
      };
    }
  });

  const settled = await Promise.all(fetches);
  results.push(...settled);

  // Sort by nama
  results.sort((a, b) => a.desa_nama.localeCompare(b.desa_nama));
  return results;
}

export async function getStatistikPerDesaDirect(): Promise<DesaStatistikDirect[]> {
  return getOrFetchCached<DesaStatistikDirect[]>('per_desa_direct', fetchStatistikPerDesaDirectRaw);
}

/** Ambil statistik kecamatan dengan agregasi dari semua desa (Raw fetcher) */
async function fetchStatistikKecamatanDirectRaw(): Promise<StatistikKecamatanDirect> {
  // Fetch semua kategori dari semua desa secara paralel
  const categories = [
    'AGAMA',
    'UMUR_KATEGORI',
    'GOL_DARAH',
    'STATUS_KAWIN',
    'PENDIDIKAN_KK',
    'PEKERJAAN',
    'JENIS_KELAMIN',
  ] as const;

  const allFetches: Promise<{ cat: string; desa: string; items: OpenSidStatistikItem[] } | null>[] = [];

  for (const cat of categories) {
    const catId = STATISTIK_CATEGORIES[cat];
    for (const desa of DESA_BANJARMANGU) {
      allFetches.push(
        fetchDesaStatistik(desa.website, catId)
          .then((items) => ({ cat, desa: desa.slug, items }))
          .catch(() => null),
      );
    }
  }

  const settled = await Promise.all(allFetches);
  const valid = settled.filter((r): r is { cat: string; desa: string; items: OpenSidStatistikItem[] } => r !== null);

  // Kelompokkan per kategori
  const byCategory = new Map<string, OpenSidStatistikItem[][]>();
  for (const result of valid) {
    if (result.items.length === 0) continue;
    const arr = byCategory.get(result.cat) ?? [];
    arr.push(result.items);
    byCategory.set(result.cat, arr);
  }

  // Agregasi
  const getAgg = (cat: string) => aggregateItems(byCategory.get(cat) ?? []);

  // Hitung total penduduk dari jenis kelamin
  const jkItems = byCategory.get('JENIS_KELAMIN') ?? [];
  let totalPenduduk = 0;
  let totalLaki = 0;
  let totalPerempuan = 0;
  for (const items of jkItems) {
    const t = extractTotals(items);
    totalPenduduk += t.penduduk;
    totalLaki += t.laki;
    totalPerempuan += t.perempuan;
  }

  const desaOk = new Set(valid.map((r) => r.desa)).size;

  return {
    desa_count: DESA_BANJARMANGU.length,
    desa_ok: desaOk,
    total_penduduk: totalPenduduk,
    total_laki_laki: totalLaki,
    total_perempuan: totalPerempuan,
    agama: getAgg('AGAMA'),
    usia: getAgg('UMUR_KATEGORI'),
    gol_darah: getAgg('GOL_DARAH'),
    status_kawin: getAgg('STATUS_KAWIN'),
    pendidikan: getAgg('PENDIDIKAN_KK'),
    pekerjaan: getAgg('PEKERJAAN'),
  };
}

export async function getStatistikKecamatanDirect(): Promise<StatistikKecamatanDirect> {
  return getOrFetchCached<StatistikKecamatanDirect>('kecamatan_direct', fetchStatistikKecamatanDirectRaw);
}

// ─── Types untuk halaman statistik lainnya ───

export type StatistikPendidikanDirect = {
  desa_count: number;
  desa_ok: number;
  pendidikan_kk: AggregatedStatItem[];
  pendidikan_sedang: AggregatedStatItem[];
};

export type StatistikKesehatanDirect = {
  desa_count: number;
  desa_ok: number;
  cacat: AggregatedStatItem[];
  penyakit: AggregatedStatItem[];
  gol_darah: AggregatedStatItem[];
};

export type SuplemenItem = {
  id: string;
  nama: string;
  slug: string;
  sasaran: number;
  keterangan: string;
  nama_sasaran: string;
};

export type SuplemenResponse = {
  data: Array<{
    type: string;
    id: string;
    attributes: SuplemenItem;
  }>;
  meta: {
    pagination: {
      total: number;
      total_pages: number;
    };
  };
};

export type DesaProgramBantuan = {
  desa_slug: string;
  desa_nama: string;
  website: string;
  program: SuplemenItem[];
  status: 'ok' | 'empty' | 'error';
};

export type ProgramBantuanAggregated = {
  nama: string;
  jumlah_desa: number;
  desa_list: string[];
};

export type StatistikProgramBantuanDirect = {
  desa_count: number;
  desa_ok: number;
  total_program: number;
  per_desa: DesaProgramBantuan[];
  aggregated: ProgramBantuanAggregated[];
};

// ─── Fungsi fetch statistik pendidikan ───

async function fetchStatistikPendidikanDirectRaw(): Promise<StatistikPendidikanDirect> {
  const categories = ['PENDIDIKAN_KK', 'PENDIDIKAN_SEDANG'] as const;

  const allFetches: Promise<{ cat: string; desa: string; items: OpenSidStatistikItem[] } | null>[] = [];
  for (const cat of categories) {
    const catId = STATISTIK_CATEGORIES[cat];
    for (const desa of DESA_BANJARMANGU) {
      allFetches.push(
        fetchDesaStatistik(desa.website, catId)
          .then((items) => ({ cat, desa: desa.slug, items }))
          .catch(() => null),
      );
    }
  }

  const settled = await Promise.all(allFetches);
  const valid = settled.filter((r): r is { cat: string; desa: string; items: OpenSidStatistikItem[] } => r !== null);

  const byCategory = new Map<string, OpenSidStatistikItem[][]>();
  for (const result of valid) {
    if (result.items.length === 0) continue;
    const arr = byCategory.get(result.cat) ?? [];
    arr.push(result.items);
    byCategory.set(result.cat, arr);
  }

  const getAgg = (cat: string) => aggregateItems(byCategory.get(cat) ?? []);
  const desaOk = new Set(valid.map((r) => r.desa)).size;

  return {
    desa_count: DESA_BANJARMANGU.length,
    desa_ok: desaOk,
    pendidikan_kk: getAgg('PENDIDIKAN_KK'),
    pendidikan_sedang: getAgg('PENDIDIKAN_SEDANG'),
  };
}

export async function getStatistikPendidikanDirect(): Promise<StatistikPendidikanDirect> {
  return getOrFetchCached<StatistikPendidikanDirect>('pendidikan_direct', fetchStatistikPendidikanDirectRaw);
}

// ─── Fungsi fetch statistik kesehatan ───

async function fetchStatistikKesehatanDirectRaw(): Promise<StatistikKesehatanDirect> {
  const categories = ['CACAT', 'PENYAKIT', 'GOL_DARAH'] as const;

  const allFetches: Promise<{ cat: string; desa: string; items: OpenSidStatistikItem[] } | null>[] = [];
  for (const cat of categories) {
    const catId = STATISTIK_CATEGORIES[cat];
    for (const desa of DESA_BANJARMANGU) {
      allFetches.push(
        fetchDesaStatistik(desa.website, catId)
          .then((items) => ({ cat, desa: desa.slug, items }))
          .catch(() => null),
      );
    }
  }

  const settled = await Promise.all(allFetches);
  const valid = settled.filter((r): r is { cat: string; desa: string; items: OpenSidStatistikItem[] } => r !== null);

  const byCategory = new Map<string, OpenSidStatistikItem[][]>();
  for (const result of valid) {
    if (result.items.length === 0) continue;
    const arr = byCategory.get(result.cat) ?? [];
    arr.push(result.items);
    byCategory.set(result.cat, arr);
  }

  const getAgg = (cat: string) => {
    // Buang baris "bukan kondisi": TIDAK CACAT / TIDAK DISABILITAS (cacat),
    // TIDAK ADA/TIDAK SAKIT (penyakit), TIDAK TAHU (gol. darah) — baris-baris
    // ini berisi warga SEHAT dan menggelembungkan total.
    const rows = (byCategory.get(cat) ?? []).map((items) =>
      items.filter((i) => !/^TIDAK/i.test((i.attributes.nama ?? '').trim())),
    );
    return aggregateItems(rows);
  };
  const desaOk = new Set(valid.map((r) => r.desa)).size;

  return {
    desa_count: DESA_BANJARMANGU.length,
    desa_ok: desaOk,
    cacat: getAgg('CACAT'),
    penyakit: getAgg('PENYAKIT'),
    gol_darah: getAgg('GOL_DARAH'),
  };
}

export async function getStatistikKesehatanDirect(): Promise<StatistikKesehatanDirect> {
  return getOrFetchCached<StatistikKesehatanDirect>('kesehatan_direct', fetchStatistikKesehatanDirectRaw);
}

// ─── Fungsi fetch program & bantuan (suplemen) ───

async function fetchDesaSuplemen(website: string): Promise<SuplemenItem[]> {
  const allItems: SuplemenItem[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = `${website}/internal_api/suplemen?page[number]=${page}&page[size]=100`;
    const res = await fetch(url, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: SuplemenResponse = await res.json();
    for (const item of json.data ?? []) {
      allItems.push(item.attributes);
    }
    totalPages = json.meta?.pagination?.total_pages ?? 1;
    page++;
  }

  return allItems;
}

async function fetchProgramBantuanDirectRaw(): Promise<StatistikProgramBantuanDirect> {
  const fetches = DESA_BANJARMANGU.map(async (desa) => {
    try {
      const programs = await fetchDesaSuplemen(desa.website);
      if (programs.length === 0) {
        return {
          desa_slug: desa.slug,
          desa_nama: desa.nama,
          website: desa.website,
          program: [],
          status: 'empty' as const,
        };
      }
      return {
        desa_slug: desa.slug,
        desa_nama: desa.nama,
        website: desa.website,
        program: programs,
        status: 'ok' as const,
      };
    } catch {
      return {
        desa_slug: desa.slug,
        desa_nama: desa.nama,
        website: desa.website,
        program: [],
        status: 'error' as const,
      };
    }
  });

  const settled = await Promise.all(fetches);
  settled.sort((a, b) => a.desa_nama.localeCompare(b.desa_nama));

  // Agregasi: hitung berapa desa yang punya program tertentu
  const programMap = new Map<string, ProgramBantuanAggregated>();
  for (const desa of settled) {
    for (const prog of desa.program) {
      const existing = programMap.get(prog.nama);
      if (existing) {
        existing.jumlah_desa++;
        existing.desa_list.push(desa.desa_nama);
      } else {
        programMap.set(prog.nama, {
          nama: prog.nama,
          jumlah_desa: 1,
          desa_list: [desa.desa_nama],
        });
      }
    }
  }

  const aggregated = Array.from(programMap.values()).sort((a, b) => b.jumlah_desa - a.jumlah_desa);
  const desaOk = settled.filter((d) => d.status === 'ok').length;
  const totalProgram = programMap.size;

  return {
    desa_count: DESA_BANJARMANGU.length,
    desa_ok: desaOk,
    total_program: totalProgram,
    per_desa: settled,
    aggregated,
  };
}

export async function getProgramBantuanDirect(): Promise<StatistikProgramBantuanDirect> {
  return getOrFetchCached<StatistikProgramBantuanDirect>('program_bantuan_direct', fetchProgramBantuanDirectRaw);
}
