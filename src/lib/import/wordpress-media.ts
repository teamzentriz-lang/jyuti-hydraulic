import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import type { getDb } from "@/db";
import { media } from "@/db/schema";
import {
  automationBlockMessage,
  canonicalLegacyUrl,
  filenameFromUrl,
  isAutomationBlocked,
  normalizeWordPressSizedUploadUrl,
  resolveMimeType,
  wordpressStoragePrefix,
} from "@/lib/import/wordpress-phase-a";
import {
  buildMediaLookup,
  registerMediaLookupRow,
  resolveMediaIdFromUrl,
  type MediaLookup,
} from "@/lib/import/wordpress-html";
import { fetchWpAttachmentSourceUrl, wpAuthHeaders, wpOrigin } from "@/lib/import/wordpress-client";
import { storageService } from "@/lib/storage";

type Db = ReturnType<typeof getDb>;

async function downloadBinary(url: string) {
  const response = await fetch(url, { headers: wpAuthHeaders() });
  if (isAutomationBlocked(response.status, "")) {
    throw new Error(automationBlockMessage(wpOrigin()));
  }
  if (!response.ok) throw new Error(`Download failed (${response.status}) for ${url}`);
  const type = response.headers.get("content-type") ?? "";
  if (type.includes("text/html")) throw new Error(automationBlockMessage(wpOrigin()));
  return Buffer.from(await response.arrayBuffer());
}

export async function loadMediaLookup(db: Db): Promise<MediaLookup> {
  const rows = await db.select({ id: media.id, legacyUrl: media.legacyUrl }).from(media);
  return buildMediaLookup(rows);
}

export async function resolveOrImportMediaFromUrl(
  db: Db,
  src: string,
  lookup: MediaLookup,
  meta: { dryRun: boolean; alt?: string; title?: string },
): Promise<{ mediaId: string | null; imported: boolean }> {
  const existing = resolveMediaIdFromUrl(src, lookup);
  if (existing) return { mediaId: existing, imported: false };
  if (meta.dryRun) return { mediaId: null, imported: false };

  const absolute = src.trim().startsWith("http") ? src.trim() : new URL(src.trim(), `${wpOrigin()}/`).toString();
  const legacyUrl = canonicalLegacyUrl(normalizeWordPressSizedUploadUrl(absolute));
  const [row] = await db.select({ id: media.id }).from(media).where(eq(media.legacyUrl, legacyUrl)).limit(1);
  if (row) {
    registerMediaLookupRow(lookup, legacyUrl, row.id);
    return { mediaId: row.id, imported: false };
  }

  const filename = filenameFromUrl(legacyUrl);
  const mimeType = resolveMimeType(filename, undefined);
  if (!mimeType.startsWith("image/")) return { mediaId: null, imported: false };

  let bytes: Buffer;
  try {
    bytes = await downloadBinary(legacyUrl);
  } catch {
    try {
      bytes = await downloadBinary(canonicalLegacyUrl(absolute));
    } catch {
      return { mediaId: null, imported: false };
    }
  }
  if (!bytes.length) return { mediaId: null, imported: false };

  const id = randomUUID();
  const stored = await storageService.upload({
    id,
    body: bytes,
    mimeType,
    originalName: filename,
    prefix: wordpressStoragePrefix(legacyUrl),
  });

  await db.insert(media).values({
    id,
    filename: stored.filename,
    originalName: filename,
    alt: (meta.alt ?? "").trim().slice(0, 300),
    title: (meta.title ?? meta.alt ?? filename).trim().slice(0, 300),
    caption: "",
    description: "",
    mimeType: stored.mimeType,
    size: stored.size,
    width: null,
    height: null,
    storageDriver: stored.storageDriver,
    storageKey: stored.storageKey,
    url: stored.url,
    legacyUrl,
    folder: wordpressStoragePrefix(legacyUrl),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  registerMediaLookupRow(lookup, legacyUrl, id);
  return { mediaId: id, imported: true };
}

export function createFeaturedMediaResolver() {
  const attachmentCache = new Map<number, string | null>();

  return async function mediaIdFromFeatured(wpMediaId: number, lookup: MediaLookup) {
    if (!wpMediaId) return null;
    if (attachmentCache.has(wpMediaId)) {
      const cached = attachmentCache.get(wpMediaId);
      return cached ? cached : null;
    }
    const sourceUrl = await fetchWpAttachmentSourceUrl(wpMediaId);
    if (!sourceUrl) {
      attachmentCache.set(wpMediaId, null);
      return null;
    }
    const id = resolveMediaIdFromUrl(sourceUrl, lookup);
    attachmentCache.set(wpMediaId, id);
    return id;
  };
}
