import { eq } from "drizzle-orm";
import type { getDb } from "@/db";
import { routes } from "@/db/schema";
import { pagePathFromLink } from "@/lib/import/wordpress-catalog";
import { normalizePath, publicPath } from "@/lib/paths";
import {
  listAllPublishedPages,
  listAllPublishedPosts,
  wpOrigin,
} from "@/lib/import/wordpress-client";

export type UrlAuditResult = {
  wordpressPaths: string[];
  cmsPaths: string[];
  missingInCms: string[];
  cmsOnly: string[];
};

export function pathKey(path: string) {
  return publicPath(normalizePath(path));
}

export async function collectWordPressPublicPaths() {
  const [pages, posts] = await Promise.all([listAllPublishedPages(null), listAllPublishedPosts(null)]);
  const paths = new Set<string>();
  for (const page of pages) {
    const path = pagePathFromLink(page.link);
    if (path) paths.add(path);
  }
  for (const post of posts) {
    paths.add(normalizePath(post.slug));
  }
  return [...paths].sort();
}

export async function collectPublishedCmsPaths(db: ReturnType<typeof getDb>) {
  const rows = await db
    .select({ path: routes.path })
    .from(routes)
    .where(eq(routes.status, "published"));
  return new Set(rows.map((row) => row.path));
}

export async function auditWordPressUrls(db: ReturnType<typeof getDb>): Promise<UrlAuditResult> {
  const wordpressPaths = await collectWordPressPublicPaths();
  const cmsPathSet = await collectPublishedCmsPaths(db);
  const missingInCms = wordpressPaths.filter((path) => !cmsPathSet.has(path));
  const wpSet = new Set(wordpressPaths);
  const cmsOnly = [...cmsPathSet].filter((path) => !wpSet.has(path)).sort();
  return {
    wordpressPaths,
    cmsPaths: [...cmsPathSet].sort(),
    missingInCms,
    cmsOnly,
  };
}

export async function writeMissingUrlReport(result: UrlAuditResult, outputPath: string) {
  const { writeFile } = await import("fs/promises");
  const lines = [
    `# WordPress URL audit (${wpOrigin()})`,
    `Generated: ${new Date().toISOString()}`,
    "",
    `WordPress paths: ${result.wordpressPaths.length}`,
    `CMS published routes: ${result.cmsPaths.length}`,
    `Missing in CMS: ${result.missingInCms.length}`,
    `CMS-only paths: ${result.cmsOnly.length}`,
    "",
    "## Missing in CMS",
    ...result.missingInCms.map((path) => pathKey(path)),
    "",
    "## CMS-only (not in WordPress list)",
    ...result.cmsOnly.map((path) => pathKey(path)),
  ];
  await writeFile(outputPath, lines.join("\n"), "utf8");
}
