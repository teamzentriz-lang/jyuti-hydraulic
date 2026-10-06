import { randomUUID } from "crypto";
import { config } from "dotenv";
import { eq } from "drizzle-orm";

config({ path: ".env" });
config({ path: ".env.local", override: true });

import { closeDb, getDb } from "@/db";
import { media } from "@/db/schema";
import { ensureSingletons } from "@/lib/cms/queries";
import { applyWordPressGlobals } from "@/lib/import/apply-globals";
import { purgeSeedContent } from "@/lib/import/purge-seed-content";
import {
  automationBlockMessage,
  isAutomationBlocked,
  prepareMediaItem,
  siteGlobals,
  type PreparedMedia,
  type WpMediaItem,
} from "@/lib/import/wordpress-phase-a";
import { storageService } from "@/lib/storage/service";
import { CmsError } from "@/db/errors";

const PER_PAGE = 100;
const CONCURRENCY = 4;

type Options = {
  dryRun: boolean;
  limit: number | null;
};

function parseArgs(argv: string[]): Options {
  const dryRun = argv.includes("--dry-run");
  const limitArg = argv.find((arg) => arg.startsWith("--limit="));
  const limitValue = limitArg ? Number(limitArg.slice("--limit=".length)) : null;
  return {
    dryRun,
    limit: limitValue && Number.isFinite(limitValue) && limitValue > 0 ? limitValue : null,
  };
}

function origin() {
  return (process.env.WP_ORIGIN || "https://jyotihydraulic.com").replace(/\/$/, "");
}

function authHeaders(): HeadersInit {
  const user = process.env.WP_USER?.trim();
  const password = process.env.WP_APPLICATION_PASSWORD?.replace(/\s/g, "");
  const headers: Record<string, string> = {
    Accept: "application/json, */*",
    "User-Agent": "JyotiHydraulicMigration/1.0",
  };
  if (user && password) {
    headers.Authorization = `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
  }
  return headers;
}

async function readWp(url: string) {
  const response = await fetch(url, { headers: authHeaders() });
  const body = await response.text();
  if (isAutomationBlocked(response.status, body)) {
    throw new Error(automationBlockMessage(origin()));
  }
  if (!response.ok) {
    throw new Error(`WordPress returned ${response.status} for ${url}`);
  }
  if (body.trimStart().startsWith("<")) {
    throw new Error(automationBlockMessage(origin()));
  }
  return { response, body };
}

async function listMedia(base: string, limit: number | null) {
  const items: WpMediaItem[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = `${base}/wp-json/wp/v2/media?per_page=${PER_PAGE}&page=${page}&orderby=id&order=asc&_fields=id,date_gmt,title,caption,description,alt_text,mime_type,source_url,media_details`;
    const { response, body } = await readWp(url);
    const batch = JSON.parse(body) as WpMediaItem[];
    totalPages = Number(response.headers.get("x-wp-totalpages") || "1");
    items.push(...batch);
    console.log(`Listed media page ${page}/${totalPages} (${items.length} files).`);
    if (limit && items.length >= limit) return items.slice(0, limit);
    page += 1;
  }

  return items;
}

async function download(url: string) {
  const response = await fetch(url, { headers: authHeaders() });
  if (isAutomationBlocked(response.status, "")) {
    throw new Error(automationBlockMessage(origin()));
  }
  if (!response.ok) throw new Error(`Download failed (${response.status}) for ${url}`);
  const type = response.headers.get("content-type") ?? "";
  if (type.includes("text/html")) throw new Error(automationBlockMessage(origin()));
  return Buffer.from(await response.arrayBuffer());
}

async function importOne(prepared: PreparedMedia, dryRun: boolean) {
  const db = getDb();
  const [existing] = await db
    .select({ id: media.id })
    .from(media)
    .where(eq(media.legacyUrl, prepared.legacyUrl))
    .limit(1);
  if (existing) return "skipped" as const;
  if (dryRun) return "planned" as const;

  const id = randomUUID();
  const bytes = await download(prepared.legacyUrl);
  if (bytes.length === 0) throw new Error("Empty file.");
  const stored = await storageService.upload({
    id,
    body: bytes,
    mimeType: prepared.mimeType,
    originalName: prepared.filename,
    prefix: prepared.prefix,
  });

  await db.insert(media).values({
    id,
    filename: stored.filename,
    originalName: prepared.filename,
    alt: prepared.alt,
    title: prepared.title,
    caption: prepared.caption,
    description: prepared.description,
    mimeType: stored.mimeType,
    size: stored.size,
    width: prepared.width,
    height: prepared.height,
    storageDriver: stored.storageDriver,
    storageKey: stored.storageKey,
    url: stored.url,
    legacyUrl: prepared.legacyUrl,
    folder: prepared.prefix,
    createdAt: prepared.createdAt ?? new Date(),
    updatedAt: new Date(),
  });
  return "imported" as const;
}

async function mapPool<T>(items: T[], size: number, worker: (item: T) => Promise<void>) {
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (item) await worker(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, () => run()));
}

async function importCatalogue(base: string, dryRun: boolean) {
  const legacyUrl = siteGlobals(base).catalogueLegacyUrl;
  const db = getDb();
  const [existing] = await db.select({ id: media.id }).from(media).where(eq(media.legacyUrl, legacyUrl)).limit(1);
  if (existing) return existing.id;
  if (dryRun) return null;

  const id = randomUUID();
  const bytes = await download(legacyUrl);
  const filename = "e-catalogue-jyoti-hydraulic-new.pdf";
  const stored = await storageService.upload({
    id,
    body: bytes,
    mimeType: "application/pdf",
    originalName: filename,
    prefix: "wordpress/catalogue",
  });
  await db.insert(media).values({
    id,
    filename: stored.filename,
    originalName: filename,
    alt: "Jyoti Hydraulic catalogue",
    title: "E-catalogue",
    mimeType: stored.mimeType,
    size: stored.size,
    storageDriver: stored.storageDriver,
    storageKey: stored.storageKey,
    url: stored.url,
    legacyUrl,
    folder: "wordpress/catalogue",
  });
  return id;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Set DATABASE_URL in .env.local, then run this again.");
    process.exit(1);
  }

  const options = parseArgs(process.argv.slice(2));
  const base = origin();
  console.log(`${options.dryRun ? "Dry run" : "Import"} from ${base}`);

  await ensureSingletons();
  const listed = await listMedia(base, options.limit);
  const prepared = listed.flatMap((item) => {
    const row = prepareMediaItem(item);
    return row ? [row] : [];
  });
  const unsupported = listed.length - prepared.length;
  console.log(`${prepared.length} supported files. ${unsupported} skipped (unsupported type or missing URL).`);

  const counts = { imported: 0, skipped: 0, planned: 0, failed: 0 };
  await mapPool(prepared, CONCURRENCY, async (item) => {
    try {
      const result = await importOne(item, options.dryRun);
      counts[result] += 1;
      const done = counts.imported + counts.skipped + counts.planned + counts.failed;
      if (done % 25 === 0 || done === prepared.length) {
        console.log(
          `Progress ${done}/${prepared.length} — imported ${counts.imported}, skipped ${counts.skipped}, planned ${counts.planned}, failed ${counts.failed}`,
        );
      }
    } catch (error) {
      counts.failed += 1;
      const message = error instanceof CmsError || error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed ${item.legacyUrl}: ${message}`);
      if (/Imunify360|whitelist/i.test(message)) throw error;
    }
  });

  if (options.limit) {
    console.log("--limit only imports media. Catalogue and site settings run when you omit --limit.");
  } else if (options.dryRun) {
    console.log("Dry run: catalogue and settings were not changed. Home page copy stays in the CMS.");
  } else {
    await importCatalogue(base, false);
    const db = getDb();
    const purged = await purgeSeedContent(db);
    console.log(
      `Removed seed content: ${purged.products} products, ${purged.categories} categories, ${purged.pages} pages, ${purged.posts} posts, ${purged.media} placeholder media files.`,
    );
    const applied = await applyWordPressGlobals(db, base);
    console.log("Updated site, header, footer, and contact settings. Home page copy was left unchanged.");
    if (applied.replacedLogo && applied.logo) console.log(`Logo set from ${applied.logo.filename}.`);
    else if (applied.logo) console.log(`Logo available (${applied.logo.filename}) but an existing logo was kept. Run finalize to replace placeholders.`);
    else console.log("No logo file matched. Set the logo in Site settings.");
  }

  console.log(
    `Done. imported ${counts.imported}, already stored ${counts.skipped}, planned ${counts.planned}, failed ${counts.failed}, unsupported ${unsupported}.`,
  );
  await closeDb();
  if (counts.failed > 0) process.exitCode = 1;
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await closeDb().catch(() => undefined);
  process.exit(1);
});
