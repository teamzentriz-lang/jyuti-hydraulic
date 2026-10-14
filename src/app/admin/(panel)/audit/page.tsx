import { desc, eq } from "drizzle-orm";
import { PageHeader } from "@/components/admin/page-header";
import { requireUser } from "@/lib/auth";
import { requirePermission } from "@/lib/authorization";
import { getDb } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { formatWhen } from "@/components/admin/status-pill";

export default async function AuditPage() {
  const user = await requireUser();
  requirePermission(user, "audit.view");
  const rows = await getDb()
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
      actorName: users.name,
      actorEmail: users.email,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorId, users.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(200);

  return (
    <>
      <PageHeader eyebrow="System" title="Activity history" description="Recent access-control and CMS changes. This log is append-only." />
      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-paper text-xs uppercase tracking-wide text-muted"><tr><th className="px-3 py-2">When</th><th className="px-3 py-2">Actor</th><th className="px-3 py-2">Action</th><th className="px-3 py-2">Record</th></tr></thead>
          <tbody>
            {rows.map((row) => <tr key={row.id} className="border-b border-line last:border-0"><td className="px-3 py-2 text-muted">{formatWhen(row.createdAt)}</td><td className="px-3 py-2">{row.actorName ?? row.actorEmail ?? "System"}</td><td className="px-3 py-2">{row.action}</td><td className="px-3 py-2">{row.entityType}{row.entityId ? ` · ${row.entityId}` : ""}</td></tr>)}
            {!rows.length ? <tr><td colSpan={4} className="px-3 py-8 text-center text-muted">No activity recorded yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
