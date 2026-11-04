import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { PageForm } from "@/components/admin/page-form";
import { emptyPageInitial } from "@/lib/cms/page-form-defaults";
import { ProductForm } from "@/components/admin/product-form";
import { ResourceForm } from "@/components/admin/resource-form";
import { requireUser } from "@/lib/auth";
import { canAccessResource, hasPermission, permissionForResource } from "@/lib/authorization";
import { fieldsFor, relationOptions } from "@/lib/cms/queries";
import { emptyValues, isResourceKey, resources } from "@/lib/cms/resources";

export default async function NewResourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ resource: string }>;
  searchParams: Promise<{ location?: string }>;
}) {
  const [{ resource: key }, query] = await Promise.all([params, searchParams]);
  if (!isResourceKey(key)) notFound();
  if (key === "media") redirect("/admin/media/");
  const config = resources[key];
  const user = await requireUser();
  if (!canAccessResource(user, key) || (key === "users" && user.systemRole !== "super_admin")) redirect("/admin/");
  if (!hasPermission(user, permissionForResource(key))) redirect(`/admin/${key}/`);
  const fields =
    key === "products" ? resources[key].fields : await fieldsFor(key, undefined, user);

  if (key === "products") {
    const [categories, productOptions] = await Promise.all([relationOptions("product-categories"), relationOptions("products")]);
    const emptyPayload = {
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
    };
    return (
      <>
        <PageHeader eyebrow={config.label} title="New product" description={config.description} />
        <ProductForm
          initial={{ status: "draft", isActive: true, enquiryEnabled: true }}
          payload={emptyPayload}
          media={[]}
          categoryOptions={categories}
          categoryIds={[]}
          productOptions={productOptions}
          pageHtml={null}
          canDelete={false}
        />
      </>
    );
  }

  if (key === "pages") {
    return (
      <>
        <PageHeader eyebrow={config.label} title="New page" description={config.description} />
        <PageForm initial={emptyPageInitial()} sections={[]} media={[]} canDelete={false} />
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow={config.label} title={`New ${config.singular.toLowerCase()}`} description={config.description} />
      <ResourceForm
        resource={key}
        fields={fields}
        initial={{
          ...emptyValues(key),
          ...(key === "nav-links" && query.location === "products" ? { location: "products" } : {}),
        }}
        media={[]}
        pathMode={config.pathMode}
        canDelete={false}
      />
    </>
  );
}
