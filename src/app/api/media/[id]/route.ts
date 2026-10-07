import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { media } from "@/db/schema";
import { storageService } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });

  const db = getDb();
  const [file] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  if (!file) return new NextResponse("Not found", { status: 404 });
  if (file.storageDriver === "r2" && /^https?:\/\//i.test(file.url)) {
    return NextResponse.redirect(file.url);
  }

  try {
    const bytes = await storageService.getObject(file.storageKey, file.storageDriver);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(bytes.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    if (file.legacyUrl && /^https?:\/\//i.test(file.legacyUrl)) {
      return NextResponse.redirect(file.legacyUrl);
    }
    return new NextResponse("Not found", { status: 404 });
  }
}
