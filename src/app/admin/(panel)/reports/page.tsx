import { redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { requireUser } from "@/lib/auth";
import { hasPermission } from "@/lib/authorization";
import { quotationReport } from "@/lib/quotation-data";
import { money } from "@/lib/quotations";

export default async function ReportsPage(){const user=await requireUser();if(!hasPermission(user,"crm.reports.view"))redirect("/admin/");const report=await quotationReport();return <><PageHeader eyebrow="CRM" title="Sales reports" description="Quotation pipeline, accepted value and conversion."/><div className="grid gap-4 md:grid-cols-3"><Card label="Pipeline value" value={money(report.total)}/><Card label="Accepted value" value={money(report.won)}/><Card label="Value conversion" value={`${report.conversion}%`}/></div><section className="mt-6 rounded-xl border bg-white p-5"><h2 className="font-semibold text-navy">Quotation status</h2><div className="mt-4 space-y-3">{report.byStatus.map(row=><div key={row.status} className="flex justify-between border-b pb-2 text-sm"><span className="capitalize">{row.status.replace("_"," ")} ({row.count})</span><strong>{money(row.value)}</strong></div>)}</div></section></>};function Card({label,value}:{label:string;value:string}){return <div className="rounded-xl border bg-white p-5"><p className="text-sm text-muted">{label}</p><p className="mt-2 text-2xl font-semibold text-navy">{value}</p></div>}
