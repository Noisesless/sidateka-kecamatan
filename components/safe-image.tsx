"use client";

import { useState } from "react";

interface SafeImageProps {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  fillContainer?: boolean;
}

const FALLBACK_SRC = "/placeholder-artikel.jpg";

export function SafeImage({
  src,
  alt = "Foto Kegiatan Desa",
  className = "w-full h-full object-cover",
}: SafeImageProps) {
  const [imgSrc, setImgSrc] = useState<string>(src || FALLBACK_SRC);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError && imgSrc !== FALLBACK_SRC) {
      setHasError(true);
      setImgSrc(FALLBACK_SRC);
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
