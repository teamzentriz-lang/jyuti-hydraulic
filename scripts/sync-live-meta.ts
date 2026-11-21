import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env" });
config({ path: ".env.local", override: true });

type Target = { table: string; prefix: string; columns: string[] };

const targets: Target[] = [
  { table: "pages", prefix: "", columns: ["canonical_url", "og_title", "og_description", "twitter_title", "twitter_description"] },
  { table: "product_categories", prefix: "", columns: ["canonical_url"] },
  { table: "products", prefix: "", columns: ["canonical_url", "og_title", "og_description", "twitter_title", "twitter_description"] },
  { table: "posts", prefix: "", columns: ["canonical_url", "og_title", "og_description", "twitter_title", "twitter_description"] },
  { table: "location_pages", prefix: "city", columns: [] },
  { table: "export_pages", prefix: "exports", columns: [] },
];

function arg(name: string, fallback: string) {
  const value = process.argv.find((item) => item.startsWith(`${name}=`));
  return value ? value.slice(name.length + 1) : fallback;
}

function attr(tag: string, name: string) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i"));
  return match?.[1]?.trim() || null;
}

function metadata(html: string) {
  const tags = [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => match[0]);
  const find = (key: string) => {
    const tag = tags.find((item) => (attr(item, "name") || attr(item, "property"))?.toLowerCase() === key);
    return tag ? attr(tag, "content") : null;
  };
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || null;
  const canonicalTag = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0]).find((tag) => attr(tag, "rel")?.toLowerCase() === "canonical");
  return {
    seoTitle: title,
    seoDescription: find("description"),
    canonicalUrl: canonicalTag ? attr(canonicalTag, "href") : null,
    ogTitle: find("og:title"),
    ogDescription: find("og:description"),
    twitterTitle: find("twitter:title"),
    twitterDescription: find("twitter:description"),
  };
}

function clean(value: string | null) {
  return value?.replace(/\s+/g, " ").trim() || null;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  const origin = arg("--origin", process.env.WP_ORIGIN || "https://jyotihydraulic.com").replace(/\/$/, "");
  const dryRun = process.argv.includes("--dry-run");
  const limit = Number(arg("--limit", "0"));
  const db = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
  let checked = 0;
  let updated = 0;
  let failed = 0;

  try {
    for (const target of targets) {
      const availableColumns = new Set(
        (await db.unsafe<{ column_name: string }[]>(
          `select column_name from information_schema.columns where table_name = $1`,
          [target.table],
        )).map((item) => item.column_name),
      );
      const syncColumns = target.columns.filter((column) => availableColumns.has(column));
      const rows = await db.unsafe<{ id: string; path: string }[]>(
        `select id, path from ${target.table} where status = 'published' order by path${limit > 0 ? ` limit ${Math.floor(limit)}` : ""}`,
      );
      for (const row of rows) {
        const path = row.path.replace(/^\/+|\/+$/g, "");
        const scopedPath = target.prefix && !path.toLowerCase().startsWith(`${target.prefix.toLowerCase()}/`)
          ? `${target.prefix}/${path}`
          : path;
        const url = `${origin}/${scopedPath}/`;
        checked += 1;
        try {
          const response = await fetch(url, { headers: { "user-agent": "JyotiHydraulic-MetadataSync/1.0" } });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = metadata(await response.text());
          const values: Record<string, string> = {};
          if (data.seoTitle) values.seo_title = clean(data.seoTitle)!;
          if (data.seoDescription) values.seo_description = clean(data.seoDescription)!;
          for (const column of syncColumns) {
            const key = column.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()) as keyof typeof data;
            const value = clean(data[key]);
            if (value) values[column] = value;
          }
          if (!Object.keys(values).length) continue;
          if (!dryRun) {
            const assignments = Object.keys(values).map((column) => `${column} = $${Object.keys(values).indexOf(column) + 1}`).join(", ");
            await db.unsafe(`update ${target.table} set ${assignments}, updated_at = now() where id = $${Object.keys(values).length + 1}`, [...Object.values(values), row.id]);
          }
          updated += 1;
          console.log(`${dryRun ? "AUDIT" : "SYNC"} ${url}`);
        } catch (error) {
          failed += 1;
          console.warn(`SKIP ${url}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  } finally {
    await db.end();
  }
  console.log(`Checked: ${checked}; ${dryRun ? "Would update" : "Updated"}: ${updated}; Failed: ${failed}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
