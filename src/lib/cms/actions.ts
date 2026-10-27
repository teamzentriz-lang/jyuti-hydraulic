"use server";

import { randomUUID } from "crypto";
import { eq, getTableColumns, sql, type AnyColumn } from "drizzle-orm";
import type { AnyPgTable } from "drizzle-orm/pg-core";
import { revalidatePath } from "next/cache";
import { revalidatePublicSite } from "@/lib/cms/revalidate-public";
import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { CmsError, toCmsMessage } from "@/db/errors";
import {
  contactSettings,
  footerSettings,
  headerSettings,
  homeContent,
  homeFeaturedProducts,
  homeHeroImages,
  companies,
  contacts,
  inquiries,
  leadActivities,
  leads,
  media,
  navLinks,
  productCategories,
  posts,
  products,
  pageHtmlOverrides,
  routes,
  sessions,
  siteSettings,
  siteHtmlSettings,
  siteUiSettings,
  teamMembers,
  users,
  type SpecRow,
  type WhyItem,
  type ClientItem,
  type StatItem,
  type StrengthItem,
  type TestimonialItem,
  type UspItem,
} from "@/db/schema";
import {
  createSession,
  destroySession,
  hashPassword,
  requireSuperAdmin,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  hasPermission,
  permissionForResource,
  requirePermission,
} from "@/lib/authorization";
import { getRecord, tables } from "@/lib/cms/queries";
import {
  saveContentFaqs,
  saveProductCategoryAssignments,
  saveProductPayload,
  savePageSections,
  loadProductPayload,
  type FaqPayload,
  type PageSectionPayload,
} from "@/lib/cms/entity-data";
import { readProductPayloadFromForm } from "@/lib/cms/parse-product-payload";
import { readPageScalars } from "@/lib/cms/page-save";
import { readProductScalars } from "@/lib/cms/product-save";
import {
  parseResource,
  readFormData,
  resources,
  type ResourceKey,
} from "@/lib/cms/resources";
import { releaseRoute, reserveRoute } from "@/lib/cms/routes";
import {
  normalizePath,
  normalizeRedirectPath,
  normalizeSlug,
  publicPath,
} from "@/lib/paths";
import { sanitizeRichText } from "@/lib/sanitize";
import { deleteStoredObject } from "@/lib/storage";

export type ActionState = { error: string } | null;

const routeKinds = {
  pages: "page",
  "product-categories": "category",
  products: "product",
  locations: "location",
  exports: "export",
  posts: "post",
} as const;

const virtualFields = new Set([
  "galleryMediaIds",
  "relatedProductIds",
  "password",
  "memberIds",
  "heroMediaIds",
  "featuredProductIds",
  "_specs",
  "_features",
  "_applications",
  "_documents",
  "_options",
  "_technicalTables",
  "_related",
  "_sections",
  "_faqs",
  "_contentTables",
  "_pageHeaderHtml",
  "_pageFooterHtml",
  "_pageHtmlEnabled",
  "entityPayload",
]);

const crmResources = new Set<ResourceKey>([
  "inquiries",
  "companies",
  "contacts",
  "leads",
  "lead-activities",
  "follow-ups",
]);
const assignmentFields = ["ownerId", "assignedToId", "teamId"] as const;

function adminHref(resource: string, id?: string) {
  return id ? `/admin/${resource}/${id}/` : `/admin/${resource}/`;
}

async function assertNoParentCycle(
  tx: Pick<ReturnType<typeof getDb>, "select">,
  table: typeof productCategories | typeof navLinks,
  id: string,
  parentId: string | null,
) {
  let current = parentId;
  const seen = new Set<string>();
  for (let depth = 0; current && depth < 12; depth += 1) {
    if (current === id)
      throw new CmsError("That parent would put this item inside itself.");
    if (seen.has(current)) break;
    seen.add(current);
    const [row] = await tx
      .select({ parentId: table.parentId })
      .from(table)
      .where(eq(table.id, current))
      .limit(1);
    current = row?.parentId ?? null;
  }
}

export async function saveResourceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const resource = String(formData.get("resource") ?? "") as ResourceKey;
  const existingId = String(formData.get("id") ?? "");
  if (!resources[resource]) return { error: "Unknown section." };

  try {
    const actor = await requireUser();
    if (resource === "users") await requireSuperAdmin();
    else requirePermission(actor, permissionForResource(resource));
    if (resource === "media" && !existingId) {
      throw new CmsError("Upload files from the media library.");
    }

    const raw =
      resource === "products"
        ? (readProductScalars(formData) as Record<string, unknown>)
        : resource === "pages"
          ? (readPageScalars(formData) as Record<string, unknown>)
          : readFormData(resource, formData);
    if (typeof raw.slug === "string") raw.slug = normalizeSlug(raw.slug);
    if (typeof raw.path === "string") {
      raw.path =
        resource === "page-html"
          ? normalizeRedirectPath(raw.path)
          : normalizePath(raw.path);
    }
    const data =
      resource === "products" || resource === "pages"
        ? raw
        : parseResource(resource, raw);
    const row: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      if (virtualFields.has(key)) continue;
      const richKeys = new Set([
        "body",
        "richContent",
        "overview",
        "featuresText",
        "benefits",
        "advantages",
        "applicationsText",
        "workingPrinciple",
        "construction",
        "material",
        "manufacturingDetails",
        "qualityInformation",
        "maintenanceInformation",
        "safetyInformation",
        "customizationInformation",
      ]);
      if (richKeys.has(key) && typeof value === "string") {
        row[key] = sanitizeRichText(value);
        continue;
      }
      if (
        resources[resource].fields.some(
          (field) => field.name === key && field.type === "richtext",
        ) &&
        typeof value === "string"
      ) {
        row[key] = sanitizeRichText(value);
        continue;
      }
      row[key] = value;
    }

    const mode = resources[resource].pathMode;
    if (mode === "post") row.path = data.slug;
    if (mode === "location") row.path = `city/${data.slug}`;
    if (mode === "export") row.path = `exports/${data.slug}`;
    if (typeof row.email === "string") row.email = row.email.toLowerCase();
    if ("publishedAt" in row) {
      row.publishedAt = row.publishedAt
        ? new Date(String(row.publishedAt))
        : null;
    }
    for (const field of resources[resource].fields) {
      if (field.type === "datetime" && field.name in row) {
        row[field.name] = row[field.name]
          ? new Date(String(row[field.name]))
          : null;
      }
    }

    let existingScoped: Record<string, unknown> | null = null;
    if (existingId && crmResources.has(resource)) {
      existingScoped = await getRecord(resource, existingId, actor);
      if (!existingScoped)
        throw new CmsError(
          "That CRM record is outside your allowed visibility.",
        );
    }
    if (crmResources.has(resource) && actor.systemRole !== "super_admin") {
      const canAssign = hasPermission(actor, "crm.assign");
      if (!canAssign) {
        if (existingScoped) {
          for (const field of assignmentFields) {
            if (field in row) row[field] = existingScoped[field] ?? null;
          }
        }
        if (!existingId) {
          if ("ownerId" in row) row.ownerId = actor.id;
          if ("assignedToId" in row) row.assignedToId = actor.id;
          if ("teamId" in row) row.teamId = null;
        }
      }
    }

    if (resource === "redirects") {
      row.fromPath = normalizeRedirectPath(String(data.fromPath));
      row.toPath = normalizeRedirectPath(String(data.toPath));
      if (row.fromPath === row.toPath)
        throw new CmsError("The redirect has to point somewhere else.");
    }
    if (Array.isArray(row.specs)) {
      row.specs = row.specs.filter((item) => {
        const spec = item as SpecRow;
        return spec.label.trim() || spec.value.trim();
      });
    }

    let passwordHash: string | undefined;
    if (resource === "users") {
      const password = String(data.password ?? "");
      if (!existingId && password.length < 8)
        throw new CmsError("Password must be at least 8 characters.");
      if (existingId && password && password.length < 8)
        throw new CmsError("Password must be at least 8 characters.");
      if (!existingId && !password)
        throw new CmsError("Set a password for the new account.");
      if (password) passwordHash = await hashPassword(password);
    }

    const db = getDb();
    const id = existingId || randomUUID();
    const table = tables[resource] as AnyPgTable;
    const idColumn = getTableColumns(table).id as AnyColumn | undefined;
    if (!idColumn) throw new CmsError("This record cannot be saved.");

    const kind = routeKinds[resource as keyof typeof routeKinds];
    let previousPath: string | undefined;
    if (existingId && kind) {
      const [existing] = await db
        .select()
        .from(table)
        .where(eq(idColumn, existingId))
        .limit(1);
      const path = (existing as { path?: unknown } | undefined)?.path;
      previousPath = typeof path === "string" ? path : undefined;
    }

    await db.transaction(async (tx) => {
      if (resource === "users" && existingId) {
        const [existing] = await tx
          .select()
          .from(users)
          .where(eq(users.id, existingId))
          .limit(1);
        if (!existing) throw new CmsError("That account no longer exists.");
        if (
          existing.systemRole === "super_admin" &&
          (row.systemRole !== "super_admin" || row.status !== "active")
        ) {
          const [countRow] = await tx
            .select({ count: sql<number>`count(*)::int` })
            .from(users)
            .where(
              sql`${users.systemRole} = 'super_admin' and ${users.status} = 'active'`,
            );
          if ((countRow?.count ?? 0) <= 1)
            throw new CmsError("Keep at least one active Super Admin.");
        }
      }

      if (resource === "product-categories") {
        await assertNoParentCycle(
          tx,
          productCategories,
          id,
          (row.parentId as string | null) ?? null,
        );
      }
      if (resource === "nav-links") {
        await assertNoParentCycle(
          tx,
          navLinks,
          id,
          (row.parentId as string | null) ?? null,
        );
      }

      const values = {
        ...row,
        ...(crmResources.has(resource) &&
        !existingId &&
        resource !== "inquiries"
          ? { createdById: actor.id }
          : {}),
        ...(resource === "follow-ups" && row.status === "completed"
          ? { completedAt: new Date() }
          : {}),
        ...(resource === "leads" &&
        ["won", "lost", "closed"].includes(String(row.stage))
          ? { closedAt: new Date() }
          : {}),
        ...(resource === "users"
          ? { role: row.systemRole === "super_admin" ? "admin" : "editor" }
          : {}),
        ...(resource === "users" && row.status === "inactive"
          ? { deactivatedAt: new Date() }
          : {}),
        ...(passwordHash ? { passwordHash } : {}),
        updatedAt: new Date(),
      };

      if (existingId) {
        await tx
          .update(table)
          .set(values as never)
          .where(eq(idColumn, existingId));
      } else {
        await tx.insert(table).values({ ...values, id } as never);
      }

      if (resource === "products") {
        const payload = readProductPayloadFromForm(formData);
        await saveProductPayload(tx, id, payload);
        await saveProductCategoryAssignments(
          tx,
          id,
          formData
            .getAll("categoryIds")
            .filter((value): value is string => typeof value === "string"),
        );

        const overridePath = publicPath(String(row.path ?? ""));
        const headerHtml = sanitizeRichText(
          String(formData.get("_pageHeaderHtml") ?? ""),
        );
        const footerHtml = sanitizeRichText(
          String(formData.get("_pageFooterHtml") ?? ""),
        );
        const isActive = formData.get("_pageHtmlEnabled") === "on";
        const [existingOverride] = await tx
          .select({ id: pageHtmlOverrides.id })
          .from(pageHtmlOverrides)
          .where(eq(pageHtmlOverrides.path, overridePath))
          .limit(1);

        if (existingOverride) {
          await tx
            .update(pageHtmlOverrides)
            .set({ headerHtml, footerHtml, isActive, updatedAt: new Date() })
            .where(eq(pageHtmlOverrides.id, existingOverride.id));
        } else if (headerHtml || footerHtml || isActive) {
          await tx.insert(pageHtmlOverrides).values({
            path: overridePath,
            headerHtml,
            footerHtml,
            isActive,
          });
        }
      }

      if (resource === "product-categories") {
        const faqsRaw = String(formData.get("_faqs") ?? "");
        let faqs: FaqPayload[] = [];
        try {
          faqs = faqsRaw ? (JSON.parse(faqsRaw) as FaqPayload[]) : [];
        } catch {
          throw new CmsError("Could not read category FAQs.");
        }
        await saveContentFaqs(tx, "category", id, faqs);
      }

      if (resource === "pages") {
        const sectionsRaw = String(formData.get("_sections") ?? "");
        let sections: PageSectionPayload[] = [];
        try {
          sections = sectionsRaw
            ? (JSON.parse(sectionsRaw) as PageSectionPayload[])
            : [];
        } catch {
          throw new CmsError("Could not read page sections.");
        }
        await savePageSections(tx, id, sections);
      }

      if (resource === "teams") {
        const memberIds = [
          ...new Set((data.memberIds as string[] | undefined) ?? []),
        ];
        await tx.delete(teamMembers).where(eq(teamMembers.teamId, id));
        if (memberIds.length)
          await tx
            .insert(teamMembers)
            .values(memberIds.map((userId) => ({ teamId: id, userId })));
      }

      if (
        resource === "leads" &&
        existingScoped &&
        existingScoped.stage !== row.stage
      ) {
        await tx.insert(leadActivities).values({
          leadId: id,
          type: "status_change",
          subject: `Stage changed to ${String(row.stage).replace("_", " ")}`,
          details: `Previous stage: ${String(existingScoped.stage ?? "unknown")}`,
          occurredAt: new Date(),
          createdById: actor.id,
        });
      }

      if (kind && typeof row.path === "string") {
        await reserveRoute(tx, {
          path: row.path,
          kind,
          entityId: id,
          status: (row.status as "draft" | "published") ?? "draft",
        });
      }
    });

    if (resource === "users" && row.status === "inactive" && existingId) {
      await db.delete(sessions).where(eq(sessions.userId, existingId));
    }
    await writeAuditLog({
      actorId: actor.id,
      action: existingId ? "updated" : "created",
      entityType: resource,
      entityId: id,
      metadata:
        resource === "users"
          ? {
              systemRole: row.systemRole,
              status: row.status,
              crmVisibility: row.crmVisibility,
            }
          : crmResources.has(resource)
            ? {
                ownerId: row.ownerId ?? row.assignedToId ?? null,
                teamId: row.teamId ?? null,
                stage: row.stage ?? row.status ?? null,
              }
            : {},
    });

    const publicPaths = [
      typeof row.path === "string" ? row.path : undefined,
      previousPath,
    ].filter((value): value is string => Boolean(value));
    if (resource === "redirects" && typeof row.fromPath === "string") {
      publicPaths.push(normalizePath(row.fromPath));
    }
    revalidatePublicSite(publicPaths);
    revalidatePath("/admin");
    redirect(`${adminHref(resource, id)}?saved=1`);
  } catch (error) {
    return { error: toCmsMessage(error) };
  }
}

export async function cloneProductAction(formData: FormData) {
  const sourceId = String(formData.get("id") ?? "");
  if (!sourceId) redirect("/admin/products/");

  try {
    const actor = await requireUser();
    requirePermission(actor, "cms.catalogue.manage");
    const db = getDb();
    const [source] = await db
      .select()
      .from(products)
      .where(eq(products.id, sourceId))
      .limit(1);
    if (!source) throw new CmsError("That product no longer exists.");

    const payload = await loadProductPayload(sourceId);
    const basePath = normalizePath(source.path);
    const baseSlug = normalizeSlug(source.slug);
    let duplicatePath = "";
    let duplicateSlug = "";
    for (let copyNumber = 1; copyNumber <= 999; copyNumber += 1) {
      const suffix = copyNumber === 1 ? "-copy" : `-copy-${copyNumber}`;
      const pathCandidate = `${basePath.slice(0, 400 - suffix.length)}${suffix}`;
      const slugCandidate = `${baseSlug.slice(0, 180 - suffix.length)}${suffix}`;
      const [taken] = await db
        .select({ path: routes.path })
        .from(routes)
        .where(eq(routes.path, pathCandidate))
        .limit(1);
      if (!taken) {
        duplicatePath = pathCandidate;
        duplicateSlug = slugCandidate;
        break;
      }
    }
    if (!duplicatePath) {
      throw new CmsError("Could not create an unused copy URL.");
    }

    const id = randomUUID();
    const {
      id: _sourceId,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      legacyId: _legacyId,
      legacySlug: _legacySlug,
      legacyUrl: _legacyUrl,
      legacyType: _legacyType,
      ...sourceValues
    } = source;
    const title = `${source.title} (Copy)`.slice(0, 300);

    await db.transaction(async (tx) => {
      await tx.insert(products).values({
        ...sourceValues,
        id,
        title,
        slug: duplicateSlug,
        path: duplicatePath,
        canonicalUrl: null,
        status: "draft",
        updatedAt: new Date(),
      });
      await saveProductPayload(tx, id, payload);
      await reserveRoute(tx, {
        path: duplicatePath,
        kind: "product",
        entityId: id,
        status: "draft",
      });
    });

    await writeAuditLog({
      actorId: actor.id,
      action: "cloned",
      entityType: "products",
      entityId: id,
      metadata: { sourceId },
    });
    revalidatePath("/admin/products");
    redirect(`${adminHref("products", id)}?cloned=1`);
  } catch (error) {
    const message = toCmsMessage(error);
    redirect(`/admin/products/?error=${encodeURIComponent(message)}`);
  }
}

export async function clonePostAction(formData: FormData) {
  const sourceId = String(formData.get("id") ?? "");
  if (!sourceId) redirect("/admin/posts/");

  try {
    const actor = await requireUser();
    requirePermission(actor, "cms.content.manage");
    const db = getDb();
    const [source] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, sourceId))
      .limit(1);
    if (!source) throw new CmsError("That post no longer exists.");

    const basePath = normalizePath(source.path);
    const baseSlug = normalizeSlug(source.slug);
    let duplicatePath = "";
    let duplicateSlug = "";
    for (let copyNumber = 1; copyNumber <= 999; copyNumber += 1) {
      const suffix = copyNumber === 1 ? "-copy" : `-copy-${copyNumber}`;
      const pathCandidate = `${basePath.slice(0, 400 - suffix.length)}${suffix}`;
      const slugCandidate = `${baseSlug.slice(0, 180 - suffix.length)}${suffix}`;
      const [taken] = await db
        .select({ path: routes.path })
        .from(routes)
        .where(eq(routes.path, pathCandidate))
        .limit(1);
      if (!taken) {
        duplicatePath = pathCandidate;
        duplicateSlug = slugCandidate;
        break;
      }
    }
    if (!duplicatePath) {
      throw new CmsError("Could not create an unused copy URL.");
    }

    const id = randomUUID();
    const {
      id: _sourceId,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      legacyId: _legacyId,
      legacySlug: _legacySlug,
      legacyUrl: _legacyUrl,
      legacyType: _legacyType,
      ...sourceValues
    } = source;
    const title = `${source.title} (Copy)`.slice(0, 300);

    await db.transaction(async (tx) => {
      await tx.insert(posts).values({
        ...sourceValues,
        id,
        title,
        slug: duplicateSlug,
        path: duplicatePath,
        canonicalUrl: null,
        status: "draft",
        publishedAt: null,
        updatedAt: new Date(),
      });
      await reserveRoute(tx, {
        path: duplicatePath,
        kind: "post",
        entityId: id,
        status: "draft",
      });
    });

    await writeAuditLog({
      actorId: actor.id,
      action: "cloned",
      entityType: "posts",
      entityId: id,
      metadata: { sourceId },
    });
    revalidatePath("/admin/posts");
    redirect(`${adminHref("posts", id)}?cloned=1`);
  } catch (error) {
    const message = toCmsMessage(error);
    redirect(`/admin/posts/?error=${encodeURIComponent(message)}`);
  }
}

export async function deleteResourceAction(formData: FormData) {
  const resource = String(formData.get("resource") ?? "") as ResourceKey;
  const id = String(formData.get("id") ?? "");
  if (!resources[resource] || !id) redirect("/admin/");

  let deletedPath: string | undefined;

  try {
    const actor = await requireUser();
    if (resource === "users") await requireSuperAdmin();
    else requirePermission(actor, permissionForResource(resource));
    if (crmResources.has(resource) && !(await getRecord(resource, id, actor))) {
      throw new CmsError("That CRM record is outside your allowed visibility.");
    }
    const db = getDb();
    const removed: { storageDriver: "local" | "r2"; storageKey: string }[] = [];
    const table = tables[resource] as AnyPgTable;
    const idColumn = getTableColumns(table).id as AnyColumn | undefined;
    if (!idColumn) throw new CmsError("This record cannot be deleted.");

    const kind = routeKinds[resource as keyof typeof routeKinds];
    if (kind) {
      const [existing] = await db
        .select()
        .from(table)
        .where(eq(idColumn, id))
        .limit(1);
      const path = (existing as { path?: unknown } | undefined)?.path;
      deletedPath = typeof path === "string" ? path : undefined;
    }

    await db.transaction(async (tx) => {
      if (resource === "users") {
        if (actor.id === id)
          throw new CmsError(
            "You cannot delete the account you are signed in with.",
          );
        const [existing] = await tx
          .select()
          .from(users)
          .where(eq(users.id, id))
          .limit(1);
        if (existing?.systemRole === "super_admin") {
          const [countRow] = await tx
            .select({ count: sql<number>`count(*)::int` })
            .from(users)
            .where(
              sql`${users.systemRole} = 'super_admin' and ${users.status} = 'active'`,
            );
          if (existing.status === "active" && (countRow?.count ?? 0) <= 1)
            throw new CmsError("Keep at least one active Super Admin.");
        }
      }

      if (resource === "media") {
        const [file] = await tx
          .select()
          .from(media)
          .where(eq(media.id, id))
          .limit(1);
        if (file)
          removed.push({
            storageDriver: file.storageDriver,
            storageKey: file.storageKey,
          });
      }

      if (kind) await releaseRoute(tx, id, kind);
      await tx.delete(table).where(eq(idColumn, id));
    });

    await writeAuditLog({
      actorId: actor.id,
      action: "deleted",
      entityType: resource,
      entityId: id,
    });

    const stored = removed[0];
    if (stored) {
      await deleteStoredObject(stored.storageDriver, stored.storageKey).catch(
        (error) => {
          console.error("Stored file was not removed", error);
        },
      );
    }
  } catch (error) {
    const message = toCmsMessage(error, "delete");
    redirect(`${adminHref(resource, id)}?error=${encodeURIComponent(message)}`);
  }

  revalidatePublicSite(deletedPath ? [deletedPath] : []);
  revalidatePath("/admin");
  redirect(adminHref(resource));
}

export async function convertInquiryToLeadAction(formData: FormData) {
  const inquiryId = String(formData.get("inquiryId") ?? "");
  if (!inquiryId) redirect("/admin/inquiries/");
  const actor = await requireUser();
  requirePermission(actor, "inquiries.manage");
  requirePermission(actor, "crm.leads.manage");
  const visible = await getRecord("inquiries", inquiryId, actor);
  if (!visible)
    throw new CmsError("That enquiry is outside your allowed visibility.");
  const db = getDb();
  let leadId = String(visible.convertedLeadId ?? "");
  if (!leadId) {
    leadId = randomUUID();
    await db.transaction(async (tx) => {
      const companyId = visible.company ? randomUUID() : null;
      const contactId = randomUUID();
      if (companyId) {
        await tx.insert(companies).values({
          id: companyId,
          name: String(visible.company),
          email: String(visible.email ?? ""),
          phone: String(visible.phone ?? ""),
          ownerId: (visible.assignedToId as string | null) ?? actor.id,
          teamId: (visible.teamId as string | null) ?? null,
          createdById: actor.id,
        });
      }
      await tx.insert(contacts).values({
        id: contactId,
        companyId,
        name: String(visible.name),
        email: String(visible.email ?? ""),
        phone: String(visible.phone ?? ""),
        ownerId: (visible.assignedToId as string | null) ?? actor.id,
        teamId: (visible.teamId as string | null) ?? null,
        createdById: actor.id,
      });
      await tx.insert(leads).values({
        id: leadId,
        inquiryId,
        companyId,
        contactId,
        title: String(visible.subject || `Enquiry from ${visible.name}`),
        description: String(visible.message ?? ""),
        stage: visible.assignedToId ? "assigned" : "new",
        priority:
          (visible.priority as "low" | "normal" | "high" | "urgent") ??
          "normal",
        ownerId: (visible.assignedToId as string | null) ?? actor.id,
        teamId: (visible.teamId as string | null) ?? null,
        nextFollowUpAt: visible.nextFollowUpAt
          ? new Date(String(visible.nextFollowUpAt))
          : null,
        createdById: actor.id,
      });
      await tx
        .update(inquiries)
        .set({
          status: "converted",
          convertedLeadId: leadId,
          updatedAt: new Date(),
        })
        .where(eq(inquiries.id, inquiryId));
      await tx.insert(leadActivities).values({
        leadId,
        type: "note",
        subject: "Lead created from website enquiry",
        details: String(visible.message ?? ""),
        createdById: actor.id,
      });
    });
    await writeAuditLog({
      actorId: actor.id,
      action: "converted_to_lead",
      entityType: "inquiries",
      entityId: inquiryId,
      metadata: { leadId },
    });
  }
  revalidatePath("/admin");
  redirect(`/admin/leads/${leadId}/`);
}

const optionalUuid = z
  .string()
  .nullable()
  .transform((value, ctx) => {
    if (!value) return null;
    const parsed = z.uuid().safeParse(value);
    if (!parsed.success) {
      ctx.addIssue({ code: "custom", message: "Choose a valid file." });
      return z.NEVER;
    }
    return parsed.data;
  });

const settingsSchema = z.object({
  companyName: z.string().trim().min(1).max(160),
  logoId: optionalUuid,
  phonePrimary: z.string().trim().min(1).max(40),
  phoneSecondary: z.string().trim().max(40).nullable(),
  emailPrimary: z.email(),
  emailSecondary: z.union([z.email(), z.literal("")]).nullable(),
  enquiryToEmail: z.email(),
  address: z.string().trim().min(1).max(500),
  whatsapp: z.string().trim().max(40).nullable(),
  youtubeUrl: z.union([z.url(), z.literal("")]).nullable(),
  facebookUrl: z.union([z.url(), z.literal("")]).nullable(),
  instagramUrl: z.union([z.url(), z.literal("")]).nullable(),
  linkedinUrl: z.union([z.url(), z.literal("")]).nullable(),
  catalogueId: optionalUuid,
  footerText: z.string().trim().max(2000),
  mapUrl: z.union([z.url(), z.literal("")]).nullable(),
  gtranslateEnabled: z.boolean(),
  quoteCtaLabel: z.string().trim().min(1).max(80),
  quoteCtaHref: z.string().trim().min(1).max(300),
});

function textOrNull(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  return value ? value : null;
}

export async function saveSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireUser();
    requirePermission(actor, "cms.settings.manage");
    const parsed = settingsSchema.safeParse({
      companyName: formData.get("companyName"),
      logoId: textOrNull(formData, "logoId"),
      phonePrimary: formData.get("phonePrimary"),
      phoneSecondary: textOrNull(formData, "phoneSecondary"),
      emailPrimary: formData.get("emailPrimary"),
      emailSecondary: textOrNull(formData, "emailSecondary") ?? "",
      enquiryToEmail: formData.get("enquiryToEmail"),
      address: formData.get("address"),
      whatsapp: textOrNull(formData, "whatsapp"),
      youtubeUrl: textOrNull(formData, "youtubeUrl") ?? "",
      facebookUrl: textOrNull(formData, "facebookUrl") ?? "",
      instagramUrl: textOrNull(formData, "instagramUrl") ?? "",
      linkedinUrl: textOrNull(formData, "linkedinUrl") ?? "",
      catalogueId: textOrNull(formData, "catalogueId"),
      footerText: formData.get("footerText"),
      mapUrl: textOrNull(formData, "mapUrl") ?? "",
      gtranslateEnabled: formData.get("gtranslateEnabled") === "on",
      quoteCtaLabel: formData.get("quoteCtaLabel"),
      quoteCtaHref: formData.get("quoteCtaHref"),
    });
    if (!parsed.success) {
      throw new CmsError(
        parsed.error.issues[0]?.message ?? "Check the settings form.",
      );
    }
    const data = parsed.data;
    const db = getDb();
    await db
      .update(siteSettings)
      .set({
        ...data,
        emailSecondary: data.emailSecondary || null,
        youtubeUrl: data.youtubeUrl || null,
        facebookUrl: data.facebookUrl || null,
        instagramUrl: data.instagramUrl || null,
        linkedinUrl: data.linkedinUrl || null,
        mapUrl: data.mapUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(siteSettings.id, "default"));
    await writeAuditLog({
      actorId: actor.id,
      action: "updated",
      entityType: "site_settings",
      entityId: "default",
    });
    revalidatePublicSite();
    revalidatePath("/admin/settings");
    redirect("/admin/settings/?saved=1");
  } catch (error) {
    return { error: toCmsMessage(error) };
  }
}

const whyItem = z.object({
  title: z.string().trim().max(160),
  body: z.string().trim().max(2000),
});

const clientItem = z.object({
  name: z.string().trim().max(160),
  logo: z.string().trim().max(2000),
});

const testimonialItem = z.object({
  quote: z.string().trim().max(2000),
  author: z.string().trim().max(300),
});

const strengthItem = z.object({
  title: z.string().trim().max(160),
  subtitle: z.string().trim().max(160),
  icon: z.string().trim().max(60).optional(),
});

const statItem = z.object({
  value: z.string().trim().max(60),
  label: z.string().trim().max(160),
});

const uspItem = z.object({
  number: z.string().trim().max(20).optional(),
  title: z.string().trim().max(200),
  body: z.string().trim().max(2000),
});

const homeSchema = z.object({
  heroEyebrow: z.string().trim().max(120),
  heroHeadline: z.string().trim().max(300),
  heroSubcopy: z.string().trim().max(1000),
  heroMediaIds: z.array(z.uuid()).max(8),
  aboutTitle: z.string().trim().max(200),
  aboutBody: z.string().max(100_000),
  aboutMediaId: optionalUuid,
  aboutPillars: z.array(whyItem).max(6),
  showcaseCategoryPaths: z.array(z.string().trim().max(200)).max(12),
  featuredProductIds: z.array(z.uuid()).max(12),
  whyChooseTitle: z.string().trim().max(300),
  whyChooseIntro: z.string().trim().max(2000),
  whyChooseUs: z.array(whyItem).max(12),
  visionTitle: z.string().trim().max(120),
  visionBody: z.string().trim().max(5000),
  missionTitle: z.string().trim().max(120),
  missionBody: z.string().trim().max(5000),
  clientLogos: z.array(clientItem).max(50).default([]),
  testimonials: z.array(testimonialItem).max(50).default([]),
  strengths: z.array(strengthItem).max(12).default([]),
  stats: z.array(statItem).max(12).default([]),
  usps: z.array(uspItem).max(20).default([]),
  customBandTitle: z.string().trim().max(300).default(""),
  customBandEyebrow: z.string().trim().max(200).default(""),
  customBandBody: z.string().trim().max(3000).default(""),
  customBandButtonText: z.string().trim().max(100).default(""),
  customBandButtonHref: z.string().trim().max(300).default(""),
});

function readJson<T>(formData: FormData, name: string, fallback: T): T {
  try {
    return JSON.parse(String(formData.get(name) ?? "")) as T;
  } catch {
    return fallback;
  }
}

const headerSchema = z.object({
  logoId: optionalUuid,
  mobileLogoId: optionalUuid,
  faviconId: optionalUuid,
  topBarEnabled: z.boolean(),
  topBarText: z.string().trim().max(500),
  phone: z.string().trim().max(40),
  email: z.union([z.email(), z.literal("")]),
  ctaText: z.string().trim().max(120),
  ctaUrl: z.string().trim().max(300),
  stickyHeader: z.boolean(),
});

export async function saveHeaderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireUser();
    requirePermission(actor, "cms.settings.manage");
    const parsed = headerSchema.safeParse({
      logoId: textOrNull(formData, "logoId"),
      mobileLogoId: textOrNull(formData, "mobileLogoId"),
      faviconId: textOrNull(formData, "faviconId"),
      topBarEnabled: formData.get("topBarEnabled") === "on",
      topBarText: formData.get("topBarText"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      ctaText: formData.get("ctaText"),
      ctaUrl: formData.get("ctaUrl"),
      stickyHeader: formData.get("stickyHeader") === "on",
    });
    if (!parsed.success)
      throw new CmsError(
        parsed.error.issues[0]?.message ?? "Check the header form.",
      );
    await getDb()
      .update(headerSettings)
      .set({
        ...parsed.data,
        email: String(parsed.data.email),
        updatedAt: new Date(),
      })
      .where(eq(headerSettings.id, "default"));
    await writeAuditLog({
      actorId: actor.id,
      action: "updated",
      entityType: "header_settings",
      entityId: "default",
    });
    revalidatePublicSite();
    redirect("/admin/header/?saved=1");
  } catch (error) {
    return { error: toCmsMessage(error) };
  }
}

export async function saveFooterAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireUser();
    requirePermission(actor, "cms.settings.manage");
    const logoId = textOrNull(formData, "logoId");
    const contactInformationJson = {
      address: String(formData.get("contactAddress") ?? "").trim(),
      email: String(formData.get("contactEmail") ?? "").trim(),
      emailSecondary: String(
        formData.get("contactEmailSecondary") ?? "",
      ).trim(),
      phone: String(formData.get("contactPhone") ?? "").trim(),
    };
    const socialLinksJson = String(formData.get("socialLinks") ?? "")
      .split(/\r?\n/)
      .map((line) => {
        const [network, ...urlParts] = line.split("|");
        return {
          network: network?.trim() ?? "",
          url: urlParts.join("|").trim(),
        };
      })
      .filter((link) => link.network && /^https?:\/\//i.test(link.url));
    await getDb()
      .update(footerSettings)
      .set({
        logoId,
        description: String(formData.get("description") ?? ""),
        copyrightText: String(formData.get("copyrightText") ?? ""),
        contactInformationJson,
        socialLinksJson,
        newsletterEnabled: formData.get("newsletterEnabled") === "on",
        newsletterTitle: String(formData.get("newsletterTitle") ?? ""),
        newsletterDescription: String(
          formData.get("newsletterDescription") ?? "",
        ),
        updatedAt: new Date(),
      })
      .where(eq(footerSettings.id, "default"));
    await writeAuditLog({
      actorId: actor.id,
      action: "updated",
      entityType: "footer_settings",
      entityId: "default",
    });
    revalidatePublicSite();
    redirect("/admin/footer/?saved=1");
  } catch (error) {
    return { error: toCmsMessage(error) };
  }
}

export async function saveContactSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireUser();
    requirePermission(actor, "cms.settings.manage");
    await getDb()
      .update(contactSettings)
      .set({
        title: String(formData.get("title") ?? ""),
        subtitle: String(formData.get("subtitle") ?? ""),
        description: String(formData.get("description") ?? ""),
        address: String(formData.get("address") ?? ""),
        email: String(formData.get("email") ?? ""),
        emailSecondary: String(formData.get("emailSecondary") ?? ""),
        detailsEyebrow: String(formData.get("detailsEyebrow") ?? ""),
        detailsTitle: String(formData.get("detailsTitle") ?? ""),
        formTitle: String(formData.get("formTitle") ?? ""),
        formDescription: String(formData.get("formDescription") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        whatsapp: String(formData.get("whatsapp") ?? ""),
        mapUrl: textOrNull(formData, "mapUrl"),
        mapEmbed: textOrNull(formData, "mapEmbed"),
        businessHours: String(formData.get("businessHours") ?? ""),
        updatedAt: new Date(),
      })
      .where(eq(contactSettings.id, "default"));
    await writeAuditLog({
      actorId: actor.id,
      action: "updated",
      entityType: "contact_settings",
      entityId: "default",
    });
    revalidatePublicSite();
    redirect("/admin/contact-settings/?saved=1");
  } catch (error) {
    return { error: toCmsMessage(error) };
  }
}

export async function saveCommonHtmlAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireUser();
    requirePermission(actor, "cms.settings.manage");
    await getDb()
      .update(siteHtmlSettings)
      .set({
        commonHeaderHtml: sanitizeRichText(
          String(formData.get("commonHeaderHtml") ?? ""),
        ),
        commonFooterHtml: sanitizeRichText(
          String(formData.get("commonFooterHtml") ?? ""),
        ),
        updatedAt: new Date(),
      })
      .where(eq(siteHtmlSettings.id, "default"));
    await writeAuditLog({
      actorId: actor.id,
      action: "updated",
      entityType: "site_html_settings",
      entityId: "default",
    });
    revalidatePublicSite();
    redirect("/admin/common-html/?saved=1");
  } catch (error) {
    unstable_rethrow(error);
    return { error: toCmsMessage(error) };
  }
}

export async function saveSiteLabelsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireUser();
    requirePermission(actor, "cms.settings.manage");
    const { siteLabelDefaults } = await import("@/lib/site-labels");
    const labels = Object.fromEntries(
      Object.keys(siteLabelDefaults).map((key) => [
        key,
        String(formData.get(key) ?? "").trim(),
      ]),
    );
    await getDb()
      .update(siteUiSettings)
      .set({ labels, updatedAt: new Date() })
      .where(eq(siteUiSettings.id, "default"));
    await writeAuditLog({
      actorId: actor.id,
      action: "updated",
      entityType: "site_ui_settings",
      entityId: "default",
    });
    revalidatePublicSite();
    redirect("/admin/site-labels/?saved=1");
  } catch (error) {
    return { error: toCmsMessage(error) };
  }
}

export async function saveHomeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireUser();
    requirePermission(actor, "cms.settings.manage");
    const parsed = homeSchema.safeParse({
      heroEyebrow: formData.get("heroEyebrow"),
      heroHeadline: formData.get("heroHeadline"),
      heroSubcopy: formData.get("heroSubcopy"),
      heroMediaIds: readJson(formData, "heroMediaIds", []),
      aboutTitle: formData.get("aboutTitle"),
      aboutBody: formData.get("aboutBody"),
      aboutMediaId: textOrNull(formData, "aboutMediaId"),
      aboutPillars: readJson<WhyItem[]>(formData, "aboutPillars", []),
      showcaseCategoryPaths: readJson<string[]>(
        formData,
        "showcaseCategoryPaths",
        [],
      ),
      featuredProductIds: readJson(formData, "featuredProductIds", []),
      whyChooseTitle: formData.get("whyChooseTitle"),
      whyChooseIntro: formData.get("whyChooseIntro"),
      whyChooseUs: readJson<WhyItem[]>(formData, "whyChooseUs", []),
      visionTitle: formData.get("visionTitle"),
      visionBody: formData.get("visionBody"),
      missionTitle: formData.get("missionTitle"),
      missionBody: formData.get("missionBody"),
      clientLogos: readJson<ClientItem[]>(formData, "clientLogos", []),
      testimonials: readJson<TestimonialItem[]>(formData, "testimonials", []),
      strengths: readJson<StrengthItem[]>(formData, "strengths", []),
      stats: readJson<StatItem[]>(formData, "stats", []),
      usps: readJson<UspItem[]>(formData, "usps", []),
      customBandTitle: formData.get("customBandTitle") ?? "",
      customBandEyebrow: formData.get("customBandEyebrow") ?? "",
      customBandBody: formData.get("customBandBody") ?? "",
      customBandButtonText: formData.get("customBandButtonText") ?? "",
      customBandButtonHref: formData.get("customBandButtonHref") ?? "",
    });

    await writeAuditLog({
      actorId: actor.id,
      action: "updated",
      entityType: "home_content",
      entityId: "default",
    });
    if (!parsed.success)
      throw new CmsError(
        parsed.error.issues[0]?.message ?? "Check the home form.",
      );
    const data = parsed.data;
    const db = getDb();
    const heroes = [...new Set(data.heroMediaIds)];
    const featured = [...new Set(data.featuredProductIds)];

    await db.transaction(async (tx) => {
      await tx
        .update(homeContent)
        .set({
          heroEyebrow: data.heroEyebrow,
          heroHeadline: data.heroHeadline,
          heroSubcopy: data.heroSubcopy,
          aboutTitle: data.aboutTitle,
          aboutBody: sanitizeRichText(data.aboutBody),
          aboutMediaId: data.aboutMediaId,
          aboutPillars: data.aboutPillars.filter(
            (item) => item.title || item.body,
          ),
          showcaseCategoryPaths: data.showcaseCategoryPaths.filter(Boolean),
          whyChooseTitle: data.whyChooseTitle,
          whyChooseIntro: data.whyChooseIntro,
          whyChooseUs: data.whyChooseUs.filter(
            (item) => item.title || item.body,
          ),
          visionTitle: data.visionTitle,
          visionBody: data.visionBody,
          missionTitle: data.missionTitle,
          missionBody: data.missionBody,
          clientLogos: data.clientLogos.filter(
            (item) => item.name || item.logo,
          ),
          testimonials: data.testimonials.filter(
            (item) => item.quote || item.author,
          ),
          strengths: data.strengths.filter(
            (item) => item.title || item.subtitle,
          ),
          stats: data.stats.filter((item) => item.value || item.label),
          usps: data.usps.filter((item) => item.title || item.body),
          customBandTitle: data.customBandTitle,
          customBandEyebrow: data.customBandEyebrow,
          customBandBody: data.customBandBody,
          customBandButtonText: data.customBandButtonText,
          customBandButtonHref: data.customBandButtonHref,
          updatedAt: new Date(),
        })
        .where(eq(homeContent.id, "default"));

      await tx.delete(homeHeroImages);
      if (heroes.length) {
        await tx
          .insert(homeHeroImages)
          .values(heroes.map((mediaId, sortOrder) => ({ mediaId, sortOrder })));
      }
      await tx.delete(homeFeaturedProducts);
      if (featured.length) {
        await tx
          .insert(homeFeaturedProducts)
          .values(
            featured.map((productId, sortOrder) => ({ productId, sortOrder })),
          );
      }
    });

    revalidatePublicSite();
    revalidatePath("/admin/home");
    redirect("/admin/home/?saved=1");
  } catch (error) {
    return { error: toCmsMessage(error) };
  }
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let destination = "";
  try {
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(formData.get("password") ?? "");
    const db = getDb();
    const [user] = await db
      .select({
        id: users.id,
        passwordHash: users.passwordHash,
        status: users.status,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (
      !user ||
      user.status !== "active" ||
      !(await verifyPassword(password, user.passwordHash))
    ) {
      return { error: "Those details do not match an account." };
    }
    await db.delete(sessions).where(eq(sessions.userId, user.id));
    await db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id));
    await createSession(user.id);
    await writeAuditLog({
      actorId: user.id,
      action: "signed_in",
      entityType: "session",
      entityId: user.id,
    });
    const next = String(formData.get("next") ?? "/admin/");
    destination =
      next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin/";
  } catch (error) {
    unstable_rethrow(error);
    try {
      return { error: toCmsMessage(error) };
    } catch {
      return { error: "Sign in failed. Try again." };
    }
  }
  redirect(destination);
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login/");
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireUser();
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    if (newPassword.length < 8)
      throw new CmsError("Use at least 8 characters.");
    const db = getDb();
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.id, actor.id))
      .limit(1);
    if (!row || !(await verifyPassword(currentPassword, row.passwordHash))) {
      throw new CmsError("The current password is wrong.");
    }
    await db
      .update(users)
      .set({
        passwordHash: await hashPassword(newPassword),
        updatedAt: new Date(),
      })
      .where(eq(users.id, actor.id));
    await db.delete(sessions).where(eq(sessions.userId, actor.id));
    await createSession(actor.id);
    await writeAuditLog({
      actorId: actor.id,
      action: "password_changed",
      entityType: "user",
      entityId: actor.id,
    });
    redirect("/admin/account/?saved=1");
  } catch (error) {
    return { error: toCmsMessage(error) };
  }
}
