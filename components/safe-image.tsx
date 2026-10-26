"use client";

import { useState } from "react";

interface SafeImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fillContainer?: boolean;
}

export function SafeImage({
  src,
  alt,
  className = "w-full h-full object-cover",
  fillContainer = true,
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`${
          fillContainer ? "absolute inset-0" : "w-full h-full min-h-[140px]"
        } flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-slate-150 to-slate-200 text-slate-400 p-4 select-none`}
        aria-label={alt}
      >
        <svg
          className="w-10 h-10 opacity-50 mb-1"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2Z" />
          <path d="M18 10h-6" />
          <path d="M18 14h-6" />
          <path d="M18 18h-6" />
          <path d="M6 10h2v2H6z" />
          <path d="M6 14h2v2H6z" />
        </svg>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 text-center line-clamp-1 max-w-[90%]">
          Berita Desa
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
