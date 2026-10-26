"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type HeroSlide = {
  id: string | number;
  title: string;
  subtitle?: string;
  image?: string;
  href?: string;
  cta?: string;
  desaName?: string;
};

/**
 * Hero slider ala OpenDK: full-width, autoplay 4.5s dengan pause on hover, navigasi prev/next, pagination dots.
 * Dikonversi ke React + Tailwind tanpa dependency Swiper.
 */
export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [active, setActive] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const id = setInterval(() => {
      setActive((i) => (i + 1) % slides.length);
    }, 4500);
    return () => clearInterval(id);
  }, [slides.length, isPaused]);

  if (slides.length === 0) {
    return (
      <div className="relative h-[280px] sm:h-[360px] lg:h-[420px] bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-foreground)]" />
    );
  }

  const go = (i: number) => setActive((i + slides.length) % slides.length);

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative h-[280px] sm:h-[360px] lg:h-[420px] overflow-hidden bg-[var(--color-foreground)] group"
    >
      {slides.map((s, i) => (
        <div
          key={s.id}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            i === active ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
        {s.image ? (
            <img
              src={s.image}
              alt={s.title}
              onError={(e) => {
                e.currentTarget.src = "/placeholder-artikel.jpg";
              }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-foreground)] to-[var(--color-secondary)]" />
          )}
          {/* dark overlay for text readability */}
          <div className="absolute inset-0 bg-black/55" />

          <div className="relative z-10 h-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col">
            {/* Label kecamatan / desa selalu terlihat di bagian atas */}
            <div className="pt-6 sm:pt-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-[11px] font-bold uppercase tracking-widest text-white !text-white">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] animate-pulse-soft" />
                {s.desaName ? `Desa ${s.desaName} · Kec. Banjarmangu` : "Kecamatan Banjarmangu"}
              </div>
            </div>

            {/* Judul artikel dengan ellipsis untuk teks panjang */}
            <div className="flex-1 flex items-center mb-4 sm:mb-6">
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-white !text-white line-clamp-3 max-w-3xl drop-shadow-sm">
                {s.title}
              </h1>
            </div>

            {/* Subtitle dan CTA dengan jarak dari batas bawah */}
            <div className="animate-fade-up pb-5 sm:pb-7">
              {s.subtitle && (
                <p className="mt-2 text-sm sm:text-base text-white/90 line-clamp-2 max-w-2xl drop-shadow-sm">
                  {s.subtitle}
                </p>
              )}
              {s.href && s.cta && (
                <Link
                  href={s.href}
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[var(--color-accent)] hover:bg-white hover:text-[var(--color-primary)] text-white font-semibold text-sm transition-colors shadow-md"
                >
                  {s.cta}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* prev/next */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Slide sebelumnya"
            onClick={() => go(active - 1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-sm text-white grid place-items-center transition-colors opacity-0 group-hover:opacity-100"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Slide berikutnya"
            onClick={() => go(active + 1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-sm text-white grid place-items-center transition-colors opacity-0 group-hover:opacity-100"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </>
      )}

      {/* pagination dots with pill backdrop */}
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-md max-w-[90%] overflow-x-auto">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => setActive(i)}
              className={`h-1.5 rounded-full transition-all flex-shrink-0 ${
                i === active ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
