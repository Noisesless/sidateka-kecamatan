import { FaqAccordion, type FaqItem } from "@/components/faq-accordion";

export const metadata = {
  title: "FAQ — Kecamatan Banjarmangu",
  description:
    "Pertanyaan yang sering diajukan tentang website Kecamatan Banjarmangu, data desa, dan informasi umum.",
};

const WEBSITE_FAQ: FaqItem[] = [
  {
    question: "Apa itu Portal Kecamatan Banjarmangu?",
    answer:
      "Portal Kecamatan Banjarmangu adalah website resmi yang dikelola oleh Pemerintah Kecamatan Banjarmangu, Kabupaten Banjarnegara. Portal ini menyediakan informasi publik, berita, statistik, profil desa, dan layanan unduhan dokumen untuk masyarakat.",
  },
  {
    question: "Bagaimana cara menghubungi kantor kecamatan?",
    answer:
      "Informasi kontak (alamat, telepon, email) tersedia di halaman Profil Kecamatan. Anda juga dapat datang langsung ke kantor kecamatan pada jam kerja (Senin–Jumat).",
  },
  {
    question: "Menu apa saja yang tersedia di website ini?",
    answer:
      "Tersedia beberapa menu utama: Beranda, Berita (artikel dari desa), Desa (profil 17 desa), Profil Kecamatan (sejarah, letak geografis, struktur, visi-misi, tupoksi), Statistik Penduduk, PPID, Pelayanan Publik, Unduhan, dan FAQ.",
  },
  {
    question: "Apakah data di website ini bisa diunduh?",
    answer:
      "Ya. Halaman Unduhan menyediakan dokumen Prosedur, Regulasi, dan Formulir dalam format PDF/DOCX yang dapat diunduh langsung. Dokumen dikelola oleh admin kecamatan.",
  },
  {
    question: "Bagaimana jika data atau informasi tidak sesuai dengan kenyataan?",
    answer:
      "Silakan sampaikan koreksi melalui halaman Kontak atau langsung ke kantor kecamatan. Data akan diverifikasi dan diperbarui melalui dasbor admin.",
  },
];

const DESA_FAQ: FaqItem[] = [
  {
    question: "Berapa jumlah desa di Kecamatan Banjarmangu?",
    answer:
      "Kecamatan Banjarmangu memiliki 17 desa. Daftar lengkap desa dapat dilihat di menu Desa di navigasi atas.",
  },
  {
    question: "Bagaimana cara melihat data statistik penduduk per desa?",
    answer:
      "Buka menu Statistik Penduduk. Data ditampilkan dalam bentuk tabel dan grafik per desa, berisi jumlah penduduk, laki-laki, perempuan, dan jumlah Kepala Keluarga. Data diperbarui secara berkala dari sumber resmi.",
  },
  {
    question: "Bagaimana jika suatu desa belum memiliki artikel di portal?",
    answer:
      "Seluruh 17 desa di Kecamatan Banjarmangu telah terhubung ke portal Sidateka. Apabila ada desa yang belum mempublikasikan artikel terbaru, sistem tetap menyediakan tautan langsung ke website resmi desa terkait.",
  },
  {
    question: "Dari mana data statistik penduduk berasal?",
    answer:
      "Data statistik penduduk Kecamatan Banjarmangu bersumber dari website resmi tiap desa dan dokumen statistik kecamatan. Data ini dikelola oleh Bagian Pemerintahan Kecamatan.",
  },
  {
    question: "Bagaimana cara membaca artikel dari suatu desa?",
    answer:
      "Klik kartu desa di menu Desa, lalu pilih tab 'Artikel' pada halaman desa. Anda akan melihat daftar artikel terbaru dari desa tersebut. Klik judul artikel untuk membaca selengkapnya.",
  },
  {
    question: "Apakah semua website desa sudah terkoneksi?",
    answer:
      "Ya, seluruh 17 website resmi desa di Kecamatan Banjarmangu telah terintegrasi di portal Sidateka untuk memudahkan warga mengakses informasi secara terpusat.",
  },
];

function FaqSection({ title, description, icon, items }: { title: string; description: string; icon: React.ReactNode; items: FaqItem[] }) {
  return (
    <section className="mb-12">
      <div className="mb-6 flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold leading-tight">{title}</h2>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-1">{description}</p>
        </div>
      </div>
      <FaqAccordion items={items} />
    </section>
  );
}

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Header */}
      <header className="mb-12">
        <div className="text-[11px] uppercase tracking-widest text-[var(--color-primary)] font-bold mb-1">
          · FAQ
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold leading-tight mb-3">
          Pertanyaan yang Sering Diajukan
        </h1>
        <p className="text-lg text-[var(--color-muted-foreground)] max-w-2xl">
          Temukan jawaban atas pertanyaan umum tentang website ini dan data desa di
          Kecamatan Banjarmangu.
        </p>
      </header>

      <FaqSection
        title="Tentang Website"
        description="Informasi umum tentang Portal Kecamatan Banjarmangu dan fitur-fiturnya."
        icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        }
        items={WEBSITE_FAQ}
      />

      <FaqSection
        title="Data Desa"
        description="Pertanyaan seputar 17 desa di Kecamatan Banjarmangu, statistik, dan artikel."
        icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        }
        items={DESA_FAQ}
      />

      {/* Contact CTA */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-primary)]/5 p-6 sm:p-8 text-center">
        <h2 className="font-serif text-xl sm:text-2xl font-bold mb-2">
          Tidak menemukan jawabannya?
        </h2>
        <p className="text-sm text-[var(--color-muted-foreground)] mb-4 max-w-lg mx-auto">
          Sampaikan pertanyaan atau koreksi data Anda langsung ke kantor Kecamatan
          Banjarmangu pada jam kerja.
        </p>
        <a
          href="/profil"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-foreground)] text-white text-sm font-semibold transition-colors"
        >
          Lihat Kontak Kecamatan
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </a>
      </section>
    </div>
  );
}
