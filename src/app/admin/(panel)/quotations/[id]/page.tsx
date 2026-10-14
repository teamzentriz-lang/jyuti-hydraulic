import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { QuotationForm } from "@/components/admin/quotation-form";
import { requireUser } from "@/lib/auth";
import { hasPermission } from "@/lib/authorization";
import { createRevisionAction, decideQuotationAction, sendQuotationAction, submitQuotationAction } from "@/lib/quotation-actions";
import { getQuotation, quoteOptions } from "@/lib/quotation-data";
import { editableQuoteStatuses, money } from "@/lib/quotations";

export default async function QuotationPage({params}:{params:Promise<{id:string}>}) { const {id}=await params; const user=await requireUser(); const [quote,options]=await Promise.all([getQuotation(id,user),quoteOptions()]); if(!quote) notFound(); const editable=editableQuoteStatuses.has(quote.status)&&hasPermission(user,"quotations.edit"); const v=quote.version; return <><PageHeader eyebrow={`Quotation · ${quote.status.replace("_"," ")}`} title={`${quote.quoteNumber} · v${quote.currentVersion}`} description={`${v.customerName} · ${money(v.totalAmount,v.currency)}`} action={<Link href={`/api/admin/quotations/${quote.id}/pdf`} target="_blank" className="rounded-md border px-4 py-2 text-sm font-semibold">Download PDF</Link>}/>
  <div className="mb-5 flex flex-wrap gap-3 rounded-xl border bg-white p-4">
    {editable&&hasPermission(user,"quotations.submit")?<form action={submitQuotationAction}><input type="hidden" name="id" value={id}/><button className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white">Submit for approval</button></form>:null}
    {quote.status==="pending_approval"&&hasPermission(user,"quotations.approve")?<form action={decideQuotationAction} className="flex flex-wrap gap-2"><input type="hidden" name="id" value={id}/><input name="remarks" placeholder="Decision remarks" className="rounded-md border px-3 py-2 text-sm"/><button name="decision" value="approved" className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Approve</button><button name="decision" value="rejected" className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white">Reject</button></form>:null}
    {quote.status==="approved"&&hasPermission(user,"quotations.send")?<form action={sendQuotationAction} className="flex gap-2"><input type="hidden" name="id" value={id}/><input name="recipient" type="email" defaultValue={v.customerEmail} placeholder="Recipient email" className="rounded-md border px-3 py-2 text-sm"/><button className="rounded-md bg-signal px-4 py-2 text-sm font-semibold text-white">Send approved PDF</button></form>:null}
    {!editableQuoteStatuses.has(quote.status)&&quote.status!=="pending_approval"&&hasPermission(user,"quotations.edit")?<form action={createRevisionAction}><input type="hidden" name="id" value={id}/><button className="rounded-md border border-signal px-4 py-2 text-sm font-semibold text-signal">Create revision</button></form>:null}
  </div>
  <QuotationForm canEdit={editable} options={options} initial={{...v,id:quote.id,leadId:quote.leadId,companyId:quote.companyId,contactId:quote.contactId,validUntil:quote.validUntil,lines:quote.lines}}/>
  <section className="mt-6 rounded-xl border bg-white p-5"><h2 className="font-semibold text-navy">History</h2><p className="mt-2 text-sm text-muted">Versions: {quote.versions.map(x=>`v${x.versionNumber}`).join(", ")} · Approval events: {quote.approvals.length} · Deliveries: {quote.deliveries.length}</p></section></>; }
