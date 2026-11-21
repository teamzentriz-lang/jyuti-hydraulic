import { randomUUID } from "crypto";
import { desc, ilike, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { CmsError } from "@/db/errors";
import { media, mediaBlobs } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/authorization";
import { deleteStoredObject, saveUpload } from "@/lib/storage";
import { currentStorageDriver } from "@/lib/storage/factory";
import { assertUpload } from "@/lib/storage/validation";
import { storedFilenameFromUpload } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  if (!hasPermission(user, "media.manage")) return NextResponse.json({ error: "You do not have access to media." }, { status: 403 });

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
    if (!hasPermission(user, "media.manage")) return NextResponse.json({ error: "You do not have access to media." }, { status: 403 });

    const form = await request.formData();
    const files = form.getAll("files").filter((file): file is File => file instanceof File);
    if (!files.length) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
    if (files.length > 20) return NextResponse.json({ error: "Upload up to 20 files at a time." }, { status: 400 });

    const db = getDb();
    const prefix = form.get("prefix")?.toString().trim() || form.get("folder")?.toString().trim() || undefined;
    const items = [];
    for (const file of files) {
      const id = randomUUID();
      const useDatabaseStorage = Boolean(process.env.VERCEL) && currentStorageDriver() === "local";

      if (useDatabaseStorage) {
        assertUpload(file);
        const bytes = Buffer.from(await file.arrayBuffer());
        const filename = storedFilenameFromUpload(file.name);
        const [row] = await db.transaction(async (tx) => {
          const [created] = await tx
            .insert(media)
            .values({
              id,
              filename,
              originalName: file.name,
              alt: "",
              mimeType: file.type,
              size: bytes.length,
              storageDriver: "local",
              storageKey: `database/${id}/${filename}`,
              url: `/api/media/${id}`,
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
          await tx.insert(mediaBlobs).values({
            mediaId: id,
            dataBase64: bytes.toString("base64"),
          });
          return [created];
        });
        if (row) items.push(row);
        continue;
      }

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

    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof CmsError
        ? error.message
        : error instanceof Error
          ? `Upload failed: ${error.message}`
          : "Upload failed.";
    if (!(error instanceof CmsError)) console.error(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
