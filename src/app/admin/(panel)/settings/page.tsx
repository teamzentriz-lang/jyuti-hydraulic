import { Notice, PageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/singleton-forms";
import { getSettings, mediaItems } from "@/lib/cms/queries";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const params = await searchParams;
  const settings = await getSettings();
  const media = await mediaItems([settings.logoId, settings.catalogueId].filter((id): id is string => Boolean(id)));

  return (
    <>
      <PageHeader
        eyebrow="Globals"
        title="Site settings"
        description="Logo, phones, emails, address, WhatsApp, social links, catalogue, and footer. The public site will read this record."
      />
      {params.saved ? <Notice tone="ok">Settings saved.</Notice> : null}
      <SettingsForm settings={settings} media={media} />
    </>
  );
}
