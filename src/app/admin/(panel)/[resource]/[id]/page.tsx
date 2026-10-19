import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Notice, PageHeader } from "@/components/admin/page-header";
import { PageForm } from "@/components/admin/page-form";
import { ProductForm } from "@/components/admin/product-form";
import { ResourceForm } from "@/components/admin/resource-form";
import { MediaPreview } from "@/components/admin/media-preview";
import { formatBytes, formatWhen } from "@/components/admin/status-pill";
import { requireUser } from "@/lib/auth";
import { canAccessResource } from "@/lib/authorization";
import type { PageSectionPayload, ProductPayload } from "@/lib/cms/entity-data";
import { fieldsFor, getPageHtmlOverride, getRecord, mediaItems, relationOptions } from "@/lib/cms/queries";
import { isResourceKey, resources, type FieldDef } from "@/lib/cms/resources";
import { convertInquiryToLeadAction } from "@/lib/cms/actions";
import { primaryButtonClass, secondaryButtonClass } from "@/components/admin/styles";
import { publicPath } from "@/lib/paths";
import { hasPermission, permissionForResource } from "@/lib/authorization";

function mediaIds(record: Record<string, unknown>, fields: FieldDef[]) {
  const ids: string[] = [];
  for (const field of fields) {
    const value = record[field.name];
    if (field.type === "media" && typeof value === "string") ids.push(value);
    if (field.type === "mediaMany" && Array.isArray(value)) {
      ids.push(...value.filter((item): item is string => typeof item === "string"));
    }
  }
  return ids;
}

export default async function EditResourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ resource: string; id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const [{ resource: key, id }, query] = await Promise.all([params, searchParams]);
  if (!isResourceKey(key)) notFound();
  const config = resources[key];
  const user = await requireUser();
  if (!canAccessResource(user, key) || (key === "users" && user.systemRole !== "super_admin")) redirect("/admin/");

  const record = await getRecord(key, id, user);
  if (!record) notFound();
  const fields = await fieldsFor(key, id, user);
  const media = await mediaItems(mediaIds(record, fields));
  const canEdit = hasPermission(user, permissionForResource(key));

  if (key === "products") {
    const [categories, productOptions, pageHtml] = await Promise.all([
      relationOptions("product-categories"),
      relationOptions("products", id),
      getPageHtmlOverride(publicPath(String(record.path ?? ""))),
    ]);
    const payload = (record.productPayload ?? {
      specifications: [],
      features: [],
      applications: [],
      documents: [],
      options: [],
      technicalTables: [],
      relatedProducts: [],
      galleryMediaIds: [],
      applicationImageIds: [],
      sections: [],
      faqs: [],
      contentTables: [],
    }) as ProductPayload;
    return (
      <>
        <PageHeader eyebrow={config.label} title={String(record.title)} />
        {query.saved ? <Notice tone="ok">Saved.</Notice> : null}
        {query.error ? <Notice tone="error">{query.error}</Notice> : null}
        <ProductForm id={id} initial={record} payload={payload} media={media} categoryOptions={categories} productOptions={productOptions} pageHtml={pageHtml} canDelete />
      </>
    );
  }

  if (key === "pages") {
    const sections = (record.pageSections ?? []) as PageSectionPayload[];
    return (
      <>
        <PageHeader eyebrow={config.label} title={String(record.title)} />
        {query.saved ? <Notice tone="ok">Saved.</Notice> : null}
        {query.error ? <Notice tone="error">{query.error}</Notice> : null}
        <PageForm id={id} initial={record} sections={sections} media={media} canDelete />
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow={config.label} title={String(record.title || record.name || record.label || record.filename || config.singular)} />
      {key === "media" ? (
        <>
          <p className="mb-4 text-sm text-muted">
            {String(record.filename)} · {String(record.mimeType)} · {formatBytes(record.size)} · added {formatWhen(record.createdAt)}
          </p>
          <MediaPreview
            id={String(record.id)}
            url={String(record.url ?? "")}
            mimeType={String(record.mimeType ?? "")}
            filename={String(record.filename ?? "")}
            alt={String(record.alt ?? "")}
            title={String(record.title ?? "")}
          />
        </>
      ) : null}
      {query.saved ? <Notice tone="ok">Saved.</Notice> : null}
      {query.error ? <Notice tone="error">{query.error}</Notice> : null}
      {key === "inquiries" && hasPermission(user, "inquiries.manage") && hasPermission(user, "crm.leads.manage") ? (
        record.convertedLeadId ? (
          <div className="mb-4"><Link className={secondaryButtonClass} href={`/admin/leads/${record.convertedLeadId}`}>Open converted lead</Link></div>
        ) : (
          <form action={convertInquiryToLeadAction} className="mb-4">
            <input type="hidden" name="inquiryId" value={id} />
            <button className={primaryButtonClass}>Convert to sales lead</button>
          </form>
        )
      ) : null}
      <ResourceForm
        resource={key}
        id={id}
        fields={fields}
        initial={record}
        media={media}
        pathMode={config.pathMode}
        canDelete={!(key === "users" && id === user.id)}
        canEdit={canEdit}
      />
    </>
  );
}
