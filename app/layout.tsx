import type { Metadata, Viewport } from "next";
import { Roboto, Newsreader, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { VisitorTracker } from "@/components/visitor-tracker";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { PwaRegister } from "@/components/pwa-register";
import { PwaInstallBanner } from "@/components/pwa-install-banner";
import { ensureInitialized } from "@/lib/init";
import { getAllDesa } from "@/lib/queries";

const roboto = Roboto({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://sidateka.banjarmangu.banjarnegarakab.go.id";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "SIDATEKA BANJARMANGU",
    template: "%s · SIDATEKA BANJARMANGU",
  },
  description:
    "SIDATEKA (Sistim Informasi Desa Terintegrasi Kecamatan) BANJARMANGU — portal agregator berita dan informasi 17 desa di Kecamatan Banjarmangu, Kabupaten Banjarnegara, Jawa Tengah.",
  keywords: [
    "SIDATEKA",
    "Sistim Informasi Desa Terintegrasi Kecamatan",
    "Kecamatan Banjarmangu",
    "Banjarnegara",
    "Portal Desa",
    "OpenSID",
    "OpenDK",
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SIDATEKA",
  },
};

export const viewport: Viewport = {
  themeColor: "#1E40AF",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Init DB + seed once on first render
ensureInitialized();

export default function RootLayout({ children }: LayoutProps<"/">) {
  const desa = getAllDesa(true);
  return (
    <html
      lang="id"
      className={`${roboto.variable} ${newsreader.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[var(--color-background)] text-[var(--color-foreground)]">
        <Navbar desa={desa} />
        <main className="flex-1 w-full">{children}</main>
        <Footer />
        <VisitorTracker />
        <MobileBottomNav />
        <PwaInstallBanner />
        <PwaRegister />
      </body>
    </html>
  );
}
