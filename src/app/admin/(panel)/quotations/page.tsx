import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { requireUser } from "@/lib/auth";
import { hasPermission } from "@/lib/authorization";
import { listQuotations } from "@/lib/quotation-data";
import { money } from "@/lib/quotations";

export default async function QuotationsPage() { const user = await requireUser(); if (!hasPermission(user, "quotations.view")) redirect("/admin/"); const rows = await listQuotations(user); return <><PageHeader eyebrow="CRM" title="Quotations" description="Versioned quotations with controlled approval and sending." action={hasPermission(user,"quotations.create") ? <Link href="/admin/quotations/new" className="rounded-md bg-signal px-4 py-2 text-sm font-semibold text-white">New quotation</Link> : undefined} /><div className="overflow-x-auto rounded-xl border bg-white"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50"><tr>{["Number","Customer","Status","Version","Total","Updated"].map(x=><th key={x} className="px-4 py-3">{x}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.id} className="border-t"><td className="px-4 py-3"><Link className="font-semibold text-signal" href={`/admin/quotations/${row.id}`}>{row.quoteNumber}</Link></td><td className="px-4">{row.customerName}</td><td className="px-4 capitalize">{row.status.replace("_"," ")}</td><td className="px-4">v{row.currentVersion}</td><td className="px-4">{money(row.totalAmount,row.currency)}</td><td className="px-4">{row.updatedAt.toLocaleDateString("en-IN")}</td></tr>)}</tbody></table>{!rows.length?<p className="p-6 text-sm text-muted">No quotations yet.</p>:null}</div></>; }
