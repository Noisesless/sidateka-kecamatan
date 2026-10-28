"use client";

import { useState } from "react";

interface SafeImageProps {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  fillContainer?: boolean;
  fallbackSrc?: string;
}

const DEFAULT_FALLBACK = "/placeholder-artikel.jpg";

export function SafeImage({
  src,
  alt = "Foto Kegiatan Desa",
  className = "w-full h-full object-cover",
  fallbackSrc = DEFAULT_FALLBACK,
}: SafeImageProps) {
  const effectiveFallback = fallbackSrc || DEFAULT_FALLBACK;
  const [imgSrc, setImgSrc] = useState<string>(src || effectiveFallback);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError && imgSrc !== effectiveFallback) {
      setHasError(true);
      setImgSrc(effectiveFallback);
    }
  };

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imgSrc}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={handleError}
      className={className}
    />
  );
}

export default SafeImage;
