import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env" });
config({ path: ".env.local", override: true });

type Target = {
  table: string;
  prefix: string;
  columns: string[];
};

const targets: Target[] = [
  {
    table: "pages",
    prefix: "",
    columns: [
      "canonical_url",
      "og_title",
      "og_description",
      "twitter_title",
      "twitter_description",
    ],
  },
  { table: "product_categories", prefix: "", columns: ["canonical_url"] },
  {
    table: "products",
    prefix: "",
    columns: [
      "canonical_url",
      "og_title",
      "og_description",
      "twitter_title",
      "twitter_description",
    ],
  },
  {
    table: "posts",
    prefix: "",
    columns: [
      "canonical_url",
      "og_title",
      "og_description",
      "twitter_title",
      "twitter_description",
    ],
  },
  { table: "location_pages", prefix: "city", columns: [] },
  { table: "export_pages", prefix: "exports", columns: [] },
];

function arg(name: string, fallback: string) {
  const value = process.argv.find((item) => item.startsWith(`${name}=`));
  return value ? value.slice(name.length + 1) : fallback;
}

function attr(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"));
  return (match?.[1] ?? match?.[2])?.trim() || null;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, code) => {
      const n = Number(code);
      return Number.isFinite(n) ? String.fromCodePoint(n) : _;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const n = Number.parseInt(hex, 16);
      return Number.isFinite(n) ? String.fromCodePoint(n) : _;
    });
}

function clean(value: string | null) {
  if (!value) return null;
  return decodeHtmlEntities(value).replace(/\s+/g, " ").trim() || null;
}

function metadata(html: string) {
  const tags = [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => match[0]);
  const find = (key: string) => {
    const tag = tags.find(
      (item) =>
        (attr(item, "name") || attr(item, "property"))?.toLowerCase() === key,
    );
    return tag ? attr(tag, "content") : null;
  };
  const title =
    html
      .match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]
      ?.replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim() || null;
  const canonicalTag = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => match[0])
    .find((tag) => attr(tag, "rel")?.toLowerCase() === "canonical");
  return {
    seoTitle: title,
    seoDescription: find("description"),
    canonicalUrl: canonicalTag ? attr(canonicalTag, "href") : null,
    ogTitle: find("og:title"),
    ogDescription: find("og:description"),
    twitterTitle: find("twitter:title"),
    twitterDescription: find("twitter:description"),
    ogImage: find("og:image"),
  };
}

async function syncCategory(db: postgres.Sql, id: string, html: string, url: string, dryRun: boolean) {
  const head = html.split(/<\/head>/i)[0];
  const meta = metadata(head);
  const canonical = clean(meta.canonicalUrl);
  if (!canonical || new URL(canonical).origin !== new URL(url).origin || !meta.seoTitle) {
    throw new Error("Missing category title or canonical on the source site.");
  }
  const liveMeta: Record<string, string> = {};
  const robots = new Set<string>();
  let keywords: string | null = null;
  for (const [tag] of head.matchAll(/<meta\b[^>]*>/gi)) {
    const key = (attr(tag, "property") || attr(tag, "name"))?.toLowerCase();
    const value = clean(attr(tag, "content"));
    if (!key || !value) continue;
    if (key === "keywords") keywords = value;
    if (key === "robots") value.toLowerCase().split(/\s*,\s*/).forEach((rule) => robots.add(rule));
    if (key.startsWith("og:") || key.startsWith("twitter:")) liveMeta[key] = value;
  }
  liveMeta.robots = [...robots].filter((rule) => !["index", "follow", "noindex", "nofollow", "all", "none"].includes(rule)).join(", ");
  if (dryRun) return;
  await db`
    update product_categories set seo_title = ${clean(meta.seoTitle)}, seo_description = ${clean(meta.seoDescription)},
      canonical_url = ${canonical}, focus_keyword = ${keywords},
      robots_index = ${!robots.has("noindex") && !robots.has("none")},
      robots_follow = ${!robots.has("nofollow") && !robots.has("none")},
      og_title = ${clean(meta.ogTitle)}, og_description = ${clean(meta.ogDescription)},
      twitter_title = ${clean(meta.twitterTitle)}, twitter_description = ${clean(meta.twitterDescription)},
      og_image_id = null, twitter_image_id = null,
      listing_config = jsonb_set(listing_config, '{liveMeta}', ${db.json(liveMeta)}),
      updated_at = now() where id = ${id}
  `;
}

function liveUrl(
  origin: string,
  row: { path: string; legacy_url?: string | null },
  prefix: string,
) {
  if (row.legacy_url && /^https?:\/\//i.test(row.legacy_url)) {
    return row.legacy_url.endsWith("/") ? row.legacy_url : `${row.legacy_url}/`;
  }
  const path = row.path.replace(/^\/+|\/+$/g, "");
  const scopedPath =
    prefix && !path.toLowerCase().startsWith(`${prefix.toLowerCase()}/`)
      ? `${prefix}/${path}`
      : path;
  return scopedPath ? `${origin}/${scopedPath}/` : `${origin}/`;
}

function normalizeMediaUrl(value: string) {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`.replace(/\/$/, "").toLowerCase();
  } catch {
    return value.trim().replace(/\/$/, "").toLowerCase();
  }
}

async function resolveMediaId(
  db: postgres.Sql,
  imageUrl: string | null,
  cache: Map<string, string | null>,
) {
  const cleaned = clean(imageUrl);
  if (!cleaned) return null;
  const key = normalizeMediaUrl(cleaned);
  if (cache.has(key)) return cache.get(key) ?? null;
  const fileName = key.split("/").pop() || "";
  const rows = await db.unsafe<{ id: string }[]>(
    `select id from media
     where lower(regexp_replace(coalesce(legacy_url, ''), '/$', '')) = $1
        or lower(regexp_replace(coalesce(url, ''), '/$', '')) = $1
        or (length($2) > 4 and (
          lower(coalesce(legacy_url, '')) like '%' || $2
          or lower(coalesce(url, '')) like '%' || $2
          or lower(coalesce(filename, '')) = $2
        ))
     order by case
       when lower(regexp_replace(coalesce(legacy_url, ''), '/$', '')) = $1 then 0
       when lower(regexp_replace(coalesce(url, ''), '/$', '')) = $1 then 1
       else 2
     end
     limit 1`,
    [key, fileName.toLowerCase()],
  );
  const id = rows[0]?.id ?? null;
  cache.set(key, id);
  return id;
}

async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is not configured.");
  const origin = arg(
    "--origin",
    process.env.WP_ORIGIN || "https://jyotihydraulic.com",
  ).replace(/\/$/, "");
  const dryRun = process.argv.includes("--dry-run");
  const limit = Number(arg("--limit", "0"));
  const onlyTables = new Set(
    arg("--tables", "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
  const db = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
  let checked = 0;
  let updated = 0;
  let failed = 0;
  const mediaCache = new Map<string, string | null>();

  try {
    // Homepage SEO lives in site_settings (there is no pages row for "/").
    if (!onlyTables.size || onlyTables.has("site_settings")) {
      checked += 1;
      const homeUrl = `${origin}/`;
      try {
        const response = await fetch(homeUrl, {
          headers: { "user-agent": "JyotiHydraulic-MetadataSync/1.0" },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = metadata(await response.text());
        const siteName = clean(data.seoTitle || data.ogTitle);
        const shortDescription = clean(
          data.seoDescription || data.ogDescription,
        );
        if (siteName || shortDescription) {
          if (!dryRun) {
            await db`
              update site_settings
              set
                site_name = coalesce(${siteName}, site_name),
                short_description = coalesce(${shortDescription}, short_description),
                company_name = case
                  when coalesce(company_name, '') = '' then 'Jyoti Hydraulic'
                  else company_name
                end,
                updated_at = now()
              where id = 'default'
            `;
          }
          updated += 1;
          console.log(`${dryRun ? "AUDIT" : "SYNC"} ${homeUrl} (site_settings)`);
        }
      } catch (error) {
        failed += 1;
        console.warn(
          `SKIP ${homeUrl}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    for (const target of targets) {
      if (onlyTables.size && !onlyTables.has(target.table)) continue;
      const availableColumns = new Set(
        (
          await db.unsafe<{ column_name: string }[]>(
            `select column_name from information_schema.columns where table_schema = 'public' and table_name = $1`,
            [target.table],
          )
        ).map((item) => item.column_name),
      );
      const syncColumns = target.columns.filter((column) =>
        availableColumns.has(column),
      );
      const hasLegacyUrl = availableColumns.has("legacy_url");
      const selectSql = hasLegacyUrl
        ? `select id, path, legacy_url from ${target.table} where status = 'published' order by path${limit > 0 ? ` limit ${Math.floor(limit)}` : ""}`
        : `select id, path from ${target.table} where status = 'published' order by path${limit > 0 ? ` limit ${Math.floor(limit)}` : ""}`;
      const rows = await db.unsafe<
        { id: string; path: string; legacy_url?: string | null }[]
      >(selectSql);

      for (const row of rows) {
        const url = liveUrl(origin, row, target.prefix);
        checked += 1;
        try {
          const response = await fetch(url, {
            headers: { "user-agent": "JyotiHydraulic-MetadataSync/1.0" },
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const html = await response.text();
          if (target.table === "product_categories") {
            if (response.url.replace(/\/$/, "") !== url.replace(/\/$/, "")) {
              throw new Error("The source URL redirects to a different page.");
            }
            await syncCategory(db, row.id, html, url, dryRun);
            updated += 1;
            console.log(`${dryRun ? "AUDIT" : "SYNC"} ${url}`);
            continue;
          }
          const data = metadata(html);
          const values: Record<string, string> = {};
          if (data.seoTitle && availableColumns.has("seo_title")) {
            values.seo_title = clean(data.seoTitle)!;
          }
          if (data.seoDescription && availableColumns.has("seo_description")) {
            values.seo_description = clean(data.seoDescription)!;
          }
          for (const column of syncColumns) {
            const key = column.replace(/_([a-z])/g, (_, letter: string) =>
              letter.toUpperCase(),
            ) as keyof typeof data;
            const value = clean(data[key] as string | null);
            if (value) values[column] = value;
          }

          // Keep CMS Social fields aligned with live Open Graph images.
          const ogImageId = await resolveMediaId(db, data.ogImage, mediaCache);
          if (ogImageId && availableColumns.has("og_image_id")) {
            values.og_image_id = ogImageId;
          }
          if (ogImageId && availableColumns.has("twitter_image_id")) {
            values.twitter_image_id = ogImageId;
          }

          // When live HTML has no og:image (common on product pages), mirror the
          // same visual the frontend already falls back to so admin shows it.
          if (!values.og_image_id && availableColumns.has("og_image_id")) {
            const fallbackColumn = availableColumns.has("cover_media_id")
              ? "cover_media_id"
              : availableColumns.has("featured_image_id")
                ? "featured_image_id"
                : availableColumns.has("hero_media_id")
                  ? "hero_media_id"
                  : null;
            if (fallbackColumn) {
              const [fallback] = await db.unsafe<{ image_id: string | null }[]>(
                `select ${fallbackColumn} as image_id from ${target.table} where id = $1 limit 1`,
                [row.id],
              );
              if (fallback?.image_id) {
                values.og_image_id = fallback.image_id;
                if (availableColumns.has("twitter_image_id")) {
                  values.twitter_image_id = fallback.image_id;
                }
              }
            }
          }

          if (!Object.keys(values).length) continue;
          if (!dryRun) {
            const keys = Object.keys(values);
            const assignments = keys
              .map((column, index) => `${column} = $${index + 1}`)
              .join(", ");
            await db.unsafe(
              `update ${target.table} set ${assignments}, updated_at = now() where id = $${keys.length + 1}`,
              [...Object.values(values), row.id],
            );
          }
          updated += 1;
          console.log(`${dryRun ? "AUDIT" : "SYNC"} ${url}`);
        } catch (error) {
          failed += 1;
          console.warn(
            `SKIP ${url}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }
  } finally {
    await db.end();
  }
  console.log(
    `Checked: ${checked}; ${dryRun ? "Would update" : "Updated"}: ${updated}; Failed: ${failed}`,
  );
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
