import { SiteLabelsForm } from "@/components/admin/site-labels-form";
import { Notice, PageHeader } from "@/components/admin/page-header";
import { requireUser } from "@/lib/auth";
import { requirePermission } from "@/lib/authorization";
import { getSiteLabels } from "@/lib/cms/queries";
export default async function SiteLabelsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  requirePermission(await requireUser(), "cms.settings.manage");
  const [labels, params] = await Promise.all([getSiteLabels(), searchParams]);
  return (
    <>
      <PageHeader
        eyebrow="Globals"
        title="Site labels"
        description="Editable visible text for listing pages, product tabs, footer and 404 page."
      />
      {params.saved ? <Notice tone="ok">Site labels saved.</Notice> : null}
      <SiteLabelsForm labels={labels} />
    </>
  );
}
