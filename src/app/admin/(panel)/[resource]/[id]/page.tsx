import { notFound, redirect } from "next/navigation";
import { Notice, PageHeader } from "@/components/admin/page-header";
import { PageForm } from "@/components/admin/page-form";
import { ProductForm } from "@/components/admin/product-form";
import { ResourceForm } from "@/components/admin/resource-form";
import { MediaPreview } from "@/components/admin/media-preview";
import { formatBytes, formatWhen } from "@/components/admin/status-pill";
import { requireUser } from "@/lib/auth";
import type { PageSectionPayload, ProductPayload } from "@/lib/cms/entity-data";
import { fieldsFor, getRecord, mediaItems, relationOptions } from "@/lib/cms/queries";
import { isResourceKey, resources, type FieldDef } from "@/lib/cms/resources";

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
  if (config.adminOnly && user.role !== "admin") redirect("/admin/");

  const record = await getRecord(key, id);
  if (!record) notFound();
  const fields = await fieldsFor(key, id);
  const media = await mediaItems(mediaIds(record, fields));

  if (key === "products") {
    const [categories, productOptions] = await Promise.all([relationOptions("product-categories"), relationOptions("products", id)]);
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
        <ProductForm id={id} initial={record} payload={payload} media={media} categoryOptions={categories} productOptions={productOptions} canDelete />
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
      <ResourceForm
        resource={key}
        id={id}
        fields={fields}
        initial={record}
        media={media}
        pathMode={config.pathMode}
        canDelete={!(key === "users" && id === user.id)}
      />
    </>
  );
}
