import { Notice, PageHeader } from "@/components/admin/page-header";
import { ContactSettingsForm } from "@/components/admin/layout-forms";
import { getDb } from "@/db";
import { contactSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureSingletons } from "@/lib/cms/queries";

export default async function ContactSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const params = await searchParams;
  await ensureSingletons();
  const db = getDb();
  const [row] = await db.select().from(contactSettings).where(eq(contactSettings.id, "default")).limit(1);
  if (!row) throw new Error("Contact settings missing.");

  return (
    <>
      <PageHeader eyebrow="Globals" title="Contact settings" description="Contact page content and map settings." />
      {params.saved ? <Notice tone="ok">Contact settings saved.</Notice> : null}
      <ContactSettingsForm contact={row} />
    </>
  );
}
