import { and, desc, eq, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { companies, contacts, leads, quotationApprovals, quotationDeliveries, quotationLineItems, quotationSettings, quotations, quotationVersions, teamMembers } from "@/db/schema";
import type { SessionUser } from "@/lib/auth";

function scope(user: SessionUser) {
  if (user.systemRole === "super_admin" || user.crmVisibility === "all") return undefined;
  if (user.crmVisibility === "team") return or(eq(quotations.ownerId, user.id), sql`${quotations.teamId} in (select ${teamMembers.teamId} from ${teamMembers} where ${teamMembers.userId} = ${user.id})`);
  return eq(quotations.ownerId, user.id);
}

export async function quoteOptions() {
  const db = getDb();
  const [leadRows, companyRows, contactRows, settings] = await Promise.all([
    db.select({ value: leads.id, label: leads.title }).from(leads).orderBy(leads.title),
    db.select({ value: companies.id, label: companies.name }).from(companies).orderBy(companies.name),
    db.select({ value: contacts.id, label: contacts.name, email: contacts.email, phone: contacts.phone }).from(contacts).orderBy(contacts.name),
    db.select().from(quotationSettings).where(eq(quotationSettings.id, 1)).limit(1),
  ]);
  return { leads: leadRows, companies: companyRows, contacts: contactRows, settings: settings[0] };
}

export async function listQuotations(user: SessionUser) {
  return getDb().select({ id: quotations.id, quoteNumber: quotations.quoteNumber, status: quotations.status, currentVersion: quotations.currentVersion, validUntil: quotations.validUntil, updatedAt: quotations.updatedAt, customerName: quotationVersions.customerName, totalAmount: quotationVersions.totalAmount, currency: quotationVersions.currency })
    .from(quotations).innerJoin(quotationVersions, and(eq(quotationVersions.quotationId, quotations.id), eq(quotationVersions.versionNumber, quotations.currentVersion)))
    .where(scope(user)).orderBy(desc(quotations.updatedAt));
}

export async function getQuotation(id: string, user: SessionUser) {
  const where = scope(user);
  const [head] = await getDb().select().from(quotations).where(and(eq(quotations.id, id), where)).limit(1);
  if (!head) return null;
  const [version, versions, approvals, deliveries] = await Promise.all([
    getDb().select().from(quotationVersions).where(and(eq(quotationVersions.quotationId, id), eq(quotationVersions.versionNumber, head.currentVersion))).limit(1),
    getDb().select().from(quotationVersions).where(eq(quotationVersions.quotationId, id)).orderBy(desc(quotationVersions.versionNumber)),
    getDb().select().from(quotationApprovals).where(eq(quotationApprovals.quotationId, id)).orderBy(desc(quotationApprovals.createdAt)),
    getDb().select().from(quotationDeliveries).where(eq(quotationDeliveries.quotationId, id)).orderBy(desc(quotationDeliveries.sentAt)),
  ]);
  if (!version[0]) return null;
  const lines = await getDb().select().from(quotationLineItems).where(eq(quotationLineItems.versionId, version[0].id)).orderBy(quotationLineItems.sortOrder);
  return { ...head, version: version[0], lines, versions, approvals, deliveries };
}

export async function quotationReport() {
  const db = getDb();
  const byStatus = await db.select({ status: quotations.status, count: sql<number>`count(*)::int`, value: sql<number>`coalesce(sum(${quotationVersions.totalAmount}),0)::int` }).from(quotations).innerJoin(quotationVersions, and(eq(quotationVersions.quotationId, quotations.id), eq(quotationVersions.versionNumber, quotations.currentVersion))).groupBy(quotations.status);
  const total = byStatus.reduce((n, row) => n + row.value, 0);
  const won = byStatus.find((row) => row.status === "accepted")?.value ?? 0;
  return { byStatus, total, won, conversion: total ? Math.round((won / total) * 100) : 0 };
}
