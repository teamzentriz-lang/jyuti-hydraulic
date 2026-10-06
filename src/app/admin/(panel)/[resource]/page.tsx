import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MediaListThumb } from "@/components/admin/media-list-thumb";
import { MediaUploader } from "@/components/admin/media-uploader";
import { Notice, PageHeader } from "@/components/admin/page-header";
import { formatBytes, formatWhen, StatusPill } from "@/components/admin/status-pill";
import { secondaryButtonClass } from "@/components/admin/styles";
import { requireUser } from "@/lib/auth";
import { isResourceKey, resources } from "@/lib/cms/resources";
import { listRecords } from "@/lib/cms/queries";
import { currentStorageDriver } from "@/lib/storage";

const dateKeys = new Set(["updatedAt", "createdAt", "publishedAt"]);
const pillKeys = new Set(["status", "active"]);

export default async function ResourceListPage({
  params,
  searchParams,
}: {
  params: Promise<{ resource: string }>;
  searchParams: Promise<{ q?: string; page?: string; error?: string }>;
}) {
  const [{ resource: key }, query] = await Promise.all([params, searchParams]);
  if (!isResourceKey(key)) notFound();
  const config = resources[key];
  const user = await requireUser();
  if (config.adminOnly && user.role !== "admin") redirect("/admin/");

  const page = Number(query.page ?? "1");
  const result = await listRecords(key, { q: query.q, page: Number.isFinite(page) ? page : 1 });
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const search = query.q ? `&q=${encodeURIComponent(query.q)}` : "";

  return (
    <>
      <PageHeader
        eyebrow="Collection"
        title={config.label}
        description={config.description}
        action={
          config.allowCreate === false ? null : (
            <Link href={`/admin/${key}/new`} className={secondaryButtonClass}>
              New {config.singular.toLowerCase()}
            </Link>
          )
        }
      />
      {query.error ? <Notice tone="error">{query.error}</Notice> : null}
      {key === "media" ? <MediaUploader driver={currentStorageDriver()} /> : null}
      <form className="mb-4 flex gap-2" action={`/admin/${key}/`}>
        <input
          name="q"
          defaultValue={query.q ?? ""}
          placeholder={`Search ${config.label.toLowerCase()}`}
          className="w-full max-w-sm rounded-md border border-line bg-white px-3 py-2 text-sm"
        />
        <button className={secondaryButtonClass}>Search</button>
      </form>
      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-paper text-xs uppercase tracking-wide text-muted">
            <tr>
              {config.tableColumns.map((column) => (
                <th key={column.key} className="px-3 py-2 font-semibold">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={String(row.id)} className="border-b border-line last:border-0">
                {config.tableColumns.map((column, index) => {
                  const value = row[column.key];
                  let content: React.ReactNode = pillKeys.has(column.key) ? (
                    <StatusPill value={value} />
                  ) : column.key === "size" ? (
                    formatBytes(value)
                  ) : dateKeys.has(column.key) ? (
                    formatWhen(value)
                  ) : (
                    String(value ?? "—") || "—"
                  );
                  if (key === "media" && column.key === "filename") {
                    content = (
                      <span className="inline-flex items-center">
                        <MediaListThumb
                          id={String(row.id)}
                          url={String(row.url ?? "")}
                          mimeType={String(row.mimeType ?? "")}
                          filename={String(value ?? "")}
                        />
                        {String(value ?? "—")}
                      </span>
                    );
                  }
                  return (
                    <td key={column.key} className="px-3 py-3 align-middle">
                      {index === 0 ? (
                        <Link href={`/admin/${key}/${row.id}`} className="font-semibold text-navy hover:underline">
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {!result.rows.length ? <p className="px-3 py-8 text-center text-sm text-muted">Nothing in {config.label.toLowerCase()} yet.</p> : null}
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-muted">
        <p>
          {result.total} record{result.total === 1 ? "" : "s"}
        </p>
        <div className="flex gap-3">
          {result.page > 1 ? <Link href={`/admin/${key}?page=${result.page - 1}${search}`}>Previous</Link> : null}
          <span>
            Page {result.page} of {totalPages}
          </span>
          {result.page < totalPages ? <Link href={`/admin/${key}?page=${result.page + 1}${search}`}>Next</Link> : null}
        </div>
      </div>
    </>
  );
}
