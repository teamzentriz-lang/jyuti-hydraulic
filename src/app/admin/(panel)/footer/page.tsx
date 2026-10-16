import { Notice, PageHeader } from "@/components/admin/page-header";
import { FooterForm } from "@/components/admin/layout-forms";
import { getDb } from "@/db";
import { footerSettings, siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureSingletons, mediaItems } from "@/lib/cms/queries";
import { requireUser } from "@/lib/auth";
import { requirePermission } from "@/lib/authorization";

export default async function FooterSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const params = await searchParams;
  requirePermission(await requireUser(), "cms.settings.manage");
  await ensureSingletons();
  const db = getDb();
  const [[row], [settings]] = await Promise.all([
    db
      .select()
      .from(footerSettings)
      .where(eq(footerSettings.id, "default"))
      .limit(1),
    db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.id, "default"))
      .limit(1),
  ]);
  if (!row) throw new Error("Footer settings missing.");
  const media = await mediaItems(row.logoId ? [row.logoId] : []);

  return (
    <>
      <PageHeader
        eyebrow="Globals"
        title="Footer"
        description="Edit every footer detail, including contact information, social links, newsletter and copyright."
      />
      {params.saved ? <Notice tone="ok">Footer saved.</Notice> : null}
      <FooterForm
        footer={{
          ...row,
          contactInformationJson: {
            address:
              row.contactInformationJson.address || settings?.address || "",
            email:
              row.contactInformationJson.email || settings?.emailPrimary || "",
            emailSecondary:
              row.contactInformationJson.emailSecondary ||
              settings?.emailSecondary ||
              "",
            phone:
              row.contactInformationJson.phone || settings?.phonePrimary || "",
          },
        }}
        media={media}
      />
    </>
  );
}
