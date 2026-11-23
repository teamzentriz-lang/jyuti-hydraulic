import { config } from "dotenv";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";

config({ path: ".env" });
config({ path: ".env.local", override: true });

/**
 * Attach WordPress featured images to imported blog posts that are missing
 * cover_media_id. Prefer an existing media row; otherwise register a media
 * record that points at the live legacy URL so listings render immediately.
 */
async function main() {
  const { closeDb, getDb } = await import("../src/db");
  const { media, posts } = await import("../src/db/schema");
  const {
    listAllPublishedPosts,
    fetchWpAttachmentSourceUrl,
  } = await import("../src/lib/import/wordpress-client");
  const {
    loadMediaLookup,
    resolveOrImportMediaFromUrl,
  } = await import("../src/lib/import/wordpress-media");
  const { registerMediaLookupRow, resolveMediaIdFromUrl } = await import(
    "../src/lib/import/wordpress-html"
  );
  const {
    canonicalLegacyUrl,
    filenameFromUrl,
    normalizeWordPressSizedUploadUrl,
    resolveMimeType,
    wordpressStoragePrefix,
  } = await import("../src/lib/import/wordpress-phase-a");

  const db = getDb();
  const missing = await db
    .select({
      id: posts.id,
      title: posts.title,
      path: posts.path,
      legacyId: posts.legacyId,
    })
    .from(posts)
    .where(and(isNotNull(posts.legacyId), isNull(posts.coverMediaId)));

  if (!missing.length) {
    console.log("All imported posts already have CMS cover images.");
    await closeDb();
    return;
  }

  console.log(`Posts missing covers: ${missing.length}`);
  const wpPosts = await listAllPublishedPosts(null);
  const postById = new Map(wpPosts.map((post) => [post.id, post]));
  const lookup = await loadMediaLookup(db);
  let attached = 0;
  let failed = 0;

  async function ensureCoverMedia(
    sourceUrl: string,
    title: string,
  ): Promise<string | null> {
    const existing = resolveMediaIdFromUrl(sourceUrl, lookup);
    if (existing) return existing;

    // Prefer a full import when storage is available; fall back to a legacy
    // URL pointer so the public site can still show the featured image.
    const imported = await resolveOrImportMediaFromUrl(db, sourceUrl, lookup, {
      dryRun: false,
      alt: title,
      title,
    });
    if (imported.mediaId) return imported.mediaId;

    const absolute = sourceUrl.trim().startsWith("http")
      ? sourceUrl.trim()
      : sourceUrl.trim();
    const legacyUrl = canonicalLegacyUrl(
      normalizeWordPressSizedUploadUrl(absolute),
    );
    if (!/^https?:\/\//i.test(legacyUrl)) return null;

    const [row] = await db
      .select({ id: media.id })
      .from(media)
      .where(eq(media.legacyUrl, legacyUrl))
      .limit(1);
    if (row) {
      registerMediaLookupRow(lookup, legacyUrl, row.id);
      return row.id;
    }

    const filename = filenameFromUrl(legacyUrl);
    const mimeType = resolveMimeType(filename, undefined);
    if (!mimeType.startsWith("image/")) return null;
    const id = randomUUID();
    await db.insert(media).values({
      id,
      filename,
      originalName: filename,
      alt: title.slice(0, 300),
      title: title.slice(0, 300),
      caption: "",
      description: "",
      mimeType,
      size: 0,
      width: null,
      height: null,
      storageDriver: "local",
      storageKey: `legacy-remote/${id}/${filename}`,
      url: legacyUrl,
      legacyUrl,
      folder: wordpressStoragePrefix(legacyUrl),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    registerMediaLookupRow(lookup, legacyUrl, id);
    return id;
  }

  for (const post of missing) {
    const wp = post.legacyId ? postById.get(post.legacyId) : undefined;
    if (!wp?.featured_media) {
      failed += 1;
      continue;
    }
    const sourceUrl = await fetchWpAttachmentSourceUrl(wp.featured_media);
    if (!sourceUrl) {
      failed += 1;
      console.log(`No featured media URL: ${post.title}`);
      continue;
    }
    const mediaId = await ensureCoverMedia(sourceUrl, post.title);
    if (!mediaId) {
      failed += 1;
      console.log(`Could not attach cover: ${post.title}`);
      continue;
    }
    await db
      .update(posts)
      .set({
        coverMediaId: mediaId,
        ogImageId: mediaId,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, post.id));
    attached += 1;
    if (attached % 25 === 0 || attached === 1) {
      console.log(`Attached ${attached}/${missing.length}: ${post.title}`);
    }
  }

  console.log(`Attached ${attached} blog covers. Failed/skipped: ${failed}.`);
  await closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
