import { Notice, PageHeader } from "@/components/admin/page-header";
import { HeaderForm } from "@/components/admin/layout-forms";
import { getDb } from "@/db";
import { headerSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureSingletons, mediaItems } from "@/lib/cms/queries";

export default async function HeaderSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const params = await searchParams;
  await ensureSingletons();
  const db = getDb();
  const [row] = await db.select().from(headerSettings).where(eq(headerSettings.id, "default")).limit(1);
  if (!row) throw new Error("Header settings missing.");
  const mediaList = await mediaItems([row.logoId, row.mobileLogoId, row.faviconId].filter((id): id is string => Boolean(id)));

  return (
    <>
      <PageHeader eyebrow="Globals" title="Header" description="Logo, top bar, CTA, and sticky header options." />
      {params.saved ? <Notice tone="ok">Header saved.</Notice> : null}
      <HeaderForm header={row} media={mediaList} />
    </>
  );
}
