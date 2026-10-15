import { CommonHtmlForm } from "@/components/admin/common-html-form";
import { Notice, PageHeader } from "@/components/admin/page-header";
import { getDb } from "@/db";
import { siteHtmlSettings } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { requirePermission } from "@/lib/authorization";
import { ensureSingletons } from "@/lib/cms/queries";
import { eq } from "drizzle-orm";

export default async function CommonHtmlPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const params = await searchParams;
  requirePermission(await requireUser(), "cms.settings.manage");
  await ensureSingletons();
  const [settings] = await getDb()
    .select()
    .from(siteHtmlSettings)
    .where(eq(siteHtmlSettings.id, "default"))
    .limit(1);
  if (!settings) throw new Error("Common HTML settings are missing.");
  return (
    <>
      <PageHeader
        eyebrow="Globals"
        title="Common HTML"
        description="Optional formatted blocks shared by every public page."
      />
      {params.saved ? <Notice tone="ok">Common HTML saved.</Notice> : null}
      <CommonHtmlForm
        commonHeaderHtml={settings.commonHeaderHtml}
        commonFooterHtml={settings.commonFooterHtml}
      />
    </>
  );
}
