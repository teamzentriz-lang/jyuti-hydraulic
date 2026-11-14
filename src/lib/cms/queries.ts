import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  ilike,
  inArray,
  isNotNull,
  or,
  sql,
  type AnyColumn,
} from "drizzle-orm";
import type { AnyPgTable } from "drizzle-orm/pg-core";
import { getDb, withDatabaseRetry } from "@/db";
import { classifyDatabaseError, type DatabaseFailure } from "@/db/errors";
import { mediaDeliveryUrl } from "@/lib/media-url";
import {
  blogCategories,
  blogTags,
  catalogues,
  certificates,
  companies,
  contacts,
  cmsForms,
  contactSettings,
  exportPages,
  footerSettings,
  galleryAlbums,
  galleryItems,
  headerSettings,
  homeContent,
  homeFeaturedProducts,
  homeHeroImages,
  inquiries,
  leadActivities,
  leads,
  locationPages,
  media,
  navLinks,
  pages,
  posts,
  productCategories,
  productImages,
  products,
  redirects,
  siteSettings,
  followUpTasks,
  teamMembers,
  teams,
  users,
  siteHtmlSettings,
  siteUiSettings,
} from "@/db/schema";
import { pageHtmlOverrides } from "@/db/schema-cms";
import {
  defaultClients,
  defaultStats,
  defaultStrengths,
  defaultTestimonials,
  defaultUsps,
  homeDefaults,
} from "@/lib/brand";
import {
  loadContentFaqs,
  loadProductPayload,
  loadPageSections,
} from "@/lib/cms/entity-data";
import {
  type RelationName,
  type ResourceKey,
  resources,
} from "@/lib/cms/resources";
import { linkedArticlePaths } from "@/lib/cms/product-article";

export const tables = {
  pages,
  "product-categories": productCategories,
  products,
  locations: locationPages,
  exports: exportPages,
  posts,
  "blog-categories": blogCategories,
  "blog-tags": blogTags,
  gallery: galleryItems,
  "gallery-albums": galleryAlbums,
  certificates,
  catalogues,
  forms: cmsForms,
  inquiries,
  companies,
  contacts,
  leads,
  "lead-activities": leadActivities,
  "follow-ups": followUpTasks,
  redirects,
  "nav-links": navLinks,
  users,
  teams,
  "page-html": pageHtmlOverrides,
  media,
} satisfies Record<ResourceKey, AnyPgTable>;

export async function loadDatabase<T>(
  fn: () => Promise<T>,
): Promise<{ ok: true; data: T } | { ok: false; failure: DatabaseFailure }> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    return { ok: false, failure: classifyDatabaseError(error) };
  }
}

let singletonSetup: Promise<void> | null = null;

export async function ensureSingletons() {
  if (singletonSetup) return singletonSetup;

  singletonSetup = withDatabaseRetry(async () => {
    const db = getDb();
    // Schema changes belong in migration scripts. Runtime requests only ensure
    // singleton rows exist, so a page render never attempts DDL or takes locks.
    await db
      .insert(siteSettings)
      .values({ id: "default" })
      .onConflictDoNothing();
    await db
      .insert(homeContent)
      .values({ id: "default", ...homeDefaults })
      .onConflictDoNothing();
    await db
      .insert(headerSettings)
      .values({ id: "default" })
      .onConflictDoNothing();
    await db
      .insert(footerSettings)
      .values({ id: "default" })
      .onConflictDoNothing();
    await db
      .insert(contactSettings)
      .values({ id: "default" })
      .onConflictDoNothing();
    await db
      .insert(siteHtmlSettings)
      .values({ id: "default" })
      .onConflictDoNothing();
    await db
      .insert(siteUiSettings)
      .values({ id: "default" })
      .onConflictDoNothing();
  });

  try {
    await singletonSetup;
  } catch (error) {
    singletonSetup = null;
    throw error;
  }
}

export async function countUsers() {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);
  return row?.count ?? 0;
}

function serializeRow(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === "passwordHash") continue;
    out[key] = value instanceof Date ? value.toISOString() : value;
  }
  return out;
}

const crmResources = new Set<ResourceKey>([
  "inquiries",
  "companies",
  "contacts",
  "leads",
  "lead-activities",
  "follow-ups",
]);

async function crmScopeCondition(
  resource: ResourceKey,
  table: AnyPgTable,
  user: import("@/lib/auth").SessionUser,
) {
  if (
    !crmResources.has(resource) ||
    user.systemRole === "super_admin" ||
    user.crmVisibility === "all"
  )
    return undefined;
  const columns = getTableColumns(table) as Record<
    string,
    AnyColumn | undefined
  >;
  const direct = [columns.ownerId, columns.assignedToId];
  if (user.crmVisibility === "own") direct.push(columns.createdById);
  const directConditions = direct
    .filter((column): column is AnyColumn => Boolean(column))
    .map((column) => eq(column, user.id));
  const teamCondition = columns.teamId
    ? sql`${columns.teamId} in (select ${teamMembers.teamId} from ${teamMembers} where ${teamMembers.userId} = ${user.id})`
    : undefined;

  if (resource === "lead-activities" && columns.leadId) {
    const leadScope =
      user.crmVisibility === "team"
        ? sql`(${leads.ownerId} = ${user.id} or ${leads.teamId} in (select ${teamMembers.teamId} from ${teamMembers} where ${teamMembers.userId} = ${user.id}))`
        : sql`${leads.ownerId} = ${user.id}`;
    return sql`exists (select 1 from ${leads} where ${leads.id} = ${columns.leadId} and ${leadScope})`;
  }

  const conditions =
    user.crmVisibility === "team" && teamCondition
      ? [...directConditions, teamCondition]
      : directConditions;
  return conditions.length ? or(...conditions) : sql`false`;
}

export async function listRecords(
  resource: ResourceKey,
  input: { q?: string; page?: number; user?: import("@/lib/auth").SessionUser },
) {
  const config = resources[resource];
  const db = getDb();
  const table = tables[resource];
  const columns = getTableColumns(table) as Record<
    string,
    AnyColumn | undefined
  >;
  const pageSize = 20;
  const page = Math.max(1, input.page ?? 1);
  const q = input.q?.trim().replace(/[%_]/g, "") ?? "";
  const search = q
    ? or(
        ...config.searchColumns
          .map((name) => columns[name])
          .filter((column): column is AnyColumn => Boolean(column))
          .map((column) => ilike(column, `%${q}%`)),
      )
    : undefined;

  const orderColumn = columns[config.orderBy.column];
  if (!orderColumn)
    throw new Error(`Missing sort column ${config.orderBy.column}`);
  const order =
    config.orderBy.direction === "asc" ? asc(orderColumn) : desc(orderColumn);

  const scope = input.user
    ? await crmScopeCondition(resource, table, input.user)
    : undefined;
  const where = search && scope ? and(search, scope) : (search ?? scope);
  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(table)
      .where(where)
      .orderBy(order)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(table)
      .where(where),
  ]);

  return {
    rows: rows.map((row) => serializeRow(row as Record<string, unknown>)),
    total: countRows[0]?.count ?? 0,
    page,
    pageSize,
  };
}

export async function getRecord(
  resource: ResourceKey,
  id: string,
  user?: import("@/lib/auth").SessionUser,
) {
  const db = getDb();
  const table = tables[resource];
  const columns = getTableColumns(table);
  const idColumn = columns.id;
  if (!idColumn) return null;
  const scope = user
    ? await crmScopeCondition(resource, table, user)
    : undefined;
  const [row] = await db
    .select()
    .from(table)
    .where(scope ? and(eq(idColumn, id), scope) : eq(idColumn, id))
    .limit(1);
  if (!row) return null;
  const record = serializeRow(row as Record<string, unknown>);

  if (resource === "products") {
    record.productPayload = await loadProductPayload(id);
    const productPayload = record.productPayload as Awaited<
      ReturnType<typeof loadProductPayload>
    >;
    // Legacy imports stored related blog cards as links inside the product
    // overview. Surface those links in the manager so existing relationships
    // can be saved or deleted explicitly.
    if (!productPayload.relatedPosts.length) {
      const legacyHtml = [record.overview, record.body, record.richContent]
        .filter((value): value is string => typeof value === "string")
        .join("\n");
      const legacyPaths = linkedArticlePaths(legacyHtml);
      if (legacyPaths.length) {
        const legacyPosts = await publishedPostsByPaths(legacyPaths, 50);
        productPayload.relatedPosts = legacyPosts.map((post, sortOrder) => ({
          postId: post.id,
          sortOrder,
        }));
        record.productPayload = productPayload;
      }
    }
    record.galleryMediaIds = (
      record.productPayload as { galleryMediaIds: string[] }
    ).galleryMediaIds;
    record.relatedProductIds = (
      record.productPayload as {
        relatedProducts: { relatedProductId: string }[];
      }
    ).relatedProducts.map((item) => item.relatedProductId);
  }

  if (resource === "product-categories") {
    record.categoryFaqs = await loadContentFaqs("category", id);
  }

  if (resource === "pages") {
    record.pageSections = await loadPageSections(id);
  }

  if (resource === "teams") {
    const members = await db
      .select({ userId: teamMembers.userId })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, id));
    record.memberIds = members.map((member) => member.userId);
  }

  return record;
}

export async function relationOptions(
  name: RelationName,
  excludeId?: string,
  user?: import("@/lib/auth").SessionUser,
) {
  const db = getDb();
  if (name === "product-categories") {
    const rows = await db
      .select({
        id: productCategories.id,
        title: productCategories.title,
        path: productCategories.path,
      })
      .from(productCategories)
      .orderBy(asc(productCategories.path))
      .limit(2000);
    return rows
      .filter((row) => row.id !== excludeId)
      .map((row) => ({ value: row.id, label: `${row.title}   /${row.path}/` }));
  }
  if (name === "products") {
    const rows = await db
      .select({ id: products.id, title: products.title, path: products.path })
      .from(products)
      .orderBy(asc(products.title))
      .limit(2000);
    return rows
      .filter((row) => row.id !== excludeId)
      .map((row) => ({ value: row.id, label: `${row.title}   /${row.path}/` }));
  }
  if (name === "users") {
    if (
      user &&
      user.systemRole !== "super_admin" &&
      !user.permissionOverrides.includes("crm.assign")
    )
      return [];
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        status: users.status,
      })
      .from(users)
      .orderBy(asc(users.name))
      .limit(2000);
    return rows
      .filter((row) => row.id !== excludeId)
      .map((row) => ({
        value: row.id,
        label: `${row.name} (${row.email})${row.status === "inactive" ? " - inactive" : ""}`,
      }));
  }
  if (name === "teams") {
    if (
      user &&
      user.systemRole !== "super_admin" &&
      !user.permissionOverrides.includes("crm.assign")
    )
      return [];
    const rows = await db
      .select({ id: teams.id, name: teams.name, isActive: teams.isActive })
      .from(teams)
      .orderBy(asc(teams.name))
      .limit(500);
    return rows.map((row) => ({
      value: row.id,
      label: `${row.name}${row.isActive ? "" : " - inactive"}`,
    }));
  }
  if (name === "companies") {
    const rows = await db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .where(
        user
          ? await crmScopeCondition("companies", companies, user)
          : undefined,
      )
      .orderBy(asc(companies.name))
      .limit(2000);
    return rows.map((row) => ({ value: row.id, label: row.name }));
  }
  if (name === "contacts") {
    const rows = await db
      .select({ id: contacts.id, name: contacts.name, email: contacts.email })
      .from(contacts)
      .where(
        user ? await crmScopeCondition("contacts", contacts, user) : undefined,
      )
      .orderBy(asc(contacts.name))
      .limit(2000);
    return rows.map((row) => ({
      value: row.id,
      label: `${row.name}${row.email ? ` (${row.email})` : ""}`,
    }));
  }
  if (name === "inquiries") {
    const rows = await db
      .select({
        id: inquiries.id,
        name: inquiries.name,
        subject: inquiries.subject,
      })
      .from(inquiries)
      .where(
        user
          ? await crmScopeCondition("inquiries", inquiries, user)
          : undefined,
      )
      .orderBy(desc(inquiries.createdAt))
      .limit(2000);
    return rows.map((row) => ({
      value: row.id,
      label: `${row.name}${row.subject ? ` - ${row.subject}` : ""}`,
    }));
  }
  if (name === "leads") {
    const rows = await db
      .select({ id: leads.id, title: leads.title, stage: leads.stage })
      .from(leads)
      .where(user ? await crmScopeCondition("leads", leads, user) : undefined)
      .orderBy(desc(leads.updatedAt))
      .limit(2000);
    return rows.map((row) => ({
      value: row.id,
      label: `${row.title} (${row.stage})`,
    }));
  }
  const rows = await db
    .select({
      id: navLinks.id,
      label: navLinks.label,
      location: navLinks.location,
    })
    .from(navLinks)
    .orderBy(asc(navLinks.sortOrder))
    .limit(2000);
  return rows
    .filter((row) => row.id !== excludeId)
    .map((row) => ({ value: row.id, label: `${row.location}: ${row.label}` }));
}

export async function blogPostOptions() {
  const db = getDb();
  const rows = await db
    .select({ id: posts.id, title: posts.title, path: posts.path, status: posts.status })
    .from(posts)
    .orderBy(asc(posts.title))
    .limit(2000);
  return rows.map((row) => ({
    value: row.id,
    label: `${row.title}   /${row.path}/${row.status === "published" ? "" : " - draft"}`,
  }));
}

export async function fieldsFor(
  resource: ResourceKey,
  currentId?: string,
  user?: import("@/lib/auth").SessionUser,
) {
  const fields = [];
  for (const field of resources[resource].fields) {
    if (
      user &&
      crmResources.has(resource) &&
      ["ownerId", "assignedToId", "teamId"].includes(field.name) &&
      user.systemRole !== "super_admin" &&
      !user.permissionOverrides.includes("crm.assign")
    )
      continue;
    if (
      (field.type === "relation" || field.type === "relationMany") &&
      field.relation
    ) {
      const exclude =
        field.name === "parentId" || field.name === "relatedProductIds"
          ? currentId
          : undefined;
      fields.push({
        ...field,
        options: await relationOptions(field.relation, exclude, user),
      });
    } else {
      fields.push(field);
    }
  }
  return fields;
}

export type MediaItem = {
  id: string;
  url: string;
  filename: string;
  alt: string;
  mimeType: string;
  legacyUrl?: string | null;
};

export async function mediaItems(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return [] as MediaItem[];
  const db = getDb();
  const rows = await db
    .select({
      id: media.id,
      url: media.url,
      legacyUrl: media.legacyUrl,
      filename: media.filename,
      alt: media.alt,
      mimeType: media.mimeType,
    })
    .from(media)
    .where(inArray(media.id, unique));
  const byId = new Map(rows.map((row) => [row.id, row]));
  return unique.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}

export async function getSettings() {
  return withDatabaseRetry(async () => {
    await ensureSingletons();
    const db = getDb();
    const [row] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.id, "default"))
      .limit(1);
    if (!row) throw new Error("Site settings are missing.");
    return row;
  });
}

export async function getPageHtmlOverride(path: string) {
  return withDatabaseRetry(async () => {
    const db = getDb();
    const [row] = await db
      .select()
      .from(pageHtmlOverrides)
      .where(eq(pageHtmlOverrides.path, path))
      .limit(1);
    return row ?? null;
  });
}

export async function getHome() {
  return withDatabaseRetry(async () => {
    await ensureSingletons();
    const db = getDb();
    const [row] = await db
      .select()
      .from(homeContent)
      .where(eq(homeContent.id, "default"))
      .limit(1);
    if (!row) throw new Error("Home content is missing.");
    const heroes = await db
      .select()
      .from(homeHeroImages)
      .orderBy(asc(homeHeroImages.sortOrder));
    const featured = await db
      .select()
      .from(homeFeaturedProducts)
      .orderBy(asc(homeFeaturedProducts.sortOrder));
    const clientLogos =
      row.clientLogos && row.clientLogos.length > 0
        ? row.clientLogos
        : defaultClients;
    const testimonials =
      row.testimonials && row.testimonials.length > 0
        ? row.testimonials
        : defaultTestimonials;
    const strengths =
      row.strengths && row.strengths.length > 0
        ? row.strengths
        : defaultStrengths;
    const stats = row.stats && row.stats.length > 0 ? row.stats : defaultStats;
    const usps = row.usps && row.usps.length > 0 ? row.usps : defaultUsps;
    return {
      ...row,
      clientLogos,
      testimonials,
      strengths,
      stats,
      usps,
      customBandTitle: row.customBandTitle || homeDefaults.customBandTitle,
      customBandEyebrow:
        row.customBandEyebrow || homeDefaults.customBandEyebrow,
      customBandBody: row.customBandBody || homeDefaults.customBandBody,
      customBandButtonText:
        row.customBandButtonText || homeDefaults.customBandButtonText,
      customBandButtonHref:
        row.customBandButtonHref || homeDefaults.customBandButtonHref,
      heroMediaIds: heroes.map((item) => item.mediaId),
      featuredProductIds: featured.map((item) => item.productId),
    };
  });
}

export type FeaturedProductCard = {
  id: string;
  title: string;
  path: string;
  summary: string;
  imageUrl: string | null;
  imageAlt: string;
};

export async function publishedPosts(
  limit = 6,
  wpImportedOnly = false,
  query = "",
) {
  const db = getDb();
  const conditions = [eq(posts.status, "published")];
  if (wpImportedOnly) conditions.push(isNotNull(posts.legacyId));
  const search = query.trim();
  if (search) {
    const pattern = `%${search}%`;
    const match = or(
      ilike(posts.title, pattern),
      ilike(posts.excerpt, pattern),
    );
    if (match) conditions.push(match);
  }
  const rows = await db
    .select({
      id: posts.id,
      title: posts.title,
      path: posts.path,
      excerpt: posts.excerpt,
      publishedAt: posts.publishedAt,
      author: posts.author,
      readingTime: posts.readingTime,
      featured: posts.featured,
      coverMediaId: posts.coverMediaId,
      coverAlt: media.alt,
    })
    .from(posts)
    .leftJoin(media, eq(posts.coverMediaId, media.id))
    .where(and(...conditions))
    .orderBy(desc(posts.publishedAt))
    .limit(limit);
  return rows.map((row) => ({
    ...row,
    coverUrl: row.coverMediaId ? `/api/media/${row.coverMediaId}` : null,
  }));
}

/** Fetch selected published posts in the same order as their supplied paths. */
export async function publishedPostsByPaths(paths: string[], limit = 3) {
  const unique = [...new Set(paths.map((path) => path.replace(/^\/+|\/+$/g, "")).filter(Boolean))].slice(0, limit);
  if (!unique.length) return [];
  const db = getDb();
  const rows = await db
    .select({
      id: posts.id,
      title: posts.title,
      path: posts.path,
      excerpt: posts.excerpt,
      publishedAt: posts.publishedAt,
      author: posts.author,
      readingTime: posts.readingTime,
      featured: posts.featured,
      coverMediaId: posts.coverMediaId,
      coverAlt: media.alt,
    })
    .from(posts)
    .leftJoin(media, eq(posts.coverMediaId, media.id))
    .where(and(eq(posts.status, "published"), inArray(posts.path, unique)));
  const byPath = new Map(rows.map((row) => [row.path.replace(/^\/+|\/+$/g, ""), row]));
  return unique.flatMap((path) => {
    const row = byPath.get(path);
    return row ? [{ ...row, coverUrl: row.coverMediaId ? `/api/media/${row.coverMediaId}` : null }] : [];
  });
}

/** Fetch selected published posts in the order chosen for a product. */
export async function publishedPostsByIds(ids: string[], limit = 3) {
  const unique = [...new Set(ids.filter(Boolean))].slice(0, limit);
  if (!unique.length) return [];
  const db = getDb();
  const rows = await db
    .select({
      id: posts.id,
      title: posts.title,
      path: posts.path,
      excerpt: posts.excerpt,
      publishedAt: posts.publishedAt,
      author: posts.author,
      readingTime: posts.readingTime,
      featured: posts.featured,
      coverMediaId: posts.coverMediaId,
      coverAlt: media.alt,
    })
    .from(posts)
    .leftJoin(media, eq(posts.coverMediaId, media.id))
    .where(and(eq(posts.status, "published"), inArray(posts.id, unique)));
  const byId = new Map(rows.map((row) => [row.id, row]));
  return unique.flatMap((id) => {
    const row = byId.get(id);
    return row
      ? [{ ...row, coverUrl: row.coverMediaId ? `/api/media/${row.coverMediaId}` : null }]
      : [];
  });
}

export async function getHeaderSettings() {
  return withDatabaseRetry(async () => {
    await ensureSingletons();
    const db = getDb();
    const [row] = await db
      .select()
      .from(headerSettings)
      .where(eq(headerSettings.id, "default"))
      .limit(1);
    if (!row) throw new Error("Header settings are missing.");
    return row;
  });
}

export async function getFooterSettings() {
  return withDatabaseRetry(async () => {
    await ensureSingletons();
    const db = getDb();
    const [row] = await db
      .select()
      .from(footerSettings)
      .where(eq(footerSettings.id, "default"))
      .limit(1);
    if (!row) throw new Error("Footer settings are missing.");
    return row;
  });
}

export async function getContactSettings() {
  return withDatabaseRetry(async () => {
    await ensureSingletons();
    const db = getDb();
    const [row] = await db
      .select()
      .from(contactSettings)
      .where(eq(contactSettings.id, "default"))
      .limit(1);
    if (!row) throw new Error("Contact settings are missing.");
    return row;
  });
}

export async function getSiteLabels() {
  const { withSiteLabelDefaults } = await import("@/lib/site-labels");
  await ensureSingletons();
  const [row] = await getDb()
    .select()
    .from(siteUiSettings)
    .where(eq(siteUiSettings.id, "default"))
    .limit(1);
  return withSiteLabelDefaults(row?.labels);
}

/** Published catalogue PDF URL (Catalogues admin), or Site settings catalogue file as fallback. */
export async function getCataloguePdfUrl(): Promise<string | null> {
  try {
    const db = getDb();
    const [row] = await db
      .select({ documentId: catalogues.documentId })
      .from(catalogues)
      .where(
        and(
          eq(catalogues.status, "published"),
          isNotNull(catalogues.documentId),
        ),
      )
      .orderBy(asc(catalogues.sortOrder), asc(catalogues.title))
      .limit(1);
    if (row?.documentId) {
      const items = await mediaItems([row.documentId]);
      const file = items[0];
      if (file?.mimeType === "application/pdf") return mediaDeliveryUrl(file);
    }

    const settings = await getSettings();
    if (settings.catalogueId) {
      const items = await mediaItems([settings.catalogueId]);
      const file = items[0];
      if (file?.mimeType === "application/pdf") return mediaDeliveryUrl(file);
    }
    return null;
  } catch {
    return null;
  }
}

export async function cataloguesForSite(limit = 24) {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: catalogues.id,
        title: catalogues.title,
        description: catalogues.description,
        coverImageId: catalogues.coverImageId,
        documentId: catalogues.documentId,
        version: catalogues.version,
        language: catalogues.language,
      })
      .from(catalogues)
      .where(eq(catalogues.status, "published"))
      .orderBy(asc(catalogues.sortOrder), asc(catalogues.title))
      .limit(limit);
    const mediaRows = await mediaItems(
      rows.flatMap((row) =>
        [row.coverImageId, row.documentId].filter((id): id is string =>
          Boolean(id),
        ),
      ),
    );
    const mediaById = new Map(mediaRows.map((item) => [item.id, item]));
    return rows.map((row) => ({
      ...row,
      cover: row.coverImageId
        ? (mediaById.get(row.coverImageId) ?? null)
        : null,
      documentUrl: row.documentId
        ? (() => {
            const file = mediaById.get(row.documentId);
            return file ? mediaDeliveryUrl(file) : null;
          })()
        : null,
    }));
  } catch {
    return [];
  }
}

export async function galleryForSite(limit = 48) {
  const db = getDb();
  const rows = await db
    .select({
      id: galleryItems.id,
      title: galleryItems.title,
      caption: galleryItems.caption,
      mediaId: galleryItems.mediaId,
    })
    .from(galleryItems)
    .orderBy(asc(galleryItems.sortOrder))
    .limit(limit);
  const items = await mediaItems(rows.map((row) => row.mediaId));
  const mediaById = new Map(items.map((item) => [item.id, item]));
  return rows.map((row) => ({
    ...row,
    media: mediaById.get(row.mediaId) ?? null,
  }));
}

export async function certificatesForSite(limit = 24) {
  const db = getDb();
  const rows = await db
    .select({
      id: certificates.id,
      title: certificates.title,
      caption: certificates.caption,
      mediaId: certificates.mediaId,
    })
    .from(certificates)
    .orderBy(asc(certificates.sortOrder))
    .limit(limit);
  const items = await mediaItems(rows.map((row) => row.mediaId));
  const mediaById = new Map(items.map((item) => [item.id, item]));
  return rows.map((row) => ({
    ...row,
    media: mediaById.get(row.mediaId) ?? null,
  }));
}

export type CategoryShowcase = {
  id: string;
  title: string;
  path: string;
  products: FeaturedProductCard[];
};

export async function homeCategoryShowcases(
  categoryPaths: readonly string[],
  productsPerCategory = 6,
) {
  const db = getDb();
  if (!categoryPaths.length) return [] as CategoryShowcase[];
  const categories = await db
    .select({
      id: productCategories.id,
      title: productCategories.title,
      path: productCategories.path,
    })
    .from(productCategories)
    .where(
      and(
        eq(productCategories.status, "published"),
        inArray(productCategories.path, [...categoryPaths]),
      ),
    );

  const order = new Map(categoryPaths.map((path, index) => [path, index]));
  const sortedCategories = [...categories].sort(
    (a, b) => (order.get(a.path) ?? 0) - (order.get(b.path) ?? 0),
  );

  const showcases: CategoryShowcase[] = [];
  for (const category of sortedCategories) {
    const productRows = await db
      .select({
        id: products.id,
        title: products.title,
        path: products.path,
        summary: products.summary,
      })
      .from(products)
      .where(
        and(
          eq(products.categoryId, category.id),
          eq(products.status, "published"),
        ),
      )
      .orderBy(asc(products.sortOrder), asc(products.title))
      .limit(productsPerCategory);

    const images = await db
      .select({
        productId: productImages.productId,
        url: media.url,
        legacyUrl: media.legacyUrl,
        alt: media.alt,
      })
      .from(productImages)
      .innerJoin(media, eq(productImages.mediaId, media.id))
      .where(
        inArray(
          productImages.productId,
          productRows.map((row) => row.id),
        ),
      )
      .orderBy(asc(productImages.sortOrder));

    const imageByProduct = new Map<string, { url: string; alt: string }>();
    for (const row of images) {
      if (!imageByProduct.has(row.productId)) {
        imageByProduct.set(row.productId, { url: row.url, alt: row.alt ?? "" });
      }
    }

    showcases.push({
      ...category,
      products: productRows.map((row) => {
        const image = imageByProduct.get(row.id);
        return {
          ...row,
          imageUrl: image?.url ?? null,
          imageAlt: image?.alt || row.title,
        };
      }),
    });
  }
  return showcases;
}

/** Home product grids: WordPress-imported categories first, then CMS paths, then site skeleton defaults. */
export async function homePageCategoryShowcases(
  configuredPaths: readonly string[],
  productsPerCategory = 6,
  categoryLimit = 3,
) {
  const migrated = await migratedCategoryShowcases(
    productsPerCategory,
    categoryLimit,
  );
  if (migrated.length) return migrated;

  const paths = configuredPaths.filter(Boolean);
  if (paths.length) {
    const fromCms = await homeCategoryShowcases(paths, productsPerCategory);
    if (fromCms.length) return fromCms;
  }

  const { homeShowcasePaths } = await import("@/lib/site-skeleton");
  return homeCategoryShowcases(homeShowcasePaths, productsPerCategory);
}

/** Product grids on the home page — only categories imported from WordPress (legacy_id set). */
export async function migratedCategoryShowcases(
  productsPerCategory = 5,
  categoryLimit = 3,
) {
  const db = getDb();
  const categories = await db
    .select({
      id: productCategories.id,
      title: productCategories.title,
      path: productCategories.path,
    })
    .from(productCategories)
    .where(
      and(
        eq(productCategories.status, "published"),
        isNotNull(productCategories.legacyId),
      ),
    )
    .orderBy(asc(productCategories.sortOrder), asc(productCategories.title))
    .limit(categoryLimit);

  const showcases: CategoryShowcase[] = [];
  for (const category of categories) {
    const productRows = await db
      .select({
        id: products.id,
        title: products.title,
        path: products.path,
        summary: products.summary,
      })
      .from(products)
      .where(
        and(
          eq(products.categoryId, category.id),
          eq(products.status, "published"),
          isNotNull(products.legacyId),
        ),
      )
      .orderBy(asc(products.sortOrder), asc(products.title))
      .limit(productsPerCategory);

    const images = await db
      .select({
        productId: productImages.productId,
        mediaId: media.id,
        url: media.url,
        legacyUrl: media.legacyUrl,
        alt: media.alt,
      })
      .from(productImages)
      .innerJoin(media, eq(productImages.mediaId, media.id))
      .where(
        inArray(
          productImages.productId,
          productRows.map((row) => row.id),
        ),
      )
      .orderBy(asc(productImages.sortOrder));

    const imageByProduct = new Map<string, { url: string; alt: string }>();
    for (const row of images) {
      if (!imageByProduct.has(row.productId)) {
        imageByProduct.set(row.productId, {
          url: `/api/media/${row.mediaId}`,
          alt: row.alt ?? "",
        });
      }
    }

    showcases.push({
      ...category,
      products: productRows.map((row) => {
        const image = imageByProduct.get(row.id);
        return {
          ...row,
          imageUrl: image?.url ?? null,
          imageAlt: image?.alt || row.title,
        };
      }),
    });
  }
  return showcases;
}

export async function featuredProductsForHome(productIds: string[]) {
  const ordered = [...new Set(productIds.filter(Boolean))];
  if (!ordered.length) return [] as FeaturedProductCard[];
  const db = getDb();
  const rows = await db
    .select({
      id: products.id,
      title: products.title,
      path: products.path,
      summary: products.summary,
    })
    .from(products)
    .where(and(inArray(products.id, ordered), isNotNull(products.legacyId)));

  const images = await db
    .select({
      productId: productImages.productId,
      mediaId: media.id,
      url: media.url,
      legacyUrl: media.legacyUrl,
      alt: media.alt,
    })
    .from(productImages)
    .innerJoin(media, eq(productImages.mediaId, media.id))
    .where(inArray(productImages.productId, ordered))
    .orderBy(asc(productImages.sortOrder));

  const imageByProduct = new Map<string, { url: string; alt: string }>();
  for (const row of images) {
    if (!imageByProduct.has(row.productId)) {
      imageByProduct.set(row.productId, {
        url: `/api/media/${row.mediaId}`,
        alt: row.alt ?? "",
      });
    }
  }

  const byId = new Map(rows.map((row) => [row.id, row]));
  return ordered.flatMap((id) => {
    const row = byId.get(id);
    if (!row) return [];
    const image = imageByProduct.get(id);
    return [
      {
        ...row,
        imageUrl: image?.url ?? null,
        imageAlt: image?.alt || row.title,
      },
    ];
  });
}

export type CatalogueGroup = {
  id: string;
  title: string;
  path: string;
  summary: string;
  imageUrl: string | null;
  imageAlt: string;
};

export type CatalogueItem = CatalogueGroup & {
  groupId: string;
  kind: "category" | "product";
};

export async function catalogueListing() {
  const db = getDb();
  const categoryRows = await db
    .select({
      id: productCategories.id,
      title: productCategories.title,
      path: productCategories.path,
      summary: productCategories.summary,
      parentId: productCategories.parentId,
      imageId: productCategories.imageId,
      thumbnailId: productCategories.thumbnailId,
    })
    .from(productCategories)
    .where(eq(productCategories.status, "published"))
    .orderBy(asc(productCategories.sortOrder), asc(productCategories.title));

  const categoryMedia = await mediaItems(
    categoryRows.flatMap((row) =>
      [row.thumbnailId, row.imageId].filter((id): id is string => Boolean(id)),
    ),
  );
  const categoryMediaById = new Map(
    categoryMedia.map((item) => [item.id, item]),
  );
  const categoryImage = (row: (typeof categoryRows)[number]) => {
    const item =
      (row.thumbnailId ? categoryMediaById.get(row.thumbnailId) : undefined) ??
      (row.imageId ? categoryMediaById.get(row.imageId) : undefined);
    return item
      ? { url: mediaDeliveryUrl(item), alt: item.alt || row.title }
      : { url: null, alt: row.title };
  };

  const parentOf = new Map(categoryRows.map((row) => [row.id, row.parentId]));
  const rootOf = (id: string | null) => {
    let current = id;
    const seen = new Set<string>();
    while (current && parentOf.get(current) && !seen.has(current)) {
      seen.add(current);
      current = parentOf.get(current) ?? null;
    }
    return current ?? "";
  };

  const topLevel = categoryRows.filter((row) => !row.parentId);
  const groups = (topLevel.length ? topLevel : categoryRows).map((row) => {
    const image = categoryImage(row);
    return {
      id: row.id,
      title: row.title,
      path: row.path,
      summary: row.summary,
      imageUrl: image.url,
      imageAlt: image.alt,
    };
  });

  const productRows = await db
    .select({
      id: products.id,
      title: products.title,
      path: products.path,
      summary: products.summary,
      categoryId: products.categoryId,
    })
    .from(products)
    .where(eq(products.status, "published"))
    .orderBy(asc(products.sortOrder), asc(products.title));

  const productImageRows = productRows.length
    ? await db
        .select({
          productId: productImages.productId,
          mediaId: media.id,
          url: media.url,
          legacyUrl: media.legacyUrl,
          alt: media.alt,
        })
        .from(productImages)
        .innerJoin(media, eq(productImages.mediaId, media.id))
        .where(
          inArray(
            productImages.productId,
            productRows.map((row) => row.id),
          ),
        )
        .orderBy(asc(productImages.sortOrder))
    : [];
  const productImageById = new Map<string, { url: string; alt: string }>();
  for (const row of productImageRows) {
    if (!productImageById.has(row.productId)) {
      productImageById.set(row.productId, {
        url: mediaDeliveryUrl({ id: row.mediaId, url: row.url, legacyUrl: row.legacyUrl }),
        alt: row.alt ?? "",
      });
    }
  }

  const childCategories: CatalogueItem[] = categoryRows
    .filter((row) => row.parentId)
    .map((row) => {
      const image = categoryImage(row);
      return {
        id: row.id,
        title: row.title,
        path: row.path,
        summary: row.summary,
        imageUrl: image.url,
        imageAlt: image.alt,
        groupId: rootOf(row.id),
        kind: "category" as const,
      };
    });

  const productItems: CatalogueItem[] = productRows.map((row) => {
    const image = productImageById.get(row.id);
    return {
      id: row.id,
      title: row.title,
      path: row.path,
      summary: row.summary,
      imageUrl: image?.url ?? null,
      imageAlt: image?.alt || row.title,
      groupId: rootOf(row.categoryId),
      kind: "product" as const,
    };
  });

  return { groups, items: [...childCategories, ...productItems] };
}

export async function dashboardSummary(
  user?: import("@/lib/auth").SessionUser,
) {
  const db = getDb();
  const pairs = [
    ["pages", pages],
    ["product-categories", productCategories],
    ["products", products],
    ["locations", locationPages],
    ["exports", exportPages],
    ["posts", posts],
    ["blog-categories", blogCategories],
    ["blog-tags", blogTags],
    ["gallery", galleryItems],
    ["gallery-albums", galleryAlbums],
    ["certificates", certificates],
    ["catalogues", catalogues],
    ["forms", cmsForms],
    ["media", media],
    ["inquiries", inquiries],
    ["companies", companies],
    ["contacts", contacts],
    ["leads", leads],
    ["lead-activities", leadActivities],
    ["follow-ups", followUpTasks],
    ["redirects", redirects],
    ["nav-links", navLinks],
    ["users", users],
    ["teams", teams],
    ["page-html", pageHtmlOverrides],
  ] as const;

  const counts = Object.fromEntries(
    await Promise.all(
      pairs.map(async ([key, table]) => {
        const scope = user
          ? await crmScopeCondition(key, table, user)
          : undefined;
        const [row] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(table)
          .where(scope);
        return [key, row?.count ?? 0] as const;
      }),
    ),
  ) as Record<(typeof pairs)[number][0], number>;

  const recent = await db
    .select()
    .from(inquiries)
    .where(
      user ? await crmScopeCondition("inquiries", inquiries, user) : undefined,
    )
    .orderBy(desc(inquiries.createdAt))
    .limit(5);
  return { counts, recent };
}

export async function crmDashboardSummary(
  user: import("@/lib/auth").SessionUser,
) {
  const db = getDb();
  const [leadScope, inquiryScope, taskScope] = await Promise.all([
    crmScopeCondition("leads", leads, user),
    crmScopeCondition("inquiries", inquiries, user),
    crmScopeCondition("follow-ups", followUpTasks, user),
  ]);
  const combine = (
    scope: ReturnType<typeof sql> | undefined,
    condition: ReturnType<typeof sql>,
  ) => (scope ? and(scope, condition) : condition);
  const [[open], [unassigned], [overdue], pipeline] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(leads)
      .where(
        combine(leadScope, sql`${leads.stage} not in ('won','lost','closed')`),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(inquiries)
      .where(
        combine(
          inquiryScope,
          sql`${inquiries.assignedToId} is null and ${inquiries.status} = 'new'`,
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(followUpTasks)
      .where(
        combine(
          taskScope,
          sql`${followUpTasks.status} = 'pending' and ${followUpTasks.dueAt} < now()`,
        ),
      ),
    db
      .select({ stage: leads.stage, count: sql<number>`count(*)::int` })
      .from(leads)
      .where(leadScope)
      .groupBy(leads.stage),
  ]);
  return {
    openLeads: open?.count ?? 0,
    unassignedInquiries: unassigned?.count ?? 0,
    overdueFollowUps: overdue?.count ?? 0,
    pipeline,
  };
}
