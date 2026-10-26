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
};

// GET /foto/<subdir>/<nama-file> — sajikan file dari .data/uploads
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await ctx.params;
  if (!segments || segments.length === 0) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Guard path traversal: tiap segmen hanya boleh alfanumerik, dash, titik, underscore
  if (segments.some((s) => !/^[a-zA-Z0-9._-]+$/.test(s) || s.includes(".."))) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, ...segments);
  if (!filePath.startsWith(UPLOAD_DIR) || !fs.existsSync(filePath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_BY_EXT[ext];
  if (!mime) {
    return new NextResponse("Not found", { status: 404 });
  }

  const data = fs.readFileSync(filePath);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
