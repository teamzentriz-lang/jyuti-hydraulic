import { redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { QuotationForm } from "@/components/admin/quotation-form";
import { requireUser } from "@/lib/auth";
import { hasPermission } from "@/lib/authorization";
import { quoteOptions } from "@/lib/quotation-data";

export default async function NewQuotationPage() { const user=await requireUser(); if(!hasPermission(user,"quotations.create")) redirect("/admin/quotations/"); const options=await quoteOptions(); return <><PageHeader eyebrow="Quotations" title="New quotation" description="Create a commercial draft. Totals are calculated and stored on the server."/><QuotationForm canEdit options={options} initial={{currency:options.settings?.defaultCurrency??"INR",terms:options.settings?.defaultTerms,paymentTerms:options.settings?.defaultPaymentTerms,deliveryTerms:options.settings?.defaultDeliveryTerms}}/></>; }
