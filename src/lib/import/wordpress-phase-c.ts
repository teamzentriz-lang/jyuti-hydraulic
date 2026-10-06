import { randomUUID } from "crypto";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { getDb } from "@/db";
import { pages, posts, routes } from "@/db/schema";
import { contentFaqs, contentTables, pageSections } from "@/db/schema-cms";
import { reserveRoute } from "@/lib/cms/routes";
import { revalidatePublicSite } from "@/lib/cms/revalidate-public";
import {
  createFeaturedMediaResolver,
  loadMediaLookup,
} from "@/lib/import/wordpress-media";
import {
  filterStaticPages,
  inferPageType,
  pageSlugFromPath,
  postPathFromSlug,
  type StaticPage,
} from "@/lib/import/wordpress-static";
import {
  htmlToPlainSummary,
  processWordPressHtml,
  type MediaLookup,
} from "@/lib/import/wordpress-html";
import {
  fetchSeoFromPublicHtml,
  listAllPublishedPages,
  listAllPublishedPosts,
  wpOrigin,
  wpPageContentHtml,
  wpPageTitle,
  wpPostContentHtml,
  wpPostExcerptHtml,
  wpPostTitle,
  type ImportCliOptions,
  type WpPostItem,
} from "@/lib/import/wordpress-client";

type Db = ReturnType<typeof getDb>;

export type PhaseCStats = {
  pagesCreated: number;
  pagesUpdated: number;
  postsCreated: number;
  postsUpdated: number;
  skipped: number;
};

function publicLegacyUrl(link: string) {
  const legacyUrl = link.startsWith("http") ? link : `${wpOrigin()}/${link.replace(/^\//, "")}`;
  return legacyUrl.endsWith("/") ? legacyUrl : `${legacyUrl}/`;
}

function parsePublishedAt(dateGmt: string | undefined) {
  if (!dateGmt) return null;
  const date = new Date(dateGmt);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function purgeSeedStaticContent(db: Db) {
  const pageIds = await db
    .select({ id: pages.id })
    .from(pages)
    .where(isNull(pages.legacyId))
    .then((rows) => rows.map((row) => row.id));

  if (pageIds.length) {
    await db.delete(pageSections).where(inArray(pageSections.pageId, pageIds));
    await db.delete(contentFaqs).where(and(eq(contentFaqs.entityKind, "page"), inArray(contentFaqs.entityId, pageIds)));
    await db.delete(contentTables).where(and(eq(contentTables.entityKind, "page"), inArray(contentTables.entityId, pageIds)));
    await db.delete(pages).where(inArray(pages.id, pageIds));
  }

  const postIds = await db
    .select({ id: posts.id })
    .from(posts)
    .where(isNull(posts.legacyId))
    .then((rows) => rows.map((row) => row.id));

  if (postIds.length) {
    await db.delete(contentFaqs).where(and(eq(contentFaqs.entityKind, "post"), inArray(contentFaqs.entityId, postIds)));
    await db.delete(contentTables).where(and(eq(contentTables.entityKind, "post"), inArray(contentTables.entityId, postIds)));
    await db.delete(posts).where(inArray(posts.id, postIds));
  }

  const removedEntityIds = [...pageIds, ...postIds];
  if (removedEntityIds.length) {
    await db.delete(routes).where(inArray(routes.entityId, removedEntityIds));
  }

  return { pages: pageIds.length, posts: postIds.length };
}

async function upsertStaticPage(
  db: Db,
  page: StaticPage,
  lookup: MediaLookup,
  mediaIdFromFeatured: ReturnType<typeof createFeaturedMediaResolver>,
  options: ImportCliOptions,
  stats: PhaseCStats,
) {
  const rawHtml = wpPageContentHtml(page);
  const body = processWordPressHtml(rawHtml, lookup);
  const excerpt = htmlToPlainSummary(body, 2000);
  const title = wpPageTitle(page);
  const slug = pageSlugFromPath(page.path);
  const legacyUrl = publicLegacyUrl(page.link);

  let seoTitle: string | null = title;
  let seoDescription: string | null = excerpt.slice(0, 500) || null;
  if (!options.skipSeo && !options.dryRun) {
    const seo = await fetchSeoFromPublicHtml(legacyUrl);
    if (seo.seoTitle) seoTitle = seo.seoTitle;
    if (seo.seoDescription) seoDescription = seo.seoDescription;
  }

  const heroMediaId = options.dryRun ? null : await mediaIdFromFeatured(page.featured_media, lookup);

  const [existing] = await db.select({ id: pages.id }).from(pages).where(eq(pages.legacyId, page.id)).limit(1);

  if (options.dryRun) {
    if (existing) stats.pagesUpdated += 1;
    else stats.pagesCreated += 1;
    return;
  }

  const id = existing?.id ?? randomUUID();
  const values = {
    title,
    slug,
    path: page.path,
    pageType: inferPageType(page.path),
    heroMediaId,
    featuredImageId: heroMediaId,
    excerpt,
    shortDescription: excerpt.slice(0, 500),
    body,
    seoTitle,
    seoDescription,
    canonicalUrl: legacyUrl,
    status: "published" as const,
    legacyId: page.id,
    legacySlug: page.slug,
    legacyUrl,
    legacyType: "page",
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(pages).set(values).where(eq(pages.id, id));
    stats.pagesUpdated += 1;
  } else {
    await db.insert(pages).values({ id, ...values });
    stats.pagesCreated += 1;
  }

  await db.transaction(async (tx) => {
    await reserveRoute(tx, {
      path: page.path,
      kind: "page",
      entityId: id,
      status: "published",
    });
  });
}

async function upsertPost(
  db: Db,
  post: WpPostItem,
  lookup: MediaLookup,
  mediaIdFromFeatured: ReturnType<typeof createFeaturedMediaResolver>,
  options: ImportCliOptions,
  stats: PhaseCStats,
) {
  const rawHtml = wpPostContentHtml(post);
  const body = processWordPressHtml(rawHtml, lookup);
  const excerptRaw = wpPostExcerptHtml(post);
  const excerpt = htmlToPlainSummary(processWordPressHtml(excerptRaw, lookup) || body, 2000);
  const title = wpPostTitle(post);
  const slug = postPathFromSlug(post.slug);
  const path = slug;
  const legacyUrl = publicLegacyUrl(post.link);
  const publishedAt = parsePublishedAt(post.date_gmt);

  let seoTitle: string | null = title;
  let seoDescription: string | null = excerpt.slice(0, 500) || null;
  if (!options.skipSeo && !options.dryRun) {
    const seo = await fetchSeoFromPublicHtml(legacyUrl);
    if (seo.seoTitle) seoTitle = seo.seoTitle;
    if (seo.seoDescription) seoDescription = seo.seoDescription;
  }

  const coverMediaId = options.dryRun ? null : await mediaIdFromFeatured(post.featured_media, lookup);

  const [existing] = await db.select({ id: posts.id }).from(posts).where(eq(posts.legacyId, post.id)).limit(1);

  if (options.dryRun) {
    if (existing) stats.postsUpdated += 1;
    else stats.postsCreated += 1;
    return;
  }

  const id = existing?.id ?? randomUUID();
  const values = {
    title,
    slug,
    path,
    publishedAt,
    coverMediaId,
    excerpt,
    body,
    seoTitle,
    seoDescription,
    canonicalUrl: legacyUrl,
    status: "published" as const,
    legacyId: post.id,
    legacySlug: post.slug,
    legacyUrl,
    legacyType: "post",
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(posts).set(values).where(eq(posts.id, id));
    stats.postsUpdated += 1;
  } else {
    await db.insert(posts).values({ id, ...values });
    stats.postsCreated += 1;
  }

  await db.transaction(async (tx) => {
    await reserveRoute(tx, {
      path,
      kind: "post",
      entityId: id,
      status: "published",
    });
  });
}

export async function runWordPressPhaseC(db: Db, options: ImportCliOptions): Promise<PhaseCStats> {
  const stats: PhaseCStats = {
    pagesCreated: 0,
    pagesUpdated: 0,
    postsCreated: 0,
    postsUpdated: 0,
    skipped: 0,
  };

  console.log(`Fetching published content from ${wpOrigin()}…`);
  const [allPages, allPosts] = await Promise.all([
    listAllPublishedPages(null),
    listAllPublishedPosts(options.limit),
  ]);

  let staticPages = filterStaticPages(allPages);
  let wpPosts = allPosts;
  if (options.limit) {
    staticPages = staticPages.slice(0, options.limit);
    wpPosts = wpPosts.slice(0, options.limit);
  }

  console.log(`Static pages: ${staticPages.length}. Blog posts: ${wpPosts.length}.`);

  if (!options.dryRun && options.purgeDummy) {
    const purged = await purgeSeedStaticContent(db);
    console.log(`Removed dummy content: ${purged.pages} pages, ${purged.posts} posts.`);
  }

  const lookup = await loadMediaLookup(db);
  const mediaIdFromFeatured = createFeaturedMediaResolver();

  for (const page of staticPages) {
    try {
      await upsertStaticPage(db, page, lookup, mediaIdFromFeatured, options, stats);
    } catch (error) {
      console.warn(`Skipped page ${page.path}:`, error instanceof Error ? error.message : error);
      stats.skipped += 1;
    }
  }

  for (const post of wpPosts) {
    try {
      await upsertPost(db, post, lookup, mediaIdFromFeatured, options, stats);
    } catch (error) {
      console.warn(`Skipped post ${post.slug}:`, error instanceof Error ? error.message : error);
      stats.skipped += 1;
    }
  }

  if (!options.dryRun) {
    revalidatePublicSite([...staticPages.map((page) => page.path), ...wpPosts.map((post) => postPathFromSlug(post.slug))]);
  }

  return stats;
}
