const MALE_NAMES = new Set([
  'teguh', 'wahyu', 'wahyudi', 'wahyudiana', 'maulana', 'giana', 'nyana', 'hudi',
  'eko', 'prayitno', 'sugeng', 'pranyoto', 'slamet', 'rahardjo', 'didin', 'sarno',
  'ahlul', 'akhmad', 'prasojo', 'burhanudin', 'kuswaji', 'mistar', 'puthut', 'rasmono',
  'suranto', 'waris', 'yatin', 'yayan', 'adhi', 'setiawan', 'aliful', 'ikhsan',
  'andi', 'bambang', 'mohamad', 'barokah', 'nuki', 'nufian', 'syarief', 'amin',
  'bispanto', 'pondeh', 'sakherun', 'sigit', 'wagito', 'supriyanto', 'suyono',
  'ramel', 'subagyo', 'subandi', 'joko', 'agus', 'budi', 'dwi', 'tri'
]);

const FEMALE_RX = /\b(siti|sri|dewi|putri|ariasih|fitna|tatun|depi|khasriyatun|rindiyati|rochjati|wati|yanti|astuti|lestari|ningsih|rahayu|eni|ani|ida|tri|purwanti|supriyanti|suhartini|sulastri|kartini|fatimah|maryam|zulfa|ayu|retno|dian|maya|lia|nia|rina|rini|tutik|herlina|susi|mega|ika|novi|fitri|isna|anisa|annisa|sarah|aisyah|ulfah|latifah|hidayati|marlina|widya|desi|mutia|mutmainah|sukarti|sunarti|suprapti|surati|tuminah|waginah|warsih|yuli|yuliana|murtinah|nurfaizah|laspriati)\b/i;

/**
 * Tentukan foto avatar fallback untuk perangkat desa:
 * - /wuser.png untuk perempuan/wanita
 * - /kuser.png untuk laki-laki
 */
export function getPerangkatFallbackAvatar(
  nama: string,
  jabatan?: string | null,
  fotoUrl?: string | null
): '/wuser.png' | '/kuser.png' {
  if (fotoUrl) {
    if (/wuser/i.test(fotoUrl)) return '/wuser.png';
    if (/kuser/i.test(fotoUrl)) return '/kuser.png';
  }

  const full = `${nama} ${jabatan || ''}`.toLowerCase();
  if (/\b(pkk|wanita|posyandu|bidan)\b/i.test(full)) return '/wuser.png';

  const tokens = nama.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean);

  // Jika ada token nama yang jelas laki-laki, prioritaskan kuser
  const hasMaleToken = tokens.some((t) => MALE_NAMES.has(t));
  if (hasMaleToken) return '/kuser.png';

  // Deteksi nama perempuan
  if (FEMALE_RX.test(full)) return '/wuser.png';

  // Deteksi sufiks nama perempuan Jawa
  if (/(wati|yanti|astuti|ningsih|atun|ati|tini|rini|nah)$/i.test(tokens[0] || '')) {
    return '/wuser.png';
  }

  // Default laki-laki
  return '/kuser.png';
}

