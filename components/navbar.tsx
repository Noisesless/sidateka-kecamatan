"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_LINKS } from "@/lib/navigation";

interface NavbarProps {
  desa: Array<{ id: number; slug: string; nama: string }>;
}

/**
 * Desktop nav items (hover-driven via CSS group-hover).
 * Mobile is handled separately with state.
 */
function DesktopNavItems({ items }: { items: typeof NAV_LINKS }) {
  return (
    <>
      {items.map((item) => {
        const hasChildren = item.children && item.children.length > 0;
        return (
          <li
            key={item.href + item.label}
            className="relative group list-none"
            style={{ listStyle: "none" }}
          >
            {hasChildren ? (
              <>
                <button
                  className="px-3 py-2 text-sm font-medium text-[var(--color-foreground)]/80 hover:text-[var(--color-primary)] rounded-md hover:bg-[var(--color-muted)] transition-colors cursor-pointer flex items-center gap-1 text-sm no-underline"
                  style={{ listStyle: "none", textDecoration: "none" }}
                >
                  {item.label}
                  <svg
                    className="w-3 h-3 -mr-0.5 transition-transform group-hover:rotate-180"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <ul className="hidden group-hover:block absolute top-full left-0 min-w-[200px] z-50 bg-white border border-[var(--color-border)] rounded-lg shadow-xl overflow-hidden">
                  <div className="absolute -top-3 left-0 right-0 h-4" />
                  <DesktopNavItems items={item.children!} />
                </ul>
              </>
            ) : (
              <Link
                href={item.href}
                target={item.target}
                className="px-3 py-2 text-sm font-medium text-[var(--color-foreground)]/80 hover:text-[var(--color-primary)] rounded-md hover:bg-[var(--color-muted)] transition-colors cursor-pointer block no-underline"
                style={{ listStyle: "none", textDecoration: "none" }}
              >
                {item.label}
              </Link>
            )}
          </li>
        );
      })}
    </>
  );
}

/**
 * Mobile nav items: state-driven open/close, auto-close on link click or route change.
 */
function MobileNavItems({
  items,
  depth = 0,
  closeAll,
}: {
  items: typeof NAV_LINKS;
  depth?: number;
  closeAll: () => void;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <ul
      className={`${depth > 0 ? "pl-3 border-l border-[var(--color-border)] ml-3" : ""} space-y-1`}
      style={{ listStyle: "none" }}
    >
      {items.map((item, idx) => {
        const hasChildren = item.children && item.children.length > 0;
        const isOpen = openIdx === idx;
        return (
          <li key={item.href + item.label} className="list-none" style={{ listStyle: "none" }}>
            {hasChildren ? (
              <>
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-[var(--color-foreground)]/80 hover:bg-[var(--color-muted)] rounded-md transition-colors"
                >
                  <span>{item.label}</span>
                  <svg
                    className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="mt-1">
                    <MobileNavItems
                      items={item.children!}
                      depth={depth + 1}
                      closeAll={closeAll}
                    />
                  </div>
                )}
              </>
            ) : (
              <Link
                href={item.href}
                target={item.target}
                onClick={closeAll}
                className="block px-3 py-2 text-sm font-medium text-[var(--color-foreground)]/80 hover:bg-[var(--color-muted)] rounded-md transition-colors"
              >
                {item.label}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function Navbar({ desa }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Tutup menu setiap kali pindah halaman
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Tutup saat resize ke desktop (breakpoint xl 1280px agar optimal di laptop 1366px)
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1280) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Lock body scroll saat menu terbuka
  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3 sm:gap-4">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group cursor-pointer min-w-0">
            <img
              src="/logo.png"
              alt="Logo Kecamatan"
              className="h-9 w-9 rounded-lg shadow-sm group-hover:scale-105 transition-transform object-contain shrink-0"
            />
            <div className="block leading-tight min-w-0">
              <div className="font-serif text-sm sm:text-base font-semibold text-[var(--color-foreground)] truncate">
                SIDATEKA BANJARMANGU
              </div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--color-muted-foreground)] truncate max-w-[190px] xs:max-w-[240px] sm:max-w-none">
                Sistim Informasi Desa Terintegrasi Kecamatan
              </div>
            </div>
          </Link>

          {/* Desktop nav (Optimal di laptop 1366px: 8 menu + Analitik) */}
          <nav
            className="hidden xl:flex items-center gap-1 shrink-0"
            style={{ listStyle: "none" }}
          >
            <DesktopNavItems items={NAV_LINKS} />
            <Link
              href="/analitik"
              className="ml-2 inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-[var(--color-primary-foreground)] bg-[var(--color-primary)] hover:bg-[var(--color-foreground)] rounded-md transition-colors cursor-pointer shrink-0"
            >
              Analitik
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 3v16a2 2 0 0 0 2 2h16" />
                <path d="M7 14l4-4 3 3 5-6" />
              </svg>
            </Link>
          </nav>

          {/* Mobile & Tablet hamburger (< 1280px) */}
          <div className="xl:hidden flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="p-2 rounded-md hover:bg-[var(--color-muted)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="18" x2="20" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu (slide-down panel) */}
        <div
          className={`xl:hidden overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${
            mobileOpen ? "max-h-[80vh] opacity-100 overflow-y-auto" : "max-h-0 opacity-0"
          }`}
        >
          <div
            className="border-t border-[var(--color-border)] py-4 space-y-1"
            style={{ listStyle: "none" }}
          >
            <MobileNavItems items={NAV_LINKS} closeAll={closeMobile} />

            <div className="my-2 h-px bg-[var(--color-border)]" />
            <div className="px-3 pb-1 pt-1 text-[10px] uppercase tracking-widest text-[var(--color-muted-foreground)]">
              Desa
            </div>
            <ul style={{ listStyle: "none" }} className="space-y-1">
              {desa.map((d) => (
                <li key={d.id} className="list-none" style={{ listStyle: "none" }}>
                  <Link
                    href={`/desa/${d.slug}`}
                    onClick={closeMobile}
                    className="block px-3 py-1.5 text-sm text-[var(--color-foreground)]/80 hover:bg-[var(--color-muted)] rounded-md"
                  >
                    {d.nama}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="my-2 h-px bg-[var(--color-border)]" />
            <Link
              href="/analitik"
              onClick={closeMobile}
              className="block px-3 py-2 text-sm font-semibold text-white bg-[var(--color-primary)] rounded-md text-center"
            >
              Analitik Desa
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
