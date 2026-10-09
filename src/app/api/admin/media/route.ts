import { randomUUID } from "crypto";
import { desc, ilike, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { CmsError } from "@/db/errors";
import { media } from "@/db/schema";
import { revalidatePublicSite } from "@/lib/cms/revalidate-public";
import { getCurrentUser } from "@/lib/auth";
import { deleteStoredObject, saveUpload } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in again." }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q")?.trim().replace(/[%_]/g, "") ?? "";
  const db = getDb();
  const rows = await db
    .select({
      id: media.id,
      url: media.url,
      filename: media.filename,
      alt: media.alt,
      mimeType: media.mimeType,
    })
    .from(media)
    .where(q ? or(ilike(media.filename, `%${q}%`), ilike(media.alt, `%${q}%`)) : undefined)
    .orderBy(desc(media.createdAt))
    .limit(40);

  return NextResponse.json({ items: rows });
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign in again." }, { status: 401 });

    const form = await request.formData();
    const files = form.getAll("files").filter((file): file is File => file instanceof File);
    if (!files.length) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
    if (files.length > 20) return NextResponse.json({ error: "Upload up to 20 files at a time." }, { status: 400 });

    const db = getDb();
    const prefix = form.get("prefix")?.toString().trim() || form.get("folder")?.toString().trim() || undefined;
    const items = [];
    for (const file of files) {
      const id = randomUUID();
      const stored = await saveUpload(file, id, { prefix });

      try {
        const [row] = await db
          .insert(media)
          .values({
            id,
            filename: stored.filename,
            originalName: file.name,
            alt: "",
            mimeType: stored.mimeType,
            size: stored.size,
            storageDriver: stored.storageDriver,
            storageKey: stored.storageKey,
            url: stored.url,
            folder: prefix ?? "",
            uploadedById: user.id,
          })
          .returning({
            id: media.id,
            url: media.url,
            filename: media.filename,
            alt: media.alt,
            mimeType: media.mimeType,
          });
        if (row) items.push(row);
      } catch (error) {
        await deleteStoredObject(stored.storageDriver, stored.storageKey).catch((cleanupError) => {
          console.error("Upload rollback failed", cleanupError);
        });
        throw error;
      }
    }

    revalidatePublicSite();

    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof CmsError ? error.message : "Upload failed.";
    if (!(error instanceof CmsError)) console.error(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
