import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";

export const dynamic = "force-dynamic";

const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(process.cwd(), ".data", "uploads");

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

const FALLBACK_JPEG_PATH = path.join(process.cwd(), "public", "placeholder-artikel.jpg");

function returnFallbackResponse() {
  if (fs.existsSync(FALLBACK_JPEG_PATH)) {
    try {
      const data = fs.readFileSync(FALLBACK_JPEG_PATH);
      return new NextResponse(new Uint8Array(data), {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=86400",
        },
      });
    } catch {
      // lanjut ke fallback SVG jika gagal baca file
    }
  }

  // Fallback SVG darurat jika file jpeg tidak terbaca
  const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
    <rect width="800" height="450" fill="#0f172a" />
    <text x="400" y="225" text-anchor="middle" fill="#38bdf8" font-family="sans-serif" font-size="18" font-weight="bold">SIDATEKA BANJARMANGU - DOKUMENTASI KEGIATAN DESA</text>
  </svg>`;
  return new NextResponse(FALLBACK_SVG, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

// GET /foto/<subdir>/<nama-file> — sajikan file dari .data/uploads, fallback ke kolase jika hilang
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await ctx.params;
  if (!segments || segments.length === 0) {
    return returnFallbackResponse();
  }

  // Guard path traversal: tiap segmen hanya boleh alfanumerik, dash, titik, underscore
  if (segments.some((s) => !/^[a-zA-Z0-9._-]+$/.test(s) || s.includes(".."))) {
    return returnFallbackResponse();
  }

  const filePath = path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, ...segments);
  if (!filePath.startsWith(UPLOAD_DIR) || !fs.existsSync(filePath)) {
    return returnFallbackResponse();
  }

  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_BY_EXT[ext];
  if (!mime) {
    return returnFallbackResponse();
  }

  try {
    const data = fs.readFileSync(filePath);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return returnFallbackResponse();
  }
}
