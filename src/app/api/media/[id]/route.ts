import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { classifyDatabaseError } from "@/db/errors";
import { media, mediaBlobs } from "@/db/schema";
import { ensureSingletons } from "@/lib/cms/queries";
import { storageService } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });

  await ensureSingletons();
  const db = getDb();
  const [file] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  if (!file) return new NextResponse("Not found", { status: 404 });
  if (file.storageDriver === "r2" && /^https?:\/\//i.test(file.url)) {
    return NextResponse.redirect(file.url);
  }

  let blob: { dataBase64: string } | undefined;
  try {
    [blob] = await db
      .select({ dataBase64: mediaBlobs.dataBase64 })
      .from(mediaBlobs)
      .where(eq(mediaBlobs.mediaId, id))
      .limit(1);
  } catch (error) {
    // media_blobs was added after the initial CMS schema. Older production
    // databases must still be able to serve files from their configured
    // storage provider or the imported legacy URL.
    if (classifyDatabaseError(error).reason !== "schema") throw error;
  }
  if (blob) {
    const bytes = Buffer.from(blob.dataBase64, "base64");
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(bytes.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
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
