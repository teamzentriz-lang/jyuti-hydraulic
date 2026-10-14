"use client";

import { useActionState, useState } from "react";
import { saveQuotationAction, type QuoteActionState } from "@/lib/quotation-actions";

type Line = { description: string; quantity: number; unitPrice: number; discountPercent: number; taxPercent: number };
type Option = { value: string; label: string };
type Initial = Record<string, unknown> & { lines?: Array<{ description: string; quantity: number; unitPrice: number; discountBps: number; taxRateBps: number }> };

export function QuotationForm({ initial = {}, options, canEdit }: { initial?: Initial; options: { leads: Option[]; companies: Option[]; contacts: Array<Option & { email: string; phone: string }> }; canEdit: boolean }) {
  const [state, action, pending] = useActionState<QuoteActionState, FormData>(saveQuotationAction, null);
  const [lines, setLines] = useState<Line[]>(() => initial.lines?.map((l) => ({ description: l.description, quantity: l.quantity, unitPrice: l.unitPrice / 100, discountPercent: l.discountBps / 100, taxPercent: l.taxRateBps / 100 })) ?? [{ description: "", quantity: 1, unitPrice: 0, discountPercent: 0, taxPercent: 18 }]);
  const field = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";
  return <form action={action} className="space-y-5">
    <input type="hidden" name="id" value={String(initial.id ?? "")} /><input type="hidden" name="lines" value={JSON.stringify(lines)} />
    {state?.error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-800">{state.error}</p> : null}
    <fieldset disabled={!canEdit || pending} className="space-y-5 disabled:opacity-70">
      <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="mb-4 font-semibold text-navy">Customer & reference</h2><div className="grid gap-4 md:grid-cols-3">
        <Select name="leadId" label="Lead" value={initial.leadId} options={options.leads} className={field} /><Select name="companyId" label="Company" value={initial.companyId} options={options.companies} className={field} /><Select name="contactId" label="Contact" value={initial.contactId} options={options.contacts} className={field} />
        <Input name="customerName" label="Customer name" value={initial.customerName} required className={field} /><Input name="customerEmail" label="Email" value={initial.customerEmail} type="email" className={field} /><Input name="customerPhone" label="Phone" value={initial.customerPhone} className={field} />
        <label className="md:col-span-2 text-sm font-medium">Billing address<textarea name="billingAddress" defaultValue={String(initial.billingAddress ?? "")} className={`${field} mt-1 min-h-20`} /></label><Input name="validUntil" label="Valid until" value={initial.validUntil ? new Date(String(initial.validUntil)).toISOString().slice(0, 10) : ""} type="date" className={field} />
      </div></section>
      <section className="rounded-xl border border-slate-200 bg-white p-5"><div className="mb-4 flex justify-between"><h2 className="font-semibold text-navy">Line items</h2><button type="button" onClick={() => setLines((x) => [...x, { description: "", quantity: 1, unitPrice: 0, discountPercent: 0, taxPercent: 18 }])} className="rounded-md border px-3 py-1 text-sm">Add item</button></div>
        <div className="space-y-3">{lines.map((line, index) => <div key={index} className="grid gap-2 rounded-lg bg-slate-50 p-3 md:grid-cols-[2fr_0.6fr_0.8fr_0.7fr_0.7fr_auto]">
          {(["description","quantity","unitPrice","discountPercent","taxPercent"] as const).map((key) => <input key={key} aria-label={key} type={key === "description" ? "text" : "number"} min={key === "description" ? undefined : 0} step={key === "unitPrice" ? "0.01" : "1"} value={line[key]} placeholder={key} onChange={(e) => setLines((all) => all.map((row, i) => i === index ? { ...row, [key]: key === "description" ? e.target.value : Number(e.target.value) } : row))} className={field} />)}
          <button type="button" onClick={() => setLines((all) => all.filter((_, i) => i !== index))} className="text-sm text-red-700">Remove</button>
        </div>)}</div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5"><div className="grid gap-4 md:grid-cols-2"><Input name="shippingAmount" label="Shipping amount" value={Number(initial.shippingAmount ?? 0) / 100} type="number" className={field} /><Input name="currency" label="Currency" value={initial.currency ?? "INR"} className={field} />{["paymentTerms","deliveryTerms","terms","notes"].map((name) => <label key={name} className="text-sm font-medium capitalize">{name.replace(/([A-Z])/g," $1")}<textarea name={name} defaultValue={String(initial[name] ?? "")} className={`${field} mt-1 min-h-20`} /></label>)}</div></section>
      {canEdit ? <button type="submit" className="rounded-md bg-signal px-5 py-2.5 text-sm font-semibold text-white">{pending ? "Saving..." : "Save quotation"}</button> : null}
    </fieldset>
  </form>;
}

function Input({ name, label, value, className, ...props }: { name: string; label: string; value: unknown; className: string; [key: string]: unknown }) { return <label className="text-sm font-medium">{label}<input name={name} defaultValue={String(value ?? "")} className={`${className} mt-1`} {...props} /></label>; }
function Select({ name, label, value, options, className }: { name: string; label: string; value: unknown; options: Option[]; className: string }) { return <label className="text-sm font-medium">{label}<select name={name} defaultValue={String(value ?? "")} className={`${className} mt-1`}><option value="">None</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>; }
