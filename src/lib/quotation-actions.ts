"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { quotationApprovals, quotationDeliveries, quotationLineItems, quotationSettings, quotations, quotationVersions } from "@/db/schema";
import { requireSuperAdmin, requireUser } from "@/lib/auth";
import { requirePermission } from "@/lib/authorization";
import { writeAuditLog } from "@/lib/audit";
import { getQuotation } from "@/lib/quotation-data";
import { buildQuotationPdf } from "@/lib/quotation-pdf";
import { sendQuotationEmail } from "@/lib/mail";
import { calculateQuote, editableQuoteStatuses, type QuoteLineInput } from "@/lib/quotations";

export type QuoteActionState = { error?: string; ok?: string } | null;
const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const nullable = (fd: FormData, key: string) => text(fd, key) || null;

function parseLines(fd: FormData) {
  let raw: unknown;
  try { raw = JSON.parse(text(fd, "lines")); } catch { throw new Error("Line items are invalid."); }
  if (!Array.isArray(raw) || !raw.length) throw new Error("Add at least one line item.");
  return raw.map((item): QuoteLineInput => ({ description: String(item.description ?? "").trim(), quantity: Number(item.quantity), unitPrice: Math.round(Number(item.unitPrice) * 100), discountBps: Math.round(Number(item.discountPercent) * 100), taxRateBps: Math.round(Number(item.taxPercent) * 100) })).filter((item) => item.description && item.quantity > 0);
}

export async function saveQuotationAction(_state: QuoteActionState, fd: FormData): Promise<QuoteActionState> {
  try {
    const actor = await requireUser();
    const id = text(fd, "id");
    requirePermission(actor, id ? "quotations.edit" : "quotations.create");
    const existing = id ? await getQuotation(id, actor) : null;
    if (id && !existing) throw new Error("Quotation not found.");
    if (existing && !editableQuoteStatuses.has(existing.status)) throw new Error("Create a revision before editing this approved or submitted quotation.");
    const calc = calculateQuote(parseLines(fd), Math.round(Number(text(fd, "shippingAmount") || 0) * 100));
    const customerName = text(fd, "customerName");
    if (!customerName || !calc.lines.length) throw new Error("Customer and at least one valid item are required.");
    const db = getDb();
    const quoteId = await db.transaction(async (tx) => {
      let targetId = id;
      const versionNumber = existing?.currentVersion ?? 1;
      if (!existing) {
        const [setting] = await tx.update(quotationSettings).set({ nextNumber: sql`${quotationSettings.nextNumber} + 1`, updatedAt: new Date() }).where(eq(quotationSettings.id, 1)).returning();
        if (!setting) throw new Error("Quotation settings are missing.");
        const quoteNumber = `${setting.numberPrefix}-${String(setting.nextNumber - 1).padStart(5, "0")}`;
        const [created] = await tx.insert(quotations).values({ quoteNumber, leadId: nullable(fd, "leadId"), companyId: nullable(fd, "companyId"), contactId: nullable(fd, "contactId"), ownerId: actor.id, status: "draft", validUntil: text(fd, "validUntil") ? new Date(text(fd, "validUntil")) : null, createdById: actor.id }).returning();
        targetId = created.id;
      } else {
        await tx.update(quotations).set({ leadId: nullable(fd, "leadId"), companyId: nullable(fd, "companyId"), contactId: nullable(fd, "contactId"), validUntil: text(fd, "validUntil") ? new Date(text(fd, "validUntil")) : null, updatedAt: new Date() }).where(eq(quotations.id, id));
        await tx.delete(quotationVersions).where(and(eq(quotationVersions.quotationId, id), eq(quotationVersions.versionNumber, versionNumber)));
      }
      const [version] = await tx.insert(quotationVersions).values({ quotationId: targetId, versionNumber, customerName, customerEmail: text(fd, "customerEmail"), customerPhone: text(fd, "customerPhone"), billingAddress: text(fd, "billingAddress"), currency: text(fd, "currency") || "INR", subtotal: calc.subtotal, discountAmount: calc.discountAmount, taxAmount: calc.taxAmount, shippingAmount: calc.shippingAmount, totalAmount: calc.totalAmount, terms: text(fd, "terms"), paymentTerms: text(fd, "paymentTerms"), deliveryTerms: text(fd, "deliveryTerms"), notes: text(fd, "notes"), createdById: actor.id }).returning();
      await tx.insert(quotationLineItems).values(calc.lines.map((line, index) => ({ versionId: version.id, description: line.description, quantity: line.quantity, unitPrice: line.unitPrice, discountBps: line.discountBps, taxRateBps: line.taxRateBps, lineTotal: line.lineTotal, sortOrder: index })));
      return targetId;
    });
    await writeAuditLog({ actorId: actor.id, action: id ? "quotation.updated" : "quotation.created", entityType: "quotation", entityId: quoteId });
    redirect(`/admin/quotations/${quoteId}/`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { error: error instanceof Error ? error.message : "Could not save quotation." };
  }
}

async function loadFor(actor: Awaited<ReturnType<typeof requireUser>>, id: string) { const quote = await getQuotation(id, actor); if (!quote) throw new Error("Quotation not found."); return quote; }

export async function submitQuotationAction(fd: FormData) {
  const actor = await requireUser(); requirePermission(actor, "quotations.submit"); const quote = await loadFor(actor, text(fd, "id"));
  if (!editableQuoteStatuses.has(quote.status)) throw new Error("Only a draft or revision can be submitted.");
  const [settings] = await getDb().select().from(quotationSettings).where(eq(quotationSettings.id,1)).limit(1);
  const needsApproval = Boolean(settings?.approvalRequired && quote.version.totalAmount >= (settings.approvalThreshold || 0));
  await getDb().transaction(async (tx) => { await tx.update(quotations).set({ status: needsApproval ? "pending_approval" : "approved", approvedById: needsApproval ? null : actor.id, approvedAt: needsApproval ? null : new Date(), updatedAt: new Date() }).where(eq(quotations.id, quote.id)); if(needsApproval) await tx.insert(quotationApprovals).values({ quotationId: quote.id, versionId: quote.version.id, requestedById: actor.id }); });
  await writeAuditLog({ actorId: actor.id, action: needsApproval ? "quotation.submitted" : "quotation.auto_approved", entityType: "quotation", entityId: quote.id, metadata: { version: quote.currentVersion } }); revalidatePath(`/admin/quotations/${quote.id}/`);
}

export async function decideQuotationAction(fd: FormData) {
  const actor = await requireUser(); requirePermission(actor, "quotations.approve"); const quote = await loadFor(actor, text(fd, "id"));
  if (quote.status !== "pending_approval") throw new Error("This quotation is not awaiting approval.");
  const decision = text(fd, "decision") === "approved" ? "approved" : "rejected";
  await getDb().transaction(async (tx) => { await tx.update(quotationApprovals).set({ status: decision, reviewerId: actor.id, remarks: text(fd, "remarks"), decidedAt: new Date() }).where(and(eq(quotationApprovals.quotationId, quote.id), eq(quotationApprovals.status, "pending"))); await tx.update(quotations).set({ status: decision, approvedById: decision === "approved" ? actor.id : null, approvedAt: decision === "approved" ? new Date() : null, rejectedAt: decision === "rejected" ? new Date() : null, updatedAt: new Date() }).where(eq(quotations.id, quote.id)); });
  await writeAuditLog({ actorId: actor.id, action: `quotation.${decision}`, entityType: "quotation", entityId: quote.id, metadata: { remarks: text(fd, "remarks") } }); revalidatePath(`/admin/quotations/${quote.id}/`);
}

export async function createRevisionAction(fd: FormData) {
  const actor = await requireUser(); requirePermission(actor, "quotations.edit"); const quote = await loadFor(actor, text(fd, "id"));
  if (editableQuoteStatuses.has(quote.status) || quote.status === "pending_approval") throw new Error("This version can still be edited or is awaiting a decision.");
  await getDb().transaction(async (tx) => { const next = quote.currentVersion + 1; const [version] = await tx.insert(quotationVersions).values({ ...quote.version, id: undefined, versionNumber: next, createdAt: undefined, createdById: actor.id }).returning(); await tx.insert(quotationLineItems).values(quote.lines.map((line) => ({ ...line, id: undefined, versionId: version.id }))); await tx.update(quotations).set({ currentVersion: next, status: "revised", approvedById: null, approvedAt: null, sentAt: null, updatedAt: new Date() }).where(eq(quotations.id, quote.id)); });
  await writeAuditLog({ actorId: actor.id, action: "quotation.revised", entityType: "quotation", entityId: quote.id, metadata: { version: quote.currentVersion + 1 } }); revalidatePath(`/admin/quotations/${quote.id}/`);
}

export async function sendQuotationAction(fd: FormData) {
  const actor = await requireUser(); requirePermission(actor, "quotations.send"); const quote = await loadFor(actor, text(fd, "id"));
  if (quote.status !== "approved") throw new Error("Only an approved quotation can be sent.");
  const recipient = text(fd, "recipient") || quote.version.customerEmail; if (!recipient) throw new Error("Recipient email is required.");
  const pdf = buildQuotationPdf({ ...quote.version, quoteNumber: quote.quoteNumber, versionNumber: quote.currentVersion, validUntil: quote.validUntil, lines: quote.lines });
  const subject = `Quotation ${quote.quoteNumber}`;
  const result = await sendQuotationEmail({ to: recipient, subject, text: `Please find quotation ${quote.quoteNumber} attached.`, filename: `${quote.quoteNumber}-v${quote.currentVersion}.pdf`, pdf });
  await getDb().insert(quotationDeliveries).values({ quotationId: quote.id, versionId: quote.version.id, recipientEmail: recipient, subject, status: result.sent ? "sent" : "failed", providerMessageId: result.sent ? result.messageId : null, errorMessage: result.sent ? null : result.reason, sentById: actor.id });
  if (!result.sent) throw new Error(result.reason);
  await getDb().update(quotations).set({ status: "sent", sentAt: new Date(), updatedAt: new Date() }).where(eq(quotations.id, quote.id)); await writeAuditLog({ actorId: actor.id, action: "quotation.sent", entityType: "quotation", entityId: quote.id, metadata: { recipient } }); revalidatePath(`/admin/quotations/${quote.id}/`);
}

export async function saveQuotationSettingsAction(fd: FormData) {
  const actor = await requireSuperAdmin();
  await getDb().insert(quotationSettings).values({ id: 1, numberPrefix: text(fd,"numberPrefix") || "JH-Q", defaultCurrency: text(fd,"defaultCurrency") || "INR", defaultTaxRateBps: Math.round(Number(text(fd,"defaultTaxRate")||18)*100), defaultValidityDays: Math.max(1,Number(text(fd,"defaultValidityDays")||30)), defaultTerms: text(fd,"defaultTerms"), defaultPaymentTerms: text(fd,"defaultPaymentTerms"), defaultDeliveryTerms: text(fd,"defaultDeliveryTerms"), approvalRequired: fd.get("approvalRequired")==="on", approvalThreshold: Math.round(Number(text(fd,"approvalThreshold")||0)*100) }).onConflictDoUpdate({ target: quotationSettings.id, set: { numberPrefix: text(fd,"numberPrefix") || "JH-Q", defaultCurrency: text(fd,"defaultCurrency") || "INR", defaultTaxRateBps: Math.round(Number(text(fd,"defaultTaxRate")||18)*100), defaultValidityDays: Math.max(1,Number(text(fd,"defaultValidityDays")||30)), defaultTerms:text(fd,"defaultTerms"),defaultPaymentTerms:text(fd,"defaultPaymentTerms"),defaultDeliveryTerms:text(fd,"defaultDeliveryTerms"),approvalRequired:fd.get("approvalRequired")==="on",approvalThreshold:Math.round(Number(text(fd,"approvalThreshold")||0)*100),updatedAt:new Date() } });
  await writeAuditLog({ actorId: actor.id, action:"quotation.settings.updated", entityType:"quotation_settings", entityId:"1" }); revalidatePath("/admin/quotation-settings/");
}
